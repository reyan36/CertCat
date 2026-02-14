// lib/position-utils.js
// Shared position calculation utility - ensures alignment matches across PDF, preview, and editor
//
// POSITIONING SYSTEM:
// - All positions are stored as percentages (0-100) representing the CENTER point
// - x=50, y=50 means the element's center is at the center of the page
// - This makes alignment consistent regardless of element size

// A4 Landscape dimensions in points (must match everywhere)
export const A4_WIDTH = 842;
export const A4_HEIGHT = 595;
export const ASPECT_RATIO = A4_WIDTH / A4_HEIGHT;

/**
 * Calculate element position from percentage-based center coordinates
 * Returns position in A4 points (not scaled)
 *
 * @param {Object} element - Element with x, y (percentages), and type-specific properties
 * @returns {Object} Position in A4 points
 */
export function calculateElementPosition(element) {
  const xPercent = parseFloat(element.x) || 50;
  const yPercent = parseFloat(element.y) || 50;

  // Center position in A4 points
  const centerX = (xPercent / 100) * A4_WIDTH;
  const centerY = (yPercent / 100) * A4_HEIGHT;

  if (element.type === 'text') {
    const fontSize = parseInt(element.fontSize) || 20;

    // For text, we return the center point
    // The rendering code will handle centering based on actual text width
    return {
      centerX,
      centerY,
      fontSize,
      // Top position adjusted for vertical centering
      top: centerY - (fontSize / 2),
    };
  }

  if (element.type === 'image') {
    const width = parseInt(element.width) || 100;
    // Use stored height if available, otherwise use width (square)
    const height = element.height ? parseInt(element.height) : width;

    return {
      centerX,
      centerY,
      width,
      height,
      left: centerX - (width / 2),
      top: centerY - (height / 2),
    };
  }

  if (element.type === 'qrcode') {
    const size = parseInt(element.size) || 80;

    return {
      centerX,
      centerY,
      size,
      left: centerX - (size / 2),
      top: centerY - (size / 2),
    };
  }

  // Default: just return center position
  return {
    centerX,
    centerY,
    left: centerX,
    top: centerY,
  };
}

/**
 * Scale position from A4 points to display pixels
 *
 * @param {Object} position - Position from calculateElementPosition
 * @param {number} scale - Scale factor (containerWidth / A4_WIDTH)
 * @returns {Object} Scaled position for display
 */
export function scalePosition(position, scale) {
  const scaled = {};

  for (const [key, value] of Object.entries(position)) {
    if (typeof value === 'number') {
      scaled[key] = value * scale;
    } else {
      scaled[key] = value;
    }
  }

  return scaled;
}

/**
 * Convert pixel position back to percentage (for drag operations)
 *
 * @param {number} pixelX - X position in container pixels
 * @param {number} pixelY - Y position in container pixels
 * @param {number} containerWidth - Container width in pixels
 * @param {number} containerHeight - Container height in pixels
 * @returns {Object} { x, y } as percentages (0-100)
 */
export function pixelToPercent(pixelX, pixelY, containerWidth, containerHeight) {
  return {
    x: Math.max(0, Math.min(100, (pixelX / containerWidth) * 100)),
    y: Math.max(0, Math.min(100, (pixelY / containerHeight) * 100)),
  };
}

/**
 * Utility to convert image URL to base64 (for PDF generation)
 * Handles CORS by using fetch with appropriate headers
 */
export async function imageToBase64(url) {
  if (!url) return null;

  // Already base64
  if (url.startsWith('data:')) return url;

  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    // Return original URL as fallback - let PDF renderer try directly
    return url;
  }
}

/**
 * Load image and get its natural dimensions
 * Used when adding images to preserve aspect ratio
 */
export function getImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
