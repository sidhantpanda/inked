import type { ComponentProps } from 'react';

import type { DashboardTheme } from '@inked/commons';

import { CanvasToolbar } from './CanvasToolbar';
import { DisplayStage } from './DisplayStage';

/** The centre column: composition heading, theme toolbar, and the live display. */
export function StudioCanvas({
  subtitle,
  onThemeChange,
  ...stage
}: ComponentProps<typeof DisplayStage> & {
  subtitle: string;
  onThemeChange: (theme: Partial<DashboardTheme>) => void;
}) {
  return (
    <section className="studio">
      <div className="studio-header">
        <div>
          <span className="eyebrow">Exact PhotoPainter preview</span>
          <h1>{stage.config.name}</h1>
          <p className="studio-sub">{subtitle}</p>
        </div>
      </div>
      <CanvasToolbar
        theme={stage.config.theme}
        previewState={stage.previewState}
        previewMatchesConfig={stage.previewMatchesConfig}
        onThemeChange={onThemeChange}
      />
      <DisplayStage {...stage} />
      <p className="canvas-caption">
        <span>Exact output</span> The preview under the editing outlines is the same revision sent
        to PhotoPainter.
      </p>
    </section>
  );
}
