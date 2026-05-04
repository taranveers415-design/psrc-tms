import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Search, FileText, ChevronLeft, ChevronRight, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchInvoices(); }, [search, status, page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/invoices', { params: { search, status, page, limit: 20 } });
      setInvoices(res.data.data);
      setSummary(res.data.summary);
      setTotalPages(res.data.pagination.pages);
    } catch (error) { toast.error('Failed to fetch invoices'); }
    finally { setLoading(false); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'sent': return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500">Manage billing and GST compliance</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Invoiced</p>
          <p className="text-xl font-bold text-gray-900">₹{Number(summary?.totalInvoiced || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-xl font-bold text-green-600">₹{Number(summary?.totalPaid || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-xl font-bold text-red-600">₹{Number(summary?.totalOutstanding || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-xl font-bold text-amber-600">{summary?.overdueCount || 0}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No invoices found</td></tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link to={`/invoices/${invoice.id}`} className="font-medium text-primary-600 hover:underline">{invoice.invoice_number}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{invoice.client_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{Number(invoice.total_amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-red-600">₹{Number(invoice.balance_due).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)} {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> Previous</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">Next <ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
