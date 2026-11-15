import { useEffect, useRef, useState } from 'react';

import { fetchPreviewBmp, paintPreview, renderPreview } from './api';
import type { PreviewState, RenderedPreview, SetStatus } from './types';

const RENDER_DEBOUNCE_MS = 120;

/**
 * Keeps an exact PNG preview of the current configuration and exposes the two
 * actions that reuse its pixels: downloading the BMP and painting the display.
 */
export function useDisplayPreview(configSignature: string, setStatus: SetStatus) {
  const [preview, setPreview] = useState<RenderedPreview | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>('rendering');
  const previewUrlRef = useRef<string | null>(null);
  const previewMatchesConfig = preview?.configSignature === configSignature;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPreviewState('rendering');
      void renderPreview(configSignature, controller.signal)
        .then(({ renderToken, blob }) => {
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = url;
          setPreview({ configSignature, renderToken, url });
          setPreviewState('ready');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setPreviewState('error');
          setStatus({ kind: 'error', message: (error as Error).message });
        });
    }, RENDER_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [configSignature, setStatus]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  async function downloadBmp() {
    try {
      if (!preview || !previewMatchesConfig) throw new Error('Wait for the preview to finish');
      setStatus({ kind: 'working', message: 'Preparing the previewed BMP…' });
      const url = URL.createObjectURL(await fetchPreviewBmp(preview.renderToken));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inked-dashboard.bmp';
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'success', message: 'BMP downloaded' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function paint() {
    try {
      if (!preview || !previewMatchesConfig) throw new Error('Wait for the preview to finish');
      setStatus({ kind: 'working', message: 'Sending the previewed pixels to Photo Painter…' });
      const result = await paintPreview(preview.renderToken);
      setStatus({
        kind: 'success',
        message: result.message ?? `Painted ${Math.round(result.bytes / 1024)} KB`
      });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  return {
    preview,
    previewState,
    previewMatchesConfig,
    /** The on-screen preview is current, so its BMP can be downloaded or painted. */
    exportReady: previewMatchesConfig && previewState === 'ready',
    downloadBmp,
    paint
  };
}
