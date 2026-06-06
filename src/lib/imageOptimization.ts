export const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') 
    image.src = url
  })

export async function optimizeImageBase64(
  dataUrl: string, 
  maxWidth = 1200, 
  maxHeight = 1200,
  targetSizeKb = 300
): Promise<string> {
  const image = await createImage(dataUrl);
  
  let { width, height } = image;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return dataUrl;
  
  ctx.drawImage(image, 0, 0, width, height);

  let quality = 0.9;
  let type = 'image/webp';
  
  // Try WebP first, fallback to JPEG if WebP size check fails to produce Blob (some old browsers)
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  
  if (!blob) {
    type = 'image/jpeg';
    // Redraw with white background for JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  }
  
  if (!blob) return dataUrl;

  // Compress loop
  while (blob && blob.size > targetSizeKb * 1024 && quality > 0.4) {
    quality -= 0.1;
    let newBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (newBlob && newBlob.size < blob.size) {
      blob = newBlob;
    } else {
      break;
    }
  }

  if (blob && blob.size > targetSizeKb * 1024 && width > 600) {
     // Still too large, reduce dimensions
     const newWidth = Math.round(width * 0.8);
     const newHeight = Math.round(height * 0.8);
     canvas.width = newWidth;
     canvas.height = newHeight;
     ctx.drawImage(image, 0, 0, newWidth, newHeight);
     blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  }

  if (!blob) return dataUrl;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob!);
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}
