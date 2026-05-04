import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Calculator, BookOpen, TrendingUp, TrendingDown, DollarSign, FileText, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Accounting = () => {
  const [activeTab, setActiveTab] = useState('coa');
  const [coa, setCoa] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [trialBalance, setTrialBalance] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'coa') {
        const res = await axios.get('/api/accounting/chart-of-accounts');
        setCoa(res.data.data);
      } else if (activeTab === 'transactions') {
        const res = await axios.get('/api/accounting/transactions');
        setTransactions(res.data.data);
      } else if (activeTab === 'trial') {
        const res = await axios.get('/api/accounting/trial-balance');
        setTrialBalance(res.data);
      } else if (activeTab === 'pnl') {
        const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const to = new Date().toISOString().split('T')[0];
        const res = await axios.get(`/api/accounting/profit-loss?from=${from}&to=${to}`);
        setPnl(res.data);
      }
    } catch (error) { toast.error('Failed to fetch data'); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'coa', label: 'Chart of Accounts', icon: BookOpen },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'trial', label: 'Trial Balance', icon: Calculator },
    { id: 'pnl', label: 'P&L Statement', icon: TrendingUp },
  ];

  const getAccountTypeColor = (type) => {
    switch (type) {
      case 'asset': return 'text-blue-600 bg-blue-50';
      case 'liability': return 'text-red-600 bg-red-50';
      case 'equity': return 'text-purple-600 bg-purple-50';
      case 'revenue': return 'text-green-600 bg-green-50';
      case 'expense': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-gray-500">Manage books, ledger, and financial reports</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Chart of Accounts */}
          {activeTab === 'coa' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Account Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Bank Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coa.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{account.account_code}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{account.account_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getAccountTypeColor(account.account_type)}`}>
                            {account.account_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">₹{Number(account.current_balance).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {account.is_bank_account ? `${account.bank_name} - ${account.bank_account_number}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transactions */}
          {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Debit</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Credit</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(txn.transaction_date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{txn.account_name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-700">{txn.transaction_type}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">{txn.debit_amount > 0 ? `₹${Number(txn.debit_amount).toLocaleString()}` : '-'}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">{txn.credit_amount > 0 ? `₹${Number(txn.credit_amount).toLocaleString()}` : '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{txn.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trial Balance */}
          {activeTab === 'trial' && trialBalance.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Total Debit</p>
                  <p className="text-xl font-bold text-gray-900">₹{Number(trialBalance.summary.totalDebit).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Total Credit</p>
                  <p className="text-xl font-bold text-gray-900">₹{Number(trialBalance.summary.totalCredit).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Difference</p>
                  <p className={`text-xl font-bold ${parseFloat(trialBalance.summary.difference) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Number(trialBalance.summary.difference).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Debit</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Credit</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trialBalance.data.map((row) => (
                      <tr key={row.account_code} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.account_code}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.account_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{row.account_type}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(row.total_debit).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(row.total_credit).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">₹{Number(row.balance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* P&L Statement */}
          {activeTab === 'pnl' && pnl && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">₹{Number(pnl.summary.totalRevenue).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">₹{Number(pnl.summary.totalExpenses).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Net Profit</p>
                  <p className={`text-xl font-bold ${parseFloat(pnl.summary.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Number(pnl.summary.netProfit).toLocaleString()} ({pnl.summary.profitMargin})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-green-50">
                    <h3 className="font-semibold text-green-800">Revenue</h3>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      {pnl.revenue.map((item) => (
                        <tr key={item.account_name} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-900">{item.account_name}</td>
                          <td className="px-6 py-3 text-sm text-right font-medium text-green-600">₹{Number(item.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-red-50">
                    <h3 className="font-semibold text-red-800">Expenses</h3>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      {pnl.expenses.map((item) => (
                        <tr key={item.account_name} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-900">{item.account_name}</td>
                          <td className="px-6 py-3 text-sm text-right font-medium text-red-600">₹{Number(item.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Accounting;
