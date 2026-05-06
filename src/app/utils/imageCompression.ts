/**
 * Compresse une image avant l'upload
 * @param file - Fichier image à compresser
 * @param maxSizeMB - Taille maximale en MB (défaut: 2MB)
 * @param maxWidthOrHeight - Dimension maximale (défaut: 1920px)
 * @param quality - Qualité de compression 0-1 (défaut: 0.8)
 * @returns Promise<File> - Fichier compressé
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 2,
  maxWidthOrHeight: number = 1920,
  quality: number = 0.8
): Promise<File> {
  // Si ce n'est pas une image, retourner le fichier tel quel
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Redimensionner si nécessaire
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height / width) * maxWidthOrHeight;
            width = maxWidthOrHeight;
          } else {
            width = (width / height) * maxWidthOrHeight;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compresser avec qualité réduite
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Échec de la compression'));
              return;
            }

            // Vérifier la taille
            const sizeMB = blob.size / (1024 * 1024);
            
            if (sizeMB > maxSizeMB && quality > 0.1) {
              // Réessayer avec une qualité plus basse
              const newQuality = quality * 0.7;
              compressImage(file, maxSizeMB, maxWidthOrHeight, newQuality)
                .then(resolve)
                .catch(reject);
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Erreur de chargement de l\'image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
}

/**
 * Valide la taille d'un fichier
 * @param file - Fichier à valider
 * @param maxSizeMB - Taille maximale en MB
 * @returns boolean
 */
export function validateFileSize(file: File, maxSizeMB: number = 2): boolean {
  const sizeMB = file.size / (1024 * 1024);
  return sizeMB <= maxSizeMB;
}

/**
 * Formate la taille d'un fichier pour l'affichage
 * @param bytes - Taille en bytes
 * @returns string - Taille formatée (ex: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
