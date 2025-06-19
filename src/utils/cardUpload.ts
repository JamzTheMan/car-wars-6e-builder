import { CardType } from '@/types/types';

export interface CardUploadResult {
  imageUrl: string;
  cardType: CardType;
  cardSubtype: string;
  buildPointCost: number;
  crewPointCost: number;
  numberAllowed: number;
  source: string;
  isExistingFile: boolean;
  fileName: string;
}

export async function uploadCardImage(
  file: File,
  cardType: CardType,
  cardSubtype: string,
  buildPointCost: number,
  crewPointCost: number,
  numberAllowed: number,
  source: string
): Promise<CardUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'cards');
  formData.append('cardType', cardType);
  formData.append('cardSubtype', cardSubtype);
  formData.append('buildPointCost', buildPointCost.toString());
  formData.append('crewPointCost', crewPointCost.toString());
  formData.append('numberAllowed', numberAllowed.toString());
  formData.append('source', source);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }
  const {
    path: imageUrl,
    cardType: responseCardType,
    cardSubtype: responseCardSubtype,
    buildPointCost: responseBuildPointCost,
    crewPointCost: responseCrewPointCost,
    numberAllowed: responseNumberAllowed,
    source: responseSource,
    isExistingFile,
    originalFileName,
  } = await response.json();

  return {
    imageUrl,
    cardType: responseCardType || cardType,
    cardSubtype: responseCardSubtype || cardSubtype,
    buildPointCost:
      typeof responseBuildPointCost === 'number' ? responseBuildPointCost : buildPointCost,
    crewPointCost:
      typeof responseCrewPointCost === 'number' ? responseCrewPointCost : crewPointCost,
    numberAllowed:
      typeof responseNumberAllowed === 'number' ? responseNumberAllowed : numberAllowed,
    source: responseSource || source,
    isExistingFile: !!isExistingFile,
    fileName: originalFileName || file.name,
  };
}
