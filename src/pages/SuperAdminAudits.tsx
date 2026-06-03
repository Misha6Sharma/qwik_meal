import React, { useState, useEffect } from 'react';
import { Activity, Shield, Receipt } from 'lucide-react';
import { LoginActivity, TransactionAudit } from '../types';
import { dbService } from '../db';

export function SuperAdminAudits() {
  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [transactions, setTransactions] = useState<TransactionAudit[]>([]);
  const [activeTab, setActiveTab] = useState<'logins' | 'transactions'>('logins');

  useEffect(() => {
    const fetchAudits = async () => {
      // 1. Fetch Logins
      const fbLogins = await dbService.getLogins();
      setLogins(fbLogins);
      
      // 2. Fetch Transactions
      const fbTxns = await dbService.getTransactions();
      setTransactions(fbTxns);
    };
    fetchAudits();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Audits</h1>
        <p className="text-gray-500 mt-2">Monitor login activities and financial transactions.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('logins')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'logins' ? 'bg-red-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
        >
          <Shield size={18} />
          Login Activity
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'transactions' ? 'bg-red-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
        >
          <Receipt size={18} />
          Transaction Logs
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {activeTab === 'logins' ? (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Login Time</th>
                  <th className="px-6 py-4 font-semibold">Logout Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No login activities found.
                    </td>
                  </tr>
                ) : (
                  logins.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{log.userName}</div>
                        <div className="text-xs text-gray-500">{log.userEmail}</div>
                        <div className="text-xs text-gray-400">ID: {log.userId}</div>
                      </td>
                      <td className="px-6 py-4 font-medium">{log.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(log.loginTime).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{log.logoutTime ? new Date(log.logoutTime).toLocaleString() : <span className="text-green-600 font-medium">Active</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
                <tr>
                  <th className="px-6 py-4 font-semibold">Transaction ID</th>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Time</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Refund Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{txn.transactionId}</td>
                      <td className="px-6 py-4 text-blue-600 underline cursor-pointer">{txn.orderId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(txn.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold">₹{txn.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${txn.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {txn.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">{txn.refundStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
