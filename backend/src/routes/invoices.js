const express = require('express');
const { body } = require('express-validator');
const { query, transaction } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const generateInvoiceNumber = () => {
  const prefix = 'PSRC-INV';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${random}`;
};

// GET /api/invoices - List invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, clientId, from, to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT i.*,
        c.company_name as client_name,
        o.order_number,
        o.cargo_description
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN orders o ON o.id = i.order_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }
    if (clientId) {
      sql += ` AND i.client_id = $${paramIndex++}`;
      params.push(clientId);
    }
    if (from) {
      sql += ` AND i.invoice_date >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND i.invoice_date <= $${paramIndex++}`;
      params.push(to);
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) as count_query`, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY i.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get summary stats
    const statsResult = await query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance_due), 0) as total_outstanding,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
      FROM invoices
      WHERE ($1::uuid IS NULL OR client_id = $1)
      AND ($2::date IS NULL OR invoice_date >= $2)
      AND ($3::date IS NULL OR invoice_date <= $3)
    `, [clientId || null, from || null, to || null]);

    res.json({
      data: result.rows,
      summary: statsResult.rows[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id - Get invoice details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await query(`
      SELECT i.*,
        c.company_name as client_name, c.gst_number as client_gst, c.billing_address, c.shipping_address,
        o.order_number, o.cargo_description, o.cargo_weight, o.cargo_volume
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN orders o ON o.id = i.order_id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get invoice items
    const itemsResult = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1',
      [id]
    );

    // Get payment history
    const paymentsResult = await query(`
      SELECT pv.*, ba.account_name as bank_account_name
      FROM payment_vouchers pv
      LEFT JOIN bank_accounts ba ON ba.id = pv.bank_account_id
      WHERE pv.party_id = $1 AND pv.party_type = 'client' AND pv.voucher_type = 'receipt'
      ORDER BY pv.created_at DESC
    `, [invoice.client_id]);

    res.json({
      ...invoice,
      items: itemsResult.rows,
      payments: paymentsResult.rows
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// POST /api/invoices - Create invoice from order
router.post('/', 
  authenticate,
  authorize('admin', 'manager', 'accountant'),
  validate([
    body('orderId').isUUID(),
    body('invoiceDate').isDate(),
    body('dueDate').isDate()
  ]),
  async (req, res) => {
    try {
      const { orderId, invoiceDate, dueDate, notes, termsConditions } = req.body;

      const result = await transaction(async (client) => {
        // Get order details
        const orderResult = await client.query(`
          SELECT o.*, c.gst_number, c.company_name
          FROM orders o
          LEFT JOIN clients c ON c.id = o.client_id
          WHERE o.id = $1
        `, [orderId]);

        if (orderResult.rows.length === 0) {
          throw new Error('Order not found');
        }

        const order = orderResult.rows[0];

        // Check if invoice already exists
        const existingInvoice = await client.query(
          'SELECT id FROM invoices WHERE order_id = $1 AND status != $2',
          [orderId, 'cancelled']
        );

        if (existingInvoice.rows.length > 0) {
          throw new Error('Invoice already exists for this order');
        }

        const invoiceNumber = generateInvoiceNumber();

        // Determine GST type based on state
        const gstType = 'igst'; // Simplified - can be enhanced with state comparison
        const gstRate = 12.00;
        const subtotal = parseFloat(order.total_amount);
        const gstAmount = (subtotal * gstRate / 100).toFixed(2);
        const totalAmount = (subtotal + parseFloat(gstAmount)).toFixed(2);

        // Create invoice
        const invoiceResult = await client.query(`
          INSERT INTO invoices (invoice_number, client_id, order_id, invoice_date, due_date, subtotal, gst_type, gst_rate, gst_amount, total_amount, balance_due, status, notes, terms_conditions, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12, $13, $14)
          RETURNING *
        `, [
          invoiceNumber, order.client_id, orderId, invoiceDate, dueDate,
          subtotal, gstType, gstRate, gstAmount, totalAmount, totalAmount,
          notes, termsConditions, req.user.id
        ]);

        const invoice = invoiceResult.rows[0];

        // Create invoice items
        const items = [
          { desc: `Freight Charges - ${order.cargo_description}`, qty: 1, unit: 'trip', rate: order.freight_amount, amount: order.freight_amount },
          { desc: 'Loading Charges', qty: 1, unit: 'trip', rate: order.loading_charges, amount: order.loading_charges },
          { desc: 'Unloading Charges', qty: 1, unit: 'trip', rate: order.unloading_charges, amount: order.unloading_charges },
          { desc: 'Toll Charges', qty: 1, unit: 'trip', rate: order.toll_charges, amount: order.toll_charges }
        ].filter(item => item.amount > 0);

        for (const item of items) {
          const itemGst = (item.amount * gstRate / 100).toFixed(2);
          const itemTotal = (parseFloat(item.amount) + parseFloat(itemGst)).toFixed(2);

          await client.query(`
            INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount, gst_rate, gst_amount, total_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [invoice.id, item.desc, item.qty, item.unit, item.rate, item.amount, gstRate, itemGst, itemTotal]);
        }

        return invoice;
      });

      res.status(201).json({
        message: 'Invoice created successfully',
        invoice: result
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(400).json({ error: error.message || 'Failed to create invoice' });
    }
  }
);

// PUT /api/invoices/:id/status - Update invoice status
router.put('/:id/status', authenticate, authorize('admin', 'manager', 'accountant'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentReference, amountPaid } = req.body;

    const validStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = ['status = $1'];
    const values = [status];
    let paramIndex = 2;

    if (status === 'sent') {
      updates.push('sent_at = CURRENT_TIMESTAMP');
    }

    if ((status === 'paid' || status === 'partial') && amountPaid) {
      updates.push(`amount_paid = amount_paid + $${paramIndex++}`);
      updates.push(`balance_due = total_amount - amount_paid`);
      values.push(amountPaid);
    }

    if (paymentReference) {
      updates.push(`payment_reference = $${paramIndex++}`);
      values.push(paymentReference);
    }

    if (status === 'paid') {
      updates.push('paid_at = CURRENT_TIMESTAMP');
    }

    values.push(id);
    const sql = `UPDATE invoices SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      message: 'Invoice status updated',
      invoice: result.rows[0]
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

module.exports = router;
