const express = require('express');
const { body, query: queryValidator } = require('express-validator');
const { query, transaction } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/vehicles - List all vehicles with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT v.*, 
        d.full_name as driver_name,
        d.phone as driver_phone,
        (SELECT COUNT(*) FROM trips WHERE vehicle_id = v.id AND status IN ('in_transit', 'loading')) as active_trips
      FROM vehicles v
      LEFT JOIN vehicle_drivers vd ON vd.vehicle_id = v.id AND vd.is_primary = true AND (vd.assigned_to IS NULL OR vd.assigned_to >= CURRENT_DATE)
      LEFT JOIN drivers d ON d.id = vd.driver_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND v.status = $${paramIndex++}`;
      params.push(status);
    }
    if (type) {
      sql += ` AND v.vehicle_type = $${paramIndex++}`;
      params.push(type);
    }
    if (search) {
      sql += ` AND (v.vehicle_number ILIKE $${paramIndex} OR v.make ILIKE $${paramIndex} OR v.model ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) as count_query`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY v.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
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
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// GET /api/vehicles/:id - Get single vehicle with full details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const vehicleResult = await query(`
      SELECT v.*, 
        d.full_name as driver_name,
        d.phone as driver_phone,
        d.id as driver_id
      FROM vehicles v
      LEFT JOIN vehicle_drivers vd ON vd.vehicle_id = v.id AND vd.is_primary = true AND (vd.assigned_to IS NULL OR vd.assigned_to >= CURRENT_DATE)
      LEFT JOIN drivers d ON d.id = vd.driver_id
      WHERE v.id = $1
    `, [id]);

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const vehicle = vehicleResult.rows[0];

    // Get maintenance history
    const maintenanceResult = await query(
      'SELECT * FROM maintenance_records WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 10',
      [id]
    );

    // Get fuel logs
    const fuelResult = await query(
      'SELECT * FROM fuel_logs WHERE vehicle_id = $1 ORDER BY filled_at DESC LIMIT 10',
      [id]
    );

    // Get trip history
    const tripsResult = await query(
      'SELECT t.*, o.order_number FROM trips t LEFT JOIN orders o ON o.id = t.order_id WHERE t.vehicle_id = $1 ORDER BY t.created_at DESC LIMIT 10',
      [id]
    );

    // Get document expiry alerts
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.setDate(today.getDate() + 30));
    const alerts = [];

    if (vehicle.rc_expiry && new Date(vehicle.rc_expiry) <= thirtyDaysFromNow) {
      alerts.push({ type: 'RC', expiry: vehicle.rc_expiry, daysLeft: Math.ceil((new Date(vehicle.rc_expiry) - new Date()) / (1000 * 60 * 60 * 24)) });
    }
    if (vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) <= thirtyDaysFromNow) {
      alerts.push({ type: 'Insurance', expiry: vehicle.insurance_expiry, daysLeft: Math.ceil((new Date(vehicle.insurance_expiry) - new Date()) / (1000 * 60 * 60 * 24)) });
    }
    if (vehicle.fitness_expiry && new Date(vehicle.fitness_expiry) <= thirtyDaysFromNow) {
      alerts.push({ type: 'Fitness', expiry: vehicle.fitness_expiry, daysLeft: Math.ceil((new Date(vehicle.fitness_expiry) - new Date()) / (1000 * 60 * 60 * 24)) });
    }
    if (vehicle.permit_expiry && new Date(vehicle.permit_expiry) <= thirtyDaysFromNow) {
      alerts.push({ type: 'Permit', expiry: vehicle.permit_expiry, daysLeft: Math.ceil((new Date(vehicle.permit_expiry) - new Date()) / (1000 * 60 * 60 * 24)) });
    }

    res.json({
      ...vehicle,
      maintenance: maintenanceResult.rows,
      fuelLogs: fuelResult.rows,
      trips: tripsResult.rows,
      documentAlerts: alerts
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle details' });
  }
});

// POST /api/vehicles - Create new vehicle
router.post('/', 
  authenticate, 
  authorize('admin', 'manager'),
  validate([
    body('vehicleNumber').notEmpty().trim().toUpperCase(),
    body('vehicleType').isIn(['truck', 'tempo', 'container', 'trailer', 'tanker']),
    body('capacityTons').optional().isDecimal(),
    body('fuelType').optional().isIn(['diesel', 'petrol', 'cng', 'electric'])
  ]),
  async (req, res) => {
    try {
      const {
        vehicleNumber, vehicleType, make, model, year, capacityTons, capacityVolume,
        fuelType, chassisNumber, engineNumber, rcNumber, rcExpiry, insuranceNumber,
        insuranceExpiry, fitnessCertificate, fitnessExpiry, permitType, permitExpiry,
        gpsDeviceId
      } = req.body;

      const result = await query(`
        INSERT INTO vehicles (
          vehicle_number, vehicle_type, make, model, year, capacity_tons, capacity_volume,
          fuel_type, chassis_number, engine_number, rc_number, rc_expiry, insurance_number,
          insurance_expiry, fitness_certificate, fitness_expiry, permit_type, permit_expiry,
          gps_device_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        vehicleNumber, vehicleType, make, model, year, capacityTons, capacityVolume,
        fuelType, chassisNumber, engineNumber, rcNumber, rcExpiry, insuranceNumber,
        insuranceExpiry, fitnessCertificate, fitnessExpiry, permitType, permitExpiry,
        gpsDeviceId
      ]);

      res.status(201).json({ 
        message: 'Vehicle created successfully',
        vehicle: result.rows[0]
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Vehicle number already exists' });
      }
      console.error('Create vehicle error:', error);
      res.status(500).json({ error: 'Failed to create vehicle' });
    }
  }
);

