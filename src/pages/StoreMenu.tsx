import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingCart, Plus, Minus, CreditCard, ShoppingBag, ArrowLeft, User as UserIcon, Users, Trash2, Calendar, Clock, MapPin, Download } from 'lucide-react';
import { mockMenuItems } from '../data.mock';
import { getBrands } from '../brands';
import { getCampaigns } from '../campaigns';
import { CartItem, OrderVariant, Campaign, Brand, MenuItem } from '../types';
import { authService } from '../auth';
import { dbService } from '../db';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';

export function StoreMenu() {
  const user = authService.getUser();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeBrandId, setActiveBrandId] = useState('');
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  
  useEffect(() => {
    getCampaigns().then(setAllCampaigns);
    getBrands().then(loadedBrands => {
      const active = loadedBrands.filter(b => b.isActive !== false);
      setBrands(active);
      if (active.length > 0) {
        setActiveBrandId(active[0].id);
      }
    });

    const loadItems = async () => {
      const fbItems = await dbService.getMenuItems();
      setAllMenuItems(fbItems);
    };
    loadItems();
  }, []);
  
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderVariant, setOrderVariant] = useState<OrderVariant>('SELF');
  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [placedOrderId, setPlacedOrderId] = useState<string>('');
  
  // Checkout form state
  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [recipientContact, setRecipientContact] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(user?.email || '');
  const [deliveryHouseNo, setDeliveryHouseNo] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryPinCode, setDeliveryPinCode] = useState('');
  const [deliveryContact, setDeliveryContact] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const activeCampaigns = allCampaigns.filter(c => c.brandId === activeBrandId && c.isActive);
  const currentCampaign = activeCampaignId ? allCampaigns.find(c => c.id === activeCampaignId) : null;
  
  const isCampaignExpired = useMemo(() => {
    if (!currentCampaign?.endDate) return false;
    return new Date() > new Date(currentCampaign.endDate);
  }, [currentCampaign]);
  
  const activeBrand = brands.find(b => b.id === activeBrandId);

  const validateServiceability = () => {
    if (!activeBrand?.serviceability?.enabled) return true;
    const { coverageType, pincodes, cities } = activeBrand.serviceability;
    
    if (coverageType === 'ALL_INDIA') return true;
    
    if (coverageType === 'PINCODES' && pincodes && pincodes.length > 0) {
       if (deliveryPinCode) {
         return pincodes.includes(deliveryPinCode);
       }
    }
    return true;
  };
  
  const isServiceable = validateServiceability();

  useEffect(() => {
    if (deliveryPinCode && deliveryPinCode.length === 6 && activeCampaignId) {
      const handler = setTimeout(() => {
        dbService.addCampaignLog({
          id: `LOG-${Date.now()}`,
          campaignId: activeCampaignId,
          timestamp: new Date().toISOString(),
          action: 'SERVICEABILITY_CHECK',
          performedBy: user?.name || 'Guest',
          details: `Serviceability check for pincode ${deliveryPinCode}: ${isServiceable ? 'SERVICEABLE' : 'NON_SERVICEABLE'}`,
          pincode: deliveryPinCode
        });
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [deliveryPinCode, activeCampaignId, isServiceable]);

  useEffect(() => {
    if (deliveryPinCode && deliveryPinCode.length === 6 && isServiceable) {
      fetch(`https://api.postalpincode.in/pincode/${deliveryPinCode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffice = data[0].PostOffice[0];
            setDeliveryCity(postOffice.District || postOffice.Block || '');
            setDeliveryState(postOffice.State || '');
          } else {
             setDeliveryCity('');
             setDeliveryState('');
          }
        })
        .catch(() => {
           setDeliveryCity('');
           setDeliveryState('');
        });
    } else {
       setDeliveryCity('');
       setDeliveryState('');
    }
  }, [deliveryPinCode, isServiceable]);

  useEffect(() => {
    if (currentCampaign && currentCampaign.fulfillmentSettings) {
      const mode = currentCampaign.fulfillmentSettings.mode;
      if (mode === 'FIXED') {
        setDeliveryDate(currentCampaign.fulfillmentSettings.fixedDeliveryDate || '');
        setDeliveryTime(currentCampaign.fulfillmentSettings.fixedDeliveryTime || '');
      } else if (mode === 'RANGE') {
        const todayStr = new Date().toISOString().split('T')[0];
        setDeliveryDate(currentCampaign.fulfillmentSettings.rangeStartDate || todayStr);
      }
    }
  }, [currentCampaign]);

  const activeMenuItems = allMenuItems.filter(i => 
    i.campaignId === activeCampaignId && 
    (dietaryFilter === 'ALL' || i.dietaryType === dietaryFilter)
  ) || [];

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId);
      if (!existing) {
        if (delta > 0) {
          const item = allMenuItems.find(i => i.id === itemId);
          if (item) return [...prev, { menuItem: item, quantity: 1 }];
        }
        return prev;
      }
      
      const nextQuantity = existing.quantity + delta;
      if (nextQuantity <= 0) {
        return prev.filter(c => c.menuItem.id !== itemId);
      }
      
      return prev.map(c => 
        c.menuItem.id === itemId ? { ...c, quantity: nextQuantity } : c
      );
    });
  };

  const getQuantity = (itemId: string) => {
    return cart.find(c => c.menuItem.id === itemId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((total, item) => total + (item.menuItem.offerPrice * item.quantity), 0);
  const cartDelivery = (orderType === 'DELIVERY' && cart.length > 0) ? Math.max(...cart.map(c => c.menuItem.deliveryCharges)) : 0;
  const finalTotal = cartTotal + cartDelivery;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (orderType === 'DELIVERY') {
      if (orderVariant === 'OTHER') {
        if (!recipientName || !recipientContact || !deliveryHouseNo || !deliveryStreet || !deliveryPinCode || !deliveryContact || !deliveryDate || !deliveryTime) {
          setCheckoutError('Please fill all mandatory fields including delivery schedule.');
          return;
        }
        if (!/^\d{10}$/.test(recipientContact) || !/^\d{10}$/.test(deliveryContact)) {
          setCheckoutError('Contact numbers must be 10 digits.');
          return;
        }
      } else {
        if (!deliveryHouseNo || !deliveryStreet || !deliveryContact || !deliveryPinCode || !deliveryDate || !deliveryTime) {
           setCheckoutError('Delivery address, contact and scheduling are required.');
           return;
        }
      }

      if (!isServiceable) {
        setCheckoutError('Sorry, this brand is currently unavailable at your selected delivery location.');
        if (activeCampaignId) {
          dbService.addCampaignLog({
            id: `LOG-${Date.now()}`,
            campaignId: activeCampaignId,
            timestamp: new Date().toISOString(),
            action: 'ORDER_BLOCKED_NON_SERVICEABLE',
            performedBy: user?.name || 'Guest',
            details: `Order blocked. Reasons: Pincode ${deliveryPinCode} is not serviceable.`,
            pincode: deliveryPinCode
          });
        }
        return;
      }
    } else {
       if (!deliveryContact || !deliveryDate || !deliveryTime) {
          setCheckoutError('Contact number and pickup schedule are required.');
          return;
       }
    }

    const today = new Date().toISOString().split('T')[0];
    if (deliveryDate < today) {
      setCheckoutError('Date cannot be in the past.');
      return;
    }

    const orderId = `ORD-${Date.now()}`;
    const pickupCode = orderType === 'PICKUP' ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined;
    if (pickupCode) setPlacedPickupCode(pickupCode);
    const orderItems = cart.map(c => {
      const { mealImage, ...strippedMenuItem } = c.menuItem;
      return { ...c, menuItem: strippedMenuItem };
    });

    const order: any = {
      id: orderId,
      userId: user?.id || 'guest',
      campaignId: activeCampaignId || undefined,
      campaignName: currentCampaign?.name,
      campaignExpiry: currentCampaign?.endDate || '',
      scheduledDeliveryDate: deliveryDate,
      scheduledDeliveryTime: deliveryTime,
      items: orderItems,
      totalAmount: finalTotal,
      status: 'PROCESSING',
      paymentStatus: 'PAID', // Simplified for simulation
      refundStatus: 'NONE',
      orderVariant,
      orderType,
      pickupCode,
      pickupStatus: orderType === 'PICKUP' ? 'PENDING' : undefined,
      recipientName,
      recipientContact,
      recipientEmail,
      deliveryAddress: orderType === 'DELIVERY' ? `${deliveryHouseNo}, ${deliveryStreet}${deliveryCity ? ', ' + deliveryCity : ''}${deliveryState ? ', ' + deliveryState : ''}` : '',
      deliveryPinCode: orderType === 'DELIVERY' ? deliveryPinCode : '',
      deliveryContact,
      deliveryDate,
      deliveryTime,
      createdAt: new Date().toISOString(),
      auditLogs: [{
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ORDER_PLACED',
        performedBy: user?.id || 'guest',
        details: 'Order placed and payment processed'
      }]
    };
    
    try {
      await dbService.addOrder(order);
    } catch (e) {
      console.warn('Firebase sync failed for order', e);
    }

    // Transaction Audit
    const txAudit = {
      id: `TXN-${Date.now()}`,
      transactionId: `PAY-${Date.now()}`,
      orderId: order.id,
      userId: user?.id || 'guest',
      amount: finalTotal,
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'PAID',
      refundStatus: 'NONE',
      timestamp: new Date().toISOString()
    };
    
    try {
      await dbService.addTransaction(txAudit);
    } catch (e) {
      console.warn('Firebase sync failed for transaction', e);
    }

    setPlacedOrderId(orderId);
    setOrderSuccess(true);
    setCart([]);
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCart = () => {
    setCart([]);
    setShowClearConfirm(false);
  };

  const [placedPickupCode, setPlacedPickupCode] = useState<string>('');

  const downloadSlip = async () => {
    const element = document.getElementById('pickup-slip');
    if (!element) return;
    
    // Temporarily ensure the element is visible with right styling for canvas
    element.style.display = 'block';
    
    try {
      const dataUrl = await toPng(element, { pixelRatio: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Pickup_Slip_${placedOrderId}.pdf`);
    } catch (e) {
      console.error('Error generating PDF', e);
    } finally {
      element.style.display = 'none';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Content Section */}
        <div className="flex-1 space-y-8">
          <div className="flex justify-between items-end border-b border-gray-200 pb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Campaign Menus</h1>
              <p className="text-gray-500 mt-2">Browse brands, select campaigns, and order</p>
            </div>
          </div>

          {!activeCampaignId ? (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">1. Select a Brand</h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {brands.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => setActiveBrandId(brand.id)}
                    className={`flex flex-col items-center gap-3 p-4 border rounded-xl min-w-[120px] transition-all ${
                      activeBrandId === brand.id 
                        ? 'border-red-500 shadow-md bg-red-50' 
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <img 
                      src={brand.logo || undefined} 
                      alt={brand.name} 
                      referrerPolicy="no-referrer" 
                      className="h-12 w-12 object-contain mix-blend-multiply rounded-full" 
                    />
                    <span className="font-semibold text-sm">{brand.name}</span>
                  </button>
                ))}
              </div>

              <h2 className="text-xl font-bold text-gray-900 pt-4">2. Select a Campaign</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeCampaigns.length > 0 ? activeCampaigns.map(campaign => (
                  <button 
                    key={campaign.id}
                    onClick={() => setActiveCampaignId(campaign.id)}
                    className="p-6 bg-white border border-gray-200 rounded-xl text-left hover:shadow-md transition-shadow group flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-red-600 transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Available for order</p>
                    </div>
                    <ArrowLeft size={20} className="text-gray-400 rotate-180 group-hover:text-red-500 transform group-hover:translate-x-1 transition-all" />
                  </button>
                )) : (
                  <p className="text-gray-500 p-4 border border-dashed rounded-lg col-span-full">
                    No active campaigns for this brand.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <button 
                  onClick={() => setActiveCampaignId(null)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm bg-red-50 px-3 py-1.5 rounded-lg w-fit transition-colors shrink-0"
                >
                  <ArrowLeft size={16} /> Back to Campaigns
                </button>
                
                <h2 className="text-2xl font-bold text-gray-900 truncate">
                  {allCampaigns.find(c => c.id === activeCampaignId)?.name}
                </h2>
              </div>
              
              {activeBrand?.serviceability?.enabled && (activeBrand.serviceability.coverageType === 'PINCODES' || activeBrand.serviceability.coverageType === 'CITIES') && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
                  <div className="text-indigo-900">
                    <p className="font-semibold text-sm">Brand Delivery Area</p>
                    <p className="text-xs mt-1">Please enter your delivery Pincode to check serviceability.</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                      type="text" 
                      placeholder="Enter Pincode" 
                      value={deliveryPinCode}
                      onChange={e => setDeliveryPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-40"
                    />
                  </div>
                </div>
              )}

              {!isServiceable && deliveryPinCode && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-red-700 font-semibold mb-2">Sorry, this brand is currently unavailable at your selected delivery location ({deliveryPinCode}).</p>
                  <p className="text-red-600 text-sm">Please raise your request using Plan My Event link given below or explore other available brands.</p>
                  <button 
                    onClick={() => { setActiveCampaignId(null); setActiveBrandId(brands[0]?.id || ''); }}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 mr-2"
                  >
                    Explore Other Brands
                  </button>
                  <button 
                    onClick={() => setActiveCampaignId(null)}
                    className="mt-4 px-4 py-2 bg-white text-red-600 border border-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                  >
                    Explore Other Campaigns
                  </button>
                  <div className="mt-4">
                    <a href="/contact" className="text-sm font-semibold text-red-700 underline hover:text-red-800">
                      Plan My Event
                    </a>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1 w-fit">
                <button 
                  onClick={() => setDietaryFilter('ALL')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dietaryFilter === 'ALL' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setDietaryFilter('VEG')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${dietaryFilter === 'VEG' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-green-700'}`}
                >
                  <div className="w-2.5 h-2.5 rounded-sm border-2 border-current flex items-center justify-center p-[1px]"><div className="w-full h-full rounded-full bg-current"></div></div> Veg
                </button>
                <button 
                  onClick={() => setDietaryFilter('NON_VEG')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${dietaryFilter === 'NON_VEG' ? 'bg-white shadow-sm text-red-700' : 'text-gray-500 hover:text-red-700'}`}
                >
                  <div className="w-2.5 h-2.5 rounded-sm border-2 border-current flex items-center justify-center p-[1px]"><div className="w-full h-full rounded-full bg-current"></div></div> Non-Veg
                </button>
              </div>

              {isServiceable && !!deliveryPinCode && deliveryPinCode.length === 6 && !isCampaignExpired && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-6">
                  <p className="text-green-800 font-semibold">Great! We serve at this location.</p>
                  <p className="text-green-700 text-sm">Let's start building your order.</p>
                </div>
              )}

              {isCampaignExpired && (
                <div className="bg-gray-100 border border-gray-300 rounded-xl p-6 text-center mb-6">
                  <Clock size={32} className="mx-auto text-gray-400 mb-3" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Campaign Has Ended</h3>
                  <p className="text-gray-600 mb-4">This campaign has expired and is no longer accepting new orders.</p>
                  <p className="text-sm font-medium text-gray-700">Please plan your order with us directly. We require at least 24 hours notice to serve your order.</p>
                </div>
              )}

              {activeBrand?.serviceability?.enabled && (activeBrand.serviceability.coverageType === 'PINCODES' || activeBrand.serviceability.coverageType === 'CITIES') && (!deliveryPinCode || deliveryPinCode.length < 6) ? (
                <div className="bg-white border-2 border-indigo-100 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center">
                   <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                     <MapPin size={32} className="text-indigo-600" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 mb-2">Check Serviceability to Order</h3>
                   <p className="text-gray-500 mb-6 max-w-md">Please enter your 6-digit delivery pincode in the top banner to see if we deliver to your location before exploring the menu and building your cart.</p>
                </div>
              ) : (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 relative ${isCampaignExpired ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
                  {!isServiceable && !!deliveryPinCode && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-20 flex items-start justify-center pt-20 rounded-3xl">
                      <div className="bg-white shadow-xl rounded-2xl p-6 text-center max-w-sm border border-red-100">
                        <MapPin size={32} className="text-red-500 mx-auto mb-3" />
                        <h4 className="font-bold text-gray-900 text-lg mb-2">Not Serviceable</h4>
                        <p className="text-sm text-gray-600">You cannot build a cart because we do not deliver to this location.</p>
                      </div>
                    </div>
                  )}
                  {activeMenuItems.length > 0 ? activeMenuItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition group">
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        src={item.mealImage || undefined} 
                        alt={item.name} 
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {item.proposedSaving > 0 && (
                        <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          Save ₹{item.proposedSaving}
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col justify-between min-h-[160px]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {item.dietaryType && (
                            <div className={`w-3.5 h-3.5 rounded-sm ${item.dietaryType === 'VEG' ? 'border border-green-600' : 'border border-red-600'} flex items-center justify-center shrink-0`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${item.dietaryType === 'VEG' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                            </div>
                          )}
                          <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.name}</h3>
                        </div>
                        {item.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.description}</p>}
                        <div className="flex gap-3 items-end mt-2">
                          <span className="text-2xl font-bold text-gray-900">₹{item.offerPrice}</span>
                          <span className="text-sm font-medium text-gray-400 line-through mb-1">₹{item.mrp}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                          Delivery: {item.deliveryCharges > 0 ? `₹${item.deliveryCharges}` : 'Free'}
                        </span>
                        
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                          <button 
                            onClick={() => {
                              if (!isServiceable) {
                                alert('Please enter a valid delivery pincode to check serviceability before adding items.');
                                return;
                              }
                              updateQuantity(item.id, -1);
                            }}
                            className="p-1 rounded-md text-gray-500 hover:bg-white hover:text-red-600 transition shadow-sm cursor-pointer disabled:opacity-50"
                            disabled={getQuantity(item.id) === 0}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="font-bold w-6 text-center text-gray-900">
                            {getQuantity(item.id)}
                          </span>
                          <button 
                            onClick={() => {
                              if (!isServiceable || (!deliveryPinCode && activeBrand?.serviceability?.enabled && activeBrand.serviceability.coverageType === 'PINCODES')) {
                                alert('Please enter a serviceable delivery pincode before adding items.');
                                return;
                              }
                              updateQuantity(item.id, 1);
                            }}
                            className="p-1 rounded-md text-gray-500 hover:bg-white hover:text-red-600 transition shadow-sm cursor-pointer disabled:opacity-50"
                            disabled={!isServiceable && !!deliveryPinCode}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                     <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                     <h3 className="text-lg font-bold text-gray-900">No items available</h3>
                     <p className="text-gray-500">This campaign menu is currently empty.</p>
                  </div>
                )}
              </div>
              )}
            </div>
          )}
        </div>

        {/* Cart/Checkout Sidebar */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm lg:sticky lg:top-24 overflow-hidden flex flex-col h-full lg:max-h-[calc(100dvh-8rem)]">
            <div className="bg-gray-900 p-4 text-white flex items-center justify-between relative">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart size={20} />
                {showCheckout ? 'Checkout' : 'Shopping Cart'}
              </h2>
              {!orderSuccess && (
                <div className="flex items-center gap-3">
                  {cart.length > 0 && (
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors cursor-pointer"
                    >
                      Clear Cart
                    </button>
                  )}
                  {!showCheckout && (
                    <span className="bg-gray-800 text-xs font-bold px-2 py-1 rounded-md">
                      {cart.reduce((a, b) => a + b.quantity, 0)} items
                    </span>
                  )}
                </div>
              )}
            </div>

            {showClearConfirm && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center p-6 text-center">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">Clear Shopping Cart?</h3>
                  <p className="text-sm text-gray-500 max-w-[200px] mx-auto">This will remove all items from your cart.</p>
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleClearCart}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-4 flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">Your cart is empty.</p>
                  <p className="text-xs">Add items from the menu to start an order.</p>
                </div>
              ) : (
                !showCheckout ? (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.menuItem.id} className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            {item.menuItem.dietaryType && (
                              <div className={`w-2 h-2 rounded-sm ${item.menuItem.dietaryType === 'VEG' ? 'border border-green-600' : 'border border-red-600'} flex items-center justify-center shrink-0`}>
                                <div className={`w-1 h-1 rounded-full ${item.menuItem.dietaryType === 'VEG' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                              </div>
                            )}
                            <h4 className="font-medium text-sm text-gray-900 leading-tight">{item.menuItem.name}</h4>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">₹{item.menuItem.offerPrice} x {item.quantity}</div>
                        </div>
                        <div className="font-bold text-sm text-gray-900 mt-0.5">
                          ₹{item.menuItem.offerPrice * item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : orderSuccess ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard size={32} />
                    </div>
                    <div className="text-green-700 font-bold text-lg">
                      Order Placed Successfully!
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-[250px] mx-auto">
                       Your order for ₹{finalTotal} is confirmed. View Dashboard to track {orderType === 'DELIVERY' ? 'delivery' : 'pickup'}.
                    </p>
                    {orderType === 'PICKUP' && (
                      <div className="mt-6 flex justify-center">
                        <button 
                          onClick={downloadSlip}
                          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition"
                        >
                          <Download size={18} /> Download Pickup Confirmation Slip
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handlePlaceOrder} className="space-y-6">
                    {checkoutError && (
                      <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                        {checkoutError}
                      </div>
                    )}
                    
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button 
                        type="button"
                        onClick={() => setOrderType('DELIVERY')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${orderType === 'DELIVERY' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <MapPin size={16} /> Delivery
                      </button>
                      <button 
                        type="button"
                        onClick={() => setOrderType('PICKUP')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${orderType === 'PICKUP' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <ShoppingBag size={16} /> Pickup
                      </button>
                    </div>

                    <div className="space-y-4 pt-2">
                       <h4 className="font-bold text-sm border-b pb-2">Options</h4>
                       <div className="flex bg-gray-100 p-1 rounded-lg mt-2">
                         <button 
                           type="button"
                           onClick={() => setOrderVariant('SELF')}
                           className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${orderVariant === 'SELF' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                           <UserIcon size={16} /> For Self
                         </button>
                         <button 
                           type="button"
                           onClick={() => setOrderVariant('OTHER')}
                           className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${orderVariant === 'OTHER' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                           <Users size={16} /> For Someone Else
                         </button>
                       </div>
                    </div>

                    {orderVariant === 'OTHER' && (
                      <div className="space-y-4 pt-2">
                        <h4 className="font-bold text-sm border-b pb-2">Recipient Details</h4>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                          <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number *</label>
                          <input type="tel" value={recipientContact} onChange={e => setRecipientContact(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" placeholder="10 digits" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email ID (Optional)</label>
                          <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 pt-2">
                      <h4 className="font-bold text-sm border-b pb-2">{orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'} Details</h4>
                      
                      {orderType === 'DELIVERY' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">House/Flat/Block No. *</label>
                            <input type="text" value={deliveryHouseNo} onChange={e => setDeliveryHouseNo(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" placeholder="e.g. Flat 4B, XYZ Apartments" />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Street/Area/Landmark *</label>
                            <input type="text" value={deliveryStreet} onChange={e => setDeliveryStreet(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" placeholder="e.g. Near Main Square, MG Road" />
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Pin Code</label>
                              <input type="text" value={deliveryPinCode} onChange={e => setDeliveryPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required className="w-full border rounded px-3 py-1.5 text-sm bg-gray-50" readOnly={isServiceable && deliveryPinCode.length === 6} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                              <input type="text" value={deliveryCity} readOnly className="w-full border rounded px-3 py-1.5 text-sm bg-gray-50 text-gray-500" placeholder="Auto-filled" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                              <input type="text" value={deliveryState} readOnly className="w-full border rounded px-3 py-1.5 text-sm bg-gray-50 text-gray-500" placeholder="Auto-filled" />
                            </div>
                          </div>
                          
                          {isServiceable && deliveryPinCode.length === 6 && deliveryCity && (
                            <div className="bg-green-50 text-green-700 p-2 rounded text-xs flex items-center gap-1 border border-green-100">
                              <MapPin size={14}/> Delivery available in {deliveryCity}, {deliveryState} - {deliveryPinCode}
                            </div>
                          )}

                          {!isServiceable && deliveryPinCode && (
                            <p className="text-xs text-red-600 mt-1">Sorry, we currently do not deliver to this location. Please raise your request using Plan My Event link given below.</p>
                          )}
                        </>
                      )}
                      
                      {orderType === 'PICKUP' && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-800">
                           <p className="font-semibold mb-1">Pickup Store:</p>
                           <p>{activeBrand?.name} - Main Branch</p>
                           <p className="text-xs mt-1 opacity-80">You can collect your order by showing the QR code in the slip after success.</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><Calendar size={12}/> {orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'} Date *</label>
                          <input 
                            type="date" 
                            min={currentCampaign?.fulfillmentSettings?.mode === 'RANGE' && currentCampaign.fulfillmentSettings.rangeStartDate ? currentCampaign.fulfillmentSettings.rangeStartDate : new Date().toISOString().split('T')[0]}
                            max={currentCampaign?.fulfillmentSettings?.mode === 'RANGE' && currentCampaign.fulfillmentSettings.rangeEndDate ? currentCampaign.fulfillmentSettings.rangeEndDate : undefined}
                            readOnly={currentCampaign?.fulfillmentSettings?.mode === 'FIXED'}
                            value={deliveryDate} 
                            onChange={e => setDeliveryDate(e.target.value)} 
                            required 
                            className={`w-full border rounded px-3 py-1.5 text-sm ${currentCampaign?.fulfillmentSettings?.mode === 'FIXED' ? 'bg-gray-50 border-gray-200 text-gray-500' : ''}`} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><Clock size={12}/> {orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'} Time *</label>
                          {currentCampaign?.fulfillmentSettings?.mode === 'FIXED' ? (
                            <input type="text" readOnly value={deliveryTime} className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50 text-gray-500" />
                          ) : (
                            <input type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number *</label>
                          <input type="tel" value={deliveryContact} onChange={e => setDeliveryContact(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" placeholder="10 digits" />
                        </div>
                      </div>
                    </div>
                  </form>
                )
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-4">
                {!showCheckout && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-gray-900">₹{cartTotal}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Charge</span>
                      <span className="font-medium text-gray-900">₹{cartDelivery}</span>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center bg-gray-50">
                   <div className="flex flex-col">
                     <span className="font-bold text-gray-900 text-sm">Total Amount</span>
                     <span className="font-bold text-xl text-red-600">₹{finalTotal}</span>
                   </div>
                   
                   {!showCheckout ? (
                    <button 
                      onClick={() => setShowCheckout(true)}
                      disabled={isCampaignExpired}
                      className={`font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${isCampaignExpired ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 cursor-pointer'}`}
                    >
                      {isCampaignExpired ? 'Expired' : 'Process'} {!isCampaignExpired && <ArrowLeft size={16} className="rotate-180" />}
                    </button>
                   ) : orderSuccess ? (
                    <button 
                      onClick={() => {
                        setCart([]);
                        setShowCheckout(false);
                        setOrderSuccess(false);
                      }}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm cursor-pointer"
                    >
                      Done
                    </button>
                   ) : (
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setShowCheckout(false)}
                         className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors text-sm cursor-pointer"
                       >
                         Back
                       </button>
                       <button 
                         onClick={handlePlaceOrder}
                         className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm flex items-center gap-2 cursor-pointer"
                       >
                         Pay
                       </button>
                    </div>
                   )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {orderSuccess && orderType === 'PICKUP' && placedOrderId && (
        <div className="hidden">
          <div id="pickup-slip" className="bg-white p-8 w-[600px] font-sans border-2 border-indigo-100 rounded-xl">
            <div className="flex justify-between items-start border-b-2 border-gray-100 pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2"><ShoppingBag className="text-indigo-600"/> Pickup Slip</h1>
                <p className="text-sm text-gray-500">Order ID: {placedOrderId}</p>
              </div>
              {activeBrand?.logo ? (
                <img src={activeBrand.logo} alt="Brand Logo" className="h-12 w-auto object-contain" />
              ) : (
                <div className="text-lg font-bold text-indigo-900">{activeBrand?.name || 'QwikMeal'}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b-2 border-gray-100">
              <div>
                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Customer Details</h3>
                <p className="font-semibold text-gray-900 text-lg">{recipientName || user?.name || 'Guest'}</p>
                <p className="text-gray-600">Ph: {recipientContact || deliveryContact}</p>
                <p className="text-gray-500 text-sm mt-1">Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg flex items-center gap-4">
                <div className="bg-white p-2 rounded">
                  <QRCodeSVG value={`qwikmeal://pickup/${placedOrderId}?code=${placedPickupCode}`} size={64} level="H" />
                </div>
                <div>
                  <p className="text-xs text-indigo-700 font-bold uppercase tracking-wider">Pickup Code</p>
                  <p className="text-3xl font-black text-indigo-900 tracking-widest">{placedPickupCode}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Order Items</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase text-xs">
                    <th className="py-2.5 font-medium">Item</th>
                    <th className="py-2.5 font-medium text-center">Qty</th>
                    <th className="py-2.5 font-medium text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 font-medium text-gray-900">{item.menuItem.name}</td>
                      <td className="py-2.5 text-center text-gray-700">{item.quantity}</td>
                      <td className="py-2.5 text-right font-medium text-gray-900">₹{item.menuItem.offerPrice * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-gray-200">
                <span className="font-bold text-gray-700 tracking-wider">TOTAL PAID</span>
                <span className="font-black text-xl text-gray-900">₹{finalTotal}</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-auto">
              <div className="flex items-start gap-2">
                <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Pickup Store Location</h3>
                  <p className="text-gray-600 text-sm">{activeBrand?.name || 'QwikMeal'} - Main Branch</p>
                  <p className="text-gray-500 text-xs mt-1">Please show your pickup code or QR code at the counter.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
