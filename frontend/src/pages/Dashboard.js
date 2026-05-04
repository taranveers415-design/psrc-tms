import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Truck, Users, ClipboardList, Route, AlertTriangle, TrendingUp,
  TrendingDown, DollarSign, Package, ArrowRight, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const KPICard = ({ title, value, icon: Icon, trend, trendValue, color }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      setData(res.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const kpi = data?.kpi || {};
  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Vehicles" value={kpi.activeVehicles || 0} icon={Truck} color="bg-blue-500" />
        <KPICard title="Active Drivers" value={kpi.activeDrivers || 0} icon={Users} color="bg-green-500" />
        <KPICard title="Active Orders" value={kpi.activeOrders || 0} icon={ClipboardList} color="bg-amber-500" />
        <KPICard title="Active Trips" value={kpi.activeTrips || 0} icon={Route} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Monthly Revenue" 
          value={`₹${(kpi.monthlyRevenue || 0).toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-emerald-500"
          trend="up"
          trendValue="vs last month"
        />
        <KPICard 
          title="Monthly Expenses" 
          value={`₹${(kpi.monthlyExpenses || 0).toLocaleString()}`} 
          icon={TrendingDown} 
          color="bg-red-500"
          trend="down"
          trendValue="vs last month"
        />
        <KPICard 
          title="Net Profit" 
          value={`₹${(kpi.monthlyProfit || 0).toLocaleString()}`} 
          icon={TrendingUp} 
          color="bg-primary-500"
        />
        <KPICard 
          title="Receivables" 
          value={`₹${(kpi.totalReceivables || 0).toLocaleString()}`} 
          icon={AlertTriangle} 
          color="bg-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.revenueTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tickFormatter={(val) => format(new Date(val), 'MMM yyyy')}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => `₹${Number(value).toLocaleString()}`}
                labelFormatter={(label) => format(new Date(label), 'MMMM yyyy')}
              />
              <Bar dataKey="revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients This Month</h3>
          <div className="space-y-4">
            {(data?.topClients || []).map((client, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                    {client.company_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.company_name}</p>
                    <p className="text-sm text-gray-500">{client.orders} orders</p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900">₹{Number(client.revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts & Today's Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Alerts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">Document Expiry Alerts</h3>
          </div>
          {(data?.alerts || []).length === 0 ? (
            <p className="text-gray-500 text-sm">No alerts at the moment</p>
          ) : (
            <div className="space-y-3">
              {(data?.alerts || []).slice(0, 5).map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div>
                    <p className="font-medium text-amber-900">{alert.alert}</p>
                    <p className="text-sm text-amber-700">{alert.reference}</p>
                  </div>
                  <span className="text-sm font-medium text-amber-800">
                    Exp: {format(new Date(alert.expiry_date), 'dd MMM yyyy')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Trips */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Trips</h3>
            <Link to="/trips" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.todayTrips || []).map((trip, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{trip.trip_number}</p>
                    <p className="text-sm text-gray-500">{trip.vehicle_number} • {trip.driver_name}</p>
                  </div>
                </div>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${trip.status === 'in_transit' ? 'bg-blue-100 text-blue-700' : ''}
                  ${trip.status === 'loading' ? 'bg-amber-100 text-amber-700' : ''}
                  ${trip.status === 'scheduled' ? 'bg-gray-100 text-gray-700' : ''}
                  ${trip.status === 'delivered' ? 'bg-green-100 text-green-700' : ''}
                `}>
                  {trip.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
            {(data?.todayTrips || []).length === 0 && (
              <p className="text-gray-500 text-sm">No trips scheduled for today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
