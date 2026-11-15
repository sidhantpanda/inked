import {
  WIDGETS,
  isSportsPreviewPresetId,
  type SportsPreviewPresetId,
  type WidgetId
} from '@inked/commons';

/** `variety` rotates sports across geometries; a preset shows one sport everywhere. */
export type SportsPreviewMode = 'variety' | SportsPreviewPresetId;

/** The gallery keeps its selection in the URL so a view can be shared or reloaded. */
export function initialWidgetId(): WidgetId {
  const requested = new URLSearchParams(window.location.search).get('widget');
  return WIDGETS.find((widget) => widget.id === requested)?.id ?? WIDGETS[0].id;
}

export function initialSportsPreviewMode(): SportsPreviewMode {
  const requested = new URLSearchParams(window.location.search).get('preset');
  return isSportsPreviewPresetId(requested) ? requested : 'variety';
}

export function updateGalleryUrl(widgetId: WidgetId, sportsPreviewMode: SportsPreviewMode) {
  const parameters = new URLSearchParams({ widget: widgetId });
  if (widgetId === 'scores' && sportsPreviewMode !== 'variety') {
    parameters.set('preset', sportsPreviewMode);
  }
  window.history.replaceState(null, '', `/widgets?${parameters.toString()}`);
}
