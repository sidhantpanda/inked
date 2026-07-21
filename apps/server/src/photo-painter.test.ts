import { describe, expect, it } from 'vitest';

import { PhotoPainterClient, type PhotoPainterError } from './photo-painter.js';

describe('PhotoPainterClient', () => {
  it('uses the same multipart BMP contract as the existing photo frame integration', async () => {
    let requestBody: BodyInit | null | undefined;
    const client = new PhotoPainterClient(async (_input, init) => {
      requestBody = init?.body;
      return new Response(JSON.stringify({ message: 'accepted' }), { status: 200 });
    });

    await expect(client.paint(Buffer.from('BMfake-bmp'))).resolves.toEqual({ message: 'accepted' });
    expect(requestBody).toBeInstanceOf(FormData);
    const image = (requestBody as FormData).get('image');
    expect(image).toBeInstanceOf(File);
    expect((image as File).name).toBe('inked-dashboard.bmp');
    expect((image as File).type).toBe('image/bmp');
  });

  it('surfaces paint API errors with the response body', async () => {
    const client = new PhotoPainterClient(
      async () => new Response('unsupported image', { status: 415 })
    );

    await expect(client.paint(Buffer.from('nope'))).rejects.toEqual(
      expect.objectContaining<Partial<PhotoPainterError>>({
        status: 415,
        responseBody: 'unsupported image'
      })
    );
  });
});
