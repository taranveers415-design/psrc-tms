const express = require('express');
const { body } = require('express-validator');
const { query, transaction } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const generateTripNumber = () => {
  const prefix = 'TRIP';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${random}`;
};

// GET /api/trips - List trips
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, vehicleId, driverId, from, to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT t.*,
        o.order_number, o.cargo_description, o.client_id,
        c.company_name as client_name,
        v.vehicle_number, v.vehicle_type,
        d.full_name as driver_name,
        d2.full_name as secondary_driver_name,
        l1.name as origin_name,
        l2.name as destination_name
      FROM trips t
      LEFT JOIN orders o ON o.id = t.order_id
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      LEFT JOIN drivers d2 ON d2.id = t.secondary_driver_id
      LEFT JOIN locations l1 ON l1.id = o.origin_location_id
      LEFT JOIN locations l2 ON l2.id = o.destination_location_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    if (vehicleId) {
      sql += ` AND t.vehicle_id = $${paramIndex++}`;
      params.push(vehicleId);
    }
    if (driverId) {
      sql += ` AND t.driver_id = $${paramIndex++}`;
      params.push(driverId);
    }
    if (from) {
      sql += ` AND t.start_date >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND t.end_date <= $${paramIndex++}`;
      params.push(to);
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) as count_query`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
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
    console.error('Get trips error:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// GET /api/trips/:id - Get trip details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const tripResult = await query(`
      SELECT t.*,
        o.order_number, o.cargo_description, o.cargo_weight, o.cargo_volume, o.number_of_packages,
        o.freight_amount, o.loading_charges, o.unloading_charges, o.toll_charges, o.other_charges, o.total_amount,
        c.company_name as client_name, c.phone as client_phone,
        v.vehicle_number, v.vehicle_type, v.capacity_tons,
        d.full_name as driver_name, d.phone as driver_phone, d.license_number,
        d2.full_name as secondary_driver_name,
        l1.name as origin_name, l1.address as origin_address,
        l2.name as destination_name, l2.address as destination_address
      FROM trips t
      LEFT JOIN orders o ON o.id = t.order_id
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      LEFT JOIN drivers d2 ON d2.id = t.secondary_driver_id
      LEFT JOIN locations l1 ON l1.id = o.origin_location_id
      LEFT JOIN locations l2 ON l2.id = o.destination_location_id
      WHERE t.id = $1
    `, [id]);

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.rows[0];

    // Get trip stops
    const stopsResult = await query(
      'SELECT ts.*, l.name as location_name FROM trip_stops ts LEFT JOIN locations l ON l.id = ts.location_id WHERE ts.trip_id = $1 ORDER BY ts.sequence',
      [id]
    );

    // Get trip expenses
    const expensesResult = await query(
      'SELECT te.*, d.full_name as incurred_by_name FROM trip_expenses te LEFT JOIN drivers d ON d.id = te.incurred_by WHERE te.trip_id = $1 ORDER BY te.created_at DESC',
      [id]
    );

    // Calculate trip profitability
    const totalExpenses = expensesResult.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const tripRevenue = parseFloat(trip.total_amount || 0);
    const profit = tripRevenue - totalExpenses;
    const profitMargin = tripRevenue > 0 ? (profit / tripRevenue * 100).toFixed(2) : 0;

    res.json({
      ...trip,
      stops: stopsResult.rows,
      expenses: expensesResult.rows,
      profitability: {
        revenue: tripRevenue,
        expenses: totalExpenses,
        profit,
        profitMargin: `${profitMargin}%`
      }
    });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Failed to fetch trip details' });
  }
});

// POST /api/trips - Create trip from order
router.post('/', 
  authenticate,
  authorize('admin', 'manager', 'staff'),
  validate([
    body('orderId').isUUID(),
    body('vehicleId').isUUID(),
    body('driverId').isUUID(),
    body('startDate').isDate()
  ]),
  async (req, res) => {
    try {
      const { orderId, vehicleId, driverId, secondaryDriverId, startDate, routeDescription } = req.body;

      const tripNumber = generateTripNumber();

      const result = await transaction(async (client) => {
        // Check if order exists and is not already assigned
        const orderCheck = await client.query(
          'SELECT status FROM orders WHERE id = $1',
          [orderId]
        );

        if (orderCheck.rows.length === 0) {
          throw new Error('Order not found');
        }

        if (orderCheck.rows[0].status === 'cancelled') {
          throw new Error('Cannot create trip for cancelled order');
        }

        // Check vehicle availability
        const vehicleCheck = await client.query(
          "SELECT status FROM vehicles WHERE id = $1 AND status = 'active'",
          [vehicleId]
        );

        if (vehicleCheck.rows.length === 0) {
          throw new Error('Vehicle not available');
        }

        // Check driver availability
        const driverCheck = await client.query(
          "SELECT status FROM drivers WHERE id = $1 AND status = 'active'",
          [driverId]
        );

        if (driverCheck.rows.length === 0) {
          throw new Error('Driver not available');
        }

        // Create trip
        const tripResult = await client.query(`
          INSERT INTO trips (trip_number, order_id, vehicle_id, driver_id, secondary_driver_id, start_date, route_description, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
          RETURNING *
        `, [tripNumber, orderId, vehicleId, driverId, secondaryDriverId || null, startDate, routeDescription]);

        // Update order status
        await client.query(
          "UPDATE orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [orderId]
        );

        return tripResult.rows[0];
      });

      res.status(201).json({
        message: 'Trip created successfully',
        trip: result
      });
    } catch (error) {
      console.error('Create trip error:', error);
      res.status(400).json({ error: error.message || 'Failed to create trip' });
    }
  }
);

// PUT /api/trips/:id/status - Update trip status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, odometerReading, remarks } = req.body;

    const validStatuses = ['scheduled', 'loading', 'in_transit', 'halted', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await transaction(async (client) => {
      const updates = ['status = $1'];
      const values = [status];
      let paramIndex = 2;

      if (status === 'in_transit' && odometerReading) {
        updates.push(`start_odometer = $${paramIndex++}`);
        values.push(odometerReading);
      }

      if (status === 'completed' || status === 'delivered') {
        updates.push('end_date = CURRENT_DATE');
        if (odometerReading) {
          updates.push(`end_odometer = $${paramIndex++}`);
          values.push(odometerReading);
          updates.push(`total_distance = $${paramIndex++} - COALESCE(start_odometer, 0)`);
          values.push(odometerReading);
        }
      }

      values.push(id);
      const sql = `UPDATE trips SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;

      const tripResult = await client.query(sql, values);

      if (tripResult.rows.length === 0) {
        throw new Error('Trip not found');
      }

      const trip = tripResult.rows[0];

      // Update order status based on trip status
      if (status === 'loading') {
        await client.query("UPDATE orders SET status = 'loaded' WHERE id = $1", [trip.order_id]);
      } else if (status === 'in_transit') {
        await client.query("UPDATE orders SET status = 'in_transit' WHERE id = $1", [trip.order_id]);
      } else if (status === 'delivered' || status === 'completed') {
        await client.query("UPDATE orders SET status = 'delivered', actual_delivery = CURRENT_TIMESTAMP WHERE id = $1", [trip.order_id]);
      }

      // Update vehicle odometer
      if (odometerReading) {
        await client.query('UPDATE vehicles SET current_odometer = $1 WHERE id = $2', [odometerReading, trip.vehicle_id]);
      }

      return trip;
    });

    res.json({
      message: 'Trip status updated',
      trip: result
    });
  } catch (error) {
    console.error('Update trip status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update trip status' });
  }
});

// POST /api/trips/:id/expenses - Add trip expense
router.post('/:id/expenses', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { expenseType, amount, description, receiptNumber, incurredBy } = req.body;

    const result = await query(`
      INSERT INTO trip_expenses (trip_id, expense_type, amount, description, receipt_number, incurred_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [id, expenseType, amount, description, receiptNumber, incurredBy || req.user.id]);

    res.status(201).json({
      message: 'Expense added successfully',
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// POST /api/trips/:id/pod - Update POD status
router.put('/:id/pod', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { podStatus, podRemarks, podImageUrl } = req.body;

    const result = await query(`
      UPDATE trips 
      SET pod_status = $1, pod_remarks = $2, pod_image_url = $3, pod_received_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [podStatus, podRemarks, podImageUrl, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({
      message: 'POD updated successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('POD update error:', error);
    res.status(500).json({ error: 'Failed to update POD' });
  }
});

module.exports = router;
