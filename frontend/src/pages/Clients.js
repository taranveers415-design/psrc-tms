import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, ChevronLeft, ChevronRight, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchClients(); }, [search, page]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/clients', { params: { search, page, limit: 20 } });
      setClients(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (error) { toast.error('Failed to fetch clients'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500">Manage client relationships and rate contracts</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">No clients found</div>
        ) : (
          clients.map((client) => (
            <Link key={client.id} to={`/clients/${client.id}`} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.company_name}</h3>
                    <p className="text-sm text-gray-500">{client.gst_number}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" />{client.phone}</div>
                <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" />{client.email || 'N/A'}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Orders</p><p className="font-semibold text-gray-900">{client.total_orders}</p></div>
                <div><p className="text-xs text-gray-500">Outstanding</p><p className="font-semibold text-red-600">₹{Number(client.outstanding_amount).toLocaleString()}</p></div>
              </div>
            </Link>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">Next <ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

export default Clients;
