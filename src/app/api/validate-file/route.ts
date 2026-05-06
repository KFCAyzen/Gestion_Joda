import { NextRequest, NextResponse } from 'next/server';
import { FILE_LIMITS, validateFile } from '@/app/utils/fileValidation';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validation du fichier
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    console.error('Erreur validation fichier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la validation du fichier' },
      { status: 500 }
    );
  }
}
