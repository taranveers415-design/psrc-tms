import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Search, Route, ChevronLeft, ChevronRight, Truck, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTrips();
  }, [search, status, page]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/trips', {
        params: { search, status, page, limit: 20 }
      });
      setTrips(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-100 text-gray-700';
      case 'loading': return 'bg-amber-100 text-amber-700';
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'halted': return 'bg-orange-100 text-orange-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          <p className="text-gray-500">Track and manage all trips</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          Create Trip
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trips..."
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
          <option value="scheduled">Scheduled</option>
          <option value="loading">Loading</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : trips.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No trips found
          </div>
        ) : (
          trips.map((trip) => (
            <Link key={trip.id} to={`/trips/${trip.id}`} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{trip.trip_number}</h3>
                  <p className="text-sm text-gray-500">Order: {trip.order_number}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(trip.status)}`}>
                  {trip.status?.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck className="w-4 h-4 text-primary-500" />
                  {trip.vehicle_number} • {trip.driver_name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-green-500" />
                  {trip.origin_name} → {trip.destination_name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {trip.start_date ? format(new Date(trip.start_date), 'dd MMM yyyy') : 'Not started'}
                  {trip.end_date && ` - ${format(new Date(trip.end_date), 'dd MMM yyyy')}`}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">{trip.client_name}</span>
                <span className="text-sm font-medium text-gray-900">{trip.total_distance || 0} km</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
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
  );
};

export default Trips;
