import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {  try {
    console.log('Delete file request received');
    const data = await request.json();
    console.log('Delete file request body:', data);
    const { filePath } = data;
    
    if (!filePath) {
      console.error('No file path provided in delete request');
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    // Ensure the path only points to files within our uploads directory
    if (!filePath.startsWith('/uploads/')) {
      console.error('Invalid file path in delete request:', filePath);
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Convert from URL path to file system path
    const fullPath = path.join(process.cwd(), 'public', filePath);
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
      message: 'File deleted successfully' 
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'File deletion failed' },
      { status: 500 }
    );
  }
}
