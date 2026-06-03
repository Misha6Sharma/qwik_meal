import React, { useState, useEffect } from 'react';
import { Package, Clock, Download } from 'lucide-react';
import { authService } from '../auth';
import { dbService } from '../db';
import { Order, DeliveryStatus, PaymentStatus, RefundStatus } from '../types';
import { ExportOrdersModal } from '../components/ExportOrdersModal';

export function AdminOrders() {
  const user = authService.getUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const fbOrders = await dbService.getOrders();
    const allOrders = [...fbOrders];
    
    // Sort
    allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (user?.role === 'BRAND_ADMIN' && user?.brandId) {
      const brandOrders = allOrders.filter((o: Order) => 
        o.items && o.items.some(item => item.menuItem && item.menuItem.brandId === user.brandId)
      );
      setOrders(brandOrders as Order[]);
    } else {
      setOrders(allOrders as Order[]);
    }
  };

  const updateOrderSettings = async (orderId: string, field: keyof Order, value: string) => {
    try {
        const fbOrders = await dbService.getOrders();
        const fbOrder = fbOrders.find((o: any) => o.id === orderId);
        if (fbOrder) {
            const newLog = {
                id: `LOG-${Date.now()}`,
                timestamp: new Date().toISOString(),
                action: `UPDATED_${field.toUpperCase()}`,
                performedBy: user?.name || user?.email || 'admin',
                details: `Changed ${field} to ${value}`
            };
            await dbService.updateOrder(orderId, {
                [field]: value,
                auditLogs: [...(fbOrder.auditLogs || []), newLog]
            });
            
            if (field === 'paymentStatus' || field === 'refundStatus') {
                const newTxn = {
                    id: `TXN-${Date.now()}`,
                    transactionId: `ADM-${Date.now()}`,
                    orderId: fbOrder.id,
                    userId: fbOrder.userId,
                    amount: fbOrder.totalAmount,
                    paymentMethod: 'ADMIN_UPDATE',
                    paymentStatus: field === 'paymentStatus' ? value as any : fbOrder.paymentStatus,
                    refundStatus: field === 'refundStatus' ? value as any : fbOrder.refundStatus,
                    timestamp: new Date().toISOString(),
                    details: `Admin changed ${field} to ${value}`
                };
                await dbService.addTransaction(newTxn);
            }
        }
    } catch(e) {
        console.error("Failed to update order", e);
    }

    loadOrders();
  };

  const deliveryStatuses: DeliveryStatus[] = ['CONFIRMED', 'PROCESSING', 'FINISHED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  const paymentStatuses: PaymentStatus[] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
  const refundStatuses: RefundStatus[] = ['NONE', 'INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Order Management</h1>
          <p className="text-gray-500 mt-2">View and manage customer orders.</p>
        </div>
        <button 
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-sm whitespace-nowrap"
        >
          <Download size={18} /> Download Campaign Orders (CSV)
        </button>
      </div>

      <ExportOrdersModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
              <tr>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Items</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                {user?.role === 'SUPER_ADMIN' && (
                  <>
                    <th className="px-6 py-4 font-semibold">Payment</th>
                    <th className="px-6 py-4 font-semibold">Refund</th>
                    <th className="px-6 py-4 font-semibold">Total (₹)</th>
                  </>
                )}
                <th className="px-6 py-4 font-semibold">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'SUPER_ADMIN' ? 7 : 4} className="px-6 py-12 text-center text-gray-500">
                    <Package size={32} className="mx-auto mb-3 opacity-30" />
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.id}</td>
                    <td className="px-6 py-4">
                      <div>{new Date(order.createdAt).toLocaleString()}</div>
                      {order.deliveryDate && order.deliveryTime && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Scheduled: {order.deliveryDate} at {order.deliveryTime}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm max-w-xs">
                        {order.items.map((item, i) => (
                           user?.role === 'BRAND_ADMIN' && user.brandId !== item.menuItem.brandId ? null : (
                              <div key={i} className="mb-1">
                                <span className="font-semibold">{item.quantity}x</span> {item.menuItem.title}
                              </div>
                           )
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.status} 
                        onChange={(e) => updateOrderSettings(order.id, 'status', e.target.value)}
                        className="bg-white border border-gray-200 text-sm rounded-md px-2 py-1 focus:ring-1 focus:ring-red-500"
                      >
                        {deliveryStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    {user?.role === 'SUPER_ADMIN' && (
                      <>
                        <td className="px-6 py-4">
                          <select 
                            value={order.paymentStatus} 
                            onChange={(e) => updateOrderSettings(order.id, 'paymentStatus', e.target.value)}
                            className="bg-white border border-gray-200 text-sm rounded-md px-2 py-1 focus:ring-1 focus:ring-red-500"
                          >
                            {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={order.refundStatus} 
                            onChange={(e) => updateOrderSettings(order.id, 'refundStatus', e.target.value)}
                            className="bg-white border border-gray-200 text-sm rounded-md px-2 py-1 focus:ring-1 focus:ring-red-500"
                          >
                            {refundStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">{order.totalAmount}</td>
                      </>
                    )}
                    <td className="px-6 py-4 group relative cursor-pointer">
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <Clock size={16} /> History
                      </span>
                      {order.auditLogs && order.auditLogs.length > 0 && (
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-80 bg-gray-900 text-white text-xs rounded-xl shadow-xl z-10 p-4 max-h-64 overflow-y-auto">
                          <h4 className="font-bold text-sm mb-3 text-gray-100 border-b border-gray-700 pb-2">Audit Logs</h4>
                          <div className="space-y-3">
                            {order.auditLogs.map((log, i) => (
                              <div key={i} className="flex gap-2">
                                <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div></div>
                                <div>
                                  <div className="font-semibold">{log.action}</div>
                                  <div className="text-gray-400">{new Date(log.timestamp).toLocaleString()} by {log.performedBy}</div>
                                  {log.details && <div className="text-gray-300 mt-0.5">{log.details}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
