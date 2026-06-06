import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, X, Crop as CropIcon, Image as ImageIcon, ZoomIn, ZoomOut, Check, Maximize } from 'lucide-react';
import { getCroppedImg } from '../lib/getCroppedImg';
import { optimizeImageBase64 } from '../lib/imageOptimization';

export interface ImageUploadCropperProps {
  onImageCropped: (croppedImageBase64: string) => void;
  aspectRatio?: number;
  currentImage?: string;
  className?: string;
  buttonLabel?: string;
}

const PRESET_ASPECTS = [
  { label: 'Default', value: 'default' },
  { label: 'Free Crop', value: 0 },
  { label: '1:1 (Square)', value: 1 },
  { label: '16:9 (Banner)', value: 16/9 },
  { label: '4:3 (Standard)', value: 4/3 },
  { label: '9:16 (Portrait)', value: 9/16 },
  { label: '21:9 (Wide)', value: 21/9 }
];

export function ImageUploadCropper({ 
  onImageCropped, 
  aspectRatio = 1, 
  currentImage,
  className = "",
  buttonLabel = "Upload Image"
}: ImageUploadCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedAspect, setSelectedAspect] = useState<number | 'default'>(aspectRatio || 'default');
  const [skipCrop, setSkipCrop] = useState(false);

  useEffect(() => {
    if (aspectRatio) {
      setSelectedAspect(aspectRatio);
    }
  }, [aspectRatio]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        setSkipCrop(false);
      });
      reader.readAsDataURL(file);
    }
  };

  const showCroppedImage = useCallback(async () => {
    try {
      if (skipCrop && imageSrc) {
        const optimized = await optimizeImageBase64(imageSrc);
        const kbSize = Math.round((optimized.length * 0.75) / 1024);
        if (kbSize > 300) {
          alert(`Warning: The optimized image is around ${kbSize}KB, which exceeds the ideal 300KB limit. Consider using a simpler image.`);
        } else if (kbSize > 200 && optimized.length !== imageSrc.length) {
          console.warn("Notice: High compression was applied to meet the 300KB limit. Quality degradation may be noticeable.");
        }
        onImageCropped(optimized);
        setImageSrc(null);
        return;
      }
      
      if (imageSrc && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
        const optimized = await optimizeImageBase64(croppedImage);
        const kbSize = Math.round((optimized.length * 0.75) / 1024);
        if (kbSize > 300) {
          alert(`Warning: The optimized image is around ${kbSize}KB, which exceeds the ideal 300KB limit. Consider using a simpler image.`);
        } else if (kbSize > 200 && optimized.length !== croppedImage.length) {
          console.warn("Notice: High compression was applied to meet the 300KB limit. Quality degradation may be noticeable.");
        }
        onImageCropped(optimized);
        setImageSrc(null); // Close modal
      }
    } catch (e) {
      console.error(e);
      alert("Error cropping and optimizing image. Please try a different image.");
    }
  }, [imageSrc, croppedAreaPixels, skipCrop, onImageCropped]);

  const activeAspect = selectedAspect === 'default' ? aspectRatio : selectedAspect === 0 ? undefined : selectedAspect;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex gap-4 items-center">
        {currentImage && !imageSrc && (
          <div className="w-16 h-16 rounded overflow-hidden border border-gray-200">
            <img src={currentImage || undefined} alt="Current" className="w-full h-full object-cover" />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
        >
          <Upload size={18} />
          {buttonLabel}
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {imageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CropIcon size={20} className="text-red-600" />
                Image Optimization & Crop
              </h3>
              <button 
                onClick={() => setImageSrc(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              <div className="relative flex-1 bg-gray-900 border-r border-gray-200">
                {skipCrop ? (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <img src={imageSrc} alt="Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={activeAspect as number}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        showGrid={true}
                      />
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg flex items-center gap-4">
                       <ZoomOut size={20} className="text-gray-600" />
                       <input
                         type="range"
                         value={zoom}
                         min={1}
                         max={3}
                         step={0.1}
                         aria-labelledby="Zoom"
                         onChange={(e) => setZoom(Number(e.target.value))}
                         className="w-32 accent-red-600"
                       />
                       <ZoomIn size={20} className="text-gray-600" />
                    </div>
                  </>
                )}
              </div>
              
              <div className="w-full lg:w-72 bg-white p-6 flex flex-col overflow-y-auto">
                <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Crop Settings</h4>
                
                <div className="space-y-4">
                  <button
                    onClick={() => setSkipCrop(true)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition text-left ${skipCrop ? 'border-red-600 bg-red-50 text-red-700 font-bold' : 'border-gray-200 hover:border-red-300 text-gray-700'}`}
                  >
                    <div className="flex items-center gap-2">
                       <Maximize size={18} />
                       <span>Use Original (Fit)</span>
                    </div>
                    {skipCrop && <Check size={18} />}
                  </button>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Aspect Ratios</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_ASPECTS.map((aspect) => (
                        <button
                          key={aspect.label}
                          onClick={() => {
                            setSelectedAspect(aspect.value as any);
                            setSkipCrop(false);
                          }}
                          className={`flex items-center justify-center p-2 rounded-lg border transition text-xs font-medium ${!skipCrop && selectedAspect === aspect.value ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-red-400'}`}
                        >
                          {aspect.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                 <div className="mt-auto pt-6">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs font-medium mb-4">
                      Tip: Banners look best when using Wide or Landscape aspect. Using "Fit" will prevent any part of the image from being cut off.
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <p className="text-sm text-gray-500 hidden sm:block">
                {skipCrop ? 'Original image will be used.' : 'Drag to reposition. Keep main subject in the central safe zone.'}
              </p>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setImageSrc(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition flex-1 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  onClick={showCroppedImage}
                  className="px-8 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-sm flex-1 sm:flex-none flex items-center justify-center gap-2"
                >
                  <Check size={18} /> Apply & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
