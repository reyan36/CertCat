// lib/storage-service.js
// Multi-provider storage: Cloudinary (primary) + ImageKit (backup)
// Both providers work independently - if one fails, the other can still work

// ============ CLOUDINARY (Primary) ============
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// ============ IMAGEKIT (Backup) ============
const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL;
const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
// Note: IMAGEKIT_PRIVATE_KEY is only available server-side

// Upload limits
export const UPLOAD_LIMITS = {
  BACKGROUND: 2 * 1024 * 1024,  // 2MB
  ELEMENT: 1 * 1024 * 1024,     // 1MB
};

/**
 * Check which providers are configured
 * Now includes separate checks for client and server requirements
 */
export function getStorageStatus() {
  const cloudinaryConfigured = !!(CLOUDINARY_CLOUD && CLOUDINARY_PRESET);
  const imagekitClientConfigured = !!(IMAGEKIT_URL && IMAGEKIT_PUBLIC_KEY);

  return {
    cloudinary: {
      configured: cloudinaryConfigured,
      name: 'Cloudinary',
      tier: 'Primary',
      ready: cloudinaryConfigured,
      missingKeys: !cloudinaryConfigured
        ? [!CLOUDINARY_CLOUD && 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', !CLOUDINARY_PRESET && 'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET'].filter(Boolean)
        : [],
    },
    imagekit: {
      configured: imagekitClientConfigured,
      name: 'ImageKit',
      tier: 'Backup',
      ready: imagekitClientConfigured, // Server-side auth check happens during upload
      missingKeys: !imagekitClientConfigured
        ? [!IMAGEKIT_URL && 'NEXT_PUBLIC_IMAGEKIT_URL', !IMAGEKIT_PUBLIC_KEY && 'NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY'].filter(Boolean)
        : [],
    },
    anyConfigured: cloudinaryConfigured || imagekitClientConfigured,
  };
}

/**
 * Validate file size
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
      error: `File too large (${actualMB}MB). Maximum: ${maxMB}MB.`,
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
      console.log(`📦 Compressed: ${(base64Image.length / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB`);
      resolve(compressed);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Image;
  });
}

/**
 * Upload to Cloudinary
 */
async function uploadToCloudinary(base64Image, folder = 'certcat') {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) {
    throw new Error('Cloudinary not configured: Missing cloud name or upload preset');
  }

  const formData = new FormData();
  formData.append('file', base64Image);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error?.message || 'Cloudinary upload failed';
    // Check for specific errors
    if (errorMsg.includes('Invalid cloud name') || errorMsg.includes('Unknown API key')) {
      throw new Error(`Cloudinary credentials invalid: ${errorMsg}`);
    }
    if (errorMsg.includes('Upload preset')) {
      throw new Error(`Cloudinary upload preset invalid: ${errorMsg}`);
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
    provider: 'Cloudinary',
  };
}

/**
 * Upload to ImageKit
 */
