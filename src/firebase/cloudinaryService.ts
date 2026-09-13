// Central Cloudinary Media Management Service for House of Mahi
// Enables direct upload of product, category, and banner photos to Cloudinary

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

// Config defaults (can be overridden via environment variables or settings)
const DEFAULT_CLOUD_NAME = 'houseofmahi';
const DEFAULT_UPLOAD_PRESET = 'houseofmahi_preset';

export const getCloudinaryCloudName = (): string => {
  return import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD_NAME;
};

export const getCloudinaryUploadPreset = (): string => {
  return import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || DEFAULT_UPLOAD_PRESET;
};

/**
 * Uploads a local File or Blob directly to Cloudinary using unsigned upload preset
 */
export const uploadImageToCloudinary = async (
  file: File | Blob,
  folder: 'products' | 'categories' | 'banners' | 'reviews' = 'products',
  cloudName = getCloudinaryCloudName(),
  uploadPreset = getCloudinaryUploadPreset()
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `houseofmahi/${folder}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error?.message || `Cloudinary upload failed with status ${response.status}`
      );
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data.secure_url;
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(
      error.message || 'Failed to upload image to Cloudinary. Please check cloud name and upload preset.'
    );
  }
};

/**
 * Generates an auto-optimized, auto-format Cloudinary URL
 */
export const getOptimizedCloudinaryUrl = (
  url: string,
  options: { width?: number; height?: number; crop?: string; quality?: string } = {}
): string => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const { width, height, crop = 'fill', quality = 'auto' } = options;
  const transformations: string[] = [`f_auto`, `q_${quality}`];

  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (width || height) transformations.push(`c_${crop}`);

  const transformString = transformations.join(',');

  // Insert transformations after /upload/
  return url.replace('/upload/', `/upload/${transformString}/`);
};
