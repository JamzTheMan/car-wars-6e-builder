import { writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';

export type UploadType = 'cards' | 'backgrounds';

export interface SavedFileInfo {
  path: string;
  isExistingFile: boolean;
}

export async function saveUploadedFile(file: File, type: UploadType): Promise<SavedFileInfo> {
  // Clean up the filename without adding a timestamp
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Create the file path
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
  const filePath = path.join(uploadDir, sanitizedName);
  const publicUrl = `/uploads/${type}/${sanitizedName}`;

  // Check if file with the same name already exists
  const fileExists = fs.existsSync(filePath);

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save the file, overwriting if it exists
  await writeFile(filePath, buffer);

  // Return the public URL and whether this was a replacement
  return {
    path: publicUrl,
    isExistingFile: fileExists,
  };
}
