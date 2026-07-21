export interface PhotoPainter {
  endpoint: string;
  paint(image: Buffer | Uint8Array, filename?: string): Promise<{ message?: string }>;
}

export class PhotoPainterError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = 'PhotoPainterError';
  }
}

export class PhotoPainterClient implements PhotoPainter {
  readonly endpoint: string;

  constructor(
    private readonly fetchImplementation: typeof fetch = globalThis.fetch
  ) {
    this.endpoint = process.env.PHOTO_PAINTER_API_URL ?? '';
    if (!this.endpoint) {
      console.error('PHOTO_PAINTER_API_URL not defined in env');
    }
  }

  async paint(image: Buffer | Uint8Array, filename = 'inked-dashboard.bmp') {
    const formData = new FormData();
    formData.append('image', new Blob([new Uint8Array(image)], { type: 'image/bmp' }), filename);

    const response = await this.fetchImplementation(this.endpoint, {
      method: 'POST',
      body: formData
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new PhotoPainterError(
        `Photo Painter returned ${response.status}: ${responseText || response.statusText}`,
        response.status,
        responseText
      );
    }

    if (!responseText) return {};
    try {
      return JSON.parse(responseText) as { message?: string };
    } catch {
      return { message: responseText };
    }
  }
}
