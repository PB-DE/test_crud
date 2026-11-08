import { describe, it, expect } from 'vitest';
import { compressImage } from '@/lib/image-utils';

describe('compressImage Utility', () => {
  it('returns file as-is in Node/SSR environment safely without throwing', async () => {
    const file = new File(['dummy-content'], 'test.png', { type: 'image/png' });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  it('handles non-image files gracefully', async () => {
    const textFile = new File(['hello text'], 'notes.txt', { type: 'text/plain' });
    const result = await compressImage(textFile);
    expect(result).toBe(textFile);
  });

  it('handles small image files under 300KB as-is', async () => {
    const smallFile = new File(['small'], 'tiny.jpg', { type: 'image/jpeg' });
    const result = await compressImage(smallFile);
    expect(result).toBe(smallFile);
  });
});

