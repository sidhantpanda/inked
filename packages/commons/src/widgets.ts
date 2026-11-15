import { WIDGET_IDS } from './types.js';
import { assertWidgetIdsExhaustive } from './widget-maker.js';
import { calendarWidget } from './widgets/calendar.js';
import { dateWidget } from './widgets/date.js';
import { messageWidget } from './widgets/message.js';
import { sportsWidget } from './widgets/sports.js';
import { stocksWidget } from './widgets/stocks.js';
import { weatherWidget } from './widgets/weather.js';

/** The widget catalog in picker order; each definition lives in `widgets/<widget>.ts`. */
export const WIDGETS = [
  dateWidget,
  weatherWidget,
  calendarWidget,
  sportsWidget,
  stocksWidget,
  messageWidget
] as const;

assertWidgetIdsExhaustive(WIDGETS, WIDGET_IDS);
