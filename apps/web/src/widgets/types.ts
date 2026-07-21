import type { ComponentType } from 'react';

import type { WidgetId, WidgetRenderProps } from '@inked/commons';

export type WidgetComponentProps<K extends WidgetId> = WidgetRenderProps<K>;

export type WidgetComponentRegistry = {
  [K in WidgetId]: ComponentType<WidgetComponentProps<K>>;
};
