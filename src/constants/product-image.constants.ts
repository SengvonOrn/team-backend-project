export const PRODUCT_IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIMES: ['image/jpeg', 'image/png', 'image/webp'],
  UPLOAD_DIR: 'uploads/products',
};

export const PRODUCT_IMAGE_MESSAGES = {
  NO_FILE: 'No file provided',
  INVALID_FILE_TYPE:
    'Invalid file type. Allowed types: image/jpeg, image/png, image/webp',
  FILE_TOO_LARGE: 'File size exceeds 5MB limit',
  PRODUCT_NOT_FOUND: 'Product not found',
  IMAGE_NOT_FOUND: 'Product image not found',
  IMAGE_CREATED: 'Product image created successfully',
  IMAGE_UPDATED: 'Product image updated successfully',
  IMAGE_DELETED: 'Product image deleted successfully',
  IMAGES_DELETED: 'Product images deleted successfully',
};
