const express = require('express');
const { body } = require('express-validator');
const { query, transaction } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Generate order number
const generateOrderNumber = () => {
  const prefix = 'PSRC';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${random}`;
};

// GET /api/orders - List orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, clientId, from, to, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT o.*, 
        c.company_name as client_name,
        l1.name as origin_name,
        l2.name as destination_name,
        t.trip_number,
        t.status as trip_status,
        v.vehicle_number
      FROM orders o
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN locations l1 ON l1.id = o.origin_location_id
      LEFT JOIN locations l2 ON l2.id = o.destination_location_id
      LEFT JOIN trips t ON t.order_id = o.id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND o.status = $${paramIndex++}`;
      params.push(status);
    }
    if (clientId) {
      sql += ` AND o.client_id = $${paramIndex++}`;
      params.push(clientId);
    }
    if (from) {
      sql += ` AND o.order_date >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND o.order_date <= $${paramIndex++}`;
      params.push(to);
    }
    if (search) {
      sql += ` AND (o.order_number ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex} OR o.cargo_description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) as count_query`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY o.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
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
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await query(`
      SELECT o.*,
        c.company_name as client_name, c.gst_number as client_gst, c.billing_address,
        l1.name as origin_name, l1.address as origin_address,
        l2.name as destination_name, l2.address as destination_address
      FROM orders o
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN locations l1 ON l1.id = o.origin_location_id
      LEFT JOIN locations l2 ON l2.id = o.destination_location_id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get trip details
    const tripResult = await query(`
      SELECT t.*, d.full_name as driver_name, v.vehicle_number
      FROM trips t
      LEFT JOIN drivers d ON d.id = t.driver_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      WHERE t.order_id = $1
    `, [id]);

    // Get invoice details
    const invoiceResult = await query(
      'SELECT * FROM invoices WHERE order_id = $1',
      [id]
    );

    res.json({
      ...order,
      trip: tripResult.rows[0] || null,
      invoice: invoiceResult.rows[0] || null
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// POST /api/orders - Create order
router.post('/', 
  authenticate,
  authorize('admin', 'manager', 'staff'),
  validate([
    body('clientId').isUUID(),
    body('originLocationId').isUUID(),
    body('destinationLocationId').isUUID(),
    body('cargoDescription').notEmpty().trim(),
    body('orderDate').isDate(),
    body('freightAmount').isDecimal()
  ]),
  async (req, res) => {
    try {
      const {
        clientId, originLocationId, destinationLocationId, cargoDescription,
        cargoWeight, cargoVolume, cargoType, numberOfPackages, orderDate,
        expectedDelivery, freightAmount, loadingCharges, unloadingCharges,
        tollCharges, otherCharges, remarks
      } = req.body;

      const orderNumber = generateOrderNumber();
      const totalAmount = parseFloat(freightAmount || 0) + 
                         parseFloat(loadingCharges || 0) + 
                         parseFloat(unloadingCharges || 0) + 
                         parseFloat(tollCharges || 0) + 
                         parseFloat(otherCharges || 0);

      const result = await query(`
        INSERT INTO orders (
          order_number, client_id, origin_location_id, destination_location_id,
          cargo_description, cargo_weight, cargo_volume, cargo_type, number_of_packages,
          order_date, expected_delivery, freight_amount, loading_charges, unloading_charges,
          toll_charges, other_charges, total_amount, status, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending', $18, $19)
        RETURNING *
      `, [
        orderNumber, clientId, originLocationId, destinationLocationId,
        cargoDescription, cargoWeight, cargoVolume, cargoType, numberOfPackages || 1,
        orderDate, expectedDelivery, freightAmount, loadingCharges, unloadingCharges,
        tollCharges, otherCharges, totalAmount, remarks, req.user.id
      ]);

      res.status(201).json({
        message: 'Order created successfully',
        order: result.rows[0]
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }
);

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = ['pending', 'confirmed', 'loaded', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = ['status = $1'];
    const values = [status];
    let paramIndex = 2;

    if (status === 'delivered') {
      updates.push('actual_delivery = CURRENT_TIMESTAMP');
    }
    if (remarks) {
      updates.push(`remarks = COALESCE(remarks, '') || ' | Status Update: ' || $${paramIndex++}`);
      values.push(remarks);
    }

    values.push(id);
    const sql = `UPDATE orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order status updated',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
