import type { ComponentType, SVGProps } from 'react';

import type { DashboardData, WidgetId, WidgetRenderProps, WidgetSize } from '@inked/commons';

import { CalendarIcon, CloudIcon, MessageIcon, ScoreIcon, TrendIcon } from './icons';
import { CalendarWidget } from './widgets/CalendarWidget';
import { DateWidget } from './widgets/DateWidget';
import { MessageWidget } from './widgets/MessageWidget';
import { ScoresWidget } from './widgets/ScoresWidget';
import { StocksWidget } from './widgets/StocksWidget';
import type { WidgetComponentRegistry } from './widgets/types';
import { WeatherWidget } from './widgets/WeatherWidget';

const ICONS: Record<WidgetId, ComponentType<SVGProps<SVGSVGElement>>> = {
  clock: CalendarIcon,
  weather: CloudIcon,
  calendar: CalendarIcon,
  scores: ScoreIcon,
  stocks: TrendIcon,
  message: MessageIcon
};

/** Adding a WidgetId requires a React component with its exact input type. */
const WIDGET_COMPONENTS = {
  clock: DateWidget,
  weather: WeatherWidget,
  calendar: CalendarWidget,
  scores: ScoresWidget,
  stocks: StocksWidget,
  message: MessageWidget
} satisfies WidgetComponentRegistry;

export function WidgetIcon({ id }: { id: WidgetId }) {
  const Icon = ICONS[id];
  return <Icon />;
}

export function WidgetPreview<K extends WidgetId>({
  id,
  size,
  data
}: {
  id: K;
  size: WidgetSize;
  data: DashboardData;
}) {
  const Renderer = WIDGET_COMPONENTS[id] as ComponentType<WidgetRenderProps<K>>;
  return (
    <article className={`widget widget--${id} widget--${size}`}>
      <Renderer input={data[id]} size={size} />
    </article>
  );
}
