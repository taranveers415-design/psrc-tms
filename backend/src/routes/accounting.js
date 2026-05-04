const express = require('express');
const { query, transaction } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/accounting/chart-of-accounts - Get chart of accounts
router.get('/chart-of-accounts', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, p.account_name as parent_name
      FROM chart_of_accounts c
      LEFT JOIN chart_of_accounts p ON p.id = c.parent_account_id
      WHERE c.is_active = true
      ORDER BY c.account_code
    `);

    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

// POST /api/accounting/transactions - Create journal entry
router.post('/transactions', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { transactionDate, accountId, contraAccountId, transactionType, amount, description, narration, referenceType, referenceId } = req.body;

    const transactionNumber = 'TXN-' + Date.now();

    const result = await query(`
      INSERT INTO transactions (transaction_number, transaction_date, account_id, contra_account_id, transaction_type, reference_type, reference_id, amount, debit_amount, credit_amount, description, narration, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      transactionNumber, transactionDate, accountId, contraAccountId, transactionType,
      referenceType, referenceId, amount,
      transactionType === 'payment' || transactionType === 'expense' ? amount : 0,
      transactionType === 'receipt' || transactionType === 'journal' ? amount : 0,
      description, narration, req.user.id
    ]);

    res.status(201).json({
      message: 'Transaction created',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// GET /api/accounting/transactions - List transactions
router.get('/transactions', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { accountId, from, to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT t.*,
        a.account_name,
        ca.account_name as contra_account_name,
        u.full_name as created_by_name
      FROM transactions t
      LEFT JOIN chart_of_accounts a ON a.id = t.account_id
      LEFT JOIN chart_of_accounts ca ON ca.id = t.contra_account_id
      LEFT JOIN users u ON u.id = t.created_by
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (accountId) {
      sql += ` AND (t.account_id = $${paramIndex} OR t.contra_account_id = $${paramIndex})`;
      params.push(accountId);
      paramIndex++;
    }
    if (from) {
      sql += ` AND t.transaction_date >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND t.transaction_date <= $${paramIndex++}`;
      params.push(to);
    }

    sql += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/accounting/trial-balance - Trial balance
router.get('/trial-balance', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { asOfDate } = req.query;

    const result = await query(`
      SELECT 
        c.account_code,
        c.account_name,
        c.account_type,
        COALESCE(SUM(t.debit_amount), 0) as total_debit,
        COALESCE(SUM(t.credit_amount), 0) as total_credit,
        COALESCE(SUM(t.debit_amount), 0) - COALESCE(SUM(t.credit_amount), 0) as balance
      FROM chart_of_accounts c
      LEFT JOIN transactions t ON t.account_id = c.id AND t.status = 'posted'
      AND ($1::date IS NULL OR t.transaction_date <= $1)
      WHERE c.is_active = true
      GROUP BY c.id, c.account_code, c.account_name, c.account_type
      ORDER BY c.account_code
    `, [asOfDate || null]);

    const totalDebit = result.rows.reduce((sum, r) => sum + parseFloat(r.total_debit), 0);
    const totalCredit = result.rows.reduce((sum, r) => sum + parseFloat(r.total_credit), 0);

    res.json({
      data: result.rows,
      summary: {
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        difference: (totalDebit - totalCredit).toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate trial balance' });
  }
});

// GET /api/accounting/profit-loss - P&L Statement
router.get('/profit-loss', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const result = await query(`
      SELECT 
        c.account_type,
        c.account_name,
        COALESCE(SUM(t.debit_amount), 0) as debit,
        COALESCE(SUM(t.credit_amount), 0) as credit,
        CASE 
          WHEN c.account_type = 'revenue' THEN COALESCE(SUM(t.credit_amount), 0) - COALESCE(SUM(t.debit_amount), 0)
          WHEN c.account_type = 'expense' THEN COALESCE(SUM(t.debit_amount), 0) - COALESCE(SUM(t.credit_amount), 0)
          ELSE 0
        END as amount
      FROM chart_of_accounts c
      LEFT JOIN transactions t ON t.account_id = c.id AND t.status = 'posted'
      AND ($1::date IS NULL OR t.transaction_date >= $1)
      AND ($2::date IS NULL OR t.transaction_date <= $2)
      WHERE c.account_type IN ('revenue', 'expense') AND c.is_active = true
      GROUP BY c.id, c.account_type, c.account_name
      ORDER BY c.account_type, c.account_name
    `, [from || null, to || null]);

    const revenue = result.rows.filter(r => r.account_type === 'revenue');
    const expenses = result.rows.filter(r => r.account_type === 'expense');

    const totalRevenue = revenue.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalExpenses = expenses.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      revenue,
      expenses,
      summary: {
        totalRevenue: totalRevenue.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netProfit: netProfit.toFixed(2),
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate P&L' });
  }
});

module.exports = router;
