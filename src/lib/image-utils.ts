/**
 * Image compression utility for client-side optimization.
 * Prevents Vercel 4.5MB Serverless request body limit errors and timeouts.
 */

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  // SSR or non-browser fallback
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  // Non-image file fallback
  if (!file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // If already under 300KB, no need to compress
  if (file.size <= 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(file);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(file);
                  return;
                }
                const baseName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'photo';
                const compressedFile = new File([blob], `${baseName}.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              },
              'image/jpeg',
              quality
            );
          } catch {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}