async function uploadToImageKit(base64Image, folder = 'certcat') {
  if (!IMAGEKIT_URL || !IMAGEKIT_PUBLIC_KEY) {
    throw new Error('ImageKit not configured: Missing URL or public key');
  }

  // Get authentication signature from server
  // This is where IMAGEKIT_PRIVATE_KEY is used (server-side only)
  let auth;
  try {
    const authResponse = await fetch('/api/imagekit-auth');
    if (!authResponse.ok) {
      const authError = await authResponse.json();
      if (authError.error?.includes('private key')) {
        throw new Error('ImageKit private key not configured on server. Add IMAGEKIT_PRIVATE_KEY to .env.local');
      }
      throw new Error(authError.error || 'Failed to get ImageKit authentication');
    }
    auth = await authResponse.json();
  } catch (error) {
    if (error.message.includes('private key')) {
      throw error;
    }
    throw new Error(`ImageKit auth failed: ${error.message}`);
  }

  // Convert base64 to blob
  const base64Data = base64Image.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('file', blob, `image_${Date.now()}.jpg`);
  formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
  formData.append('folder', `/${folder}`);
  formData.append('fileName', `img_${Date.now()}`);
  formData.append('signature', auth.signature);
  formData.append('expire', auth.expire);
  formData.append('token', auth.token);

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.message || 'ImageKit upload failed';
    if (errorMsg.includes('signature') || errorMsg.includes('authentication')) {
      throw new Error(`ImageKit authentication failed. Check your private key: ${errorMsg}`);
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return {
    url: data.url,
    publicId: data.fileId,
    provider: 'ImageKit',
  };
}

/**
 * Upload image with automatic fallback
 * Tries Cloudinary first, falls back to ImageKit if Cloudinary fails
 *
 * Key improvement: Each provider is tried independently with clear error messages
 */
export async function uploadImage(base64Image, options = {}) {
  const { folder = 'certcat', type = 'background' } = options;

  // Validate size
  const maxSize = type === 'background' ? UPLOAD_LIMITS.BACKGROUND : UPLOAD_LIMITS.ELEMENT;
  const validation = validateFileSize(base64Image, maxSize);

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const status = getStorageStatus();
  const errors = [];

  // Try Cloudinary first (primary)
  if (status.cloudinary.configured) {
    try {
      console.log('📤 Uploading to Cloudinary (primary)...');
      const result = await uploadToCloudinary(base64Image, folder);
      console.log('✅ Cloudinary upload successful');
      return { success: true, ...result };
    } catch (error) {
      console.error('❌ Cloudinary failed:', error.message);
      errors.push({ provider: 'Cloudinary', error: error.message });
      // Continue to ImageKit fallback
    }
  } else {
    console.log('⚠️ Cloudinary not configured, trying ImageKit...');
    errors.push({ provider: 'Cloudinary', error: `Not configured. Missing: ${status.cloudinary.missingKeys.join(', ')}` });
  }

  // Try ImageKit as backup
  if (status.imagekit.configured) {
    try {
      console.log('📤 Uploading to ImageKit (backup)...');
      const result = await uploadToImageKit(base64Image, folder);
      console.log('✅ ImageKit upload successful');
      return { success: true, ...result, usedFallback: true };
    } catch (error) {
      console.error('❌ ImageKit failed:', error.message);
      errors.push({ provider: 'ImageKit', error: error.message });
    }
  } else {
    console.log('⚠️ ImageKit not configured');
    errors.push({ provider: 'ImageKit', error: `Not configured. Missing: ${status.imagekit.missingKeys.join(', ')}` });
  }

  // Both failed - provide helpful error message
  if (!status.anyConfigured) {
    return {
      success: false,
      error: 'No storage provider configured. Add Cloudinary or ImageKit credentials to .env.local',
      details: errors,
    };
  }

  // Build informative error message
  const errorMessages = errors.map(e => `${e.provider}: ${e.error}`).join('\n');
  return {
    success: false,
    error: 'All storage providers failed. Check your credentials.',
    details: errors,
    fullError: errorMessages,
  };
}

/**
 * Get optimized URL (Cloudinary/ImageKit transformations)
 */
export function getOptimizedUrl(url, options = {}) {
  if (!url) return url;

  // Cloudinary URL optimization
  if (url.includes('cloudinary.com')) {
    const { width, quality = 'auto', format = 'auto' } = options;
    let transforms = `q_${quality},f_${format}`;
    if (width) transforms += `,w_${width}`;

    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/${transforms}/${parts[1]}`;
    }
  }

  // ImageKit URL optimization
  if (url.includes('imagekit.io')) {
    const { width, quality = 80 } = options;
    let transforms = `tr:q-${quality}`;
    if (width) transforms += `,w-${width}`;

    // Insert transformation before filename
    const urlParts = url.split('/');
    const filename = urlParts.pop();
    return `${urlParts.join('/')}/${transforms}/${filename}`;
  }

  return url;
}

/**
 * Test storage provider connections
 * Improved to give clear status for each provider
 */
export async function testStorageProviders() {
  const results = {};
  const status = getStorageStatus();

  // Test Cloudinary
  if (status.cloudinary.configured) {
    try {
      const response = await fetch(
        `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/sample.jpg`,
        { method: 'HEAD' }
      );
      results.cloudinary = {
        status: response.ok ? 'operational' : 'error',
        message: response.ok ? 'Connected and ready' : `HTTP ${response.status}`,
        ready: response.ok,
      };
    } catch (error) {
      results.cloudinary = {
        status: 'error',
        message: error.message,
        ready: false,
      };
    }
  } else {
    results.cloudinary = {
      status: 'not_configured',
      message: `Missing: ${status.cloudinary.missingKeys.join(', ')}`,
      ready: false,
    };
  }

  // Test ImageKit
  if (status.imagekit.configured) {
    try {
      // Test CDN connectivity
      const cdnResponse = await fetch(`${IMAGEKIT_URL}/default-image.jpg`, { method: 'HEAD' });

      // Test auth endpoint (checks if private key is configured)
      let authOk = false;
      try {
        const authResponse = await fetch('/api/imagekit-auth');
        authOk = authResponse.ok;
      } catch {
        authOk = false;
      }

      if (cdnResponse.ok && authOk) {
        results.imagekit = {
          status: 'operational',
          message: 'Connected and ready',
          ready: true,
        };
      } else if (cdnResponse.ok && !authOk) {
        results.imagekit = {
          status: 'partial',
          message: 'CDN reachable but auth failed. Check IMAGEKIT_PRIVATE_KEY in .env.local',
          ready: false,
        };
      } else {
        results.imagekit = {
          status: 'error',
          message: `CDN HTTP ${cdnResponse.status}`,
          ready: false,
        };
      }
    } catch (error) {
      results.imagekit = {
        status: 'error',
        message: error.message,
        ready: false,
      };
    }
  } else {
    results.imagekit = {
      status: 'not_configured',
      message: `Missing: ${status.imagekit.missingKeys.join(', ')}`,
      ready: false,
    };
  }

  // Overall status
  results.summary = {
    anyReady: results.cloudinary?.ready || results.imagekit?.ready,
    primaryReady: results.cloudinary?.ready || false,
    backupReady: results.imagekit?.ready || false,
  };

  return results;
}

/**
 * Quick check if uploads will work
 * Useful for UI to show storage status
 */
export async function canUpload() {
  const status = getStorageStatus();

  if (!status.anyConfigured) {
    return {
      canUpload: false,
      message: 'No storage provider configured',
    };
  }

  // At least one is configured
  return {
    canUpload: true,
    primary: status.cloudinary.configured ? 'Cloudinary' : null,
    backup: status.imagekit.configured ? 'ImageKit' : null,
    message: status.cloudinary.configured
      ? 'Cloudinary ready' + (status.imagekit.configured ? ' (ImageKit backup)' : '')
      : 'ImageKit ready (no backup)',
  };
}
