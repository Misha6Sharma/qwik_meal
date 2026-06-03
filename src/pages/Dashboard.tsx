import React, { useState, useEffect } from 'react';
import { mockMealPlans } from '../data.mock';
import { getBrands } from '../brands';
import { Brand } from '../types';
import { authService } from '../auth';
import { Tag, MapPin, ReceiptText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const user = authService.getUser();
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardInfo = async () => {
      const allBrands = await getBrands();
      setBrands(allBrands.filter(b => b.isActive !== false));
      
      const orders = await import('../db').then(m => m.dbService.getOrders(user?.id));
      const currActiveOrders = orders.filter((o: any) => !['CANCELLED', 'DELIVERED'].includes(o.status));
      
      const subs = JSON.parse(localStorage.getItem('qwikmeal_subscriptions') || '[]');
      const uSubs = subs.filter((s: any) => s.userId === user?.id);
      const currActiveSubs = uSubs.filter((s: any) => s.status === 'ACTIVE');
      
      setHasHistory(orders.length > 0 || uSubs.length > 0);
      setActiveOrders(currActiveOrders);
      setActiveSubscriptions(currActiveSubs);
    };

    loadDashboardInfo();
  }, [user?.id]);

  const welcomeMessage = user?.name 
    ? (hasHistory ? `Welcome back, ${user.name}!` : `Welcome, ${user.name}!`) 
    : 'Welcome to QwikMeal!';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-12">
      {/* Welcome Banner */}
      <div className="bg-gray-900 rounded-2xl p-8 text-white relative overflow-hidden flex flex-col justify-between gap-6">
         <div className="absolute right-0 top-0 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2" />
         <div className="relative z-10 box-border w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words mb-4">
                {welcomeMessage}
              </h1>
              {activeSubscriptions.length === 0 && activeOrders.length === 0 && (
                 <p className="text-gray-400 text-lg">Ready to order your first meal!</p>
              )}
            </div>
            
            {(user?.role === 'BRAND_ADMIN' || user?.role === 'SUPER_ADMIN') && (
               <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-sm whitespace-nowrap z-20">
                  <ReceiptText size={18} /> Manage & Export Orders
               </button>
            )}
         </div>
         <div className="relative z-10 box-border w-full">
            {(activeSubscriptions.length > 0 || activeOrders.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSubscriptions.length > 0 && (
                   <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                      <h3 className="font-semibold text-white mb-1">Active Subscription Information</h3>
                      <p className="text-gray-400 text-sm mb-3">Status: Active <br/>Plan: Daily Office Lunch <br/>Next Delivery: Tomorrow at 1:00 PM</p>
                      <button onClick={() => navigate('/dashboard/subscriptions')} className="text-yellow-400 text-sm font-medium hover:text-yellow-300">
                         View Details &rarr;
                      </button>
                   </div>
                )}
                {activeOrders.length > 0 && (
                   <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                      <h3 className="font-semibold text-white mb-1">Active Order Information</h3>
                      <p className="text-gray-400 text-sm mb-3">Status: {activeOrders[0].status} <br/>Tracking: Updates available</p>
                      <button onClick={() => navigate('/dashboard/tracking')} className="bg-yellow-400 text-gray-900 px-4 py-2 mt-1 rounded-lg text-sm font-semibold hover:bg-yellow-500 transition-colors">
                         Track Active Order
                      </button>
                   </div>
                )}
              </div>
            )}
         </div>
      </div>

      {/* Corporate Brand Offers */}
      <section>
         <div className="flex justify-between items-end mb-6">
            <div>
               <h2 className="text-2xl font-bold text-gray-900">Corporate Deals</h2>
               <p className="text-gray-500 text-sm">Exclusive offers for whitelisted employees</p>
            </div>
            <button onClick={() => navigate('/dashboard/menu')} className="hidden sm:flex items-center gap-1 text-red-600 font-semibold hover:text-red-700 transition-colors">
               Order Menu <ArrowRight size={16} />
            </button>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {brands.map(brand => (
               <div key={brand.id} onClick={() => navigate('/dashboard/menu')} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col cursor-pointer">
                 <div className="h-32 overflow-hidden bg-gray-50 flex items-center justify-center p-6">
                    <img 
                      src={brand.logo} 
                      alt={brand.name} 
                      referrerPolicy="no-referrer" 
                      className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-300" 
                    />
                 </div>
                 <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{brand.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{brand.description}</p>
                    <div className="mt-auto bg-red-50 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 self-start">
                       <Tag size={12} /> {brand.offer}
                    </div>
                 </div>
               </div>
            ))}
         </div>
      </section>

      {/* Subscription Plans */}
      <section>
         <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
            <p className="text-gray-500 text-sm">Recurring billing, delivered daily to your desk</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockMealPlans.map(plan => (
               <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-red-600 transition-colors group">
                  <div className="relative h-48">
                    <img src={plan.imageUrl} alt={plan.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {plan.tags.map(tag => (
                        <span key={tag} className="bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold px-2 py-1 rounded">
                           {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-5">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-xl text-gray-900">{plan.title}</h3>
                     </div>
                     <p className="text-gray-500 text-sm mb-6 leading-relaxed line-clamp-2">
                        {plan.description}
                     </p>
                     
                     <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                           <span className="text-2xl font-bold text-gray-900">₹{plan.pricePerMeal}</span>
                           <span className="text-gray-500 text-xs font-medium ml-1">/ meal</span>
                        </div>
                        <button onClick={() => navigate('/dashboard/tracking')} className="bg-gray-900 text-white p-2 rounded-full hover:bg-red-600 transition-colors">
                           <ArrowRight size={20} />
                        </button>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </section>
    </div>
  );
}
