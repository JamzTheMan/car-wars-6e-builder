import path from 'path';

/**
 * Allowed file extensions and their MIME types for different upload types
 */
export const ALLOWED_FILE_TYPES = {
  cards: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] as readonly string[],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ] as readonly string[],
  },
  backgrounds: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] as readonly string[],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ] as readonly string[],
  },
  data: {
    extensions: ['.json'] as readonly string[],
    mimeTypes: ['application/json', 'text/json'] as readonly string[],
  },
} as const;

export type FileCategory = keyof typeof ALLOWED_FILE_TYPES;

/**
 * Validates if a file is allowed based on its extension and MIME type
 */
export function isFileTypeAllowed(
  file: File,
  category: FileCategory
): { valid: boolean; error?: string } {
  const fileName = file.name.toLowerCase();
  const fileExt = path.extname(fileName);
  const allowedConfig = ALLOWED_FILE_TYPES[category];

  // Check extension
  if (!allowedConfig.extensions.includes(fileExt)) {
    return {
      valid: false,
      error: `File type "${fileExt}" is not allowed. Allowed types: ${allowedConfig.extensions.join(', ')}`,
    };
  }

  // Check MIME type
  if (!allowedConfig.mimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `MIME type "${file.type}" is not allowed. Allowed types: ${allowedConfig.mimeTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates file size (in bytes)
 */
export function isFileSizeAllowed(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path separators
  let sanitized = fileName.replace(/[/\\]/g, '');

  // Remove any non-alphanumeric characters except dots, hyphens, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.-_]/g, '_');

  // Prevent files starting with dots (hidden files)
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized;
  }

  // Prevent excessively long filenames (max 255 characters)
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = sanitized.substring(0, 255 - ext.length);
    sanitized = nameWithoutExt + ext;
  }

  return sanitized;
}

/**
 * Validates file path to ensure it's within allowed directories
 */
export function isPathAllowed(filePath: string, allowedPaths: string[]): boolean {
  const normalizedPath = path.normalize(filePath);

  return allowedPaths.some((allowedPath) => {
    const normalizedAllowedPath = path.normalize(allowedPath);
    return normalizedPath.startsWith(normalizedAllowedPath);
  });
}

/**
 * Comprehensive file validation
 */
export function validateUploadedFile(
  file: File,
  category: FileCategory,
  maxSizeMB: number = 10
): { valid: boolean; error?: string; sanitizedName?: string } {
  // Check file size
  const sizeCheck = isFileSizeAllowed(file, maxSizeMB);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }

  // Check file type
  const typeCheck = isFileTypeAllowed(file, category);
  if (!typeCheck.valid) {
    return typeCheck;
  }

  // Sanitize filename
  const sanitizedName = sanitizeFileName(file.name);

  return {
    valid: true,
    sanitizedName,
  };
}
