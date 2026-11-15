export interface DashboardSummary {
  id: string;
  name: string;
  layoutId: string;
  updatedAt: string;
  active: boolean;
}

export interface Status {
  kind: 'idle' | 'working' | 'success' | 'error';
  message: string;
}

export interface RenderedPreview {
  configSignature: string;
  renderToken: string;
  url: string;
}

export type PreviewState = 'rendering' | 'ready' | 'error';

export type SetStatus = (status: Status) => void;
