const express = require('express');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/trip-profitability - Trip-wise profit report
router.get('/trip-profitability', authenticate, authorize('admin', 'manager', 'accountant'), async (req, res) => {
  try {
    const { from, to, vehicleId, driverId } = req.query;

    const result = await query(`
      SELECT 
        t.trip_number,
        t.start_date,
        t.end_date,
        t.total_distance,
        t.status,
        o.order_number,
        o.cargo_description,
        c.company_name as client_name,
        v.vehicle_number,
        d.full_name as driver_name,
        o.total_amount as revenue,
        COALESCE(te.total_expenses, 0) as expenses,
        o.total_amount - COALESCE(te.total_expenses, 0) as profit,
        CASE WHEN o.total_amount > 0 
          THEN ROUND((o.total_amount - COALESCE(te.total_expenses, 0)) / o.total_amount * 100, 2)
          ELSE 0 
        END as profit_margin
      FROM trips t
      LEFT JOIN orders o ON o.id = t.order_id
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      LEFT JOIN (
        SELECT trip_id, SUM(amount) as total_expenses 
        FROM trip_expenses 
        WHERE status IN ('approved', 'reimbursed')
        GROUP BY trip_id
      ) te ON te.trip_id = t.id
      WHERE t.status IN ('completed', 'delivered')
      AND ($1::date IS NULL OR t.start_date >= $1)
      AND ($2::date IS NULL OR t.end_date <= $2)
      AND ($3::uuid IS NULL OR t.vehicle_id = $3)
      AND ($4::uuid IS NULL OR t.driver_id = $4)
      ORDER BY t.start_date DESC
    `, [from || null, to || null, vehicleId || null, driverId || null]);

    const totalRevenue = result.rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
    const totalExpenses = result.rows.reduce((sum, r) => sum + parseFloat(r.expenses || 0), 0);
    const totalProfit = totalRevenue - totalExpenses;

    res.json({
      data: result.rows,
      summary: {
        totalTrips: result.rows.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        avgProfitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    console.error('Trip profitability error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/vehicle-utilization - Vehicle utilization report
router.get('/vehicle-utilization', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const result = await query(`
      SELECT 
        v.vehicle_number,
        v.vehicle_type,
        v.capacity_tons,
        COUNT(t.id) as total_trips,
        COALESCE(SUM(t.total_distance), 0) as total_distance,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.cargo_weight), 0) as avg_load_weight,
        CASE WHEN v.capacity_tons > 0 AND COUNT(t.id) > 0
          THEN ROUND(AVG(o.cargo_weight / v.capacity_tons * 100), 2)
          ELSE 0
        END as utilization_percent
      FROM vehicles v
      LEFT JOIN trips t ON t.vehicle_id = v.id AND t.status IN ('completed', 'delivered')
        AND ($1::date IS NULL OR t.start_date >= $1)
        AND ($2::date IS NULL OR t.end_date <= $2)
      LEFT JOIN orders o ON o.id = t.order_id
      WHERE v.status = 'active'
      GROUP BY v.id, v.vehicle_number, v.vehicle_type, v.capacity_tons
      ORDER BY total_trips DESC
    `, [from || null, to || null]);

    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/driver-performance - Driver performance report
router.get('/driver-performance', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const result = await query(`
      SELECT 
        d.full_name,
        d.phone,
        d.license_number,
        COUNT(t.id) as total_trips,
        COALESCE(SUM(t.total_distance), 0) as total_distance,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.end_date - t.start_date))/3600), 0) as avg_trip_hours,
        COALESCE(SUM(te.total_expenses), 0) as total_expenses,
        COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(te.total_expenses), 0) as net_contribution,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_trips,
        COUNT(t.id) FILTER (WHERE t.status = 'cancelled') as cancelled_trips
      FROM drivers d
      LEFT JOIN trips t ON t.driver_id = d.id
        AND ($1::date IS NULL OR t.start_date >= $1)
        AND ($2::date IS NULL OR t.end_date <= $2)
      LEFT JOIN orders o ON o.id = t.order_id
      LEFT JOIN (
        SELECT trip_id, SUM(amount) as total_expenses 
        FROM trip_expenses 
        WHERE status IN ('approved', 'reimbursed')
        GROUP BY trip_id
      ) te ON te.trip_id = t.id
      WHERE d.status = 'active'
      GROUP BY d.id, d.full_name, d.phone, d.license_number
      ORDER BY total_trips DESC
    `, [from || null, to || null]);

    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/client-revenue - Client-wise revenue report
router.get('/client-revenue', authenticate, authorize('admin', 'manager', 'accountant'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const result = await query(`
      SELECT 
        c.company_name,
        c.gst_number,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(SUM(o.freight_amount), 0) as freight_revenue,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') as delivered_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'cancelled') as cancelled_orders
      FROM clients c
      LEFT JOIN orders o ON o.client_id = c.id
        AND ($1::date IS NULL OR o.order_date >= $1)
        AND ($2::date IS NULL OR o.order_date <= $2)
      WHERE c.is_active = true
      GROUP BY c.id, c.company_name, c.gst_number
      ORDER BY total_revenue DESC
    `, [from || null, to || null]);

    const totalRevenue = result.rows.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0);

    res.json({
      data: result.rows,
      summary: { totalRevenue: totalRevenue.toFixed(2), totalClients: result.rows.length }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/gst-summary - GST summary for filing
router.get('/gst-summary', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const result = await query(`
      SELECT 
        i.gst_type,
        i.gst_rate,
        COUNT(*) as invoice_count,
        COALESCE(SUM(i.subtotal), 0) as taxable_value,
        COALESCE(SUM(i.gst_amount), 0) as total_gst,
        COALESCE(SUM(i.total_amount), 0) as total_value
      FROM invoices i
      WHERE i.status IN ('sent', 'paid', 'partial')
      AND ($1::date IS NULL OR i.invoice_date >= $1)
      AND ($2::date IS NULL OR i.invoice_date <= $2)
      GROUP BY i.gst_type, i.gst_rate
      ORDER BY i.gst_type
    `, [from || null, to || null]);

    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate GST report' });
  }
});

// GET /api/reports/expense-breakdown - Expense breakdown
router.get('/expense-breakdown', authenticate, authorize('admin', 'manager', 'accountant'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const result = await query(`
      SELECT 
        te.expense_type,
        COUNT(*) as transaction_count,
        COALESCE(SUM(te.amount), 0) as total_amount,
        COALESCE(AVG(te.amount), 0) as avg_amount
      FROM trip_expenses te
      WHERE te.status IN ('approved', 'reimbursed')
      AND ($1::date IS NULL OR te.created_at >= $1)
      AND ($2::date IS NULL OR te.created_at <= $2)
      GROUP BY te.expense_type
      ORDER BY total_amount DESC
    `, [from || null, to || null]);

    const totalExpenses = result.rows.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

    res.json({
      data: result.rows,
      summary: { totalExpenses: totalExpenses.toFixed(2) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate expense report' });
  }
});

module.exports = router;
