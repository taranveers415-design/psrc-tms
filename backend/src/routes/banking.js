const express = require('express');
const { query, transaction } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/banking/accounts - List bank accounts
router.get('/accounts', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM bank_accounts WHERE is_active = true ORDER BY is_primary DESC, created_at DESC');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// POST /api/banking/accounts - Add bank account
router.post('/accounts', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { accountName, bankName, accountNumber, ifscCode, branchName, accountType, openingBalance, isPrimary } = req.body;

    const result = await query(`
      INSERT INTO bank_accounts (account_name, bank_name, account_number, ifsc_code, branch_name, account_type, opening_balance, current_balance, is_primary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
      RETURNING *
    `, [accountName, bankName, accountNumber, ifscCode, branchName, accountType, openingBalance, isPrimary || false]);

    res.status(201).json({
      message: 'Bank account added',
      account: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add bank account' });
  }
});

// GET /api/banking/transactions - List bank transactions
router.get('/transactions', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { accountId, status, from, to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT bt.*, ba.account_name, ba.bank_name
      FROM bank_transactions bt
      LEFT JOIN bank_accounts ba ON ba.id = bt.bank_account_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (accountId) {
      sql += ` AND bt.bank_account_id = $${paramIndex++}`;
      params.push(accountId);
    }
    if (status) {
      sql += ` AND bt.status = $${paramIndex++}`;
      params.push(status);
    }
    if (from) {
      sql += ` AND bt.transaction_date >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND bt.transaction_date <= $${paramIndex++}`;
      params.push(to);
    }

    sql += ` ORDER BY bt.transaction_date DESC, bt.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bank transactions' });
  }
});

// POST /api/banking/transactions - Add bank transaction (manual entry)
router.post('/transactions', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { bankAccountId, transactionDate, transactionType, amount, description, referenceNumber, partyName, partyAccount, partyIfsc } = req.body;

    const result = await transaction(async (client) => {
      // Insert bank transaction
      const txnResult = await client.query(`
        INSERT INTO bank_transactions (bank_account_id, transaction_date, transaction_type, amount, description, reference_number, party_name, party_account, party_ifsc, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manual')
        RETURNING *
      `, [bankAccountId, transactionDate, transactionType, amount, description, referenceNumber, partyName, partyAccount, partyIfsc]);

      // Update bank balance
      const balanceChange = transactionType === 'credit' ? amount : -amount;
      await client.query(
        'UPDATE bank_accounts SET current_balance = current_balance + $1 WHERE id = $2',
        [balanceChange, bankAccountId]
      );

      return txnResult.rows[0];
    });

    res.status(201).json({
      message: 'Bank transaction added',
      transaction: result
    });
  } catch (error) {
    console.error('Add bank transaction error:', error);
    res.status(500).json({ error: 'Failed to add bank transaction' });
  }
});

// POST /api/banking/reconcile - Reconcile bank transaction with ledger
router.post('/reconcile', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { bankTransactionId, ledgerTransactionId } = req.body;

    const result = await query(`
      UPDATE bank_transactions 
      SET status = 'reconciled', reconciled_with = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [ledgerTransactionId, bankTransactionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bank transaction not found' });
    }

    res.json({
      message: 'Transaction reconciled',
      transaction: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reconcile' });
  }
});

// POST /api/banking/vouchers - Create payment/receipt voucher
router.post('/vouchers', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { voucherType, voucherDate, bankAccountId, partyType, partyId, partyName, amount, paymentMode, narration } = req.body;

    const voucherNumber = 'PV-' + Date.now();

    const result = await transaction(async (client) => {
      // Create voucher
      const voucherResult = await client.query(`
        INSERT INTO payment_vouchers (voucher_number, voucher_date, voucher_type, bank_account_id, party_type, party_id, party_name, amount, payment_mode, narration, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'posted', $11)
        RETURNING *
      `, [voucherNumber, voucherDate, voucherType, bankAccountId, partyType, partyId, partyName, amount, paymentMode, narration, req.user.id]);

      // Update bank balance
      const balanceChange = voucherType === 'receipt' ? amount : -amount;
      await client.query(
        'UPDATE bank_accounts SET current_balance = current_balance + $1 WHERE id = $2',
        [balanceChange, bankAccountId]
      );

      // Add bank transaction record
      await client.query(`
        INSERT INTO bank_transactions (bank_account_id, transaction_date, transaction_type, amount, description, reference_number, party_name, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual')
      `, [bankAccountId, voucherDate, voucherType === 'receipt' ? 'credit' : 'debit', amount, narration, voucherNumber, partyName]);

      return voucherResult.rows[0];
    });

    res.status(201).json({
      message: 'Voucher created successfully',
      voucher: result
    });
  } catch (error) {
    console.error('Create voucher error:', error);
    res.status(500).json({ error: 'Failed to create voucher' });
  }
});

// GET /api/banking/vouchers - List vouchers
router.get('/vouchers', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { type, from, to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT pv.*, ba.account_name as bank_account_name, ba.bank_name
      FROM payment_vouchers pv
      LEFT JOIN bank_accounts ba ON ba.id = pv.bank_account_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (type) {
      sql += ` AND pv.voucher_type = $${paramIndex++}`;
      params.push(type);
    }
    if (from) {
      sql += ` AND pv.voucher_date >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND pv.voucher_date <= $${paramIndex++}`;
      params.push(to);
    }

    sql += ` ORDER BY pv.voucher_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json({ data: result.rows, pagination: { page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

// POST /api/banking/api-sync/:bankId - Sync with bank API (placeholder for real integration)
router.post('/api-sync/:bankId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { bankId } = req.params;
    const { fromDate, toDate } = req.body;

    // This is a placeholder. Real implementation would:
    // 1. Call ICICI/HDFC/Razorpay API
    // 2. Parse response
    // 3. Insert transactions
    // 4. Handle duplicates

    const bankResult = await query('SELECT * FROM bank_accounts WHERE id = $1', [bankId]);
    if (bankResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const bank = bankResult.rows[0];

    res.json({
      message: 'Bank API sync initiated',
      bank: bank.bank_name,
      note: 'Real bank API integration requires:\\n1. API credentials from bank\\n2. OAuth/token management\\n3. Webhook setup for real-time updates\\n4. Transaction deduplication logic',
      syncPeriod: { fromDate, toDate }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync with bank API' });
  }
});

module.exports = router;
