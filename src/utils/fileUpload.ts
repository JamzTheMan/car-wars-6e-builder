import { writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';

export type UploadType = 'cards' | 'backgrounds';

export interface SavedFileInfo {
  path: string;
  isExistingFile: boolean;
  // Add parsedName and parsedSubtype for Name_Subtype handling
  parsedName?: string;
  parsedSubtype?: string;
}

export async function saveUploadedFile(file: File, type: UploadType): Promise<SavedFileInfo> {
  // Clean up the filename without adding a timestamp
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-_]/g, '_');

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

  // Check if the filename follows the Name_Subtype format
  // Extract the base name without extension
  const fileNameWithoutExt = sanitizedName.replace(/\.[^/.]+$/, '');
  const result: SavedFileInfo = {
    path: publicUrl,
    isExistingFile: fileExists,
  };

  // Process Name_Subtype format if it contains an underscore
  const underscoreMatch = fileNameWithoutExt.match(/^(.+)_(.+)$/);
  if (underscoreMatch) {
    const [, parsedName, parsedSubtype] = underscoreMatch;
    result.parsedName = parsedName;
    result.parsedSubtype = parsedSubtype;
  }

  // Return the public URL, whether this was a replacement, and parsed name/subtype if applicable
  return result;
}
