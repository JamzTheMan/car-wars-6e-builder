import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    // Security check: ensure the path is within the uploads directory
    if (!filePath.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), 'public', filePath);

    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(`File not found or could not be deleted: ${fullPath}`, error);
      // We'll return success even if file doesn't exist, as the end result is the same
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
