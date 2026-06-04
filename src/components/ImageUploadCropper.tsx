import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, X, Crop as CropIcon, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedImg } from '../lib/getCroppedImg';

export interface ImageUploadCropperProps {
  onImageCropped: (croppedImageBase64: string) => void;
  aspectRatio?: number;
  currentImage?: string;
  className?: string;
  buttonLabel?: string;
}

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

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
    }
  };

  const showCroppedImage = useCallback(async () => {
    try {
      if (imageSrc && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
        onImageCropped(croppedImage);
        setImageSrc(null); // Close modal
      }
    } catch (e) {
      console.error(e);
      alert("Error cropping image");
    }
  }, [imageSrc, croppedAreaPixels, onImageCropped]);

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
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CropIcon size={20} className="text-red-600" />
                Image Optimization & Crop
              </h3>
              <button 
                onClick={() => setImageSrc(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="relative flex-1 bg-gray-100">
              <div className="absolute inset-0">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
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
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <p className="text-sm text-gray-500 hidden sm:block">
                Drag to reposition. Keep main subject in the central safe zone.
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
                  className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex-1 sm:flex-none"
                >
                  Apply & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
