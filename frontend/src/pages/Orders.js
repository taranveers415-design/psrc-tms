import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Search, ClipboardList, ChevronLeft, ChevronRight, Package, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [search, status, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/orders', {
        params: { search, status, page, limit: 20 }
      });
      setOrders(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'loaded': return 'bg-amber-100 text-amber-700';
      case 'in_transit': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500">Manage shipments and track deliveries</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="loaded">Loaded</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  No orders found
                </td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link to={`/orders/${order.id}`} className="font-medium text-primary-600 hover:underline">
                        {order.order_number}
                      </Link>
                      <p className="text-xs text-gray-500">{format(new Date(order.order_date), 'dd MMM yyyy')}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.client_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.origin_name} → {order.destination_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.cargo_description}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{Number(order.total_amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.trip_number ? (
                        <Link to={`/trips/${order.trip_id}`} className="text-primary-600 hover:underline">
                          {order.trip_number}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
