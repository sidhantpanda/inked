import type { SlotAssignment } from '@inked/commons';

import { CalendarSettings } from './CalendarSettings';
import { MessageSettings } from './MessageSettings';
import { SportsSettings } from './sports/SportsSettings';
import { StocksSettings } from './StocksSettings';
import { WeatherSettings } from './WeatherSettings';

/** The widget-specific option editor for the selected panel. */
export function WidgetSettingsEditor({
  assignment,
  onChange
}: {
  assignment: SlotAssignment;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  switch (assignment.widgetId) {
    case 'weather':
      return <WeatherSettings settings={assignment.settings} onChange={onChange} />;
    case 'calendar':
      return <CalendarSettings settings={assignment.settings} onChange={onChange} />;
    case 'scores':
      return (
        <SportsSettings
          key={assignment.slotId}
          settings={assignment.settings}
          onChange={onChange}
        />
      );
    case 'stocks':
      return <StocksSettings settings={assignment.settings} onChange={onChange} />;
    case 'message':
      return <MessageSettings settings={assignment.settings} onChange={onChange} />;
    default:
      return null;
  }
}
