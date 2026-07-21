import type { WidgetComponentProps } from './types';
import { WidgetLabel } from './WidgetLabel';

export function MessageWidget({ input }: WidgetComponentProps<'message'>) {
  return (
    <>
      <WidgetLabel>{input.eyebrow}</WidgetLabel>
      <h3 className="message-title">{input.title}</h3>
      <p className="message-detail">{input.detail}</p>
      <div className="accent-rule" />
    </>
  );
}
