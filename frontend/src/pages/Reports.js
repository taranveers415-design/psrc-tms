import React, { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, Truck, Users, Building2, Receipt, Fuel, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Reports = () => {
  const [activeReport, setActiveReport] = useState('trip-profitability');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reports = [
    { id: 'trip-profitability', label: 'Trip Profitability', icon: TrendingUp },
    { id: 'vehicle-utilization', label: 'Vehicle Utilization', icon: Truck },
    { id: 'driver-performance', label: 'Driver Performance', icon: Users },
    { id: 'client-revenue', label: 'Client Revenue', icon: Building2 },
    { id: 'gst-summary', label: 'GST Summary', icon: Receipt },
    { id: 'expense-breakdown', label: 'Expense Breakdown', icon: Fuel },
  ];

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      const res = await axios.get(`/api/reports/${activeReport}?${params.toString()}`);
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const renderReport = () => {
    if (!reportData) return null;

    switch (activeReport) {
      case 'trip-profitability':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Total Trips</p>
                <p className="text-xl font-bold text-gray-900">{reportData.summary?.totalTrips || 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-green-600">₹{Number(reportData.summary?.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-xl font-bold text-red-600">₹{Number(reportData.summary?.totalExpenses || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Net Profit</p>
                <p className="text-xl font-bold text-primary-600">₹{Number(reportData.summary?.totalProfit || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trip #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Expenses</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(reportData.data || []).map((row) => (
                    <tr key={row.trip_number} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.trip_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.client_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.vehicle_number}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(row.revenue).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600">₹{Number(row.expenses).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-green-600">₹{Number(row.profit).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{row.profit_margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'vehicle-utilization':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Utilization</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={reportData.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vehicle_number" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_trips" fill="#0ea5e9" name="Trips" />
                  <Bar dataKey="total_distance" fill="#22c55e" name="Distance (km)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Trips</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Distance</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Utilization %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(reportData.data || []).map((row) => (
                    <tr key={row.vehicle_number} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.vehicle_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">{row.vehicle_type}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{row.total_trips}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{Number(row.total_distance).toLocaleString()} km</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(row.total_revenue).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-primary-600">{row.utilization_percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'driver-performance':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Performance</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={reportData.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="full_name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_trips" fill="#0ea5e9" name="Trips" />
                  <Bar dataKey="total_distance" fill="#22c55e" name="Distance" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Driver</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Trips</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Distance</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Expenses</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(reportData.data || []).map((row) => (
                    <tr key={row.full_name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.full_name}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{row.total_trips}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{Number(row.total_distance).toLocaleString()} km</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(row.total_revenue).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600">₹{Number(row.total_expenses).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-green-600">₹{Number(row.net_contribution).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'client-revenue':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Revenue Distribution</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={reportData.data || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ company_name, percent }) => `${company_name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="revenue"
                    nameKey="company_name"
                  >
                    {(reportData.data || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">GST</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Orders</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Avg Order</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Delivered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(reportData.data || []).map((row) => (
                    <tr key={row.company_name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.company_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.gst_number}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{row.total_orders}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-green-600">₹{Number(row.total_revenue).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(row.avg_order_value).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{row.delivered_orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'gst-summary':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">GST Type</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Invoices</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Taxable Value</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">GST Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(reportData.data || []).map((row) => (
                    <tr key={`${row.gst_type}-${row.gst_rate}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 uppercase">{row.gst_type}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{row.gst_rate}%</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{row.invoice_count}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(row.taxable_value).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-primary-600">₹{Number(row.total_gst).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">₹{Number(row.total_value).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'expense-breakdown':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={reportData.data || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ expense_type, percent }) => `${expense_type} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="total_amount"
                    nameKey="expense_type"
                  >
                    {(reportData.data || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expense Type</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(reportData.data || []).map((row) => (
                    <tr key={row.expense_type} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">{row.expense_type}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{row.transaction_count}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-red-600">₹{Number(row.total_amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(row.avg_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">Analytics and insights for your business</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Report Selection Sidebar */}
        <div className="lg:w-64 space-y-2">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => { setActiveReport(report.id); setReportData(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeReport === report.id
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {report.label}
              </button>
            );
          })}
        </div>

        {/* Report Content */}
        <div className="flex-1 space-y-6">
          {/* Date Filter */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <button
                onClick={fetchReport}
                disabled={loading}
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <BarChart3 className="w-4 h-4" />
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {renderReport()}
        </div>
      </div>
    </div>
  );
};

export default Reports;
