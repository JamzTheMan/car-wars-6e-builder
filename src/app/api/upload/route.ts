import { NextResponse } from 'next/server';
import { saveUploadedFile, UploadType } from '@/utils/fileUpload';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as UploadType;
    const cardType = formData.get('cardType') as string;
    const cardSubtype = formData.get('cardSubtype') as string;
    const buildPointCost = formData.get('buildPointCost') as string;
    const crewPointCost = formData.get('crewPointCost') as string;
    const numberAllowed = formData.get('numberAllowed') as string;
    const source = formData.get('source') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !['cards', 'backgrounds'].includes(type)) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
    const fileInfo = await saveUploadedFile(file, type);

    // If the filename follows Name_Subtype format, use the parsed subtype
    let responseSubtype = cardSubtype;
    if (fileInfo.parsedSubtype) {
      responseSubtype = fileInfo.parsedSubtype;
    }

    return NextResponse.json({
      path: fileInfo.path,
      cardType,
      cardSubtype: responseSubtype,
      buildPointCost: buildPointCost ? parseInt(buildPointCost, 10) : 0,
      crewPointCost: crewPointCost ? parseInt(crewPointCost, 10) : 0,
      numberAllowed: numberAllowed ? parseInt(numberAllowed, 10) : 1,
      source,
      isExistingFile: fileInfo.isExistingFile,
      originalFileName: file.name,
      parsedName: fileInfo.parsedName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
