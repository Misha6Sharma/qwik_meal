import { MapPin, Package, Bike, CheckCircle, Receipt, XCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authService } from '../auth';
import { Order, DeliveryStatus } from '../types';
import { dbService } from '../db';

export function Tracking() {
  const user = authService.getUser();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  const loadOrders = async () => {
    const fbOrders = await dbService.getOrders(user?.id);
    setOrders(fbOrders);
  };

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    
    const orderToCancel = orders.find(o => o.id === orderId);
    if (!orderToCancel) return;

    let newRefundStatus = orderToCancel.refundStatus;
    if (orderToCancel.paymentStatus === 'PAID') {
        newRefundStatus = 'INITIATED'; 
        
        const newTxn = {
        id: `TXN-${Date.now()}`,
        transactionId: `REF-${Date.now()}`,
        orderId: orderToCancel.id,
        userId: user?.id || 'unknown',
        amount: orderToCancel.totalAmount, 
        paymentMethod: 'REFUND_SYSTEM',
        paymentStatus: orderToCancel.paymentStatus,
        refundStatus: 'INITIATED',
        timestamp: new Date().toISOString(),
        details: 'Refund initiated via cancellation'
        };
        try {
           await dbService.addTransaction(newTxn);
        } catch(e) {}
    }

    const newLog = {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ORDER_CANCELLED',
        performedBy: user?.id || 'unknown',
        details: 'Order cancelled by user'
    };

    const updates = {
        status: 'CANCELLED' as DeliveryStatus,
        refundStatus: newRefundStatus,
        cancellationDate: new Date().toISOString(),
        auditLogs: [...(orderToCancel.auditLogs || []), newLog]
    };
    
    try {
        await dbService.updateOrder(orderId, updates);
        loadOrders();
    } catch(e) {
        console.error("Failed to cancel order", e);
    }
  };

  const getStepIndex = (status: DeliveryStatus) => {
    switch (status) {
      case 'PROCESSING': return 0;
      case 'PACKED': return 1;
      case 'SHIPPED': return 2;
      case 'OUT_FOR_DELIVERY': return 2;
      case 'DELIVERED': return 3;
      case 'CANCELLED': return -1;
      default: return 0;
    }
  };

  const steps = [
    { id: 0, title: 'Processing', description: 'Your order is confirmed.', icon: Package },
    { id: 1, title: 'Packed', description: 'Freshly prepared and packed.', icon: CheckCircle },
    { id: 2, title: 'On The Way', description: 'Rider is arriving.', icon: Bike },
    { id: 3, title: 'Delivered', description: 'Enjoy your QwikMeal!', icon: MapPin },
  ];

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 w-full text-center">
         <div className="bg-gray-50 rounded-2xl p-12 border border-gray-200 shadow-sm flex flex-col items-center">
            <Receipt size={48} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Order History</h2>
            <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 w-full space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Order History</h1>
      
      <div className="space-y-6">
        {orders.map((order) => {
           const isCancelled = order.status === 'CANCELLED';
           const currentStepIndex = getStepIndex(order.status);
           const canCancel = ['PROCESSING', 'PACKED'].includes(order.status);
           
           return (
           <div key={order.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
              <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50 md:w-[320px] flex flex-col justify-between shrink-0">
                 <div>
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xl font-bold text-gray-900">{order.id}</h2>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mb-4">Ordered: {new Date(order.createdAt).toLocaleString()}</p>
                    
                    {order.deliveryDate && order.deliveryTime && (
                      <div className="bg-red-50 text-red-900 rounded-lg p-3 mb-4 text-xs font-semibold flex flex-col gap-1">
                        <span className="text-red-700">Scheduled Delivery:</span>
                        <span>{order.deliveryDate} at {order.deliveryTime}</span>
                      </div>
                    )}
                    
                    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Payment:</span>
                        <span className={`font-semibold ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-gray-700'}`}>{order.paymentStatus}</span>
                      </div>
                      {order.refundStatus !== 'NONE' && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Refund:</span>
                          <span className="font-semibold text-orange-600">{order.refundStatus}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                       {order.items.map((cartItem: any, idx: number) => (
                         <div key={idx} className="text-sm text-gray-700 flex justify-between gap-2 items-center">
                            <span className="truncate flex items-center gap-1.5">
                                 {cartItem.menuItem.dietaryType && (
                                    <div className={`w-2 h-2 rounded-sm ${cartItem.menuItem.dietaryType === 'VEG' ? 'border border-green-600' : 'border border-red-600'} flex items-center justify-center shrink-0`}>
                                      <div className={`w-1 h-1 rounded-full ${cartItem.menuItem.dietaryType === 'VEG' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                    </div>
                                 )}
                                 {cartItem.quantity}x {cartItem.menuItem.name}
                            </span>
                            <span className="font-semibold text-gray-900 shrink-0">₹{cartItem.quantity * cartItem.menuItem.offerPrice}</span>
                         </div>
                       ))}
                    </div>
                 </div>
                 
                 <div>
                   <div className="pt-4 border-t border-gray-200 flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500 font-medium">Total:</span>
                      <span className="text-xl font-bold text-red-600">₹{order.totalAmount}</span>
                   </div>
                   
                   {canCancel && (
                     <button 
                       onClick={() => cancelOrder(order.id)}
                       className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                     >
                       Cancel Order
                     </button>
                   )}
                 </div>
              </div>

              <div className="p-8 flex-1">
                 <div className="flex justify-between items-start mb-8">
                    <h3 className="font-bold text-gray-900 text-lg">Delivery Status</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${isCancelled ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.status || 'PROCESSING'}
                    </span>
                 </div>
                 
                 {isCancelled ? (
                   <div className="py-8 text-center text-red-600">
                     <XCircle size={48} className="mx-auto mb-4 opacity-50" />
                     <h4 className="font-bold text-lg mb-1">Order Cancelled</h4>
                     <p className="text-sm text-red-500">
                       Cancelled on {order.cancellationDate ? new Date(order.cancellationDate).toLocaleString() : 'N/A'}
                     </p>
                     {order.refundStatus === 'INITIATED' && (
                       <div className="mt-4 inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm border border-orange-100">
                         <AlertCircle size={16} /> Refund process has been initiated successfully.
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="relative">
                      {/* Connecting Line */}
                      <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-100 -z-10" />
                      
                      <div className="space-y-6">
                         {steps.map((step, idx) => {
                            const Icon = step.icon;
                            const isCompleted = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;

                            return (
                               <div key={step.id} className="flex gap-6 relative">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-4 border-white transition-colors duration-300 ${
                                     isCurrent ? 'bg-red-600 text-white shadow-md' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                  }`}>
                                     <Icon size={20} />
                                  </div>
                                  <div className="pt-2">
                                     <h3 className={`font-bold transition-colors duration-300 ${isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                                        {step.title}
                                     </h3>
                                     <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                   </div>
                 )}
              </div>
           </div>
        )})}
      </div>
    </div>
  );
}
