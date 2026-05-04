import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Landmark, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle, Clock, AlertCircle, CreditCard, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Banking = () => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'accounts') {
        const res = await axios.get('/api/banking/accounts');
        setAccounts(res.data.data);
      } else if (activeTab === 'transactions') {
        const res = await axios.get('/api/banking/transactions');
        setTransactions(res.data.data);
      } else if (activeTab === 'vouchers') {
        const res = await axios.get('/api/banking/vouchers');
        setVouchers(res.data.data);
      }
    } catch (error) { toast.error('Failed to fetch data'); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'accounts', label: 'Bank Accounts', icon: CreditCard },
    { id: 'transactions', label: 'Transactions', icon: ArrowDownLeft },
    { id: 'vouchers', label: 'Vouchers', icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Banking</h1>
        <p className="text-gray-500">Manage bank accounts, transactions, and payment vouchers</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
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
          {/* Bank Accounts */}
          {activeTab === 'accounts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <div key={account.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Landmark className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{account.account_name}</h3>
                        <p className="text-sm text-gray-500">{account.bank_name}</p>
                      </div>
                    </div>
                    {account.is_primary && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">Primary</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account Number</span>
                      <span className="font-medium text-gray-900">{account.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">IFSC</span>
                      <span className="font-medium text-gray-900">{account.ifsc_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium text-gray-900 capitalize">{account.account_type}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Current Balance</span>
                      <span className="text-xl font-bold text-gray-900">₹{Number(account.current_balance).toLocaleString()}</span>
                    </div>
                  </div>
                  {account.bank_api_enabled && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      API Connected ({account.bank_api_provider})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bank Transactions */}
          {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(txn.transaction_date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{txn.account_name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            txn.transaction_type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {txn.transaction_type === 'credit' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {txn.transaction_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">₹{Number(txn.amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{txn.description}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            txn.status === 'reconciled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {txn.status === 'reconciled' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vouchers */}
          {activeTab === 'vouchers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Voucher #</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Party</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mode</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vouchers.map((voucher) => (
                      <tr key={voucher.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{voucher.voucher_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(voucher.voucher_date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            voucher.voucher_type === 'receipt' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {voucher.voucher_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{voucher.party_name}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">₹{Number(voucher.amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 uppercase">{voucher.payment_mode}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {voucher.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Banking;
