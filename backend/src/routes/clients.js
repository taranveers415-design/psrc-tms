const express = require('express');
const { body } = require('express-validator');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/clients - List clients
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM orders WHERE client_id = c.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE client_id = c.id) as total_revenue,
        (SELECT COALESCE(SUM(balance_due), 0) FROM invoices WHERE client_id = c.id AND status IN ('sent', 'partial', 'overdue')) as outstanding_amount
      FROM clients c
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status !== undefined) {
      sql += ` AND c.is_active = $${paramIndex++}`;
      params.push(status === 'true');
    }
    if (search) {
      sql += ` AND (c.company_name ILIKE $${paramIndex} OR c.contact_person ILIKE $${paramIndex} OR c.gst_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) as count_query`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
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
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/clients/:id - Get client details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const clientResult = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    // Get orders
    const ordersResult = await query(
      'SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    );

    // Get invoices
    const invoicesResult = await query(
      'SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    );

    // Get rate contracts
    const contractsResult = await query(`
      SELECT rc.*, l1.name as origin_name, l2.name as destination_name
      FROM rate_contracts rc
      LEFT JOIN locations l1 ON l1.id = rc.origin_location_id
      LEFT JOIN locations l2 ON l2.id = rc.destination_location_id
      WHERE rc.client_id = $1 AND rc.is_active = true
    `, [id]);

    res.json({
      ...client,
      orders: ordersResult.rows,
      invoices: invoicesResult.rows,
      rateContracts: contractsResult.rows
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
});

// POST /api/clients - Create client
router.post('/', 
  authenticate,
  authorize('admin', 'manager'),
  validate([
    body('companyName').notEmpty().trim(),
    body('phone').notEmpty(),
    body('gstNumber').optional().trim()
  ]),
  async (req, res) => {
    try {
      const {
        companyName, contactPerson, email, phone, gstNumber, panNumber,
        billingAddress, shippingAddress, creditLimit, paymentTerms
      } = req.body;

      const result = await query(`
        INSERT INTO clients (company_name, contact_person, email, phone, gst_number, pan_number, billing_address, shipping_address, credit_limit, payment_terms)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [companyName, contactPerson, email, phone, gstNumber, panNumber, billingAddress, shippingAddress, creditLimit, paymentTerms]);

      res.status(201).json({
        message: 'Client created successfully',
        client: result.rows[0]
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  }
);

// PUT /api/clients/:id - Update client
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'company_name', 'contact_person', 'email', 'phone', 'gst_number', 'pan_number',
      'billing_address', 'shipping_address', 'credit_limit', 'payment_terms', 'is_active'
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
    const sql = `UPDATE clients SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      message: 'Client updated successfully',
      client: result.rows[0]
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// GET /api/clients/:id/ledger - Client ledger
router.get('/:id/ledger', authenticate, authorize('admin', 'manager', 'accountant'), async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const ledgerResult = await query(`
      SELECT 
        'invoice' as type,
        i.invoice_number as reference,
        i.invoice_date as date,
        i.total_amount as debit,
        0 as credit,
        i.status as status
      FROM invoices i
      WHERE i.client_id = $1
      AND ($2::date IS NULL OR i.invoice_date >= $2)
      AND ($3::date IS NULL OR i.invoice_date <= $3)

      UNION ALL

      SELECT 
        'payment' as type,
        pv.voucher_number as reference,
        pv.voucher_date as date,
        0 as debit,
        pv.amount as credit,
        pv.status as status
      FROM payment_vouchers pv
      WHERE pv.party_id = $1 AND pv.party_type = 'client' AND pv.voucher_type = 'receipt'
      AND ($2::date IS NULL OR pv.voucher_date >= $2)
      AND ($3::date IS NULL OR pv.voucher_date <= $3)

      ORDER BY date DESC
    `, [id, from || null, to || null]);

    // Calculate running balance
    let balance = 0;
    const ledger = ledgerResult.rows.map(row => {
      balance += parseFloat(row.debit) - parseFloat(row.credit);
      return { ...row, balance: balance.toFixed(2) };
    });

    res.json({
      clientId: id,
      ledger,
      closingBalance: balance.toFixed(2)
    });
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

module.exports = router;
