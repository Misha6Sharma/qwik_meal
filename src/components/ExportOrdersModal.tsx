import React, { useState, useEffect, useMemo } from 'react';
import { Download, X, Calendar, Filter, PieChart } from 'lucide-react';
import { dbService } from '../db';
import { Order, Campaign } from '../types';

interface ExportOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportOrdersModal({ isOpen, onClose }: ExportOrdersModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [orderStatus, setOrderStatus] = useState<string>('all');
  const [paymentType, setPaymentType] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const allOrders = await dbService.getOrders();
    const allCampaigns = await dbService.getCampaigns();
    setOrders(allOrders);
    setCampaigns(allCampaigns);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Campaign Filter
      if (selectedCampaign !== 'all' && o.campaignId !== selectedCampaign) return false;

      // Status Filter
      if (orderStatus !== 'all' && o.status !== orderStatus) return false;

      // Payment Type Filter
      if (paymentType !== 'all') {
        const orderPaymentPattern = o.paymentMethod?.toLowerCase() || '';
        const searchPattern = paymentType.toLowerCase();
        
        if (paymentType === 'COD' && orderPaymentPattern !== 'cash on delivery') return false;
        else if (paymentType !== 'COD' && !orderPaymentPattern.includes(searchPattern)) return false;
      }

      // Date Range Filter
      const orderDate = new Date(o.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);

      const last30Days = new Date(today);
      last30Days.setDate(last30Days.getDate() - 30);

      const orderDateOnly = new Date(orderDate);
      orderDateOnly.setHours(0, 0, 0, 0);

      switch (dateRange) {
        case 'today':
          if (orderDateOnly.getTime() !== today.getTime()) return false;
          break;
        case 'yesterday':
          if (orderDateOnly.getTime() !== yesterday.getTime()) return false;
          break;
        case 'last7':
          if (orderDateOnly.getTime() < last7Days.getTime()) return false;
          break;
        case 'last30':
          if (orderDateOnly.getTime() < last30Days.getTime()) return false;
          break;
        case 'custom':
          if (customStartDate && new Date(customStartDate) > orderDateOnly) return false;
          if (customEndDate && new Date(customEndDate) < orderDateOnly) return false;
          break;
      }

      return true;
    });
  }, [orders, selectedCampaign, dateRange, customStartDate, customEndDate, orderStatus, paymentType]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalGST = 0;
    let totalDiscounts = 0;
    let totalSavings = 0;
    let codCount = 0;
    let onlineCount = 0;

    filteredOrders.forEach(o => {
      totalRevenue += o.totalAmount || 0;
      totalGST += o.gstAmount || 0;
      totalSavings += o.savingsAmount || 0;
      
      let orderDiscount = 0;
      o.items?.forEach(i => {
        if (i.menuItem) {
          orderDiscount += ((i.menuItem.mrp || i.menuItem.offerPrice) - i.menuItem.offerPrice) * i.quantity;
        }
      });
      totalDiscounts += orderDiscount;
      
      const method = o.paymentMethod?.toLowerCase() || '';
      if (method === 'cash on delivery') {
        codCount++;
      } else {
        onlineCount++;
      }
    });

    return {
      totalOrders: filteredOrders.length,
      totalRevenue,
      totalGST,
      totalDiscounts, // Assuming discounts are grouped in totalSavings or handled separately
      totalSavings,
      codCount,
      onlineCount,
      averageOrderValue: filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length) : 0
    };
  }, [filteredOrders]);

  const generateCSV = (ordersToExport: Order[], presetName?: string) => {
    setIsGenerating(true);
    try {
      const headers = [
        'Campaign ID', 'Campaign Name', 'Order ID', 'Order Date & Time', 
        'Order Status', 'Payment Status', 'Payment Method', 'Customer Name', 
        'Mobile Number', 'Email Address', 'Delivery Address', 'City', 'State', 
        'Pincode', 'Delivery Date', 'Delivery Time Slot', 'Subtotal', 
        'Product Discount', 'GST Amount', 'Packaging Charges', 'Delivery Charges', 
        'Processing Fee', 'Total Savings', 'Grand Total', 'Free Delivery Applied', 
        'Packaging Waiver Applied', 'Processing Fee Waiver Applied', 'Product Names', 
        'Quantities', 'Item-wise Amount'
      ];

      const rows = ordersToExport.map(o => {
        const campaign = campaigns.find(c => c.id === o.campaignId);
        
        let subtotal = 0;
        let originalTotal = 0;
        const products: string[] = [];
        const quantities: string[] = [];
        const itemAmounts: string[] = [];
        
        o.items.forEach(i => {
           subtotal += i.menuItem.offerPrice * i.quantity;
           originalTotal += (i.menuItem.mrp || i.menuItem.offerPrice) * i.quantity;
           let pName = i.menuItem.name;
           if (i.variantSize) pName += ` (${i.variantSize})`;
           products.push(`"${pName.replace(/"/g, '""')}"`);
           quantities.push(i.quantity.toString());
           itemAmounts.push((i.menuItem.offerPrice * i.quantity).toString());
        });

        const productDiscount = originalTotal - subtotal;

        // address parsing logic if single string
        const addressParts = (o.deliveryAddress || '').split(',');
        const city = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : '';
        const statePin = addressParts.length > 0 ? addressParts[addressParts.length - 1]?.trim() : '';
        const state = statePin.split('-')[0]?.trim() || '';
        const pincode = o.deliveryPinCode || statePin.split('-')[1]?.trim() || '';

        const freeDeliveryApplied = o.savingsAmount && o.savingsAmount > 0 && campaign?.benefits?.freeDelivery ? 'Yes' : 'No';
        const packagingWaiver = campaign?.benefits?.waivePackagingCharge ? 'Yes' : 'No';
        const processingWaiver = campaign?.benefits?.waiveProcessingFee ? 'Yes' : 'No';
        const packagingCharges = campaign?.benefits?.waivePackagingCharge ? 0 : (campaign?.benefits?.packagingChargeAmount || 0);
        const processingCharges = campaign?.benefits?.waiveProcessingFee ? 0 : (campaign?.benefits?.processingFeeAmount || 0);

        const calculatedDeliveryCharge = Math.max(0, (o.totalAmount || 0) - subtotal - (o.gstAmount || 0) - packagingCharges - processingCharges);

        return [
          o.campaignId || 'Standard',
          o.campaignName || campaign?.name || 'Standard Menu',
          o.id,
          new Date(o.createdAt).toLocaleString(),
          o.status,
          o.paymentStatus,
          o.paymentMethod || '-',
          o.recipientName || '-',
          o.recipientContact || '-',
          o.recipientEmail || '-',
          `"${(o.deliveryAddress || '').replace(/"/g, '""')}"`,
          city,
          state,
          pincode,
          o.scheduledDeliveryDate || o.deliveryDate,
          o.scheduledDeliveryTime || o.deliveryTime,
          subtotal.toFixed(2),
          productDiscount.toFixed(2),
          (o.gstAmount || 0).toFixed(2),
          packagingCharges.toFixed(2),
          calculatedDeliveryCharge.toFixed(2),
          processingCharges.toFixed(2),
          (o.savingsAmount || 0).toFixed(2),
          (o.totalAmount || 0).toFixed(2),
          freeDeliveryApplied,
          packagingWaiver,
          processingWaiver,
          products.join('; '),
          quantities.join('; '),
          itemAmounts.join('; ')
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
      const prefix = presetName ? presetName.replace(/ /g, '_') : 'Campaign_Orders_Report';
      link.setAttribute('download', `${prefix}_${dateStr}.csv`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error generating CSV", e);
      alert("Failed to generating CSV.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickExport = (type: 'today' | 'week' | 'month' | 'all') => {
    let filtered = [...orders];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);

    switch (type) {
        case 'today':
            filtered = orders.filter(o => {
                const d = new Date(o.createdAt);
                d.setHours(0,0,0,0);
                return d.getTime() === today.getTime();
            });
            generateCSV(filtered, "Todays_Orders");
            break;
        case 'week':
            filtered = orders.filter(o => new Date(o.createdAt) >= weekStart);
            generateCSV(filtered, "This_Weeks_Orders");
            break;
        case 'month':
            filtered = orders.filter(o => new Date(o.createdAt) >= monthStart);
            generateCSV(filtered, "This_Months_Orders");
            break;
        case 'all':
            generateCSV(orders, "All_Campaign_Orders");
            break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Download className="text-red-600" /> Export Campaign Orders
            </h2>
            <p className="text-sm text-gray-500 mt-1">Generate and download order reports for analysis and accounting.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          
          {/* Quick Export Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
             <button onClick={() => handleQuickExport('today')} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-red-600 hover:shadow-md transition group shadow-sm">
                <div className="bg-red-50 text-red-600 p-3 rounded-full group-hover:scale-110 transition-transform">
                   <Download size={20} />
                </div>
                <span className="font-semibold text-gray-900 text-sm">Export Today's</span>
             </button>
             <button onClick={() => handleQuickExport('week')} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-600 hover:shadow-md transition group shadow-sm">
                <div className="bg-blue-50 text-blue-600 p-3 rounded-full group-hover:scale-110 transition-transform">
                   <Calendar size={20} />
                </div>
                <span className="font-semibold text-gray-900 text-sm">Export This Week</span>
             </button>
             <button onClick={() => handleQuickExport('month')} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-green-600 hover:shadow-md transition group shadow-sm">
                <div className="bg-green-50 text-green-600 p-3 rounded-full group-hover:scale-110 transition-transform">
                   <PieChart size={20} />
                </div>
                <span className="font-semibold text-gray-900 text-sm">Export This Month</span>
             </button>
             <button onClick={() => handleQuickExport('all')} className="bg-gray-900 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 border border-transparent hover:bg-gray-800 hover:shadow-md transition shadow-sm">
                <div className="bg-gray-800 text-white p-3 rounded-full">
                   <Download size={20} />
                </div>
                <span className="font-semibold text-sm">Export All Orders</span>
             </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6 mb-8">
            <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
               <h3 className="font-bold flex items-center gap-2"><PieChart size={18} /> Campaign Performance Summary</h3>
               <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-300">Based on selection matching {stats.totalOrders} orders</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
               <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
               </div>
               <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(2)}</p>
               </div>
               <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Average Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.averageOrderValue.toFixed(2)}</p>
               </div>
               <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Total Savings Provided</p>
                  <p className="text-2xl font-bold text-green-600">₹{stats.totalSavings.toFixed(2)}</p>
               </div>
               <div className="md:col-span-4 border-t border-gray-100 pt-6 mt-2 grid grid-cols-2 md:grid-cols-4 gap-6">
                   <div>
                      <p className="text-sm text-gray-500 font-medium mb-1">Online Payment Orders</p>
                      <p className="text-xl font-bold text-gray-700">{stats.onlineCount}</p>
                   </div>
                   <div>
                      <p className="text-sm text-gray-500 font-medium mb-1">COD Orders Count</p>
                      <p className="text-xl font-bold text-gray-700">{stats.codCount}</p>
                   </div>
                   <div>
                      <p className="text-sm text-gray-500 font-medium mb-1">Total GST Collected</p>
                      <p className="text-xl font-bold text-gray-700">₹{stats.totalGST.toFixed(2)}</p>
                   </div>
                   <div>
                      <p className="text-sm text-gray-500 font-medium mb-1">Discounts Given</p>
                      <p className="text-xl font-bold text-gray-700">₹{stats.totalDiscounts.toFixed(2)}</p>
                   </div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg"><Filter size={18} className="text-gray-500"/> Custom Report Filters</h3>
            </div>
            
            <div className="p-6 grid md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Campaign</label>
                <select 
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                >
                  <option value="all">All Campaigns</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
                <select 
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                >
                  <option value="all">All Orders</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Preparing</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                <select 
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="COD">Cash on Delivery</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select 
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                >
                  <option value="last30">Last 30 Days</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="custom">Custom Date Range...</option>
                </select>
              </div>

              {dateRange === 'custom' && (
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input 
                        type="date" 
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500" 
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input 
                        type="date" 
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500" 
                      />
                   </div>
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
            Close
          </button>
          <button 
            onClick={() => generateCSV(filteredOrders)} 
            disabled={isGenerating || filteredOrders.length === 0}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition flex items-center gap-2 disabled:bg-red-400 shadow-sm"
          >
            <Download size={18} /> {isGenerating ? 'Generating...' : `Download ${filteredOrders.length} Orders (CSV)`}
          </button>
        </div>
      </div>
    </div>
  );
}
