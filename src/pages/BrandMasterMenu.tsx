import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MasterMenuItem, Brand } from '../types';
import { dbService } from '../db';
import { ArrowLeft, Plus, Edit2, Trash2, Search, Filter, Image as ImageIcon, X, Check, Save } from 'lucide-react';
import { ImageUploadCropper } from '../components/ImageUploadCropper';

export function BrandMasterMenu() {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [items, setItems] = useState<MasterMenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MasterMenuItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<MasterMenuItem>>({});
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (brandId) {
      loadData();
    }
  }, [brandId]);

  useEffect(() => {
    filterData();
  }, [items, searchQuery, categoryFilter]);

  const loadData = async () => {
    const brands = await dbService.getBrands();
    const current = brands.find(b => b.id === brandId);
    if (current) setBrand(current);
    
    const menuItems = await dbService.getMasterMenuItems(brandId);
    setItems(menuItems);
  };

  const filterData = () => {
    let result = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(q) || 
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.skuCode && i.skuCode.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) {
      result = result.filter(i => i.category === categoryFilter);
    }
    setFilteredItems(result);
  };

  const categories = Array.from(new Set(items.map(i => i.category))).filter(Boolean);

  const startAdd = () => {
    setCurrentItem({
      brandId,
      isActive: true,
      category: categories[0] || 'Main',
      dietaryType: 'VEG',
      tags: []
    });
    setImagePreview('');
    setIsEditing(true);
    setError('');
  };

  const startEdit = (item: MasterMenuItem) => {
    setCurrentItem({ ...item });
    setImagePreview(item.image);
    setIsEditing(true);
    setError('');
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this master menu item? It will not be available for new campaigns.')) {
      await dbService.deleteMasterMenuItem(itemId);
      setSuccess('Item deleted successfully.');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!currentItem.name || !currentItem.category || !currentItem.basePrice || (!currentItem.image && !imagePreview)) {
      setError('Please fill in Name, Category, Base Price, and upload an image.');
      return;
    }

    const now = new Date().toISOString();
    try {
      if (currentItem.id) {
        const itemToUpdate = {
           ...currentItem,
           updatedAt: now,
           image: imagePreview || currentItem.image
        } as MasterMenuItem;
        await dbService.updateMasterMenuItem(itemToUpdate);
      } else {
        const newItem: MasterMenuItem = {
          ...currentItem as any,
          id: `MM_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          createdAt: now,
          updatedAt: now,
          image: imagePreview,
          tags: currentItem.tags || []
        };
        await dbService.addMasterMenuItem(newItem);
      }
      setIsEditing(false);
      setSuccess('Item saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err: any) {
      setError('Failed to save item: ' + err.message);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(Boolean);
        
        const now = new Date().toISOString();
        let addedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          if (row.length >= 4) {
            const newItem: MasterMenuItem = {
              id: `MM-CSV-${Date.now()}-${i}`,
              brandId: brandId!,
              name: row[0],
              category: row[1] || 'Default',
              dietaryType: (row[2] as any) || 'VEG',
              basePrice: Number(row[3]) || 0,
              description: row[4] || '',
              isActive: true,
              image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80', // Default placeholder
              tags: [],
              createdAt: now,
              updatedAt: now
            };
            await dbService.addMasterMenuItem(newItem);
            addedCount++;
          }
        }
        
        setSuccess(`Successfully imported ${addedCount} items.`);
        setTimeout(() => setSuccess(''), 3000);
        loadData();
      } catch (err: any) {
        setError('CSV Import Failed: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/super/brands')} className="text-gray-500 hover:text-gray-900 border p-2 rounded-lg bg-white">
           <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{brand?.name} - Master Menu</h1>
          <p className="text-sm text-gray-500">Centralized menu repository for this brand.</p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 font-medium">
          <Check size={18} /> {success}
        </div>
      )}

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">{currentItem.id ? 'Edit Menu Item' : 'Add New Item to Master Menu'}</h2>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
               <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                    <input type="text" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="w-full border rounded-lg px-4 py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={currentItem.description || ''} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} className="w-full border rounded-lg px-4 py-2" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                       <input type="text" value={currentItem.category || ''} onChange={e => setCurrentItem({...currentItem, category: e.target.value})} className="w-full border rounded-lg px-4 py-2" placeholder="e.g. Starters" required />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
                       <input type="text" value={currentItem.subCategory || ''} onChange={e => setCurrentItem({...currentItem, subCategory: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹) *</label>
                       <input type="number" min="0" value={currentItem.basePrice || ''} onChange={e => setCurrentItem({...currentItem, basePrice: Number(e.target.value)})} className="w-full border rounded-lg px-4 py-2" required />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Discounted Price (₹)</label>
                       <input type="number" min="0" value={currentItem.discountedPrice || ''} onChange={e => setCurrentItem({...currentItem, discountedPrice: Number(e.target.value)})} className="w-full border rounded-lg px-4 py-2" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Type *</label>
                       <select value={currentItem.dietaryType || 'VEG'} onChange={e => setCurrentItem({...currentItem, dietaryType: e.target.value as any})} className="w-full border rounded-lg px-4 py-2">
                         <option value="VEG">Vegetarian</option>
                         <option value="NON_VEG">Non-Vegetarian</option>
                         <option value="EGG">Contains Egg</option>
                         <option value="JAIN">Jain</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Type</label>
                       <input type="text" value={currentItem.cuisineType || ''} onChange={e => setCurrentItem({...currentItem, cuisineType: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code</label>
                       <input type="text" value={currentItem.skuCode || ''} onChange={e => setCurrentItem({...currentItem, skuCode: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                       <input type="text" value={currentItem.hsnCode || ''} onChange={e => setCurrentItem({...currentItem, hsnCode: e.target.value})} className="w-full border rounded-lg px-4 py-2" />
                     </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                     <input type="checkbox" checked={currentItem.isActive !== false} onChange={e => setCurrentItem({...currentItem, isActive: e.target.checked})} className="rounded text-red-600 focus:ring-red-500 w-4 h-4" />
                     <span className="text-sm font-medium text-gray-700">Item is Active</span>
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Image *</label>
                  <ImageUploadCropper
                    aspectRatio={4/3}
                    currentImage={imagePreview}
                    buttonLabel="Upload Menu Image"
                    onImageCropped={(img) => setImagePreview(img)}
                  />
               </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2">
                 <Save size={18} /> Save Item
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                   <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input type="text" placeholder="Search master menu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-red-100 outline-none" />
                </div>
                <div className="relative">
                   <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border rounded-lg pl-9 pr-8 py-2 text-sm appearance-none focus:ring-2 focus:ring-red-100 outline-none">
                     <option value="">All Categories</option>
                     {categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <label className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer">
                   Bulk Import (CSV)
                   <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                </label>
                <button onClick={startAdd} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2">
                   <Plus size={16} /> Add New Item
                </button>
             </div>
          </div>
          
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                   <th className="p-4 font-medium px-4">Menu Item</th>
                   <th className="p-4 font-medium">Category</th>
                   <th className="p-4 font-medium">Dietary</th>
                   <th className="p-4 font-medium">Base Price</th>
                   <th className="p-4 font-medium">Status</th>
                   <th className="p-4 font-medium text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {filteredItems.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="p-8 text-center text-gray-500">No master menu items found. Add items to get started!</td>
                   </tr>
                 ) : (
                   filteredItems.map(item => (
                     <tr key={item.id} className="hover:bg-gray-50">
                       <td className="p-4">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                             {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                             ) : (
                                <ImageIcon className="w-6 h-6 m-3 text-gray-400" />
                             )}
                           </div>
                           <div>
                             <p className="font-semibold text-gray-900 border-b border-dashed border-gray-300 inline text-sm">{item.name}</p>
                             {item.skuCode && <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {item.skuCode}</p>}
                           </div>
                         </div>
                       </td>
                       <td className="p-4">
                         <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">{item.category}</span>
                       </td>
                       <td className="p-4">
                         <span className={`text-xs font-semibold px-2 py-1 rounded border ${item.dietaryType === 'VEG' ? 'bg-green-50 text-green-700 border-green-200' : item.dietaryType === 'NON_VEG' ? 'bg-red-50 text-red-700 border-red-200' : item.dietaryType === 'EGG' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                           {item.dietaryType}
                         </span>
                       </td>
                       <td className="p-4 font-medium text-gray-900">
                         ₹{item.basePrice}
                         {item.discountedPrice ? <span className="text-xs text-green-600 block line-through opacity-70">₹{item.discountedPrice}</span> : null}
                       </td>
                       <td className="p-4">
                         <span className={`w-2 h-2 inline-block rounded-full mr-2 ${item.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                         <span className="text-sm font-medium">{item.isActive ? 'Active' : 'Inactive'}</span>
                       </td>
                       <td className="p-4 text-right space-x-2">
                         <button onClick={() => startEdit(item)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors inline-block">
                           <Edit2 size={16} />
                         </button>
                         <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors inline-block">
                           <Trash2 size={16} />
                         </button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
}
