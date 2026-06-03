import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Save, Trash2, CheckCircle2, Edit2, X, Upload, BarChart3, Users, DollarSign, ShoppingBag, Eye, EyeOff, Share2, Copy, MessageSquare, Mail, Link2, Download, MapPin } from 'lucide-react';
import { MenuItem, Campaign, Brand, ItemVariant, CampaignPrivacy, CoverageType, CampaignServiceability } from '../types';
import { getBrands } from '../brands';
import { getCampaigns, updateCampaignName, updateCampaignPrivacy, updateCampaignBenefits, updateCampaignServiceability } from '../campaigns';
import { authService } from '../auth';
import { dbService } from '../db';
import { ExportOrdersModal } from '../components/ExportOrdersModal';
import { ImageUploadCropper } from '../components/ImageUploadCropper';

import imgFallback from '../assets/images/img_1543339308.jpg';

export function AdminMenuBuilder() {
  const user = authService.getUser();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allowedBrands, setAllowedBrands] = useState<Brand[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

  const [showSuccess, setShowSuccess] = useState(false);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingVariantsId, setEditingVariantsId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<Partial<MenuItem> | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [campaignLogs, setCampaignLogs] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showServiceabilityModal, setShowServiceabilityModal] = useState(false);
  const [serviceabilityForm, setServiceabilityForm] = useState<CampaignServiceability>({
    enabled: false,
    coverageType: 'ALL_INDIA',
    pincodes: [],
    cities: [],
    radiusInfo: { lat: 0, lng: 0, radiusKm: 5 },
    storeIds: []
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
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-gray-200 pb-6 gap-4">
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
            <div className="flex items-center gap-2">
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

              {brandCampaigns.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      const c = allCampaigns.find((camp) => camp.id === campaignId);
                      setCurrentCampaignPrivacy(c?.sharePrivacy || 'PUBLIC');
                      setShowShareModal(true);
                    }}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition whitespace-nowrap"
                    title="Share Campaign Link"
                  >
                    Share
                  </button>
                  <button
                    onClick={() => {
                      const c = allCampaigns.find((camp) => camp.id === campaignId);
                      if (c?.serviceability) {
                        setServiceabilityForm(c.serviceability);
                      } else {
                        setServiceabilityForm({
                          enabled: false,
                          coverageType: 'ALL_INDIA',
                          pincodes: [],
                          cities: [],
                          radiusInfo: { lat: 0, lng: 0, radiusKm: 5 },
                          storeIds: []
                        });
                      }
                      setShowServiceabilityModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition whitespace-nowrap"
                    title="Campaign Serviceability"
                  >
                    <MapPin size={16} />
                    Serviceability Configuration
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
                    className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition whitespace-nowrap"
                    title="Campaign Benefits"
                  >
                    Benefits Config
                  </button>
                  <button
                    onClick={() => {
                      setNewCampaignName(allCampaigns.find(c => c.id === campaignId)?.name || '');
                      setIsEditingCampaignName(true);
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Edit Campaign Name"
                  >
                    <Edit2 size={18} />
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setNewCampaignName('');
                  setIsCreatingCampaign(true);
                  setIsEditingCampaignName(false);
                }}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Create New Campaign"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

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
              Add Menu Item
            </h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input 
                  type="text" 
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  required
                  placeholder="e.g. Veg Extravaganza"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
                <textarea 
                  value={newItem.description}
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                  rows={2}
                  placeholder="Short description of the item"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Image</label>
                <div className="flex flex-col gap-3">
                  <ImageUploadCropper 
                    aspectRatio={1} 
                    currentImage={newItem.mealImage}
                    onImageCropped={(croppedImg) => {
                      setItemImageFile(new File([new Blob()], "cropped.jpg", { type: "image/jpeg" }));
                      setNewItem({...newItem, mealImage: croppedImg});
                    }}
                    buttonLabel="Upload & Crop Image"
                  />
                  <input 
                    type="text" 
                    value={itemImageFile ? itemImageFile.name : newItem.mealImage}
                    onChange={e => {
                      setItemImageFile(null); // Clear file if URL is manually edited
                      setNewItem({...newItem, mealImage: e.target.value})
                    }}
                    placeholder="Or paste image URL here..."
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {newItem.mealImage && (
                    <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img src={newItem.mealImage} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Type *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="radio" 
                      name="dietaryType" 
                      value="VEG" 
                      checked={newItem.dietaryType === 'VEG'}
                      onChange={() => setNewItem({...newItem, dietaryType: 'VEG'})}
                      className="text-green-600 focus:ring-green-500" 
                    />
                    <span className="font-medium text-green-700">Veg</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="radio" 
                      name="dietaryType" 
                      value="NON_VEG" 
                      checked={newItem.dietaryType === 'NON_VEG'}
                      onChange={() => setNewItem({...newItem, dietaryType: 'NON_VEG'})}
                      className="text-red-600 focus:ring-red-500" 
                    />
                    <span className="font-medium text-red-700">Non-Veg</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP (₹) *</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newItem.mrp || ''}
                    onChange={e => setNewItem({...newItem, mrp: Number(e.target.value)})}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price (₹) *</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newItem.offerPrice || ''}
                    onChange={e => setNewItem({...newItem, offerPrice: Number(e.target.value)})}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charges (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  value={newItem.deliveryCharges || ''}
                  onChange={e => setNewItem({...newItem, deliveryCharges: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="bg-green-50 text-green-800 p-3 rounded-lg border border-green-100 flex justify-between items-center text-sm">
                <span className="font-medium">Proposed Saving:</span>
                <span className="font-bold text-lg">₹{Math.max(0, proposedSaving)}</span>
              </div>

              <button 
                type="submit"
                disabled={isUploading}
                className={`w-full text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isUploading ? 'Uploading Image...' : 'Add Option to Menu'}
              </button>
            </form>
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
                            src={item.mealImage} 
                            alt={item.name} 
                            referrerPolicy="no-referrer"
                            className={`w-24 h-24 object-cover rounded-xl shadow-sm border border-gray-100 ${item.isActive === false ? 'grayscale' : ''}`}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input 
                  type="text" value={editingItemData.name || ''}
                  onChange={e => setEditingItemData({...editingItemData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={editingItemData.description || ''}
                  onChange={e => setEditingItemData({...editingItemData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500" rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input 
                    type="text" value={editingItemData.category || ''}
                    placeholder="e.g. Starters, Mains"
                    onChange={e => setEditingItemData({...editingItemData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
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
                    onChange={e => setEditingItemData({...editingItemData, dietaryType: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-Vegetarian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input 
                    type="text" value={editingItemData.mealImage || ''}
                    onChange={e => setEditingItemData({...editingItemData, mealImage: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP (₹)</label>
                  <input 
                    type="number" value={editingItemData.mrp || 0}
                    onChange={e => setEditingItemData({...editingItemData, mrp: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price (₹)</label>
                  <input 
                    type="number" value={editingItemData.offerPrice || 0}
                    onChange={e => setEditingItemData({...editingItemData, offerPrice: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
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
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
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
            <div className="p-6">
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
                    {`${window.location.origin}/c/${campaignId}`}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/c/${campaignId}`);
                      alert('Link copied to clipboard!');
                    }}
                    title="Copy Link"
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition flex items-center gap-2"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    const text = encodeURIComponent(`Check out our new campaign! ${window.location.origin}/c/${campaignId}`);
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <MessageSquare className="text-gray-400 group-hover:text-green-500 transition-colors" size={24} />
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-green-600 transition-colors">WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent('New Campaign');
                    const body = encodeURIComponent(`Check out our new campaign!\n\nLink: ${window.location.origin}/c/${campaignId}`);
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }}
                  className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                >
                  <Mail className="text-gray-400 group-hover:text-blue-500 transition-colors" size={24} />
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">Email</span>
                </button>
                <button
                  onClick={async () => {
                    const url = `${window.location.origin}/c/${campaignId}`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Campaign Link',
                          text: 'Check out our new campaign!',
                          url: url,
                        });
                      } catch (err) {
                        console.error('Share failed:', err);
                      }
                    } else {
                      window.open(`sms:?body=${encodeURIComponent(url)}`, '_self');
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors group"
                >
                  <Share2 className="text-gray-400 group-hover:text-purple-500 transition-colors" size={24} />
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-purple-600 transition-colors">{navigator.share ? 'More' : 'SMS'}</span>
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
      {showServiceabilityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <MapPin size={20} className="text-indigo-600" />
                Campaign Serviceability
              </h3>
              <button 
                onClick={() => setShowServiceabilityModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <MapPin size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Delivery Validation</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">Control where this campaign is available for delivery.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceabilityForm.enabled}
                    onChange={(e) => setServiceabilityForm({ ...serviceabilityForm, enabled: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-gray-800">Enable Serviceability Validation</span>
                </label>
              </div>

               {serviceabilityForm.enabled && (
                 <div className="space-y-4">
                   <label className="block text-sm font-semibold text-gray-700">Coverage Type</label>
                   <select 
                     value={serviceabilityForm.coverageType}
                     onChange={(e) => setServiceabilityForm({ ...serviceabilityForm, coverageType: e.target.value as CoverageType })}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                   >
                     <option value="ALL_INDIA">All India (Nationwide)</option>
                     <option value="PINCODES">Selected Pincodes</option>
                     <option value="CITIES">Selected Cities</option>
                     <option value="RADIUS">Radius Based</option>
                     <option value="STORES">Store Coverage Only</option>
                   </select>

                   {serviceabilityForm.coverageType === 'PINCODES' && (
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Enter Pincodes (comma separated)</label>
                       <textarea 
                         placeholder="e.g. 110001, 110002"
                         value={serviceabilityForm.pincodes?.join(', ') || ''}
                         onChange={(e) => {
                           const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                           setServiceabilityForm({ ...serviceabilityForm, pincodes: arr });
                         }}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24"
                       />
                       <p className="text-xs text-gray-500 mt-1">Total pincodes: {serviceabilityForm.pincodes?.length || 0}</p>
                     </div>
                   )}

                   {serviceabilityForm.coverageType === 'CITIES' && (
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Enter Cities (comma separated)</label>
                       <textarea 
                         placeholder="e.g. New Delhi, Mumbai, Bangalore"
                         value={serviceabilityForm.cities?.join(', ') || ''}
                         onChange={(e) => {
                           const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                           setServiceabilityForm({ ...serviceabilityForm, cities: arr });
                         }}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24"
                       />
                     </div>
                   )}

                   {serviceabilityForm.coverageType === 'RADIUS' && (
                     <div className="grid grid-cols-3 gap-3">
                       <div>
                         <label className="block text-xs font-medium text-gray-700 mb-1">Lat</label>
                         <input type="number" step="0.0001" value={serviceabilityForm.radiusInfo?.lat || 0} onChange={e => setServiceabilityForm({...serviceabilityForm, radiusInfo: {...serviceabilityForm.radiusInfo!, lat: Number(e.target.value)}})} className="w-full border rounded-lg px-2 py-1 text-sm" />
                       </div>
                       <div>
                         <label className="block text-xs font-medium text-gray-700 mb-1">Lng</label>
                         <input type="number" step="0.0001" value={serviceabilityForm.radiusInfo?.lng || 0} onChange={e => setServiceabilityForm({...serviceabilityForm, radiusInfo: {...serviceabilityForm.radiusInfo!, lng: Number(e.target.value)}})} className="w-full border rounded-lg px-2 py-1 text-sm" />
                       </div>
                       <div>
                         <label className="block text-xs font-medium text-gray-700 mb-1">Radius (KM)</label>
                         <input type="number" min="0" value={serviceabilityForm.radiusInfo?.radiusKm || 5} onChange={e => setServiceabilityForm({...serviceabilityForm, radiusInfo: {...serviceabilityForm.radiusInfo!, radiusKm: Number(e.target.value)}})} className="w-full border rounded-lg px-2 py-1 text-sm" />
                       </div>
                     </div>
                   )}
                 </div>
               )}

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={async () => {
                    const updatedCampaigns = await updateCampaignServiceability(campaignId, serviceabilityForm);
                    setAllCampaigns(updatedCampaigns);
                    setShowServiceabilityModal(false);
                  }}
                  className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm"
                >
                  Save Serviceability Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
