import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { authService } from '../auth';
import { Order, Campaign } from '../types';
import { Package, Receipt, Calendar, CreditCard } from 'lucide-react';

export function CustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [campaigns, setCampaigns] = useState<Record<string, Campaign>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const user = authService.getUser();
      if (!user) return;
      try {
        const [fetchedOrders, fetchedCampaigns] = await Promise.all([
          dbService.getOrders(user.id),
          dbService.getCampaigns()
        ]);
        
        const cMap: Record<string, Campaign> = {};
        fetchedCampaigns.forEach(c => cMap[c.id] = c);
        
        // Filter only campaign orders
        setOrders(fetchedOrders.filter((o: any) => o.campaignId) as Order[]);
        setCampaigns(cMap);
      } catch (err) {
        console.error("Error fetching campaign orders", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading orders...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Campaign Orders</h1>
        <p className="text-gray-500">View and track all your campaign orders.</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center flex flex-col items-center">
          <Package size={48} className="text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No up-to-date orders found</h3>
          <p className="text-gray-500 max-w-md">You haven't placed any orders through our corporate meal campaigns yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-gray-500">Order ID</div>
                  <div className="font-bold text-gray-900">{order.id}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-500 flex items-center gap-1"><Calendar size={14}/> Date</div>
                  <div className="font-medium text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-500 flex items-center gap-1"><CreditCard size={14}/> Total</div>
                  <div className="font-bold text-gray-900">₹{order.totalAmount.toFixed(2)}</div>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 
                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                {order.campaignId && campaigns[order.campaignId] && (
                  <div className="mb-4 text-sm font-bold text-red-600 bg-red-50 inline-block px-3 py-1 rounded-md">
                    Campaign: {campaigns[order.campaignId].name}
                  </div>
                )}
                
                <h4 className="font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Order Items</h4>
                <div className="space-y-3 mb-6">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <img src={item.menuItem.mealImage || undefined} alt={item.menuItem.name} className="w-12 h-12 rounded object-cover" />
                        <div>
                          <div className="font-bold text-sm text-gray-900">
                            {item.menuItem.name} {item.variantSize ? `(${item.variantSize})` : ''}
                          </div>
                          <div className="text-xs text-gray-500">Quantity: {item.quantity}</div>
                        </div>
                      </div>
                      <div className="font-bold text-gray-900 text-sm">
                        ₹{item.variantSize ? item.menuItem.variants?.find(v => v.size === item.variantSize)?.offerPrice : item.menuItem.offerPrice} x {item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{(order.totalAmount - (order.gstAmount || 0)).toFixed(2)}</span>
                    </div>
                    {order.gstAmount !== undefined && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>GST (5%)</span>
                        <span>₹{order.gstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200 mt-2">
                      <span>Grand Total</span>
                      <span>₹{order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => alert('Invoice Download functionality coming soon.')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition font-medium text-sm">
                    <Receipt size={16} /> Download Invoice
                  </button>
                  {order.campaignId && (
                    <button onClick={() => window.open(`/c/${order.campaignId}`, '_blank')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold text-sm">
                      Reorder from Campaign
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