// PUT /api/vehicles/:id - Update vehicle
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'vehicle_number', 'vehicle_type', 'make', 'model', 'year', 'capacity_tons',
      'capacity_volume', 'fuel_type', 'chassis_number', 'engine_number', 'rc_number',
      'rc_expiry', 'insurance_number', 'insurance_expiry', 'fitness_certificate',
      'fitness_expiry', 'permit_type', 'permit_expiry', 'gps_device_id', 'status', 'current_odometer'
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
    const sql = `UPDATE vehicles SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({
      message: 'Vehicle updated successfully',
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// DELETE /api/vehicles/:id - Delete vehicle
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle has active trips
    const activeTrips = await query(
      "SELECT COUNT(*) FROM trips WHERE vehicle_id = $1 AND status IN ('loading', 'in_transit')",
      [id]
    );

    if (parseInt(activeTrips.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete vehicle with active trips' });
    }

    await query('DELETE FROM vehicles WHERE id = $1', [id]);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// POST /api/vehicles/:id/assign-driver - Assign driver to vehicle
router.post('/:id/assign-driver', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, isPrimary = true } = req.body;

    await transaction(async (client) => {
      // End previous primary assignment if exists
      if (isPrimary) {
        await client.query(
          'UPDATE vehicle_drivers SET assigned_to = CURRENT_DATE - 1 WHERE vehicle_id = $1 AND is_primary = true AND assigned_to IS NULL',
          [id]
        );
      }

      // Create new assignment
      await client.query(
        'INSERT INTO vehicle_drivers (vehicle_id, driver_id, assigned_from, is_primary) VALUES ($1, $2, CURRENT_DATE, $3)',
        [id, driverId, isPrimary]
      );
    });

    res.json({ message: 'Driver assigned successfully' });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

// POST /api/vehicles/:id/maintenance - Add maintenance record
router.post('/:id/maintenance', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenanceType, description, serviceCenter, cost, odometerReading, nextServiceDue, nextServiceOdometer } = req.body;

    const result = await query(`
      INSERT INTO maintenance_records (vehicle_id, maintenance_type, description, service_center, cost, odometer_reading, next_service_due, next_service_odometer)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, maintenanceType, description, serviceCenter, cost, odometerReading, nextServiceDue, nextServiceOdometer]);

    // Update vehicle odometer if provided
    if (odometerReading) {
      await query('UPDATE vehicles SET current_odometer = $1 WHERE id = $2', [odometerReading, id]);
    }

    res.status(201).json({
      message: 'Maintenance record added',
      record: result.rows[0]
    });
  } catch (error) {
    console.error('Maintenance record error:', error);
    res.status(500).json({ error: 'Failed to add maintenance record' });
  }
});

// POST /api/vehicles/:id/fuel - Add fuel log
router.post('/:id/fuel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { fuelStation, fuelType, quantityLiters, ratePerLiter, totalAmount, odometerReading, paymentMode, billNumber } = req.body;

    const result = await query(`
      INSERT INTO fuel_logs (vehicle_id, fuel_station, fuel_type, quantity_liters, rate_per_liter, total_amount, odometer_reading, payment_mode, bill_number, filled_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `, [id, fuelStation, fuelType, quantityLiters, ratePerLiter, totalAmount, odometerReading, paymentMode, billNumber]);

    // Update vehicle odometer
    if (odometerReading) {
      await query('UPDATE vehicles SET current_odometer = $1 WHERE id = $2', [odometerReading, id]);
    }

    res.status(201).json({
      message: 'Fuel log added',
      log: result.rows[0]
    });
  } catch (error) {
    console.error('Fuel log error:', error);
    res.status(500).json({ error: 'Failed to add fuel log' });
  }
});

// GET /api/vehicles/:id/fuel-summary - Fuel summary for vehicle
router.get('/:id/fuel-summary', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const result = await query(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(total_amount) as total_cost,
        SUM(quantity_liters) as total_liters,
        AVG(rate_per_liter) as avg_rate,
        MAX(filled_at) as last_filled
      FROM fuel_logs 
      WHERE vehicle_id = $1 
      AND ($2::date IS NULL OR filled_at >= $2)
      AND ($3::date IS NULL OR filled_at <= $3)
    `, [id, from || null, to || null]);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fuel summary' });
  }
});

module.exports = router;
