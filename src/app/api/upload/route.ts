import { NextResponse } from 'next/server';
import { saveUploadedFile, UploadType } from '@/utils/fileUpload';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as UploadType;
    const cardType = formData.get('cardType') as string;
    const cardCost = formData.get('cardCost') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || !['cards', 'backgrounds'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      );
    }    const fileInfo = await saveUploadedFile(file, type);

    return NextResponse.json({ 
      path: fileInfo.path,
      cardType,
      cardCost: cardCost ? parseInt(cardCost, 10) : 0,
      isExistingFile: fileInfo.isExistingFile,
      originalFileName: file.name
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
