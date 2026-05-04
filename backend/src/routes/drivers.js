const express = require('express');
const { body } = require('express-validator');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/drivers - List all drivers
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT d.*, 
        v.vehicle_number,
        v.vehicle_type,
        (SELECT COUNT(*) FROM trips WHERE driver_id = d.id AND status = 'completed') as completed_trips,
        (SELECT COALESCE(SUM(amount), 0) FROM trip_expenses WHERE trip_id IN (SELECT id FROM trips WHERE driver_id = d.id) AND status = 'reimbursed') as total_reimbursed
      FROM drivers d
      LEFT JOIN vehicle_drivers vd ON vd.driver_id = d.id AND vd.is_primary = true AND (vd.assigned_to IS NULL OR vd.assigned_to >= CURRENT_DATE)
      LEFT JOIN vehicles v ON v.id = vd.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND d.status = $${paramIndex++}`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (d.full_name ILIKE $${paramIndex} OR d.phone ILIKE $${paramIndex} OR d.license_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) as count_query`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY d.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// GET /api/drivers/:id - Get driver details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const driverResult = await query(`
      SELECT d.*, v.vehicle_number, v.id as vehicle_id
      FROM drivers d
      LEFT JOIN vehicle_drivers vd ON vd.driver_id = d.id AND vd.is_primary = true AND (vd.assigned_to IS NULL OR vd.assigned_to >= CURRENT_DATE)
      LEFT JOIN vehicles v ON v.id = vd.vehicle_id
      WHERE d.id = $1
    `, [id]);

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = driverResult.rows[0];

    // Get trip history
    const tripsResult = await query(
      'SELECT t.*, o.order_number, o.cargo_description FROM trips t LEFT JOIN orders o ON o.id = t.order_id WHERE t.driver_id = $1 ORDER BY t.created_at DESC LIMIT 20',
      [id]
    );

    // Get expense history
    const expensesResult = await query(
      'SELECT te.*, t.trip_number FROM trip_expenses te LEFT JOIN trips t ON t.id = te.trip_id WHERE te.incurred_by = $1 ORDER BY te.created_at DESC LIMIT 20',
      [id]
    );

    // Get performance stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trips,
        COALESCE(SUM(total_distance), 0) as total_distance,
        COALESCE(AVG(EXTRACT(EPOCH FROM (end_date - start_date))/3600), 0) as avg_trip_hours
      FROM trips 
      WHERE driver_id = $1
    `, [id]);

    res.json({
      ...driver,
      trips: tripsResult.rows,
      expenses: expensesResult.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ error: 'Failed to fetch driver details' });
  }
});

// POST /api/drivers - Create driver
router.post('/', 
  authenticate, 
  authorize('admin', 'manager'),
  validate([
    body('fullName').notEmpty().trim(),
    body('phone').notEmpty().isMobilePhone(),
    body('licenseNumber').notEmpty().trim()
  ]),
  async (req, res) => {
    try {
      const {
        fullName, phone, email, licenseNumber, licenseExpiry, licenseType,
        dateOfBirth, address, emergencyContact, emergencyContactName,
        joiningDate, salaryType, salaryAmount
      } = req.body;

      const result = await query(`
        INSERT INTO drivers (full_name, phone, email, license_number, license_expiry, license_type, date_of_birth, address, emergency_contact, emergency_contact_name, joining_date, salary_type, salary_amount)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [fullName, phone, email, licenseNumber, licenseExpiry, licenseType, dateOfBirth, address, emergencyContact, emergencyContactName, joiningDate, salaryType, salaryAmount]);

      res.status(201).json({
        message: 'Driver created successfully',
        driver: result.rows[0]
      });
    } catch (error) {
      console.error('Create driver error:', error);
      res.status(500).json({ error: 'Failed to create driver' });
    }
  }
);

// PUT /api/drivers/:id - Update driver
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'full_name', 'phone', 'email', 'license_number', 'license_expiry', 'license_type',
      'date_of_birth', 'address', 'emergency_contact', 'emergency_contact_name',
      'joining_date', 'salary_type', 'salary_amount', 'status'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbField)) {
        setClause.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    const sql = `UPDATE drivers SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({
      message: 'Driver updated successfully',
      driver: result.rows[0]
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

// GET /api/drivers/:id/salary - Calculate driver salary/settlement
router.get('/:id/salary', authenticate, authorize('admin', 'manager', 'accountant'), async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const driverResult = await query('SELECT salary_type, salary_amount FROM drivers WHERE id = $1', [id]);
    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driver = driverResult.rows[0];

    // Get trips in period
    const tripsResult = await query(`
      SELECT 
        COUNT(*) as trip_count,
        COALESCE(SUM(total_distance), 0) as total_distance
      FROM trips 
      WHERE driver_id = $1 
      AND status = 'completed'
      AND ($2::date IS NULL OR start_date >= $2)
      AND ($3::date IS NULL OR end_date <= $3)
    `, [id, from || null, to || null]);

    const trips = tripsResult.rows[0];
    let salary = 0;

    if (driver.salary_type === 'fixed') {
      salary = driver.salary_amount;
    } else if (driver.salary_type === 'per_trip') {
      salary = trips.trip_count * driver.salary_amount;
    } else if (driver.salary_type === 'per_km') {
      salary = trips.total_distance * driver.salary_amount;
    }

    // Get approved expenses
    const expensesResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM trip_expenses 
      WHERE incurred_by = $1 AND status = 'approved'
      AND ($2::date IS NULL OR created_at >= $2)
      AND ($3::date IS NULL OR created_at <= $3)
    `, [id, from || null, to || null]);

    const totalExpenses = parseFloat(expensesResult.rows[0].total_expenses);
    const totalPayable = salary + totalExpenses;

    res.json({
      driverId: id,
      salaryType: driver.salary_type,
      baseSalary: salary,
      tripCount: parseInt(trips.trip_count),
      totalDistance: parseFloat(trips.total_distance),
      expenses: totalExpenses,
      totalPayable,
      period: { from, to }
    });
  } catch (error) {
    console.error('Salary calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate salary' });
  }
});

module.exports = router;
