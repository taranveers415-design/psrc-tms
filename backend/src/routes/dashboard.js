const express = require('express');
const { query } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - Main dashboard data
router.get('/', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // KPI Cards
    const kpiResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM vehicles WHERE status = 'active') as active_vehicles,
        (SELECT COUNT(*) FROM drivers WHERE status = 'active') as active_drivers,
        (SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'confirmed', 'loaded', 'in_transit')) as active_orders,
        (SELECT COUNT(*) FROM trips WHERE status IN ('scheduled', 'loading', 'in_transit')) as active_trips,
        (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_invoices,
        (SELECT COALESCE(SUM(balance_due), 0) FROM invoices WHERE status IN ('sent', 'partial', 'overdue')) as total_receivables,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE order_date >= $1) as monthly_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM trip_expenses WHERE status IN ('approved', 'reimbursed') AND created_at >= $1) as monthly_expenses
    `, [firstDayOfMonth]);

    const kpi = kpiResult.rows[0];

    // Today's trips
    const todayTripsResult = await query(`
      SELECT t.*, 
        o.order_number, o.cargo_description,
        c.company_name as client_name,
        v.vehicle_number,
        d.full_name as driver_name
      FROM trips t
      LEFT JOIN orders o ON o.id = t.order_id
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      WHERE t.start_date = $1 OR t.status IN ('loading', 'in_transit')
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [today]);

    // Recent orders
    const recentOrdersResult = await query(`
      SELECT o.*, c.company_name as client_name
      FROM orders o
      LEFT JOIN clients c ON c.id = o.client_id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Document expiry alerts
    const alertsResult = await query(`
      SELECT 'vehicle' as type, vehicle_number as reference, 'RC Expiring' as alert, rc_expiry as expiry_date
      FROM vehicles WHERE rc_expiry <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active'
      UNION ALL
      SELECT 'vehicle' as type, vehicle_number as reference, 'Insurance Expiring' as alert, insurance_expiry as expiry_date
      FROM vehicles WHERE insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active'
      UNION ALL
      SELECT 'vehicle' as type, vehicle_number as reference, 'Fitness Expiring' as alert, fitness_expiry as expiry_date
      FROM vehicles WHERE fitness_expiry <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active'
      UNION ALL
      SELECT 'driver' as type, full_name as reference, 'License Expiring' as alert, license_expiry as expiry_date
      FROM drivers WHERE license_expiry <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active'
      ORDER BY expiry_date
      LIMIT 20
    `);

    // Monthly revenue trend (last 6 months)
    const revenueTrendResult = await query(`
      SELECT 
        DATE_TRUNC('month', order_date) as month,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE order_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', order_date)
      ORDER BY month DESC
    `);

    // Top clients by revenue
    const topClientsResult = await query(`
      SELECT 
        c.company_name,
        COALESCE(SUM(o.total_amount), 0) as revenue,
        COUNT(o.id) as orders
      FROM clients c
      LEFT JOIN orders o ON o.client_id = c.id AND o.order_date >= $1
      WHERE c.is_active = true
      GROUP BY c.id, c.company_name
      ORDER BY revenue DESC
      LIMIT 5
    `, [firstDayOfMonth]);

    res.json({
      kpi: {
        activeVehicles: parseInt(kpi.active_vehicles),
        activeDrivers: parseInt(kpi.active_drivers),
        activeOrders: parseInt(kpi.active_orders),
        activeTrips: parseInt(kpi.active_trips),
        overdueInvoices: parseInt(kpi.overdue_invoices),
        totalReceivables: parseFloat(kpi.total_receivables).toFixed(2),
        monthlyRevenue: parseFloat(kpi.monthly_revenue).toFixed(2),
        monthlyExpenses: parseFloat(kpi.monthly_expenses).toFixed(2),
        monthlyProfit: (parseFloat(kpi.monthly_revenue) - parseFloat(kpi.monthly_expenses)).toFixed(2)
      },
      todayTrips: todayTripsResult.rows,
      recentOrders: recentOrdersResult.rows,
      alerts: alertsResult.rows,
      revenueTrend: revenueTrendResult.rows,
      topClients: topClientsResult.rows
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
