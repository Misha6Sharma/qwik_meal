import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, Image as ImageIcon, X, MapPin } from 'lucide-react';
import { Brand, ServiceabilitySettings, CoverageType } from '../types';
import { getBrands, addBrand, updateBrand, deleteBrand } from '../brands';
import { authService } from '../auth';
import { ImageUploadCropper } from '../components/ImageUploadCropper';

export function SuperAdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Partial<Brand>>({});
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showServiceabilityModal, setShowServiceabilityModal] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [serviceabilityForm, setServiceabilityForm] = useState<ServiceabilitySettings>({
    enabled: false,
    coverageType: 'ALL_INDIA',
    pincodes: [],
    cities: [],
    radiusInfo: { lat: 0, lng: 0, radiusKm: 5 },
    storeIds: []
  });
  
  const user = authService.getUser();

  useEffect(() => {
    getBrands().then(setBrands);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Allowed formats: JPG, JPEG, PNG, WEBP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size exceeds 2MB limit.');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setCurrentBrand({ ...currentBrand, logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBrand.name || (!currentBrand.logo && !selectedFile) || !currentBrand.description || !currentBrand.offer) {
       setError('All fields are required.');
       return;
    }

    const now = new Date().toISOString();
    
    let logoUrl = currentBrand.logo || '';
    
    try {
      if (selectedFile) {
        if (imagePreview.length > 700000) {
           setError("Image is too large. Please select an image under 500KB.");
           return;
        }
        logoUrl = imagePreview;
      }

      if (currentBrand.id) {
         const uBrand = currentBrand as Brand;
         uBrand.logo = logoUrl;
         uBrand.lastModifiedTimestamp = now;
         uBrand.modifiedBy = user?.name || user?.email || 'System';
         if (selectedFile) {
            uBrand.uploadTimestamp = now;
         }
         await updateBrand(uBrand);
      } else {
         const newBrand: Brand = {
           id: `brd_${Date.now()}`,
           name: currentBrand.name,
           logo: logoUrl,
           description: currentBrand.description,
           offer: currentBrand.offer,
           isActive: currentBrand.isActive !== undefined ? currentBrand.isActive : true,
           uploadTimestamp: now,
           lastModifiedTimestamp: now,
           modifiedBy: user?.name || user?.email || 'System',
           storeLocatorEnabled: currentBrand.storeLocatorEnabled,
           storeLocatorUrl: currentBrand.storeLocatorUrl
         };
         await addBrand(newBrand);
      }
      
      setBrands(await getBrands());
      setIsEditing(false);
      setCurrentBrand({});
      setImagePreview('');
      setSelectedFile(null);
      setError('');
      setSuccess('Brand updated successfully and changes synced across the application.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Error saving brand: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      await deleteBrand(id);
      setBrands(await getBrands());
      setSuccess('Brand updated successfully and changes synced across the application.');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const startEdit = (brand: Brand) => {
    setCurrentBrand({ ...brand });
    setImagePreview(brand.logo);
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const startAdd = () => {
    setCurrentBrand({ isActive: true });
    setImagePreview('');
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const openServiceability = (brand: Brand) => {
    setActiveBrandId(brand.id);
    setServiceabilityForm(brand.serviceability || {
      enabled: false,
      coverageType: 'ALL_INDIA',
      pincodes: [],
      cities: [],
      radiusInfo: { lat: 0, lng: 0, radiusKm: 5 },
      storeIds: []
    });
    setShowServiceabilityModal(true);
  };

  const saveServiceability = async () => {
    if (!activeBrandId) return;
    const brandToUpdate = brands.find(b => b.id === activeBrandId);
    if (!brandToUpdate) return;
    
    brandToUpdate.serviceability = serviceabilityForm;
    brandToUpdate.lastModifiedTimestamp = new Date().toISOString();
    brandToUpdate.modifiedBy = user?.name || user?.email || 'System';
    
    await updateBrand(brandToUpdate);
    setBrands(await getBrands());
    setShowServiceabilityModal(false);
    setSuccess('Brand serviceability updated successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      // Determine what to parse by coverageType
      if (serviceabilityForm.coverageType === 'PINCODES') {
         // Assuming single column or comma separated line
         const codes = text.split(/[\n,]/).map(s => s.trim().replace(/['"]/g, '')).filter(s => s.length >= 6);
         const existing = new Set(serviceabilityForm.pincodes || []);
         codes.forEach(c => existing.add(c));
         setServiceabilityForm(prev => ({ ...prev, pincodes: Array.from(existing) }));
      } else if (serviceabilityForm.coverageType === 'CITIES') {
         const cities = text.split(/[\n,]/).map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
         const existing = new Set(serviceabilityForm.cities || []);
         cities.forEach(c => existing.add(c));
         setServiceabilityForm(prev => ({ ...prev, cities: Array.from(existing) }));
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Management</h1>
          <p className="text-sm text-gray-500">Add, edit, or remove brands</p>
        </div>
        {!isEditing && (
          <button
            onClick={startAdd}
            className="bg-red-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add New Brand
          </button>
        )}
      </div>

      {success && (
        <div className="p-4 text-sm font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">{currentBrand.id ? 'Edit Brand' : 'Add Brand'}</h2>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={currentBrand.name || ''}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={currentBrand.description || ''}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Tagline *</label>
                  <input
                    type="text"
                    value={currentBrand.offer || ''}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, offer: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="status"
                      checked={currentBrand.isActive !== false}
                      onChange={() => setCurrentBrand({...currentBrand, isActive: true})}
                      className="text-green-600 focus:ring-green-500" 
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="status"
                      checked={currentBrand.isActive === false}
                      onChange={() => setCurrentBrand({...currentBrand, isActive: false})}
                      className="text-gray-600 focus:ring-gray-500" 
                    />
                    <span className="text-sm">Inactive</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <label className="text-sm font-medium text-gray-700">Store Locator Enabled:</label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={currentBrand.storeLocatorEnabled || false}
                      onChange={(e) => setCurrentBrand({...currentBrand, storeLocatorEnabled: e.target.checked})}
                      className="text-green-600 focus:ring-green-500 rounded border-gray-300 h-4 w-4" 
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                </div>

                {currentBrand.storeLocatorEnabled && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Locator URL *</label>
                    <input
                      type="url"
                      value={currentBrand.storeLocatorUrl || ''}
                      onChange={(e) => setCurrentBrand({ ...currentBrand, storeLocatorUrl: e.target.value })}
                      placeholder="https://www.brand.com/store-locator"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required={currentBrand.storeLocatorEnabled}
                      pattern="https://.*"
                      title="Must be a valid URL starting with https://"
                    />
                  </div>
                )}
                
                <h4 className="font-semibold text-md text-gray-800 mt-6 mb-3 border-b pb-2">Flyer Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <input
                      type="color"
                      value={currentBrand.primaryColor || '#dc2626'}
                      onChange={(e) => setCurrentBrand({ ...currentBrand, primaryColor: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg h-10 p-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                    <input
                      type="color"
                      value={currentBrand.secondaryColor || '#ffffff'}
                      onChange={(e) => setCurrentBrand({ ...currentBrand, secondaryColor: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg h-10 p-1"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Style</label>
                  <select
                    value={currentBrand.flyerBackgroundStyle || 'SOLID'}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, flyerBackgroundStyle: e.target.value as 'SOLID' | 'GRADIENT' | 'PATTERN' })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="SOLID">Solid</option>
                    <option value="GRADIENT">Gradient</option>
                    <option value="PATTERN">Pattern</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                  <input
                    type="text"
                    value={currentBrand.flyerFooterText || 'Powered by QwikMeal'}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, flyerFooterText: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Image (Logo) *</label>
                <ImageUploadCropper 
                  aspectRatio={1} 
                  currentImage={imagePreview}
                  onImageCropped={(croppedImg) => {
                    const byteString = atob(croppedImg.split(',')[1]);
                    const mimeString = croppedImg.split(',')[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                      ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    const file = new File([blob], "brand_logo.jpg", { type: mimeString });

                    setSelectedFile(file);
                    setImagePreview(croppedImg);
                    setCurrentBrand({...currentBrand, logo: croppedImg});
                  }}
                  buttonLabel="Upload & Crop Brand Logo"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <><CheckCircle2 size={16} /> Save Brand</>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <div key={brand.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-50 relative border-b border-gray-100 p-4 flex items-center justify-center">
                <img 
                  src={brand.logo || undefined} 
                  alt={brand.name} 
                  referrerPolicy="no-referrer" 
                  className="max-h-full max-w-full object-contain" 
                />
                {!brand.isActive && (
                  <div className="absolute top-2 right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">Inactive</div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 mb-1">{brand.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{brand.description}</p>
                <div className="text-xs text-gray-400 space-y-1 mb-4">
                  {brand.lastModifiedTimestamp && <p>Updated: {new Date(brand.lastModifiedTimestamp).toLocaleString()}</p>}
                  {brand.modifiedBy && <p>By: {brand.modifiedBy}</p>}
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                  <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">{brand.offer}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openServiceability(brand)}
                      className="p-1.5 text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                      title="Manage Serviceability"
                    >
                      <MapPin size={16} />
                    </button>
                    <button 
                      onClick={() => startEdit(brand)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(brand.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showServiceabilityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <MapPin size={20} className="text-indigo-600" />
                Brand Serviceability
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
                  <p className="text-xs text-indigo-700 mt-0.5">Control where this brand is available for delivery.</p>
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
                       <div className="flex justify-between items-end mb-1">
                         <label className="block text-sm font-medium text-gray-700">Enter Pincodes (comma separated)</label>
                         <label className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded cursor-pointer hover:bg-indigo-100 font-medium border border-indigo-200">
                            Upload CSV
                            <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
                         </label>
                       </div>
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
                       <div className="flex justify-between items-end mb-1">
                         <label className="block text-sm font-medium text-gray-700">Enter Cities (comma separated)</label>
                         <label className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded cursor-pointer hover:bg-indigo-100 font-medium border border-indigo-200">
                            Upload CSV
                            <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
                         </label>
                       </div>
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
                  onClick={saveServiceability}
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
