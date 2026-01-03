import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ALLOWED_FILE_TYPES } from '@/utils/fileValidation';

export async function POST(request: Request) {
  try {
    console.log('Delete file request received');
    const data = await request.json();
    console.log('Delete file request body:', data);
    const { filePath } = data;

    if (!filePath) {
      console.error('No file path provided in delete request');
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    // Ensure the path only points to files within our uploads directory
    if (!filePath.startsWith('/uploads/')) {
      console.error('Invalid file path in delete request:', filePath);
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Additional security: Validate file extension
    const fileExt = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    if (!allowedExtensions.includes(fileExt)) {
      console.error('Attempted to delete non-image file:', filePath);
      return NextResponse.json({ error: 'Only image files can be deleted' }, { status: 403 });
    }

    // Convert from URL path to file system path
    const fullPath = path.join(process.cwd(), 'public', filePath);

    // Ensure normalized path is still within uploads (prevent directory traversal)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(uploadsDir)) {
      console.error('Path traversal attempt detected:', filePath);
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }
    // Log the file path for debugging
    console.log('Attempting to delete file:', fullPath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log('File not found, may have been already deleted:', fullPath);
      return NextResponse.json(
        { message: 'File not found, may have been already deleted' },
        { status: 200 } // Return 200 since the end goal is achieved - the file doesn't exist
      );
    }

    // Delete the file
    fs.unlinkSync(fullPath);
    console.log('File deleted successfully:', fullPath);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ error: 'File deletion failed' }, { status: 500 });
  }
}
