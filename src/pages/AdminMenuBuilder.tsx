import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Save, Trash2, CheckCircle2, Edit2, X, Upload, BarChart3, Users, DollarSign, ShoppingBag, Eye, EyeOff, Share2, Copy, MessageSquare, Mail, Link2, Download, MapPin, Calendar, Clock, Search, Filter } from 'lucide-react';
import { MenuItem, Campaign, Brand, ItemVariant, CampaignPrivacy, CoverageType, ServiceabilitySettings, FulfillmentSettings, MasterMenuItem } from '../types';
import { getBrands } from '../brands';
import { updateCampaignCTA, updateCampaignSocialProof, getCampaigns, updateCampaignName, updateCampaignPrivacy, updateCampaignBenefits, updateCampaignTimeline, updateCampaignFulfillment } from '../campaigns';
import { authService } from '../auth';
import { dbService } from '../db';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ExportOrdersModal } from '../components/ExportOrdersModal';
import { ImageUploadCropper } from '../components/ImageUploadCropper';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

import imgFallback from '../assets/images/img_1543339308.jpg';

export function AdminMenuBuilder() {
  const user = authService.getUser();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allowedBrands, setAllowedBrands] = useState<Brand[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [masterMenuItems, setMasterMenuItems] = useState<MasterMenuItem[]>([]);
  const [showMasterMenuModal, setShowMasterMenuModal] = useState(false);
  const [mmSearch, setMmSearch] = useState('');
  const [mmCategory, setMmCategory] = useState('');

  useEffect(() => {
    getBrands().then(loadedBrands => {
      const active = loadedBrands.filter(b => b.isActive !== false);
      setBrands(active);
      const uAllowed = user?.brandId && user.role !== 'SUPER_ADMIN' ? active.filter(b => b.id === user.brandId) : active;
      setAllowedBrands(uAllowed);
      if (uAllowed.length > 0 && !brandId) {
        setBrandId(uAllowed[0].id);
      }
    });
  }, []);

  const [items, setItems] = useState<MenuItem[]>([]);
  
  const loadMenuItems = async () => {
    try {
      const fbItems = await dbService.getMenuItems();
      setItems(fbItems);
    } catch(e) {
       console.error("Error loading items", e);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);
  
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  
  useEffect(() => {
    getCampaigns().then(setAllCampaigns);
  }, []);

  const [brandId, setBrandId] = useState('');
  const brandCampaigns = allCampaigns.filter(c => c.brandId === brandId);
  const [campaignId, setCampaignId] = useState(brandCampaigns[0]?.id || 'c1');
  
  // For renaming
  const [isEditingCampaignName, setIsEditingCampaignName] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  
  useEffect(() => {
    // Keep campaignId in sync if brand changes and it becomes invalid
    if (brandCampaigns.length > 0 && !brandCampaigns.find(c => c.id === campaignId)) {
      setCampaignId(brandCampaigns[0].id);
    } else if (brandCampaigns.length === 0) {
      setCampaignId('');
    }
  }, [brandId, brandCampaigns, campaignId]);

  useEffect(() => {
    if (brandId) {
       dbService.getMasterMenuItems(brandId).then(list => setMasterMenuItems(list));
    } else {
       setMasterMenuItems([]);
    }
  }, [brandId]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingVariantsId, setEditingVariantsId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<Partial<MenuItem> | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [campaignLogs, setCampaignLogs] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [shareCustomerName, setShareCustomerName] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFlyerModal, setShowFlyerModal] = useState(false);
  const [waIncludeQR, setWaIncludeQR] = useState(true);
  const [waIncludeBanner, setWaIncludeBanner] = useState(true);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineForm, setTimelineForm] = useState({ startDate: '', endDate: '' });
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [fulfillmentForm, setFulfillmentForm] = useState<FulfillmentSettings>({
    mode: 'OPEN',
    fixedDeliveryDate: '',
    fixedDeliveryTime: '',
    fixedPickupDate: '',
    fixedPickupTime: '',
    rangeStartDate: '',
    rangeEndDate: ''
  });
  const [showSocialProofModal, setShowSocialProofModal] = useState(false);
  const [socialProofForm, setSocialProofForm] = useState({
    enabled: false,
    ordersPlaced: 500,
    rating: 4.8,
    showPopularity: true
  });
  const [showCtaModal, setShowCtaModal] = useState(false);
  const [ctaForm, setCtaForm] = useState({
    enabled: true,
    text: 'Order Now',
    theme: 'teal'
  });
  const [benefitsForm, setBenefitsForm] = useState({
    freeDelivery: false,
    minOrderValueForFreeDelivery: 0,
    deliveryChargeAmount: 40,
    packagingChargeAmount: 20,
    waivePackagingCharge: false,
    processingFeeAmount: 30,
    waiveProcessingFee: false,
  });
  const [currentCampaignPrivacy, setCurrentCampaignPrivacy] = useState<'PUBLIC' | 'PRIVATE' | 'CUSTOMERS'>('PUBLIC');

  const openLogs = async () => {
    if (!campaignId) return;
    try {
      const logs = await dbService.getCampaignLogs(campaignId);
      setCampaignLogs(logs);
      setShowLogsModal(true);
    } catch (e) {}
  };

  const toggleSelectAll = (activeItemsLocal: MenuItem[]) => {
    if (selectedItems.size === activeItemsLocal.length && activeItemsLocal.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(activeItemsLocal.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const bulkStatusUpdate = async (isActive: boolean) => {
    if (selectedItems.size === 0) return;
    const array = Array.from(selectedItems);
    const updated = items.map(i => array.includes(i.id) ? { ...i, isActive } : i);
    setItems(updated);
    try {
      const selectedActiveItems = items.filter(i => array.includes(i.id));
      await Promise.all(selectedActiveItems.map(item => dbService.updateMenuItem({ ...item, isActive })));
      await logCampaignAction('Bulk Status Update', `Set ${isActive ? 'active' : 'inactive'} for ${array.length} items`);
    } catch (e) {}
    setSelectedItems(new Set());
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return;
    const array = Array.from(selectedItems);
    const updated = items.filter(i => !array.includes(i.id));
    setItems(updated);
    try {
      await Promise.all(array.map(id => dbService.deleteMenuItem(id as string)));
      await logCampaignAction('Bulk Delete', `Deleted ${array.length} items`);
    } catch (e) {}
    setSelectedItems(new Set());
  };
  
  const [analytics, setAnalytics] = useState({
    leads: 0,
    orders: 0,
    revenue: 0,
    visits: 0,
    gst: 0,
    conversions: 0,
    leadRevenue: 0
  });

  useEffect(() => {
    if (campaignId) {
      const fetchAnalytics = async () => {
        try {
          let leads: any[] = [];
          try {
            const allLeads = await dbService.getLeads(campaignId);
            leads = allLeads.filter((l: any) => l.eventType);
          } catch (e: any) {
            console.error("Error fetching leads in analytics:", e.message);
            throw new Error(`Leads fetch failed: ${e.message}`);
          }
          
          let allOrders: any[] = [];
          try {
            allOrders = await dbService.getOrders();
          } catch (e: any) {
            console.error("Error fetching orders in analytics:", e.message);
            throw new Error(`Orders fetch failed: ${e.message}`);
          }
          
          const campaignOrders = allOrders.filter((o: any) => o.campaignId === campaignId);
          const revenue = campaignOrders.reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0);
          const gst = campaignOrders.reduce((acc: number, o: any) => acc + (o.gstAmount || 0), 0);
          
          let campaignLogs: any[] = [];
          try {
            campaignLogs = await dbService.getCampaignLogs(campaignId);
          } catch(e) {}
          
          const visitCount = campaignLogs.filter(l => l.action === 'PAGE_VISIT').length;

          const conversions = leads.filter((l: any) => l.status === 'CONVERTED' || l.status === 'CLOSED').length;
          // Placeholder for structured lead revenue if any (currently zero as leads don't carry revenue natively yet)
          const leadRevenue = 0;

          setAnalytics({
            leads: leads.length,
            orders: campaignOrders.length,
            revenue,
            visits: visitCount,
            gst,
            conversions,
            leadRevenue
          });
        } catch (err: any) {
          console.error("Error fetching analytics", err.message || err);
        }
      };
      fetchAnalytics();
    }
  }, [campaignId]);

  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    mealImage: '',
    mrp: 0,
    offerPrice: 0,
    deliveryCharges: 0,
    dietaryType: 'VEG'
  });

  const proposedSaving = (newItem.mrp || 0) - (newItem.offerPrice || 0);

  // Auto-generate flyers
  useEffect(() => {
    let active = true;
    const generateFlyers = async () => {
      const c = allCampaigns.find((camp) => camp.id === campaignId);
      if (c && (!c.flyerPngUrl || !c.flyerPdfUrl)) {
        try {
          // Wait for DOM and assets
          await new Promise(r => setTimeout(r, 1500)); 
          const flyerElement = document.getElementById('whatsapp-flyer-render');
          if (!flyerElement) return;

          const dataUrl = await toPng(flyerElement, { pixelRatio: 2, backgroundColor: '#ffffff', skipAutoScale: true });
          const fetchRes = await fetch(dataUrl);
          const blob = await fetchRes.blob();
          
          if (blob.size < 10000) {
            console.error("Generated flyer is too small (blank canvas suspected)", blob.size);
            return;
          }

          // Generate PDF
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [800, 1131] });
          pdf.addImage(dataUrl, 'PNG', 0, 0, 800, 1131);
          const pdfBlob = pdf.output('blob');

          // Upload PNG
          const pngRef = ref(storage, `flyers/${c.id}_${Date.now()}.png`);
          await uploadBytes(pngRef, blob);
          const pngUrl = await getDownloadURL(pngRef);

          // Upload PDF
          const pdfRef = ref(storage, `flyers/${c.id}_${Date.now()}.pdf`);
          await uploadBytes(pdfRef, pdfBlob);
          const pdfUrl = await getDownloadURL(pdfRef);

          if (active) {
            const updatedCampaign = { ...c, flyerPngUrl: pngUrl, flyerPdfUrl: pdfUrl };
            await dbService.updateCampaign(updatedCampaign);
            setAllCampaigns(prev => prev.map(p => p.id === c.id ? updatedCampaign : p));
          }
        } catch (err) {
          console.error("Flyer auto-generation failed", err);
        }
      }
    };
    generateFlyers();
    return () => { active = false; };
  }, [campaignId, allCampaigns, items]);

  const logCampaignAction = async (action: string, details?: string) => {
    if (!campaignId || !user) return;
    try {
      await dbService.addCampaignLog({
        id: crypto.randomUUID(),
        campaignId,
        timestamp: new Date().toISOString(),
        action,
        performedBy: user.email || user.name || 'Admin',
        details
      });
    } catch (e) {}
  };

  const [mmSelectedItems, setMmSelectedItems] = useState<Set<string>>(new Set());

  const handleAddFromMasterMenu = async () => {
     if (!campaignId) {
        alert("Please create or select a campaign first.");
        return;
     }

     const itemsToAdd = masterMenuItems.filter(i => mmSelectedItems.has(i.id));
     const newItems: MenuItem[] = [];

     for (const mmItem of itemsToAdd) {
        // Skip if already in campaign logic, or allow duplicates? Better skip.
        if (items.find(i => i.masterMenuItemId === mmItem.id && i.campaignId === campaignId)) continue;
        
        const menuItem: MenuItem = {
           id: `mi-${Date.now()}-${Math.floor(Math.random()*1000)}`,
           brandId,
           campaignId,
           masterMenuItemId: mmItem.id,
           name: mmItem.name,
           description: mmItem.description,
           mealImage: mmItem.image || imgFallback,
           mrp: mmItem.basePrice,
           offerPrice: mmItem.discountedPrice || mmItem.basePrice,
           deliveryCharges: 0,
           proposedSaving: (mmItem.basePrice - (mmItem.discountedPrice || mmItem.basePrice)),
           dietaryType: mmItem.dietaryType as any,
           category: mmItem.category,
           isActive: true,
        };
        newItems.push(menuItem);
     }

     if (newItems.length > 0) {
        const updated = [...items, ...newItems];
        setItems(updated);
        try {
           await Promise.all(newItems.map(i => dbService.addMenuItem(i)));
           await logCampaignAction('Items Added from Master Menu', `Added ${newItems.length} items`);
           setShowSuccess(true);
           setTimeout(() => setShowSuccess(false), 3000);
        } catch (e) {
           console.error('Error adding items:', e);
        }
     }
     setShowMasterMenuModal(false);
     setMmSelectedItems(new Set());
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId) {
      alert("Please create or select a campaign first.");
      return;
    }
    if (!newItem.name || !newItem.mrp || !newItem.offerPrice || !newItem.dietaryType) return;
    
    let finalImageUrl = newItem.mealImage || imgFallback;

    try {
      if (itemImageFile) {
        if (newItem.mealImage && newItem.mealImage.length > 700000) {
          alert('Image is too large. Please select an image under 500KB.');
          return;
        }
        finalImageUrl = newItem.mealImage;
      }

      const menuItem: MenuItem = {
        id: `mi-${Date.now()}`,
        brandId,
        campaignId,
        name: newItem.name,
        description: newItem.description,
        mealImage: finalImageUrl,
        mrp: Number(newItem.mrp),
        offerPrice: Number(newItem.offerPrice),
        deliveryCharges: Number(newItem.deliveryCharges) || 0,
        proposedSaving: proposedSaving > 0 ? proposedSaving : 0,
        dietaryType: newItem.dietaryType,
        isActive: true,
      };

      const updated = [...items, menuItem];
      setItems(updated);
      
      try {
        await dbService.addMenuItem(menuItem);
        await logCampaignAction('Item Added', `Added ${menuItem.name}`);
      } catch (fbErr) {
        console.error("Firebase save layout", fbErr);
      }

      setNewItem({
        name: '',
        description: '',
        mealImage: '',
        mrp: 0,
        offerPrice: 0,
        deliveryCharges: 0,
        dietaryType: 'VEG'
      });
      setItemImageFile(null);
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error saving item. Please try again.');
    }
  };

  const saveEditItem = async () => {
    if (!editingItemData || !editingItemId) return;
    const proposedSaving = (editingItemData.mrp || 0) - (editingItemData.offerPrice || 0);
    const updatedItem = {
      ...editingItemData,
      proposedSaving: proposedSaving > 0 ? proposedSaving : 0
    } as MenuItem;
    
    const updated = items.map(i => i.id === editingItemId ? updatedItem : i);
    setItems(updated);
    try {
      await dbService.updateMenuItem(updatedItem);
      await logCampaignAction('Item Modified', `Edited ${updatedItem.name}`);
    } catch(e) {}
    setEditingItemId(null);
    setEditingItemData(null);
  };

  const removeItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    
    try {
        await dbService.deleteMenuItem(id);
        if (item) await logCampaignAction('Item Removed', `Removed ${item.name}`);
    } catch(e) {}
  };

  const toggleItemActive = async (item: MenuItem) => {
    const newVal = item.isActive === false ? true : false;
    const updated = items.map(i => i.id === item.id ? { ...i, isActive: newVal } : i);
    setItems(updated);
    try {
      await dbService.updateMenuItem({ ...item, isActive: newVal });
      await logCampaignAction(newVal ? 'Item Enabled' : 'Item Disabled', `${newVal ? 'Showed' : 'Hid'} ${item.name}`);
    } catch (e) {}
  };

  const saveVariants = async (item: MenuItem, variants: ItemVariant[]) => {
    const updated = items.map(i => i.id === item.id ? { ...i, variants } : i);
    setItems(updated);
    try {
      await dbService.updateMenuItem({ ...item, variants });
      await logCampaignAction('Variants Updated', `Updated sizes for ${item.name}`);
    } catch (e) {}
  };

  const handleRenameCampaign = async () => {
    if (newCampaignName.trim()) {
      const updated = await updateCampaignName(campaignId, newCampaignName.trim());
      setAllCampaigns(updated);
    }
    setIsEditingCampaignName(false);
  };

  const handleCreateCampaign = async () => {
    if (newCampaignName.trim()) {
      const newCampaign: Campaign = {
        id: `c-${Date.now()}`,
        brandId,
        name: newCampaignName.trim(),
        isActive: true
      };
      
      try {
        await dbService.addCampaign(newCampaign);
      } catch (err) {
        console.error("Firebase save campaign fail, but we will add locally", err);
      }
      
      const newAllCampaigns = [...allCampaigns, newCampaign];
      setAllCampaigns(newAllCampaigns);
      setCampaignId(newCampaign.id);
    }
    setIsCreatingCampaign(false);
    setNewCampaignName('');
  };

  const handleSaveMenu = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };
  
  const activeItems = items.filter(i => i.campaignId === campaignId).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      <ExportOrdersModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Campaign Menu Builder</h1>
          <p className="text-gray-500 mt-2">Manage menu items for your brand campaigns.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <select 
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
            }}
            disabled={user?.role === 'BRAND_ADMIN'}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-white shadow-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-50"
          >
            {allowedBrands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {isEditingCampaignName || isCreatingCampaign ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                placeholder={isCreatingCampaign ? "New Campaign Name" : ""}
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-white shadow-sm focus:ring-red-500 focus:border-red-500 min-w-[200px]"
                onKeyDown={(e) => e.key === 'Enter' && (isCreatingCampaign ? handleCreateCampaign() : handleRenameCampaign())}
              />
              <button 
                onClick={isCreatingCampaign ? handleCreateCampaign : handleRenameCampaign}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Save Campaign"
              >
                <Save size={18} />
              </button>
              <button 
                onClick={() => {
                  setIsEditingCampaignName(false);
                  setIsCreatingCampaign(false);
                }}
                className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {brandCampaigns.length === 0 ? (
                <span className="text-sm font-medium text-gray-500 mr-2">No campaigns yet</span>
              ) : (
                <select 
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-white shadow-sm focus:ring-red-500 focus:border-red-500 min-w-[200px]"
                >
                  {brandCampaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => {
                  setNewCampaignName('');
                  setIsCreatingCampaign(true);
                  setIsEditingCampaignName(false);
                }}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors shadow-sm bg-white border border-gray-200"
                title="Create New Campaign"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {brandCampaigns.length > 0 && !isEditingCampaignName && !isCreatingCampaign && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-6 mb-6">
          <button
            onClick={() => {
              const c = allCampaigns.find((camp) => camp.id === campaignId);
              setCurrentCampaignPrivacy(c?.sharePrivacy || 'PUBLIC');
              setShowShareModal(true);
            }}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition whitespace-nowrap border border-red-100"
            title="Share Campaign Link"
          >
            Share Options
          </button>
          <button
            onClick={() => setShowFlyerModal(true)}
            className="flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-100 transition whitespace-nowrap border border-purple-100"
            title="Campaign Flyer generator"
          >
            <ImageIcon size={16} />
            Flyer
          </button>
          <button
            onClick={() => {
              const c = allCampaigns.find((camp) => camp.id === campaignId);
              setTimelineForm({
                startDate: c?.startDate || '',
                endDate: c?.endDate || ''
              });
              setShowTimelineModal(true);
            }}
            className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-100 transition whitespace-nowrap border border-orange-100"
            title="Campaign Validity"
          >
            <Clock size={16} />
            Validity
          </button>
          <button
            onClick={() => {
              const c = allCampaigns.find((camp) => camp.id === campaignId);
              if (c?.fulfillmentSettings) {
                setFulfillmentForm(c.fulfillmentSettings);
              } else {
                setFulfillmentForm({
                  mode: 'OPEN',
                  fixedDeliveryDate: '',
                  fixedDeliveryTime: '',
                  fixedPickupDate: '',
                  fixedPickupTime: '',
                  rangeStartDate: '',
                  rangeEndDate: ''
                });
              }
              setShowFulfillmentModal(true);
            }}
            className="flex items-center gap-2 bg-teal-50 text-teal-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-100 transition whitespace-nowrap border border-teal-100"
            title="Delivery/Pickup Scheduling"
          >
            <Calendar size={16} />
            Fulfillment
          </button>
          <button
            onClick={() => {
              const c = allCampaigns.find((camp) => camp.id === campaignId);
              if (c?.socialProof) {
                setSocialProofForm(c.socialProof);
              } else {
                setSocialProofForm({
                  enabled: false,
                  ordersPlaced: 500,
                  rating: 4.8,
                  showPopularity: true
                });
              }
              setShowSocialProofModal(true);
            }}
            className="flex items-center gap-2 bg-pink-50 text-pink-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-100 transition whitespace-nowrap border border-pink-100"
            title="Social Proof Options"
          >
            Social Proof
          </button>
          <button
            onClick={() => {
              const c = allCampaigns.find((camp) => camp.id === campaignId);
              if (c?.ctaConfig) {
                setCtaForm(c.ctaConfig);
              } else {
                setCtaForm({
                  enabled: true,
                  text: 'Order Now',
                  theme: 'teal'
                });
              }
              setShowCtaModal(true);
            }}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition whitespace-nowrap border border-emerald-100"
            title="CTA & WhatsApp Settings"
          >
            Button Settings
          </button>
          <button
            onClick={() => {
              const c = allCampaigns.find((camp) => camp.id === campaignId);
              if (c?.benefits) {
                setBenefitsForm(c.benefits);
              } else {
                setBenefitsForm({
                  freeDelivery: false,
                  minOrderValueForFreeDelivery: 0,
                  deliveryChargeAmount: 40,
                  packagingChargeAmount: 20,
                  waivePackagingCharge: false,
                  processingFeeAmount: 30,
                  waiveProcessingFee: false,
                });
              }
              setShowBenefitsModal(true);
            }}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition whitespace-nowrap border border-blue-100"
            title="Campaign Benefits"
          >
            Benefits
          </button>
          <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>
          <button
            onClick={() => {
              setNewCampaignName(allCampaigns.find(c => c.id === campaignId)?.name || '');
              setIsEditingCampaignName(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
            title="Edit Campaign Name"
          >
            <Edit2 size={16} />
            Rename
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={20} />
                Campaign Performance Tracker
              </h2>
              <button 
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition whitespace-nowrap border border-red-100"
              >
                <Download size={18} /> Download Campaign Orders (CSV)
              </button>
            </div>
            <div className="grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center text-purple-600 mb-1"><Eye size={18} /></div>
                <div className="text-xs font-medium text-purple-800">Page Visits</div>
                <div className="text-lg font-bold text-purple-900">{analytics.visits}</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center text-blue-600 mb-1"><Users size={18} /></div>
                <div className="text-xs font-medium text-blue-800">Event Leads</div>
                <div className="text-lg font-bold text-blue-900">{analytics.leads}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center text-indigo-600 mb-1"><CheckCircle2 size={18} /></div>
                <div className="text-xs font-medium text-indigo-800">Conversions</div>
                <div className="text-lg font-bold text-indigo-900">
                  {analytics.leads > 0 ? Math.round((analytics.conversions / analytics.leads) * 100) : 0}%
                </div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center text-green-600 mb-1"><ShoppingBag size={18} /></div>
                <div className="text-xs font-medium text-green-800">Campaign Orders</div>
                <div className="text-lg font-bold text-green-900">{analytics.orders}</div>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center text-orange-600 mb-1"><DollarSign size={18} /></div>
                <div className="text-xs font-medium text-orange-800">Order Revenue</div>
                <div className="text-lg font-bold text-orange-900">₹{analytics.revenue.toLocaleString()}</div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center text-red-600 mb-1"><BarChart3 size={18} /></div>
                <div className="text-xs font-medium text-red-800">GST Collected</div>
                <div className="text-lg font-bold text-red-900">₹{analytics.gst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex flex-col gap-1">
                <div className="flex items-center text-yellow-600 mb-1"><DollarSign size={18} /></div>
                <div className="text-xs font-medium text-yellow-800">Lead Revenue</div>
                <div className="text-lg font-bold text-yellow-900">₹{analytics.leadRevenue}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus size={20} className="text-red-500" />
              Campaign Menu Assortment
            </h2>
          </div>
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-6">Create your campaign menu by selecting items from your brand's master menu repository.</p>
            <button 
              onClick={() => setShowMasterMenuModal(true)}
              className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition"
            >
              <Plus size={18} /> Browse Master Menu
            </button>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
               <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-3 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" /> Campaign specific pricing
                 </div>
                 <div className="flex items-center gap-3 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" /> Quantity restrictions
                 </div>
                 <div className="flex items-center gap-3 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" /> Visibility controls
                 </div>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Current Campaign Menu
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  {activeItems.filter(i => i.isActive !== false).length} Active, {activeItems.filter(i => i.isActive === false).length} Inactive
                </span>
              </h2>
              {activeItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openLogs}
                    className="text-xs font-semibold px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                  >
                    View Audit Logs
                  </button>
                  <button 
                    onClick={handleSaveMenu}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
                  >
                    <Save size={16} /> Save Master Menu
                  </button>
                </div>
              )}
            </div>
            
            {activeItems.length > 0 && (
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === activeItems.length && activeItems.length > 0}
                    onChange={() => toggleSelectAll(activeItems)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  Select All
                </label>
                
                {selectedItems.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs mr-2">{selectedItems.size} selected</span>
                    <button onClick={() => bulkStatusUpdate(true)} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md font-medium text-xs transition">
                      Turn On
                    </button>
                    <button onClick={() => bulkStatusUpdate(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md font-medium text-xs transition">
                      Turn Off
                    </button>
                    <button onClick={bulkDelete} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md font-medium text-xs transition">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {showSuccess && (
              <div className="bg-green-50 border-b border-green-100 p-4 flex items-center gap-3 text-green-700 font-medium">
                <CheckCircle2 size={20} />
                Master Menu has been successfully saved!
              </div>
            )}

            <div className="p-0">
              {activeItems.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                    <ImageIcon size={24} className="text-gray-400" />
                  </div>
                  <p className="font-medium">No items added to this campaign menu yet.</p>
                  <p className="text-sm">Use the form to add meal options.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeItems.map((item) => (
                    <div key={item.id} className={`p-6 flex flex-col hover:bg-gray-50 transition border-l-4 ${item.isActive === false ? 'border-l-gray-300 opacity-60' : 'border-l-green-500'}`}>
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-5 h-5 cursor-pointer"
                          />
                          <img 
                            src={item.mealImage || undefined} 
                            alt={item.name} 
                            referrerPolicy="no-referrer"
                            className={`w-24 h-24 object-contain bg-gray-50 rounded-xl shadow-sm border border-gray-100 ${item.isActive === false ? 'grayscale' : ''}`}
                          />
                        </div>
                        <div className="flex-1 text-center md:text-left w-full">
                          <div className="flex items-center justify-center md:justify-start gap-2">
                             <div className={`w-4 h-4 rounded-sm border ${item.dietaryType === 'VEG' ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'} flex items-center justify-center`}>
                                <div className={`w-2 h-2 rounded-full ${item.dietaryType === 'VEG' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                             </div>
                             <h3 className="font-bold text-xl text-gray-900 line-clamp-1">{item.name}</h3>
                             {item.isActive === false && (
                               <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Hidden</span>
                             )}
                          </div>
                          {item.masterMenuItemId && masterMenuItems.find(m => m.id === item.masterMenuItemId)?.isActive === false && (
                             <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-1.5 rounded-md text-xs font-medium mb-2 inline-block">
                                ⚠️ This item is deactivated in the Master Menu.
                             </div>
                          )}
                          {item.description && <p className="text-sm text-gray-500 line-clamp-1 mt-1">{item.description}</p>}
                          <div className="flex flex-wrap gap-4 mt-2 justify-center md:justify-start">
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 font-medium">Offer Price</span>
                              <span className="font-bold text-gray-900">₹{item.offerPrice}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 font-medium">MRP</span>
                              <span className="font-medium text-gray-400 line-through">₹{item.mrp}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 font-medium">Delivery</span>
                              <span className="font-bold text-gray-900">₹{item.deliveryCharges}</span>
                            </div>
                            <div className="flex flex-col bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                              <span className="text-xs text-green-700 font-bold uppercase tracking-tight">Saving</span>
                              <span className="font-bold text-green-800">₹{item.proposedSaving}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <button
                            onClick={() => setEditingVariantsId(editingVariantsId === item.id ? null : item.id)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                          >
                            Sizes & Prices
                          </button>
                          <button 
                            onClick={() => toggleItemActive(item)}
                            className={`p-2 rounded-lg transition-colors border ${item.isActive === false ? 'text-gray-400 border-gray-300 hover:bg-gray-100' : 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'}`}
                            title={item.isActive === false ? "Show Item" : "Hide Item"}
                          >
                            {item.isActive === false ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditingItemData({ ...item });
                            }}
                            className="p-2 text-gray-500 border border-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Item Details"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-gray-400 border border-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {editingVariantsId === item.id && (
                        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-1 flex-1">Size Variants Configuration</h4>
                            <button onClick={() => setEditingVariantsId(null)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><X size={16} /></button>
                          </div>
                          
                          <div className="space-y-3">
                            {['Normal', 'Medium', 'Large'].map((sizeType) => {
                              const variant = item.variants?.find(v => v.size === sizeType);
                              const isVariantActive = variant ? variant.isActive : false;
                              const mrp = variant?.mrp || item.mrp;
                              const offerPrice = variant?.offerPrice || item.offerPrice;
                              
                              return (
                                <div key={sizeType} className={`flex items-center gap-4 bg-white p-3 rounded-lg border ${isVariantActive ? 'border-gray-200 shadow-sm' : 'border-gray-100 bg-gray-50'}`}>
                                  <label className="flex items-center gap-2 min-w-[100px] shrink-0">
                                    <input 
                                      type="checkbox"
                                      checked={isVariantActive}
                                      onChange={(e) => {
                                        const newVariants = [...(item.variants || [])];
                                        const idx = newVariants.findIndex(v => v.size === sizeType);
                                        const newVariantValue = { size: sizeType as any, mrp, offerPrice, isActive: e.target.checked };
                                        if (idx >= 0) newVariants[idx] = newVariantValue;
                                        else newVariants.push(newVariantValue);
                                        saveVariants(item, newVariants);
                                      }}
                                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="font-medium text-sm text-gray-700">{sizeType}</span>
                                  </label>
                                  
                                  <div className="flex gap-4 flex-1">
                                    <div className="flex-1">
                                      <label className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 block">MRP (₹)</label>
                                      <input 
                                        type="number" 
                                        value={mrp}
                                        disabled={!isVariantActive}
                                        onChange={(e) => {
                                          const newVariants = [...(item.variants || [])];
                                          const idx = newVariants.findIndex(v => v.size === sizeType);
                                          if (idx >= 0) {
                                            newVariants[idx] = { ...newVariants[idx], mrp: Number(e.target.value) };
                                            saveVariants(item, newVariants);
                                          }
                                        }}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-400 py-1.5 px-2 border"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 block">Price (₹)</label>
                                      <input 
                                        type="number" 
                                        value={offerPrice}
                                        disabled={!isVariantActive}
                                        onChange={(e) => {
                                          const newVariants = [...(item.variants || [])];
                                          const idx = newVariants.findIndex(v => v.size === sizeType);
                                          if (idx >= 0) {
                                            newVariants[idx] = { ...newVariants[idx], offerPrice: Number(e.target.value) };
                                            saveVariants(item, newVariants);
                                          }
                                        }}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:text-gray-400 py-1.5 px-2 border"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItemData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Edit Menu Item</h3>
              <button onClick={() => { setEditingItemId(null); setEditingItemData(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {editingItemData.masterMenuItemId ? (
                 <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-800 mb-4 flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5" />
                    <div>
                       <strong>Linked to Master Menu</strong>
                       <p className="mt-0.5">Name, Description, and Image are managed centrally. You can configure campaign-specific overrides below.</p>
                    </div>
                 </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input 
                  type="text" value={editingItemData.name || ''}
                  onChange={e => setEditingItemData({...editingItemData, name: e.target.value})}
                  disabled={!!editingItemData.masterMenuItemId}
                  className={`w-full border rounded-lg px-4 py-2 ${editingItemData.masterMenuItemId ? 'bg-gray-100 text-gray-500' : 'bg-white focus:ring-red-500 focus:border-red-500'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={editingItemData.description || ''}
                  onChange={e => setEditingItemData({...editingItemData, description: e.target.value})}
                  disabled={!!editingItemData.masterMenuItemId}
                  className={`w-full border rounded-lg px-4 py-2 ${editingItemData.masterMenuItemId ? 'bg-gray-100 text-gray-500' : 'bg-white focus:ring-red-500 focus:border-red-500'}`} rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input 
                    type="text" value={editingItemData.category || ''}
                    disabled={!!editingItemData.masterMenuItemId}
                    placeholder="e.g. Starters, Mains"
                    onChange={e => setEditingItemData({...editingItemData, category: e.target.value})}
                    className={`w-full border rounded-lg px-4 py-2 ${editingItemData.masterMenuItemId ? 'bg-gray-100 text-gray-500' : 'bg-white focus:ring-red-500 focus:border-red-500'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input 
                    type="number" value={editingItemData.displayOrder || 0}
                    onChange={e => setEditingItemData({...editingItemData, displayOrder: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Type</label>
                  <select 
                    value={editingItemData.dietaryType || 'VEG'}
                    disabled={!!editingItemData.masterMenuItemId}
                    onChange={e => setEditingItemData({...editingItemData, dietaryType: e.target.value as any})}
                    className={`w-full border rounded-lg px-4 py-2 ${editingItemData.masterMenuItemId ? 'bg-gray-100 text-gray-500' : 'bg-white focus:ring-red-500 focus:border-red-500'}`}
                  >
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-Vegetarian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input 
                    type="text" value={editingItemData.mealImage || ''}
                    disabled={!!editingItemData.masterMenuItemId}
                    className={`w-full border rounded-lg px-4 py-2 ${editingItemData.masterMenuItemId ? 'bg-gray-100 text-gray-500' : 'bg-white focus:ring-red-500 focus:border-red-500'}`}
                  />
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mt-6">
                 <h4 className="font-semibold text-orange-800 mb-4 pb-2 border-b border-orange-200">Campaign-Specific Configurations</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Base Price (₹)</label>
                      <input 
                        type="number" value={editingItemData.mrp || 0}
                        onChange={e => setEditingItemData({...editingItemData, mrp: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Offer Price (₹)</label>
                      <input 
                        type="number" value={editingItemData.offerPrice || 0}
                        onChange={e => setEditingItemData({...editingItemData, offerPrice: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity Per Order</label>
                      <input 
                        type="number" value={editingItemData.maxQuantityPerOrder || ''}
                        onChange={e => setEditingItemData({...editingItemData, maxQuantityPerOrder: Number(e.target.value) || undefined})}
                        placeholder="No limit"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500"
                      />
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Visible From</label>
                       <input 
                         type="time" value={editingItemData.visibilityTimeStart || ''}
                         onChange={e => setEditingItemData({...editingItemData, visibilityTimeStart: e.target.value})}
                         className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Visible Until</label>
                       <input 
                         type="time" value={editingItemData.visibilityTimeEnd || ''}
                         onChange={e => setEditingItemData({...editingItemData, visibilityTimeEnd: e.target.value})}
                         className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500"
                       />
                    </div>
                 </div>

                 <div className="flex items-center gap-6 mt-4 pt-4 border-t border-orange-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editingItemData.isFeatured || false}
                        onChange={e => setEditingItemData({...editingItemData, isFeatured: e.target.checked})}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium text-gray-800">Featured Item</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editingItemData.isActive !== false}
                        onChange={e => setEditingItemData({...editingItemData, isActive: e.target.checked})}
                        className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-gray-800">Currently Available</span>
                    </label>
                 </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => { setEditingItemId(null); setEditingItemData(null); }}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={saveEditItem}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Campaign Audit Trail</h3>
              <button onClick={() => setShowLogsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {campaignLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No actions have been logged yet.</p>
              ) : (
                <div className="space-y-4">
                  {campaignLogs.map(log => (
                    <div key={log.id} className="flex gap-4 items-start p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="bg-white border border-gray-200 p-2 rounded-lg text-gray-500 shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{log.action}</h4>
                        {log.details && <p className="text-sm text-gray-600 mt-1">{log.details}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 font-medium tracking-wide">
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>By: {log.performedBy}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Share2 size={20} className="text-red-600" />
                Share Campaign
              </h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {(() => {
                const c = allCampaigns.find((camp) => camp.id === campaignId);
                const b = brands.find(brand => brand.id === c?.brandId);
                const url = `${window.location.origin}/c/${campaignId}`;
                
                return (
                  <>
                    {/* Campaign Quick Actions Removed for Clutter Reduction */}
                    <div className="flex w-full gap-3 mb-6">
                        <button
                          onClick={async () => {
                              const flyerElement = document.getElementById('whatsapp-flyer-render');
                              if (flyerElement) {
                                await new Promise(r => setTimeout(r, 600));
                                const dataUrl = await toPng(flyerElement, { pixelRatio: 2, backgroundColor: '#ffffff' });

                                const fetchRes = await fetch(dataUrl);
                                const blob = await fetchRes.blob();
                                if (!blob || blob.size < 100) {
                                  alert('Failed to generate flyer image (image is blank)');
                                  return;
                                }
                                const link = document.createElement('a');
                                link.download = `Flyer_${campaignId}.png`;
                                link.href = dataUrl;
                                link.click();
                              }
                          }}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 hover:bg-gray-50 transition shadow-sm"
                        >
                          <Download size={16} className="text-gray-500" /> Save Flyer
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            alert('Link copied to clipboard!');
                          }}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 hover:bg-gray-50 transition shadow-sm"
                        >
                          <Copy size={16} className="text-gray-500" /> Copy Link
                        </button>
                      </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Privacy</label>
                      <div className="relative">
                        <select
                          value={currentCampaignPrivacy}
                          onChange={async (e) => {
                            const newPrivacy = e.target.value as CampaignPrivacy;
                            setCurrentCampaignPrivacy(newPrivacy);
                            const updatedCampaigns = await updateCampaignPrivacy(campaignId, newPrivacy);
                            setAllCampaigns(updatedCampaigns);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 bg-white focus:ring-red-500 focus:border-red-500 shadow-sm appearance-none"
                        >
                          <option value="PUBLIC">Public - Anyone with link can view</option>
                          <option value="PRIVATE">Private - Only accessible by exact link</option>
                          <option value="CUSTOMERS">Customers Only - Requires sign-in</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Link</label>
                      <div className="flex gap-2">
                        <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-600">
                          {url}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            alert('Link copied to clipboard!');
                          }}
                          title="Copy Link"
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition flex items-center gap-2"
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                      <div className="mt-4 flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-lg">
                        <div id={`qr-container-${campaignId}`} className="bg-white p-2 rounded">
                          <QRCodeCanvas value={url} size={150} level="H" />
                        </div>
                        <button
                          onClick={async () => {
                            const qrElement = document.getElementById(`qr-container-${campaignId}`);
                            if (qrElement) {
                              try {
                                const { toPng } = await import('html-to-image');
                                const dataUrl = await toPng(qrElement, { backgroundColor: '#ffffff', pixelRatio: 2 });
                                const link = document.createElement('a');
                                link.download = `QR_${campaignId}.png`;
                                link.href = dataUrl;
                                link.click();
                              } catch (err) {
                                console.error('Failed to generate QR image', err);
                                alert('Failed to generate QR image');
                              }
                            }
                          }}
                          className="mt-6 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2 transition shadow-sm w-full justify-center"
                        >
                          <Download size={16} /> Download QR Code Image
                        </button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Personalize (Optional)</label>
                      <input 
                         type="text" 
                         placeholder="Customer Name (e.g. John)" 
                         value={shareCustomerName} 
                         onChange={(e) => setShareCustomerName(e.target.value)} 
                         className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1 text-sm focus:ring-red-500 focus:border-red-500 shadow-sm" 
                       />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp Share Settings</label>
                      <div className="space-y-2 bg-green-50/50 p-4 rounded-lg border border-green-100">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={waIncludeBanner} onChange={e => setWaIncludeBanner(e.target.checked)} className="rounded text-green-600 focus:ring-green-500" />
                          Include Campaign Banner Image
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={waIncludeQR} onChange={e => setWaIncludeQR(e.target.checked)} className="rounded text-green-600 focus:ring-green-500" />
                          Include QR Code
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={async () => {
                          const linkUrl = url;
                          const customGreeting = shareCustomerName ? `Hi ${shareCustomerName},\nWe've reserved a special offer for you from ${b?.name || 'us'}.\n\n` : '';
                          
                          let expiryText = '';
                          if (c?.endDate) {
                            expiryText = `\n⏳ *Offer Valid Until:*\n${new Date(c.endDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}\n`;
                          }

                          const ctaText = c?.ctaConfig?.text || 'Order Now';
                          const ctaSection = c?.ctaConfig?.enabled !== false ? `🛒 *[${ctaText}]*\n${linkUrl}` : `🔗 Tap below to order:\n${linkUrl}`;

                          const text = encodeURIComponent(
`${customGreeting}━━━━━━━━━━━━━━━

🍔 *QwikMeal Exclusive*

*${b?.name || 'Brand Partner'}*
*${c?.name || 'Special Campaign'}*

✅ Special Pricing
✅ Quick Delivery
✅ Secure Checkout
✅ Verified Brand Partner
${expiryText}
${ctaSection}

Powered by QwikMeal

━━━━━━━━━━━━━━━`
                          );

                          const w = window.open('about:blank', '_blank');

                          if (waIncludeBanner || waIncludeQR) {
                            try {
                              const flyerElement = document.getElementById('whatsapp-flyer-render');
                              if (flyerElement) {
                                await new Promise(resolve => setTimeout(resolve, 600));
                                const dataUrl = await toPng(flyerElement, { pixelRatio: 2, backgroundColor: '#ffffff' });

                                const fetchRes = await fetch(dataUrl);
                                const blob = await fetchRes.blob();
                                
                                if (!blob || blob.size < 100) {
                                  if (w) w.location.href = `https://wa.me/?text=${text}`;
                                  alert('Could not render flyer. Only text will be shared.');
                                  return;
                                }
                                
                                const file = new File([blob], `Campaign_${campaignId}.png`, { type: 'image/png' });
                                const unencodedText = decodeURIComponent(text);
                                const baseShareText = unencodedText;

                                // Fallback: download file and open WA
                                const link = document.createElement('a');
                                link.download = file.name;
                                const objUrl = URL.createObjectURL(blob);
                                link.href = objUrl;
                                link.click();
                                
                                const fallbackText = encodeURIComponent(baseShareText + "\n\n*(Image downloaded! Attach it to this message!)*");
                                
                                if (w) {
                                  w.location.href = `https://wa.me/?text=${fallbackText}`;
                                } else {
                                  window.open(`https://wa.me/?text=${fallbackText}`, '_blank');
                                }
                                
                                setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
                                return;
                              }
                            } catch (err) {
                              console.error('Failed to generate flyer', err);
                              if (w) w.location.href = `https://wa.me/?text=${text}`;
                              alert('Failed to generate flyer. Only text will be shared.');
                              return;
                            }
                          }
                          
                          if (w) {
                            w.location.href = `https://wa.me/?text=${text}`;
                          } else {
                            window.open(`https://wa.me/?text=${text}`, '_blank');
                          }
                        }}
                        className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors group"
                      >
                        <MessageSquare className="text-gray-400 group-hover:text-green-500 transition-colors" size={24} />
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-green-600 transition-colors">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => {
                          const linkUrl = url;
                          const subject = encodeURIComponent('New Campaign');
                          const body = encodeURIComponent(`Check out our new campaign!\n\nLink: ${linkUrl}`);
                          window.location.href = `mailto:?subject=${subject}&body=${body}`;
                        }}
                        className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                      >
                        <Mail className="text-gray-400 group-hover:text-blue-500 transition-colors" size={24} />
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">Email</span>
                      </button>
                      <button
                        onClick={async () => {
                          const linkUrl = url;
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: c?.name || 'Campaign Link',
                                text: `Check out our new campaign from ${b?.name || 'QwikMeal'}!`,
                                url: linkUrl,
                              });
                            } catch (err) {
                              console.error('Share failed:', err);
                            }
                          } else {
                            window.open(`sms:?body=${encodeURIComponent(linkUrl)}`, '_self');
                          }
                        }}
                        className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors group"
                      >
                        <Share2 className="text-gray-400 group-hover:text-purple-500 transition-colors" size={24} />
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-purple-600 transition-colors">{navigator.share ? 'More' : 'SMS'}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Flyer Modal */}
      {showFlyerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <ImageIcon size={20} className="text-purple-600" />
                Campaign Flyer Preview
              </h3>
              <button 
                onClick={() => setShowFlyerModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col items-center bg-gray-100">
              <p className="text-sm text-gray-500 mb-6 text-center">
                This flyer features dynamic brand colors and layout. Use buttons below to save or share.
              </p>
              
              {(() => {
                const c = allCampaigns.find((camp) => camp.id === campaignId);
                const b = brands.find(brand => brand.id === c?.brandId);
                const url = `${window.location.origin}/c/${campaignId}`;
                const activeItems = (c?.id && items) ? items.filter(i => i.campaignId === c.id && i.isActive !== false) : [];

                if (c?.flyerPngUrl) {
                  return (
                    <div className="relative transform origin-top w-[800px] shadow-lg flex justify-center" style={{ transform: 'scale(0.55)', marginBottom: '-400px' }}>
                      <img src={c.flyerPngUrl} alt="Flyer Preview" className="w-[800px] h-[1131px] object-cover rounded shadow-lg" crossOrigin="anonymous" />
                    </div>
                  );
                }

                return (
                  <div className="relative transform origin-top w-[800px] shadow-lg" style={{ transform: 'scale(0.55)', marginBottom: '-400px' }}>
                    <div className="w-[800px] h-[1131px] font-sans flex flex-col text-left" 
                         style={{ 
                            backgroundColor: b?.flyerBackgroundStyle === 'GRADIENT' ? '#f3f4f6' : (b?.flyerBackgroundStyle === 'PATTERN' ? '#f8fafc' : '#ffffff'),
                            backgroundImage: b?.flyerBackgroundStyle === 'GRADIENT' ? `linear-gradient(to bottom right, ${b?.primaryColor || '#dc2626'}15, ${b?.secondaryColor || '#ffffff'})` : 'none'
                          }}>
                      <div className="flex-1 p-12 flex flex-col items-center justify-start text-center">
                        {/* Brand Logo & Name */}
                        {b?.logo && (
                          <img src={b.logo} alt="Brand Logo" className="h-24 w-auto object-contain mb-4" crossOrigin="anonymous" />
                        )}
                        <h2 className="text-3xl font-bold tracking-tight mb-2" style={{ color: b?.primaryColor || '#111827' }}>
                          {b?.name || 'QwikMeal Partner'}
                        </h2>
                        
                        <h1 className="text-5xl font-black text-gray-900 mb-8 mt-2 leading-tight">
                          {c?.name || 'Special Offer'}
                        </h1>
                        
                        {/* Banner properly constrained */}
                        {activeItems.length > 0 && (
                          <div className="w-full h-[300px] flex justify-center mb-10 shadow-2xl rounded-2xl overflow-hidden border-4" style={{ borderColor: b?.primaryColor || '#f3f4f6' }}>
                             <img 
                               src={activeItems[0].mealImage || imgFallback} 
                               alt="Banner" 
                               className="w-full h-full object-cover"
                               referrerPolicy="no-referrer"
                               crossOrigin="anonymous"
                             />
                          </div>
                        )}
                        
                        <div className="flex-1 w-full flex flex-col items-center justify-center bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                          <h3 className="text-2xl font-bold text-gray-800 mb-6 uppercase tracking-widest text-center">Place Your Order</h3>
                          
                          <div className="flex items-center justify-center gap-12 w-full">
                            <div className="flex flex-col items-center flex-1">
                              <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-dashed border-gray-300 inline-block">
                                <QRCodeCanvas value={url} size={280} level="H" />
                              </div>
                            </div>
                          </div>
                          
                          <p className="mt-10 text-xl text-gray-600 font-medium text-center max-w-lg">
                            Scan the QR Code to browse menu and place your order.
                          </p>
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="w-full py-6 text-center" style={{ backgroundColor: b?.primaryColor || '#1f2937' }}>
                        <p className="text-white text-lg font-semibold tracking-wider opacity-90">
                          {b?.flyerFooterText || 'Powered by QwikMeal'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 flex flex-wrap justify-end gap-3 shrink-0">
              <button
                onClick={async () => {
                   const flyerElement = document.getElementById('whatsapp-flyer-render');
                   if (!flyerElement) return;
                   try {
                     await new Promise(r => setTimeout(r, 600));
                     const dataUrl = await toPng(flyerElement, { pixelRatio: 2, backgroundColor: '#ffffff', skipAutoScale: true });
                     const fetchRes = await fetch(dataUrl);
                     const blob = await fetchRes.blob();
                     if (blob.size < 10000) return alert("Flyer generation failed. Content is blank.");
                     
                     const { jsPDF } = await import('jspdf');
                     const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [800, 1131] });
                     pdf.addImage(dataUrl, 'PNG', 0, 0, 800, 1131);
                     const pdfBlob = pdf.output('blob');
           
                     const pngRef = ref(storage, `flyers/${campaignId}_${Date.now()}.png`);
                     await uploadBytes(pngRef, blob);
                     const pngUrl = await getDownloadURL(pngRef);
           
                     const pdfRef = ref(storage, `flyers/${campaignId}_${Date.now()}.pdf`);
                     await uploadBytes(pdfRef, pdfBlob);
                     const pdfUrl = await getDownloadURL(pdfRef);
           
                     const c = allCampaigns.find((camp) => camp.id === campaignId);
                     if (c) {
                       const updatedCampaign = { ...c, flyerPngUrl: pngUrl, flyerPdfUrl: pdfUrl };
                       await dbService.updateCampaign(updatedCampaign);
                       setAllCampaigns(prev => prev.map(p => p.id === c.id ? updatedCampaign : p));
                       alert("Flyer regenerated and saved permanently.");
                     }
                   } catch (e) {
                     alert("Failed to regenerate flyer.");
                   }
                }}
                className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 flex items-center gap-2"
                title="Save latest design to cloud"
              >
                Regenerate Flyer
              </button>

              <button
                onClick={async () => {
                  let urlToDownload = '';
                  const c = allCampaigns.find((camp) => camp.id === campaignId);
                  
                  if (c?.flyerPngUrl) {
                    try {
                      const response = await fetch(c.flyerPngUrl);
                      const blob = await response.blob();
                      urlToDownload = URL.createObjectURL(blob);
                    } catch (e) {
                      urlToDownload = c.flyerPngUrl;
                    }
                  } else {
                    const flyerElement = document.getElementById('whatsapp-flyer-render');
                    if (flyerElement) {
                      await new Promise(r => setTimeout(r, 600));
                      const dataUrl = await toPng(flyerElement, { pixelRatio: 2, backgroundColor: '#ffffff', skipAutoScale: true });
  
                      const fetchRes = await fetch(dataUrl);
                      const blob = await fetchRes.blob();
                      if (blob.size < 10000) {
                        alert('Failed to generate flyer image');
                        return;
                      }
                      urlToDownload = URL.createObjectURL(blob);
                    }
                  }
                  
                  if (urlToDownload) {
                    const link = document.createElement('a');
                    link.href = urlToDownload;
                    link.download = `Flyer_${campaignId}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(urlToDownload), 1000);
                  }
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-2"
              >
                <Download size={16} /> Download PNG
              </button>
              
              <button
                onClick={async () => {
                  let urlToDownload = '';
                  const c = allCampaigns.find((camp) => camp.id === campaignId);
                  
                  if (c?.flyerPdfUrl) {
                    try {
                      const response = await fetch(c.flyerPdfUrl);
                      const blob = await response.blob();
                      urlToDownload = URL.createObjectURL(blob);
                    } catch (e) {
                      urlToDownload = c.flyerPdfUrl;
                    }
                  } else {
                    const flyerElement = document.getElementById('whatsapp-flyer-render');
                    if (flyerElement) {
                      await new Promise(r => setTimeout(r, 600));
                      const dataUrl = await toPng(flyerElement, { pixelRatio: 2, backgroundColor: '#ffffff', skipAutoScale: true });
                      const fetchRes = await fetch(dataUrl);
                      const blob = await fetchRes.blob();
                      if (blob.size < 10000) {
                        alert('Failed to generate flyer PDF content');
                        return;
                      }
                      
                      const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'px',
                        format: [800, 1131]
                      });
                      
                      pdf.addImage(dataUrl, 'PNG', 0, 0, 800, 1131);
                      const pdfBlob = pdf.output('blob');
                      urlToDownload = URL.createObjectURL(pdfBlob);
                    }
                  }
                  
                  if (urlToDownload) {
                    const link = document.createElement('a');
                    link.href = urlToDownload;
                    link.download = `Flyer_${campaignId}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(urlToDownload), 1000);
                  }
                }}
                className="px-4 py-2 bg-red-600 border border-transparent text-white rounded-lg text-sm font-semibold hover:bg-red-700 flex items-center gap-2"
              >
                <Download size={16} /> Download PDF
              </button>

              <button
                onClick={async () => {
                  let fileBlob: Blob | null = null;
                  const c = allCampaigns.find((camp) => camp.id === campaignId);

                  if (c?.flyerPngUrl) {
                    try {
                      const response = await fetch(c.flyerPngUrl);
                      fileBlob = await response.blob();
                    } catch (e) {
                      console.error("CORS fetch failed, falling back to local generation");
                    }
                  } 
                  
                  if (!fileBlob) {
                    const flyerElement = document.getElementById('whatsapp-flyer-render');
                    if (flyerElement) {
                      await new Promise(r => setTimeout(r, 600));
                      const dataUrl = await toPng(flyerElement, { pixelRatio: 2, backgroundColor: '#ffffff', skipAutoScale: true });

                      const fetchRes = await fetch(dataUrl);
                      fileBlob = await fetchRes.blob();
                      if (!fileBlob || fileBlob.size < 10000) {
                        alert('Failed to generate flyer image content');
                        return;
                      }
                    }
                  }

                  if (fileBlob) {
                    const file = new File([fileBlob], `Flyer_${campaignId}.png`, { type: 'image/png' });
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Campaign Flyer',
                          text: `Check out this special offer!`,
                          files: [file]
                        });
                      } catch (err) {
                        console.error('Share failed:', err);
                      }
                    } else {
                        // fallback to download if share is not available
                        const objectUrl = URL.createObjectURL(fileBlob);
                        const link = document.createElement('a');
                        link.download = file.name;
                        link.href = objectUrl;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
                        alert('Native sharing not supported - downloading instead.');
                    }
                  }
                }}
                className="px-4 py-2 bg-purple-600 border border-transparent text-white rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-2"
              >
                <Share2 size={16} /> Share Flyer
              </button>
            </div>
          </div>
        </div>
      )}

      {showCtaModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Link2 size={20} className="text-emerald-600" />
                Button & Share Settings
              </h3>
              <button 
                onClick={() => setShowCtaModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <label className="flex items-center gap-2 px-1">
                <input 
                  type="checkbox" 
                  checked={ctaForm.enabled} 
                  onChange={e => setCtaForm({ ...ctaForm, enabled: e.target.checked })} 
                  className="w-4 h-4 rounded border-gray-300" 
                />
                <span className="font-medium text-gray-800">Show CTA Button in Messages</span>
              </label>

              {ctaForm.enabled && (
                <>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                      <select 
                        value={ctaForm.text} 
                        onChange={e => setCtaForm({...ctaForm, text: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="Order Now">Order Now</option>
                        <option value="Claim Offer">Claim Offer</option>
                        <option value="Book Now">Book Now</option>
                        <option value="Get Deal">Get Deal</option>
                        <option value="Redeem Offer">Redeem Offer</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Color Theme</label>
                      <select 
                        value={ctaForm.theme} 
                        onChange={e => setCtaForm({...ctaForm, theme: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="teal">Teal / Default</option>
                        <option value="blue">Blue</option>
                        <option value="red">Red</option>
                        <option value="orange">Orange</option>
                        <option value="purple">Purple</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={async () => {
                    const updatedCampaigns = await updateCampaignCTA(campaignId, ctaForm);
                    setAllCampaigns(updatedCampaigns);
                    setShowCtaModal(false);
                  }}
                  className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700 transition shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSocialProofModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-pink-600" />
                Social Proof Settings
              </h3>
              <button 
                onClick={() => setShowSocialProofModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <label className="flex items-center gap-2 px-1">
                <input 
                  type="checkbox" 
                  checked={socialProofForm.enabled} 
                  onChange={e => setSocialProofForm({ ...socialProofForm, enabled: e.target.checked })} 
                  className="w-4 h-4 rounded border-gray-300" 
                />
                <span className="font-medium text-gray-800">Enable Social Proof Badges</span>
              </label>

              {socialProofForm.enabled && (
                <>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Orders Placed (e.g. 500)</label>
                      <input 
                        type="number" 
                        min="0" 
                        value={socialProofForm.ordersPlaced} 
                        onChange={e => setSocialProofForm({...socialProofForm, ordersPlaced: Number(e.target.value)})} 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Rating (e.g. 4.8)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="0" max="5" 
                        value={socialProofForm.rating} 
                        onChange={e => setSocialProofForm({...socialProofForm, rating: Number(e.target.value)})} 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                    <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={socialProofForm.showPopularity} 
                      onChange={e => setSocialProofForm({ ...socialProofForm, showPopularity: e.target.checked })} 
                      className="w-4 h-4 rounded border-gray-300" 
                    />
                    <span className="font-medium text-gray-800 text-sm">Show "High Demand / Top Rated" badge</span>
                  </label>
                  </div>
                </>
              )}
              
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={async () => {
                    const updatedCampaigns = await updateCampaignSocialProof(campaignId, socialProofForm);
                    setAllCampaigns(updatedCampaigns);
                    setShowSocialProofModal(false);
                  }}
                  className="w-full bg-pink-600 text-white font-bold py-2.5 rounded-lg hover:bg-pink-700 transition shadow-sm"
                >
                  Save Social Proof Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBenefitsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <DollarSign size={20} className="text-blue-600" />
                Campaign Benefits Settings
              </h3>
              <button 
                onClick={() => setShowBenefitsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <label className="flex items-center gap-2 px-1">
                <input type="checkbox" checked={benefitsForm.freeDelivery} onChange={e => setBenefitsForm({ ...benefitsForm, freeDelivery: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
                <span className="font-medium text-gray-800">Free Delivery Configuration</span>
              </label>

              {benefitsForm.freeDelivery && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Value for Free Delivery</label>
                    <input type="number" min="0" value={benefitsForm.minOrderValueForFreeDelivery} onChange={e => setBenefitsForm({...benefitsForm, minOrderValueForFreeDelivery: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Delivery Charge (₹)</label>
                  <input type="number" min="0" value={benefitsForm.deliveryChargeAmount} onChange={e => setBenefitsForm({...benefitsForm, deliveryChargeAmount: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                 <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={benefitsForm.waivePackagingCharge} onChange={e => setBenefitsForm({ ...benefitsForm, waivePackagingCharge: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
                  <span className="font-medium text-gray-800 text-sm">Waive Packaging Charge</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Packaging Charge (₹)</label>
                  <input type="number" min="0" value={benefitsForm.packagingChargeAmount} onChange={e => setBenefitsForm({...benefitsForm, packagingChargeAmount: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                 <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={benefitsForm.waiveProcessingFee} onChange={e => setBenefitsForm({ ...benefitsForm, waiveProcessingFee: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
                  <span className="font-medium text-gray-800 text-sm">Waive Processing Fee</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Processing Fee (₹)</label>
                  <input type="number" min="0" value={benefitsForm.processingFeeAmount} onChange={e => setBenefitsForm({...benefitsForm, processingFeeAmount: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={async () => {
                    const updatedCampaigns = await updateCampaignBenefits(campaignId, benefitsForm);
                    setAllCampaigns(updatedCampaigns);
                    setShowBenefitsModal(false);
                  }}
                  className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                  Save Benefits Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Timeline Modal */}
      {showTimelineModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Clock size={20} className="text-orange-600" />
                Campaign Validity
              </h3>
              <button onClick={() => setShowTimelineModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Start Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={timelineForm.startDate} 
                  onChange={(e) => setTimelineForm({...timelineForm, startDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Expiry Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={timelineForm.endDate} 
                  onChange={(e) => setTimelineForm({...timelineForm, endDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Once expired, customers cannot place new orders.</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={async () => {
                    const updatedCampaigns = await updateCampaignTimeline(campaignId, timelineForm.startDate, timelineForm.endDate);
                    setAllCampaigns(updatedCampaigns);
                    setShowTimelineModal(false);
                  }}
                  className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg hover:bg-orange-700 transition"
                >
                  Save Timeline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fulfillment Modal */}
      {showFulfillmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Calendar size={20} className="text-teal-600" />
                Fulfillment Scheduling
              </h3>
              <button onClick={() => setShowFulfillmentModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Delivery Scheduling Mode</label>
                <select 
                  value={fulfillmentForm.mode}
                  onChange={(e) => setFulfillmentForm({...fulfillmentForm, mode: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                >
                  <option value="OPEN">Open Delivery (Customer Chooses)</option>
                  <option value="FIXED">Fixed Date & Time (Admin Controlled)</option>
                  <option value="RANGE">Date Selection Within Range</option>
                </select>
              </div>

              {fulfillmentForm.mode === 'FIXED' && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="font-semibold text-sm text-gray-800">Fixed Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Delivery Date</label>
                      <input type="date" value={fulfillmentForm.fixedDeliveryDate || ''} onChange={e => setFulfillmentForm({...fulfillmentForm, fixedDeliveryDate: e.target.value})} className="w-full border rounded-lg px-3 py-1.5 mt-1 text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Delivery Time Slot</label>
                      <input type="text" placeholder="e.g. 01:00 PM - 02:00 PM" value={fulfillmentForm.fixedDeliveryTime || ''} onChange={e => setFulfillmentForm({...fulfillmentForm, fixedDeliveryTime: e.target.value})} className="w-full border rounded-lg px-3 py-1.5 mt-1 text-sm"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Pickup Date</label>
                      <input type="date" value={fulfillmentForm.fixedPickupDate || ''} onChange={e => setFulfillmentForm({...fulfillmentForm, fixedPickupDate: e.target.value})} className="w-full border rounded-lg px-3 py-1.5 mt-1 text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Pickup Time Slot</label>
                      <input type="text" placeholder="e.g. 05:00 PM - 06:00 PM" value={fulfillmentForm.fixedPickupTime || ''} onChange={e => setFulfillmentForm({...fulfillmentForm, fixedPickupTime: e.target.value})} className="w-full border rounded-lg px-3 py-1.5 mt-1 text-sm"/>
                    </div>
                  </div>
                </div>
              )}

              {fulfillmentForm.mode === 'RANGE' && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="font-semibold text-sm text-gray-800">Allowed Date Range</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Start Date</label>
                      <input type="date" value={fulfillmentForm.rangeStartDate || ''} onChange={e => setFulfillmentForm({...fulfillmentForm, rangeStartDate: e.target.value})} className="w-full border rounded-lg px-3 py-1.5 mt-1 text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">End Date</label>
                      <input type="date" value={fulfillmentForm.rangeEndDate || ''} onChange={e => setFulfillmentForm({...fulfillmentForm, rangeEndDate: e.target.value})} className="w-full border rounded-lg px-3 py-1.5 mt-1 text-sm"/>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={async () => {
                    const updatedCampaigns = await updateCampaignFulfillment(campaignId, fulfillmentForm);
                    setAllCampaigns(updatedCampaigns);
                    setShowFulfillmentModal(false);
                  }}
                  className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-lg hover:bg-teal-700 transition"
                >
                  Save Fulfillment Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMasterMenuModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 text-gray-900">
               <h3 className="font-bold text-lg flex items-center gap-2">
                 <Plus size={20} className="text-red-600" /> Browse Master Menu
               </h3>
               <button onClick={() => setShowMasterMenuModal(false)} className="text-gray-400 hover:text-gray-600">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6 bg-white flex flex-col sm:flex-row gap-4 border-b border-gray-100">
               <div className="relative flex-1">
                 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input 
                   type="text" 
                   placeholder="Search items by name, category..." 
                   value={mmSearch}
                   onChange={e => setMmSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-100 outline-none"
                 />
               </div>
               <div className="relative w-full sm:w-64">
                 <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <select 
                   value={mmCategory}
                   onChange={e => setMmCategory(e.target.value)}
                   className="w-full pl-10 pr-8 py-2 border rounded-lg appearance-none focus:ring-2 focus:ring-red-100 outline-none bg-white"
                 >
                   <option value="">All Categories</option>
                   {Array.from(new Set(masterMenuItems.filter(i => i.isActive !== false).map(i => i.category))).filter(Boolean).map(c => (
                     <option key={c as string} value={c as string}>{c as string}</option>
                   ))}
                 </select>
               </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
               {masterMenuItems.length === 0 ? (
                 <div className="text-center py-12 text-gray-500">
                    <p>No active items found in the Master Menu for this brand.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {masterMenuItems.filter(i => {
                      if (i.isActive === false) return false;
                      let match = true;
                      if (mmSearch) {
                         const q = mmSearch.toLowerCase();
                         match = i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
                      }
                      if (mmCategory && i.category !== mmCategory) match = false;
                      return match;
                   }).map(item => {
                      const isAlreadyAdded = items.find(ci => ci.masterMenuItemId === item.id && ci.campaignId === campaignId);
                      const isSelected = mmSelectedItems.has(item.id);
                      return (
                        <div key={item.id} className={`border rounded-xl bg-white p-4 flex gap-4 items-start transition-shadow ${isAlreadyAdded ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`} onClick={() => {
                           if (isAlreadyAdded) return;
                           const next = new Set(mmSelectedItems);
                           if (next.has(item.id)) next.delete(item.id);
                           else next.add(item.id);
                           setMmSelectedItems(next);
                        }}>
                           <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                             <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</h4>
                              <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                              <div className="flex justify-between items-center">
                                 <span className="font-medium text-gray-900 text-sm">₹{item.discountedPrice || item.basePrice}</span>
                                 {isAlreadyAdded ? (
                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Added</span>
                                 ) : (
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300'}`}>
                                       {isSelected && <CheckCircle2 size={14} />}
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                      );
                   })}
                 </div>
               )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center">
               <span className="text-sm font-medium text-gray-700">{mmSelectedItems.size} items selected</span>
               <div className="flex gap-3">
                  <button onClick={() => setShowMasterMenuModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddFromMasterMenu}
                    disabled={mmSelectedItems.size === 0}
                    className={`px-5 py-2 rounded-lg font-medium text-sm text-white ${mmSelectedItems.size > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                    Add Selected to Campaign
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent hidden flyer for generation */}
      {(() => {
        const c = allCampaigns.find((camp) => camp.id === campaignId);
        if (!c) return null;
        const b = brands.find(brand => brand.id === c.brandId);
        const url = `${window.location.origin}/c/${campaignId}`;
        const activeItems = (c.id && items) ? items.filter(i => i.campaignId === c.id && i.isActive !== false) : [];
        
        return (
          <div id="whatsapp-flyer-render" className="fixed w-[800px] h-[1131px] font-sans flex flex-col text-left overflow-hidden" 
               style={{ 
                  top: 0, left: 0, pointerEvents: 'none', zIndex: -9999, opacity: 1,
                  backgroundColor: b?.flyerBackgroundStyle === 'GRADIENT' ? '#f3f4f6' : (b?.flyerBackgroundStyle === 'PATTERN' ? '#f8fafc' : '#ffffff'),
                  backgroundImage: b?.flyerBackgroundStyle === 'GRADIENT' ? `linear-gradient(to bottom right, ${b?.primaryColor || '#dc2626'}15, ${b?.secondaryColor || '#ffffff'})` : 'none'
                }}>
            <div className="flex-1 p-12 flex flex-col items-center justify-start text-center">
              {/* Brand Logo & Name */}
              {b?.logo && (
                <img src={b.logo} alt="Brand Logo" className="h-24 w-auto object-contain mb-4" crossOrigin="anonymous" />
              )}
              <h2 className="text-3xl font-bold tracking-tight mb-2" style={{ color: b?.primaryColor || '#111827' }}>
                {b?.name || 'QwikMeal Partner'}
              </h2>
              
              <h1 className="text-5xl font-black text-gray-900 mb-8 mt-2 leading-tight">
                {c?.name || 'Special Offer'}
              </h1>
              
              {/* Banner properly constrained */}
              {activeItems.length > 0 && (
                <div className="w-full h-[300px] flex justify-center mb-10 shadow-2xl rounded-2xl overflow-hidden border-4" style={{ borderColor: b?.primaryColor || '#f3f4f6' }}>
                   <img 
                     src={activeItems[0].mealImage || imgFallback} 
                     alt="Banner" 
                     className="w-full h-full object-cover"
                     referrerPolicy="no-referrer"
                     crossOrigin="anonymous"
                   />
                </div>
              )}
              
              <div className="flex-1 w-full flex flex-col items-center justify-center bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 uppercase tracking-widest text-center">Place Your Order</h3>
                
                <div className="flex items-center justify-center gap-12 w-full">
                  <div className="flex flex-col items-center flex-1">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-dashed border-gray-300 inline-block">
                      <QRCodeCanvas value={url} size={280} level="H" />
                    </div>
                  </div>
                </div>
                
                <p className="mt-10 text-xl text-gray-600 font-medium text-center max-w-lg">
                  Scan the QR Code to browse menu and place your order.
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="w-full py-6 text-center" style={{ backgroundColor: b?.primaryColor || '#1f2937' }}>
              <p className="text-white text-lg font-semibold tracking-wider opacity-90">
                {b?.flyerFooterText || 'Powered by QwikMeal'}
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
