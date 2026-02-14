// lib/cloudinary.js
// Cloudinary storage - replaces Firebase Storage entirely

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Upload limits - balancing quality and storage (25GB free plan)
export const UPLOAD_LIMITS = {
  BACKGROUND: 2 * 1024 * 1024,  // 2MB max for backgrounds
  ELEMENT: 1 * 1024 * 1024,     // 1MB max for logos/elements
};

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured() {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
}

/**
 * Validate file size before upload
 */
export function validateFileSize(base64String, maxSize) {
  const base64Data = base64String.includes(',') 
    ? base64String.split(',')[1] 
    : base64String;
  const estimatedSize = Math.ceil(base64Data.length * 0.75);
  
  if (estimatedSize > maxSize) {
    const maxMB = (maxSize / 1024 / 1024).toFixed(1);
    const actualMB = (estimatedSize / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      size: estimatedSize,
      error: `File too large (${actualMB}MB). Maximum allowed is ${maxMB}MB. Please use a smaller image.`
    };
  }
  
  return { valid: true, size: estimatedSize };
}

/**
 * Compress image before upload
 */
export function compressImage(base64Image, options = {}) {
  const { maxWidth = 1600, maxHeight = 1200, quality = 0.85 } = options;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressed = canvas.toDataURL('image/jpeg', quality);
      console.log(`Compressed: ${(base64Image.length/1024).toFixed(0)}KB → ${(compressed.length/1024).toFixed(0)}KB`);
      resolve(compressed);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Image;
  });
}

/**
 * Upload image to Cloudinary
 */
export async function uploadToCloudinary(base64Image, options = {}) {
  const { folder = 'certcat', type = 'background' } = options;
  
  if (!isCloudinaryConfigured()) {
    return {
      success: false,
      error: 'Cloudinary not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local'
    };
  }

  // Validate file size
  const maxSize = type === 'background' ? UPLOAD_LIMITS.BACKGROUND : UPLOAD_LIMITS.ELEMENT;
  const validation = validateFileSize(base64Image, maxSize);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

/**
 * Get optimized URL with Cloudinary transformations
 */
export function getOptimizedUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const { width, quality = 'auto', format = 'auto' } = options;
  let transforms = `q_${quality},f_${format}`;
  if (width) transforms += `,w_${width}`;
  
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/${transforms}/${parts[1]}`;
  }
  return url;
}

/**
 * Test Cloudinary connection (for status page)
 */
export async function testCloudinaryConnection() {
  if (!isCloudinaryConfigured()) {
    return { ok: false, message: 'Not configured' };
  }
  
  try {
    const response = await fetch(
      `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/sample.jpg`,
      { method: 'HEAD', cache: 'no-store' }
    );
    return response.ok 
      ? { ok: true, message: 'Operational' }
      : { ok: false, message: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}