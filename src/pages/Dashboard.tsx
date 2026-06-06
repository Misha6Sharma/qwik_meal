import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const loadDashboardInfo = async () => {
      const allBrands = await getBrands();
      setBrands(allBrands.filter(b => b.isActive !== false));
      
      const orders = await import('../db').then(m => m.dbService.getOrders(user?.id));
      const currActiveOrders = orders.filter((o: any) => !['CANCELLED', 'DELIVERED'].includes(o.status));
      
      setHasHistory(orders.length > 0);
      setActiveOrders(currActiveOrders);
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
              {activeOrders.length === 0 && (
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
            {activeOrders.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      src={brand.logo || undefined} 
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


    </div>
  );
}
