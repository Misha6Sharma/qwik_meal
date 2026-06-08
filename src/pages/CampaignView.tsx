import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, MapPin, Receipt, ArrowRight, Building2, User as UserIcon, Mail, Phone, Plus, Minus, ShoppingBag, CreditCard, ChevronLeft, ShieldCheck, Flame, Star, Headset } from 'lucide-react';
import { MenuItem, Campaign, Brand } from '../types';
import { getBrands } from '../brands';
import { getCampaigns } from '../campaigns';
import { dbService } from '../db';
import { authService } from '../auth';
import { loadRazorpayScript, createRazorpayOrder, handleRazorpayCheckout, checkRazorpayOrderStatus } from '../lib/razorpay';

type CheckoutStep = 'PRODUCTS' | 'DELIVERY' | 'PAYMENT' | 'SUCCESS';

export function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(null);
  
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('PRODUCTS');
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [deliveryForm, setDeliveryForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    deliveryDate: '',
    timeSlot: 'Lunch (12:30 PM - 1:30 PM)',
    instructions: ''
  });

  const [orderId, setOrderId] = useState<string | null>(null);
  const [savedAmount, setSavedAmount] = useState<number>(0);

  const [showEventPrompt, setShowEventPrompt] = useState(false);
  const [eventLeadForm, setEventLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    eventType: 'Corporate Event',
    eventDate: '',
    guestCount: '',
    location: '',
    budget: '',
    requirements: ''
  });

  const [deliveryPinCode, setDeliveryPinCode] = useState(() => localStorage.getItem('qwikmeal_campaign_pincode') || '');

  useEffect(() => {
    localStorage.setItem('qwikmeal_campaign_pincode', deliveryPinCode);
  }, [deliveryPinCode]);
  
  useEffect(() => {
    const checkPendingPayment = async () => {
      const pOrderId = localStorage.getItem('qwikmeal_pending_order_id');
      const pRzpId = localStorage.getItem('qwikmeal_pending_rzp_order_id');
      
      if (pOrderId && pRzpId) {
        try {
          const statusData = await checkRazorpayOrderStatus(pRzpId);
          if (statusData.status === 'paid' || statusData.status === 'captured') {
             // Recover successful payment
             localStorage.removeItem('qwikmeal_pending_order_id');
             localStorage.removeItem('qwikmeal_pending_rzp_order_id');
             
             dbService.updateOrder(pOrderId, {
               status: 'CONFIRMED', 
               paymentStatus: 'PAID'
             }).catch(e => console.error("Recovery DB update failed", e));

             setOrderId(pOrderId);
             setSavedAmount(0); // Cannot recover exact savings amount easily on page reload
             setCheckoutStep('SUCCESS');
             setCart({});
          }
        } catch (e) {
          console.warn("Payment recovery polling failed", e);
        }
      }
    };
    checkPendingPayment();
  }, []);
  
  const validateServiceability = () => {
    // Brand serviceability validation overrides campaign serviceability? The prompt says "Validate the customer's delivery address against the serviceability rules configured for that specific brand."
    // Let's use brand.serviceability.
    if (!brand?.serviceability?.enabled) return true;
    const { coverageType, pincodes } = brand.serviceability;
    
    if (coverageType === 'ALL_INDIA') return true;
    
    if (coverageType === 'PINCODES' && pincodes && pincodes.length > 0) {
       if (deliveryPinCode) {
         return pincodes.includes(deliveryPinCode);
       }
    }
    return true;
  };
  const isServiceable = validateServiceability();
  const hasServiceabilityRequirement = brand?.serviceability?.enabled && (brand.serviceability.coverageType === 'PINCODES' || brand.serviceability.coverageType === 'CITIES');
  const serviceabilityPassed = hasServiceabilityRequirement ? (isServiceable && !!deliveryPinCode && deliveryPinCode.length === 6) : true;

  const [currentUser, setCurrentUser] = useState(authService.getUser());

  useEffect(() => {
    if (deliveryPinCode && deliveryPinCode.length === 6 && campaign) {
      const handler = setTimeout(() => {
        dbService.addCampaignLog({
          id: `LOG-${Date.now()}`,
          campaignId: campaign.id,
          timestamp: new Date().toISOString(),
          action: 'SERVICEABILITY_CHECK',
          performedBy: currentUser?.name || 'Guest',
          details: `Serviceability check for pincode ${deliveryPinCode}: ${isServiceable ? 'SERVICEABLE' : 'NON_SERVICEABLE'}`,
          pincode: deliveryPinCode
        });
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [deliveryPinCode, campaign, isServiceable]);

  useEffect(() => {
    if (deliveryPinCode && deliveryPinCode.length === 6 && isServiceable) {
      fetch(`https://api.postalpincode.in/pincode/${deliveryPinCode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffice = data[0].PostOffice[0];
            setDeliveryForm(prev => ({
              ...prev,
              pincode: deliveryPinCode,
              city: postOffice.District || postOffice.Block || '',
              state: postOffice.State || ''
            }));
          }
        })
        .catch(err => console.error(err));
    }
  }, [deliveryPinCode, isServiceable]);

  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    if (!campaign?.endDate) return;
    
    const calculateTimeLeft = () => {
      const difference = new Date(campaign.endDate!).getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [campaign?.endDate]);

  const isCampaignExpired = useMemo(() => {
    if (!campaign?.endDate) return false;
    return new Date() > new Date(campaign.endDate);
  }, [campaign]);

  useEffect(() => {
    if (campaign && campaign.fulfillmentSettings) {
      const mode = campaign.fulfillmentSettings.mode;
      if (mode === 'FIXED') {
        setDeliveryForm(prev => ({
          ...prev,
          deliveryDate: campaign.fulfillmentSettings!.fixedDeliveryDate || '',
          timeSlot: campaign.fulfillmentSettings!.fixedDeliveryTime || ''
        }));
      } else if (mode === 'RANGE') {
        const todayStr = new Date().toISOString().split('T')[0];
        setDeliveryForm(prev => ({
          ...prev,
          deliveryDate: campaign.fulfillmentSettings!.rangeStartDate || todayStr
        }));
      }
    }
  }, [campaign]);

  useEffect(() => {
    if (currentUser) {
      setDeliveryForm(prev => ({
        ...prev,
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      }));
      setEventLeadForm(prev => ({
        ...prev,
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchCampaignData = async () => {
      try {
        const allCampaigns = await getCampaigns();
        const foundCampaign = allCampaigns.find(c => c.id === id || c.slug === id);
        if (!foundCampaign || !foundCampaign.isActive) {
          if (active) setLoading(false);
          return;
        }

        const currentUser = authService.getUser();
        if (foundCampaign.sharePrivacy === 'PRIVATE') {
          if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.brandId !== foundCampaign.brandId)) {
             setAccessDeniedMsg('This campaign is private and requires administrator access.');
             setCampaign(null); // Deny access
             if (active) setLoading(false);
             return;
          }
        } else if (foundCampaign.sharePrivacy === 'CUSTOMERS') {
          if (!currentUser) {
             setAccessDeniedMsg('This campaign is for signed-in customers only. Please sign in to view this campaign.');
             setCampaign(null); // Deny access
             if (active) setLoading(false);
             return;
          }
        }

        const brands = await getBrands();
        const foundBrand = brands.find(b => b.id === foundCampaign.brandId);

        const allItems = await dbService.getMenuItems();
        const searchParams = new URLSearchParams(window.location.search);
        const allowedItemsParam = searchParams.get('items');
        const allowedItemsList = allowedItemsParam ? allowedItemsParam.split(',') : null;

        const campaignItems = allItems
            .filter(i => i.campaignId === foundCampaign.id && i.brandId === foundCampaign.brandId && i.isActive !== false)
            .filter(i => allowedItemsList ? allowedItemsList.includes(i.id) : true)
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        if (active) {
          setCampaign(foundCampaign);
          setBrand(foundBrand || null);
          setItems(campaignItems);
          setLoading(false);

          // Log the visit asynchronously
          try {
            await dbService.addCampaignLog({
              id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              campaignId: foundCampaign.id,
              action: 'PAGE_VISIT',
              details: 'Campaign page loaded',
              performedBy: currentUser ? currentUser.name : 'Guest User',
              timestamp: new Date().toISOString()
            });
          } catch (e) {
            console.error("Error logging visit", e);
          }
        }
      } catch (err) {
        console.error(err);
        if (active) setLoading(false);
      }
    };

    fetchCampaignData();
    return () => { active = false; };
  }, [id]);

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart(prev => {
      const current = prev[cartKey] || 0;
      const next = current + delta;
      if (next <= 0) {
        const newCart = { ...prev };
        delete newCart[cartKey];
        return newCart;
      }
      return { ...prev, [cartKey]: next };
    });
  };

  const getCartTotal = () => {
    let total = 0;
    Object.entries(cart).forEach(([cartKey, quantity]) => {
      const [itemId, variantSize] = cartKey.split('_');
      const item = items.find(i => i.id === itemId);
      if (item) {
        let price = item.offerPrice;
        if (variantSize && variantSize !== 'default') {
          const variant = item.variants?.find(v => v.size === variantSize);
          if (variant) price = variant.offerPrice;
        }
        total += Number(price) * Number(quantity);
      }
    });
    return total;
  };

  const getProductSavings = () => {
    let savings = 0;
    Object.entries(cart).forEach(([cartKey, quantity]) => {
      const [itemId, variantSize] = cartKey.split('_');
      const item = items.find(i => i.id === itemId);
      if (item) {
        let mrp = item.mrp;
        let price = item.offerPrice;
        if (variantSize && variantSize !== 'default') {
          const variant = item.variants?.find(v => v.size === variantSize);
          if (variant) {
            mrp = variant.mrp;
            price = variant.offerPrice;
          }
        }
        if (mrp > price) {
          savings += (mrp - price) * Number(quantity);
        }
      }
    });
    return savings;
  };

  const getChargesAndBenefits = () => {
    const subtotal = getCartTotal();
    const b = campaign?.benefits || {
      freeDelivery: false,
      minOrderValueForFreeDelivery: 0,
      deliveryChargeAmount: 40,
      packagingChargeAmount: 20,
      waivePackagingCharge: false,
      processingFeeAmount: 30,
      waiveProcessingFee: false,
    };
    
    // Check if free delivery applies
    const isFreeDelivery = b.freeDelivery && (!b.minOrderValueForFreeDelivery || subtotal >= b.minOrderValueForFreeDelivery);
    
    const charges = {
      delivery: isFreeDelivery ? 0 : b.deliveryChargeAmount,
      packaging: b.waivePackagingCharge ? 0 : b.packagingChargeAmount,
      processing: b.waiveProcessingFee ? 0 : b.processingFeeAmount,
    };
    
    const savings = {
      product: getProductSavings(),
      delivery: isFreeDelivery ? b.deliveryChargeAmount : 0,
      packaging: b.waivePackagingCharge ? b.packagingChargeAmount : 0,
      processing: b.waiveProcessingFee ? b.processingFeeAmount : 0,
    };
    
    const totalSavings = savings.product + savings.delivery + savings.packaging + savings.processing;
    const gstTotal = subtotal * 0.05;
    const grandTotal = subtotal + gstTotal + charges.delivery + charges.packaging + charges.processing;
    
    return { charges, savings, totalSavings, gstTotal, grandTotal, subtotal };
  };

  const proceedToDelivery = () => {
    setCheckoutStep('DELIVERY');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const isDeliveryFormValid = () => {
    return !!(
      deliveryForm.name &&
      deliveryForm.phone.length === 10 &&
      deliveryForm.email &&
      deliveryForm.address &&
      deliveryForm.pincode &&
      deliveryForm.city &&
      deliveryForm.state &&
      deliveryForm.deliveryDate &&
      deliveryForm.timeSlot
    );
  };

  const proceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isServiceable) {
      alert("Sorry, this brand is currently unavailable at your selected delivery location.");
      return;
    }
    submitOrder();
  };

  const submitOrder = async () => {
    if (Object.keys(cart).length === 0 || isProcessing) return;
    setIsProcessing(true);

    if (!deliveryForm.name || !deliveryForm.phone || !deliveryForm.address || !deliveryForm.city || !deliveryForm.pincode || !deliveryForm.deliveryDate || !deliveryForm.timeSlot) {
      setCheckoutStep('DELIVERY');
      setIsProcessing(false);
      setTimeout(() => {
        const form = document.getElementById('delivery-form') as HTMLFormElement;
        if (form) {
          form.reportValidity();
          // Scroll slightly up to ensure the prompt is well within view
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return;
    }
    
    const orderItems = Object.entries(cart).map(([cartKey, quantity]) => {
      const [itemId, variantSize] = cartKey.split('_');
      const item = items.find(i => i.id === itemId)!;
      // Strip base64 image to prevent document size limit error
      const { mealImage, ...strippedItem } = item;
      const oItem: any = { menuItem: strippedItem, quantity };
      if (variantSize !== 'default') oItem.variantSize = variantSize;
      return oItem;
    });

    const { grandTotal, gstTotal, totalSavings } = getChargesAndBenefits();
    
    const generatedOrderId = `ORD-${Date.now().toString().slice(-6)}`;

    const newOrder = {
      id: generatedOrderId,
      userId: currentUser?.id || `guest-${deliveryForm.phone || deliveryForm.email || 'user'}`,
      recipientName: deliveryForm.name,
      recipientEmail: deliveryForm.email,
      recipientContact: deliveryForm.phone,
      company: currentUser?.company || '',
      campaignId: campaign!.id,
      campaignName: campaign!.name,
      campaignExpiry: campaign!.endDate || '',
      scheduledDeliveryDate: deliveryForm.deliveryDate,
      scheduledDeliveryTime: deliveryForm.timeSlot,
      items: orderItems,
      totalAmount: grandTotal,
      gstAmount: gstTotal,
      savingsAmount: totalSavings,
      paymentMethod: 'ONLINE',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      refundStatus: 'NONE',
      orderVariant: 'SELF',
      deliveryDate: deliveryForm.deliveryDate,
      deliveryTime: deliveryForm.timeSlot,
      shippingAddress: `${deliveryForm.address}, ${deliveryForm.landmark}, ${deliveryForm.city}, ${deliveryForm.state} - ${deliveryForm.pincode}`,
      specialInstructions: deliveryForm.instructions,
      createdAt: new Date().toISOString(),
      auditLogs: [{
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CREATED_FROM_CAMPAIGN',
        performedBy: deliveryForm.name || 'Lead/Guest',
      }]
    };

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert('Failed to load Razorpay SDK. Are you online?');
        return;
      }

      const razorpayOrder = await createRazorpayOrder(grandTotal);

      const pendingOrder = JSON.parse(JSON.stringify({
        ...newOrder,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        paymentReference: razorpayOrder.id
      }));
      
      await dbService.addOrder(pendingOrder);

      const options = {
        key: razorpayOrder.key_id, 
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: brand!.name,
        description: campaign!.name,
        order_id: razorpayOrder.id,
        prefill: {
          name: deliveryForm.name,
          email: deliveryForm.email,
          contact: deliveryForm.phone,
        },
        theme: {
          color: '#ef4444', 
        },
      };
      
      try {
        localStorage.setItem('qwikmeal_pending_order_id', generatedOrderId);
        localStorage.setItem('qwikmeal_pending_rzp_order_id', razorpayOrder.id);
        
        const response = await handleRazorpayCheckout(options);
        
        localStorage.removeItem('qwikmeal_pending_order_id');
        localStorage.removeItem('qwikmeal_pending_rzp_order_id');
        // Update UI immediately
        setOrderId(generatedOrderId);
        setSavedAmount(totalSavings);
        setCheckoutStep('SUCCESS');
        setCart({});
        
        dbService.updateOrder(generatedOrderId, {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentReference: response.razorpay_payment_id
        }).catch(dbErr => {
          console.error("Firebase sync delayed or failed:", dbErr);
        });
      } catch (checkoutErr: any) {
        console.error("Payment failed or cancelled:", checkoutErr);
        alert("Payment could not be completed: " + (checkoutErr.message || "Cancelled"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error placing order: " + (err.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const submitEventLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLead = {
        id: `LD-${Date.now()}`,
        customerId: currentUser?.id || `guest-${eventLeadForm.phone || eventLeadForm.email || 'user'}`,
        campaignId: campaign?.id || '',
        name: eventLeadForm.name || '',
        phone: eventLeadForm.phone || '',
        email: eventLeadForm.email || '',
        eventType: eventLeadForm.eventType || '',
        eventDate: eventLeadForm.eventDate || '',
        guestCount: parseInt(eventLeadForm.guestCount) || 0,
        location: eventLeadForm.location || '',
        requirements: `${eventLeadForm.budget ? `Budget: ${eventLeadForm.budget}\n\n` : ''}${eventLeadForm.requirements || ''}`,
        status: 'NEW',
        timestamp: new Date().toISOString()
      };
      const cleanedLead = JSON.parse(JSON.stringify(newLead));
      await dbService.addLead(cleanedLead);
      setShowEventPrompt(false);
      alert("Thank you for your interest. Our event planning team will contact you shortly.");
      setEventLeadForm(prev => ({ ...prev, eventType: 'Corporate Event', eventDate: '', guestCount: '', location: '', budget: '', requirements: '' }));
    } catch (err) {
      console.error(err);
      alert("Failed to submit inquiry.");
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading campaign details...</div>;
  }

  if (accessDeniedMsg) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-8">{accessDeniedMsg}</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!campaign || !brand) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Campaign Not Found</h2>
        <p className="text-gray-500 text-center max-w-md">
          This campaign link may be expired, invalid, or you might not have permission to view it.
        </p>
        <Link to="/" className="mt-8 bg-red-600 text-white px-6 py-3 rounded-full font-bold hover:bg-red-700">
          Go to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-dvh pb-20 pt-[env(safe-area-inset-top,0px)]">
      {/* Campaign Banner */}
      <div className="relative w-full h-80 bg-gray-900 overflow-hidden">
        <img 
          src={brand.logo || undefined} 
          alt={brand.name} 
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        <div className="relative z-10 h-full max-w-5xl mx-auto px-4 flex flex-col justify-end pb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-white rounded-xl p-2 shadow-lg flex items-center justify-center">
              <img src={brand.logo || undefined} alt={brand.name} className="max-w-full max-h-full object-contain" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-red-400 font-bold uppercase tracking-wider text-sm">{brand.name}</span>
                <span className="bg-blue-100/20 border border-blue-200/50 text-blue-200 backdrop-blur-sm text-xs px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                  <ShieldCheck size={12} /> Verified Merchant
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">{campaign.name}</h1>
            </div>
          </div>
          <p className="text-gray-300 max-w-2xl text-lg">
            {brand.description}
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            {campaign.endDate && (
               <div className="bg-red-900/40 border border-red-800 rounded-lg px-4 py-2 flex items-center gap-2">
                 <Clock className="text-red-400" size={18} />
                 <div>
                   <p className="text-xs text-red-200">Order Window Closes</p>
                   <p className="text-sm font-bold text-white">{new Date(campaign.endDate).toLocaleString()}</p>
                 </div>
               </div>
            )}
            
            {campaign.fulfillmentSettings?.mode === 'FIXED' && campaign.fulfillmentSettings.fixedDeliveryDate && (
               <div className="bg-blue-900/40 border border-blue-800 rounded-lg px-4 py-2 flex items-center gap-2">
                 <MapPin className="text-blue-400" size={18} />
                 <div>
                   <p className="text-xs text-blue-200">Scheduled Delivery</p>
                   <p className="text-sm font-bold text-white">{new Date(campaign.fulfillmentSettings.fixedDeliveryDate).toLocaleDateString()} | {campaign.fulfillmentSettings.fixedDeliveryTime}</p>
                 </div>
               </div>
            )}

            {campaign.socialProof?.enabled && (
              <>
                <div className="bg-yellow-900/40 border border-yellow-800 rounded-lg px-4 py-2 flex items-center gap-2">
                 <Flame className="text-yellow-400" size={18} />
                 <div>
                   <p className="text-sm font-bold text-white">{campaign.socialProof.ordersPlaced}+ Ordered</p>
                   <p className="text-xs text-yellow-200">High Demand</p>
                 </div>
               </div>
               
               <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 flex flex-col justify-center">
                 <div className="flex items-center gap-1">
                   <Star className="text-yellow-400 fill-current" size={14} />
                   <span className="text-sm font-bold text-white leading-none">{campaign.socialProof.rating}/5</span>
                 </div>
                 <p className="text-xs text-gray-300 mt-0.5">Top Rated</p>
               </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Banner indicating Secure Checkout */}
      <div className="w-full bg-green-50 border-b border-green-100 py-3 shadow-sm z-20 relative">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-xs sm:text-sm text-green-800 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-green-600" />
            <span>Secure Checkout by QwikMeal</span>
          </div>
          {campaign.endDate && !isCampaignExpired && timeLeft && (
            <div className="flex items-center gap-2">
               <Clock size={16} className="text-green-600" />
               <span>Ends in: <strong className="tabular-nums">{timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</strong></span>
            </div>
          )}
          {isCampaignExpired && (
            <div className="flex items-center gap-2 text-red-600">
               <Clock size={16} />
               <span>Campaign Expired</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {checkoutStep === 'SUCCESS' ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center text-green-800 shadow-sm">
                  <Receipt className="w-20 h-20 mx-auto mb-6 text-green-500" />
                  <h2 className="text-4xl font-bold mb-3">Order Confirmed!</h2>
                  <p className="text-xl text-green-700 mb-2">Order ID: {orderId}</p>
                  <p className="text-lg mb-8 opacity-90">Your order has been placed successfully. Thank you for shopping with us.</p>
                  
                  {savedAmount > 0 && (
                    <div className="bg-white border-dashed border-2 border-green-300 rounded-xl p-4 mb-8 inline-block">
                      <span className="text-green-800 text-lg font-bold block">
                        🎉 Total Savings: ₹{savedAmount}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <button onClick={() => setCheckoutStep('PRODUCTS')} className="bg-white text-green-800 border border-green-200 font-bold py-3 px-6 rounded-lg hover:bg-green-100 transition shadow-sm">
                      Continue Shopping
                    </button>
                    {(currentUser?.role === 'CORPORATE_USER' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'BRAND_ADMIN') ? (
                      <Link to="/user/campaign-orders" className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition shadow-md">
                        View Order History
                      </Link>
                    ) : (
                      <div className="bg-green-600/10 text-green-800 px-6 py-3 rounded-lg font-medium">
                        We will notify you soon!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : checkoutStep === 'DELIVERY' ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <button onClick={() => setCheckoutStep('PRODUCTS')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
                    <ChevronLeft size={24} />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">Delivery Details</h2>
                </div>
                
                <form id="delivery-form" onSubmit={proceedToPayment} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 border-b pb-2">Contact Information</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input required type="text" value={deliveryForm.name} onChange={e => setDeliveryForm({...deliveryForm, name: e.target.value})} className={`w-full rounded-lg px-4 py-2 outline-none transition-colors ${!deliveryForm.name ? 'border-2 border-red-300 bg-red-50/50 focus:border-red-500' : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`} placeholder="John Doe" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                        <input required type="tel" pattern="^[6-9]\d{9}$" minLength={10} maxLength={10} title="Please enter a valid 10-digit mobile number" value={deliveryForm.phone} onChange={e => setDeliveryForm({...deliveryForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} className={`w-full rounded-lg px-4 py-2 outline-none transition-colors ${(!deliveryForm.phone || deliveryForm.phone.length !== 10) ? 'border-2 border-red-300 bg-red-50/50 focus:border-red-500' : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`} placeholder="9876543210" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                        <input required type="email" value={deliveryForm.email} onChange={e => setDeliveryForm({...deliveryForm, email: e.target.value})} className={`w-full rounded-lg px-4 py-2 outline-none transition-colors ${!deliveryForm.email ? 'border-2 border-red-300 bg-red-50/50 focus:border-red-500' : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`} placeholder="john@example.com" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 border-b pb-2">Delivery Information</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">House/Flat/Block No. & Street <span className="text-red-500">*</span></label>
                        <input required type="text" value={deliveryForm.address} onChange={e => setDeliveryForm({...deliveryForm, address: e.target.value})} className={`w-full rounded-lg px-4 py-2 outline-none transition-colors ${!deliveryForm.address ? 'border-2 border-red-300 bg-red-50/50 focus:border-red-500' : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`} placeholder="123 Main St, Apartment 4B" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                        <input type="text" value={deliveryForm.landmark} onChange={e => setDeliveryForm({...deliveryForm, landmark: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Near Apollo Hospital" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                          <input readOnly required type="text" value={deliveryForm.pincode} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input readOnly required type="text" value={deliveryForm.city} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <input readOnly required type="text" value={deliveryForm.state} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-500" />
                        </div>
                      </div>

                      {deliveryForm.pincode && deliveryForm.city && (
                        <div className="bg-green-50 text-green-700 p-2 rounded text-xs flex items-center gap-1 border border-green-100 mt-2">
                          <MapPin size={14}/> Delivery available in {deliveryForm.city}, {deliveryForm.state} - {deliveryForm.pincode}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2">Preferences</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date <span className="text-red-500">*</span></label>
                        <input 
                          required 
                          type="date" 
                          min={campaign?.fulfillmentSettings?.mode === 'RANGE' && campaign.fulfillmentSettings.rangeStartDate ? campaign.fulfillmentSettings.rangeStartDate : new Date().toISOString().split('T')[0]} 
                          max={campaign?.fulfillmentSettings?.mode === 'RANGE' && campaign.fulfillmentSettings.rangeEndDate ? campaign.fulfillmentSettings.rangeEndDate : undefined}
                          readOnly={campaign?.fulfillmentSettings?.mode === 'FIXED'}
                          value={deliveryForm.deliveryDate} 
                          onChange={e => setDeliveryForm({...deliveryForm, deliveryDate: e.target.value})} 
                          className={`w-full rounded-lg px-4 py-2 outline-none transition-colors ${campaign?.fulfillmentSettings?.mode === 'FIXED' ? 'bg-gray-50 border border-gray-200 text-gray-600' : (!deliveryForm.deliveryDate ? 'border-2 border-red-300 bg-red-50/50 focus:border-red-500' : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500')}`} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time Slot <span className="text-red-500">*</span></label>
                        {campaign?.fulfillmentSettings?.mode === 'FIXED' ? (
                          <input 
                            readOnly
                            value={deliveryForm.timeSlot}
                            className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 text-gray-600 outline-none"
                          />
                        ) : (
                          <select required value={deliveryForm.timeSlot} onChange={e => setDeliveryForm({...deliveryForm, timeSlot: e.target.value})} className={`w-full rounded-lg px-4 py-2 outline-none transition-colors ${!deliveryForm.timeSlot ? 'border-2 border-red-300 bg-red-50/50 focus:border-red-500' : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`}>
                            <option value="">Select a time slot</option>
                            <option>Lunch (12:30 PM - 1:30 PM)</option>
                            <option>Late Lunch (1:30 PM - 2:30 PM)</option>
                            <option>Evening Snacks (4:30 PM - 5:30 PM)</option>
                            <option>Dinner (7:30 PM - 8:30 PM)</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (Optional)</label>
                      <textarea value={deliveryForm.instructions} onChange={e => setDeliveryForm({...deliveryForm, instructions: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 h-20" placeholder="E.g., Please leave at reception"></textarea>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                {hasServiceabilityRequirement && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-8 text-sm sm:text-base border-b border-gray-100 pb-4 justify-center sm:justify-start">
                    <span className={serviceabilityPassed ? 'font-bold text-green-600 flex items-center gap-1' : 'font-bold text-gray-900 flex items-center gap-1'}>
                      Step 1: Check Serviceability {serviceabilityPassed && <span className="text-green-600 shadow-sm rounded-full bg-white scale-150">✓</span>}
                    </span>
                    <span className="text-gray-300 hidden sm:inline">|</span>
                    <span className={!serviceabilityPassed ? 'text-gray-400 flex items-center gap-1' : 'font-bold text-gray-900 flex items-center gap-1'}>
                      Step 2: Select Items
                    </span>
                    <span className="text-gray-300 hidden sm:inline">|</span>
                    <span className={!serviceabilityPassed ? 'text-gray-400 flex items-center gap-1' : 'font-bold text-gray-900 flex items-center gap-1'}>
                      Step 3: Checkout
                    </span>
                  </div>
                )}

                {hasServiceabilityRequirement && (!deliveryPinCode || deliveryPinCode.length < 6) && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 sm:p-8 flex flex-col items-center text-center mb-8 shadow-sm">
                     <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm">
                       <MapPin size={28} className="text-indigo-600" />
                     </div>
                     <h3 className="text-xl sm:text-2xl font-bold text-indigo-900 mb-2">Check Delivery Availability</h3>
                     <p className="text-indigo-700/80 mb-6 max-w-md text-sm sm:text-base">Please enter your 6-digit delivery pincode to see if we deliver to your location before adding items to your cart.</p>
                     
                     <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                       <input 
                         type="text" 
                         placeholder="Enter Pincode" 
                         value={deliveryPinCode}
                         onChange={e => setDeliveryPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                         className="border border-indigo-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full bg-white outline-none shadow-sm text-center tracking-wider text-lg"
                       />
                     </div>
                  </div>
                )}

                <h2 id="menu-items-section" className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  Available Items ({items.length})
                </h2>

                {hasServiceabilityRequirement && deliveryPinCode && deliveryPinCode.length === 6 && (
                  <>
                    {serviceabilityPassed && !isCampaignExpired && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between mb-8 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 text-green-600 p-2 rounded-full">
                            <MapPin size={24} />
                          </div>
                          <div className="text-left">
                            <p className="text-green-800 font-semibold">Delivery Available {deliveryForm.city && deliveryForm.state ? `in ${deliveryForm.city}` : ''} ({deliveryPinCode})</p>
                            <p className="text-green-700 text-sm">You can now add items to your cart.</p>
                          </div>
                        </div>
                        <button onClick={() => setDeliveryPinCode('')} className="mt-3 sm:mt-0 text-sm font-semibold text-green-700 underline hover:text-green-800 bg-white/50 px-3 py-1.5 rounded-lg border border-green-200">
                          Change
                        </button>
                      </div>
                    )}

                    {!serviceabilityPassed && !isCampaignExpired && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-8 shadow-sm">
                        <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm mx-auto">
                           <MapPin size={28} className="text-red-500" />
                        </div>
                        <p className="text-red-700 font-bold text-lg mb-2">Sorry, delivery is currently unavailable at your location ({deliveryPinCode}).</p>
                        <p className="text-red-600 text-sm mb-6">Please raise your request using the 'Plan My Event' link below or try a different pincode.</p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <button onClick={() => setDeliveryPinCode('')} className="inline-flex items-center justify-center gap-2 bg-white border border-red-300 text-red-700 font-medium py-2 px-6 rounded-lg hover:bg-red-50 transition shadow-sm w-full sm:w-auto">
                            Change Pincode
                          </button>
                          
                          <a 
                            href={brand?.storeLocatorEnabled && brand?.storeLocatorUrl ? brand.storeLocatorUrl : `https://www.google.com/maps/search/${encodeURIComponent((brand?.name || 'Store') + ' near me')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-red-600 text-white font-medium py-2 px-6 rounded-lg hover:bg-red-700 transition shadow-sm w-full sm:w-auto"
                          >
                            <MapPin size={18} />
                            View Nearby Stores
                          </a>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-red-200">
                          <button onClick={() => { setShowEventPrompt(true); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}} className="text-sm font-semibold text-red-700 underline hover:text-red-800">
                            Plan My Event
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                  {isCampaignExpired && (
                    <div className="bg-gray-100 border border-gray-300 rounded-xl p-6 text-center mb-8">
                      <Clock size={32} className="mx-auto text-gray-400 mb-3" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Campaign Has Ended</h3>
                      <p className="text-gray-600 mb-4">This campaign has expired and is no longer accepting new orders.</p>
                      <p className="text-sm font-medium text-gray-700">Please plan your order with us directly. We require at least 24 hours notice to serve your order.</p>
                      <button onClick={() => { setShowEventPrompt(true); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}} className="mt-4 inline-block bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition">
                        Plan My Order
                      </button>
                    </div>
                  )}

                    <div className={`grid sm:grid-cols-2 gap-6 ${isCampaignExpired ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
                      {items.length === 0 ? (
                      <p className="text-gray-500">No items configured for this campaign.</p>
                    ) : items.map(item => {
                      const activeVariants = item.variants?.filter(v => v.isActive) || [];
                      const hasVariants = activeVariants.length > 0;
                      
                      return (
                      <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                        <div className="h-48 overflow-hidden bg-gray-100">
                          <img src={item.mealImage || undefined} alt={item.name} loading="lazy" className="w-full h-full object-contain" />
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                             <div className={`w-4 h-4 rounded-sm border ${item.dietaryType === 'VEG' ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'} flex items-center justify-center`}>
                                <div className={`w-2 h-2 rounded-full ${item.dietaryType === 'VEG' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                             </div>
                             <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{item.name}</h3>
                          </div>
                          {item.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3 h-10">{item.description}</p>}
                          
                          <div className="mt-auto">
                            {!hasVariants ? (
                              <div className="flex items-end justify-between mt-4">
                                <div>
                                  <span className="text-sm text-gray-500 line-through">₹{item.mrp}</span>
                                  <div className="font-bold text-xl text-gray-900">₹{item.offerPrice}</div>
                                </div>
                                {item.proposedSaving > 0 && (
                                  <div className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                    Save ₹{item.proposedSaving}
                                  </div>
                                )}
                              </div>
                            ) : null}

                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                              {hasVariants ? (
                                activeVariants.map(variant => {
                                  const cartKey = `${item.id}_${variant.size}`;
                                  return (
                                    <div key={variant.size} className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="font-bold text-sm text-gray-900">{variant.size}</div>
                                        <div className="text-sm">
                                          <span className="font-bold text-gray-900 mr-2">₹{variant.offerPrice}</span>
                                          {variant.mrp > variant.offerPrice && <span className="text-gray-500 line-through text-xs">₹{variant.mrp}</span>}
                                        </div>
                                      </div>
                                      <div className="shrink-0 w-24">
                                        {cart[cartKey] ? (
                                          <div className="flex justify-between items-center bg-gray-50 rounded-md p-1 border border-gray-200">
                                            <button onClick={() => updateQuantity(cartKey, -1)} className="p-1 px-1.5 text-red-600 hover:bg-red-50 rounded transition"><Minus size={14} /></button>
                                            <span className="font-bold text-gray-900 text-sm w-4 text-center">{cart[cartKey]}</span>
                                            <button onClick={() => updateQuantity(cartKey, 1)} className="p-1 px-1.5 text-green-600 hover:bg-green-50 rounded transition"><Plus size={14} /></button>
                                          </div>
                                        ) : (
                                          <button 
                                            onClick={() => updateQuantity(cartKey, 1)}
                                            className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-bold py-1.5 rounded-md transition text-sm flex items-center justify-center gap-1"
                                          >
                                            <Plus size={14}/> Add
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <>
                                  {cart[`${item.id}_default`] ? (
                                    <div className="flex justify-between items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                                      <button 
                                        onClick={() => updateQuantity(`${item.id}_default`, -1)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition"
                                      >
                                        <Minus size={18} />
                                      </button>
                                      <span className="font-bold text-gray-900 w-8 text-center">{cart[`${item.id}_default`]}</span>
                                      <button 
                                        onClick={() => updateQuantity(`${item.id}_default`, 1)}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-md transition"
                                      >
                                        <Plus size={18} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => updateQuantity(`${item.id}_default`, 1)}
                                      className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2 rounded-lg transition flex justify-center items-center gap-2"
                                    >
                                      <Plus size={18}/> Add to Cart
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Event Catering Promotional Banner */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-8 mt-12 shadow-sm text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="md:max-w-2xl">
                    <h3 className="text-xl md:text-2xl font-bold text-indigo-900 mb-2">🎉 Planning an Office Party, Birthday, Family Gathering or Corporate Event?</h3>
                    <p className="text-indigo-700 text-sm md:text-base leading-relaxed">
                      Get delicious food from your favorite brands for groups of any size. Special pricing and customized meal solutions available.
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => { setShowEventPrompt(true); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                      Request a Catering Quote
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Cart / Summary */}
          {checkoutStep !== 'SUCCESS' && serviceabilityPassed && (
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag /> {checkoutStep === 'PRODUCTS' ? 'Your Cart' : 'Order Summary'}
                </h3>
                  
                {Object.keys(cart).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-100">
                      <ShoppingBag size={28} className="text-orange-500" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">🍽️ Delicious food is waiting for you!</h4>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                      Start building your cart and unlock exclusive campaign savings, free delivery benefits, and special offers available for a limited time.
                    </p>
                    <button onClick={() => { window.scrollTo({ top: document.getElementById('menu-items-section')?.offsetTop || 0, behavior: 'smooth' })}} className="bg-red-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-red-700 transition shadow-sm w-full">
                      🛒 Start Building My Cart
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {checkoutStep === 'PRODUCTS' && (
                      <div className="space-y-4 mb-4">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                          <div className="font-bold text-red-800 mb-1 flex items-center gap-1">
                            🔥 Exclusive Campaign Benefits Active
                          </div>
                          <ul className="text-red-700 space-y-0.5 text-xs">
                            {getChargesAndBenefits().savings.product > 0 && <li>• Special Discounts</li>}
                            {getChargesAndBenefits().charges.delivery === 0 && <li>• Free Delivery</li>}
                            {getChargesAndBenefits().charges.processing === 0 && <li>• Zero Processing Fee</li>}
                            <li>• Instant Checkout</li>
                          </ul>
                        </div>
                      </div>
                    )}
                    {Object.entries(cart).map(([cartKey, qty]) => {
                      const [itemId, variantSize] = cartKey.split('_');
                      const item = items.find(i => i.id === itemId);
                      if (!item) return null;
                      
                      let price = item.offerPrice;
                      let displayName = item.name;
                      if (variantSize && variantSize !== 'default') {
                        const variant = item.variants?.find(v => v.size === variantSize);
                        if (variant) price = variant.offerPrice;
                        displayName = `${item.name} (${variantSize})`;
                      }

                      return (
                        <div key={cartKey} className="flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{displayName}</h4>
                            <div className="text-sm text-gray-500">
                              ₹{price} x {qty} = <span className="font-bold text-gray-900">₹{Number(price) * Number(qty)}</span>
                            </div>
                          </div>
                          {checkoutStep === 'PRODUCTS' ? (
                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200 scale-90 origin-right shrink-0">
                              <button onClick={() => updateQuantity(cartKey, -1)} className="p-1 px-2 text-red-600 hover:bg-red-50 rounded"><Minus size={14}/></button>
                              <span className="font-bold text-sm w-4 text-center">{qty}</span>
                              <button onClick={() => updateQuantity(cartKey, 1)} className="p-1 px-2 text-green-600 hover:bg-green-50 rounded"><Plus size={14}/></button>
                            </div>
                          ) : (
                             <span className="font-bold text-gray-900 shrink-0 text-sm">{qty}x</span>
                          )}
                        </div>
                      );
                    })}
                    
                    <div className="pt-4 border-t border-gray-200 mt-4 space-y-2">
                      <div className="flex justify-between text-gray-500 mb-1 text-sm">
                        <span>Subtotal</span>
                        <span>₹{getChargesAndBenefits().subtotal}</span>
                      </div>
                      
                      {getChargesAndBenefits().savings.product > 0 && (
                        <div className="flex justify-between text-green-600 mb-1 text-sm font-medium">
                          <span>Product Discount</span>
                          <span>-₹{getChargesAndBenefits().savings.product}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-gray-500 mb-1 text-sm">
                        <span>GST (5%)</span>
                        <span>₹{getChargesAndBenefits().gstTotal.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-gray-500 mb-1 text-sm">
                        <span>Packaging Charges</span>
                        {getChargesAndBenefits().charges.packaging === 0 ? (
                          <span className="text-green-600 font-medium">Free</span>
                        ) : (
                          <span>₹{getChargesAndBenefits().charges.packaging}</span>
                        )}
                      </div>

                      <div className="flex justify-between text-gray-500 mb-1 text-sm">
                        <span>Delivery Charges</span>
                        {getChargesAndBenefits().charges.delivery === 0 ? (
                          <span className="text-green-600 font-medium">Free</span>
                        ) : (
                          <span>₹{getChargesAndBenefits().charges.delivery}</span>
                        )}
                      </div>

                      <div className="flex justify-between text-gray-500 mb-2 text-sm">
                        <span>Processing Fee</span>
                        {getChargesAndBenefits().charges.processing === 0 ? (
                          <span className="text-green-600 font-medium">Free</span>
                        ) : (
                          <span>₹{getChargesAndBenefits().charges.processing}</span>
                        )}
                      </div>

                      <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-3 mt-3">
                        <span>Grand Total</span>
                        <span>₹{getChargesAndBenefits().grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {getChargesAndBenefits().totalSavings > 0 && isDeliveryFormValid() && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-green-900 text-lg flex items-center gap-2">
                            🎉 You Save ₹{getChargesAndBenefits().totalSavings}
                          </h4>
                        </div>
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-green-800 uppercase tracking-wider">Waived Charges & Discounts</h5>
                          <ul className="text-sm text-green-800 space-y-1">
                            {getChargesAndBenefits().savings.product > 0 && (
                              <li className="flex items-center gap-2">
                                <span className="text-green-600 font-bold">✓</span> Product Discount
                              </li>
                            )}
                            {getChargesAndBenefits().savings.packaging > 0 && (
                              <li className="flex items-center gap-2">
                                <span className="text-green-600 font-bold">✓</span> Packaging
                              </li>
                            )}
                            {getChargesAndBenefits().savings.delivery > 0 && (
                              <li className="flex items-center gap-2">
                                <span className="text-green-600 font-bold">✓</span> Delivery
                              </li>
                            )}
                            {getChargesAndBenefits().savings.processing > 0 && (
                              <li className="flex items-center gap-2">
                                <span className="text-green-600 font-bold">✓</span> Processing
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {checkoutStep === 'PRODUCTS' && (
                      <button 
                        onClick={proceedToDelivery}
                        disabled={isCampaignExpired}
                        className={`w-full font-bold py-3 px-4 rounded-lg transition shadow-lg mt-4 ${isCampaignExpired ? 'bg-gray-400 cursor-not-allowed text-white' : (campaign.ctaConfig?.theme === 'teal' ? 'bg-teal-600 hover:bg-teal-700 text-white' : campaign.ctaConfig?.theme === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' : campaign.ctaConfig?.theme === 'orange' ? 'bg-orange-600 hover:bg-orange-700 text-white' : campaign.ctaConfig?.theme === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white')}`}
                      >
                        {isCampaignExpired ? 'Campaign Expired' : `${campaign.ctaConfig?.text || 'Order Now'} (₹${getChargesAndBenefits().grandTotal.toFixed(2)})`}
                      </button>
                    )}

                    {checkoutStep === 'DELIVERY' && isDeliveryFormValid() && (
                      <button 
                        form="delivery-form"
                        type="submit"
                        disabled={isProcessing}
                        className={`w-full font-bold py-3 px-4 rounded-lg transition shadow-lg mt-4 flex items-center justify-center gap-2 ${
                          isProcessing ? 'bg-gray-400 text-white cursor-not-allowed' :
                          campaign.ctaConfig?.theme === 'teal' ? 'bg-teal-600 hover:bg-teal-700 text-white' : campaign.ctaConfig?.theme === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' : campaign.ctaConfig?.theme === 'orange' ? 'bg-orange-600 hover:bg-orange-700 text-white' : campaign.ctaConfig?.theme === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      >
                        {isProcessing ? 'Processing...' : <><CreditCard size={18} /> Proceed to Payment</>}
                      </button>
                    )}
                  </div>
                )}
              </div>


            </div>
          )}
        </div>
      </div>

      {showEventPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Event Inquiry</h3>
                <p className="text-sm text-gray-500">Provide details for your personalized catering event.</p>
              </div>
              <button onClick={() => setShowEventPrompt(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={submitEventLead} className="p-6 overflow-y-auto space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-2">Contact Details</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input required type="text" value={eventLeadForm.name} onChange={e => setEventLeadForm({...eventLeadForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Your Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input required type="tel" pattern="^[6-9]\d{9}$" minLength={10} maxLength={10} title="Please enter a valid 10-digit mobile number" value={eventLeadForm.phone} onChange={e => setEventLeadForm({...eventLeadForm, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="+91 9000000000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input required type="email" value={eventLeadForm.email} onChange={e => setEventLeadForm({...eventLeadForm, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="you@company.com" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-2">Event Specifications</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select required value={eventLeadForm.eventType} onChange={e => setEventLeadForm({...eventLeadForm, eventType: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>Corporate Event</option>
                      <option>Office Party</option>
                      <option>Birthday Party</option>
                      <option>Family Gathering</option>
                      <option>Anniversary</option>
                      <option>Festival Celebration</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                      <input type="date" required value={eventLeadForm.eventDate} onChange={e => setEventLeadForm({...eventLeadForm, eventDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                      <input type="number" required min="1" value={eventLeadForm.guestCount} onChange={e => setEventLeadForm({...eventLeadForm, guestCount: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. 50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Location</label>
                    <input type="text" required value={eventLeadForm.location} onChange={e => setEventLeadForm({...eventLeadForm, location: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="City or Venue area" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 border-b pb-2">Additional Information</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approximate Budget (Optional)</label>
                  <input type="text" value={eventLeadForm.budget} onChange={e => setEventLeadForm({...eventLeadForm, budget: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. ₹50,000 or ₹1,000 per plate" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements (Optional)</label>
                  <textarea value={eventLeadForm.requirements} onChange={e => setEventLeadForm({...eventLeadForm, requirements: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20" placeholder="Dietary restrictions, preferred cuisine, themes..."></textarea>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-100 flex justify-end gap-4">
                <button type="button" onClick={() => setShowEventPrompt(false)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-8 rounded-lg hover:bg-blue-700 shadow-md transition">Submit Inquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
