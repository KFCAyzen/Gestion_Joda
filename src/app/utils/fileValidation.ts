/**
 * Configuration des limites de fichiers pour l'application
 */

export const FILE_LIMITS = {
  // Taille maximale acceptée en entrée (avant compression)
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,

  // Taille cible après compression des images
  TARGET_COMPRESSED_SIZE_MB: 3,
  
  // Types MIME autorisés
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
  
  // Extensions autorisées
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png'],
  
  // Messages d'erreur
  ERRORS: {
    FILE_TOO_LARGE: (size: number, max: number) =>
      `Fichier trop volumineux (${size.toFixed(1)} MB). Maximum autorisé : ${max} MB`,
    INVALID_TYPE: 'Type de fichier non autorisé. Formats acceptés: PDF, JPG, PNG',
    INVALID_NAME: 'Nom de fichier invalide. Utilisez uniquement des lettres, chiffres, tirets et points.',
    NO_FILE: 'Aucun fichier fourni',
  },
} as const;

/**
 * Valide un fichier selon les règles définies
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: FILE_LIMITS.ERRORS.NO_FILE };
  }

  // Vérifier le type
  if (!FILE_LIMITS.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return { valid: false, error: FILE_LIMITS.ERRORS.INVALID_TYPE };
  }

  // Vérifier la taille
  if (file.size > FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
    const sizeMB = file.size / (1024 * 1024);
    return { 
      valid: false, 
      error: FILE_LIMITS.ERRORS.FILE_TOO_LARGE(sizeMB, FILE_LIMITS.MAX_FILE_SIZE_MB) 
    };
  }

  // Vérifier le nom
  if (!/^[\w\-. ]+$/.test(file.name)) {
    return { valid: false, error: FILE_LIMITS.ERRORS.INVALID_NAME };
  }

  return { valid: true };
}
