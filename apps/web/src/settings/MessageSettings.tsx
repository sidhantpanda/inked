import type { MessageWidgetSettings } from '@inked/commons';

/** Message options: the eyebrow, headline, and supporting detail. */
export function MessageSettings({
  settings,
  onChange
}: {
  settings: MessageWidgetSettings;
  onChange: (patch: Partial<MessageWidgetSettings>) => void;
}) {
  return (
    <>
      <label className="settings-field">
        <span>Eyebrow</span>
        <input
          type="text"
          value={settings.eyebrow}
          onChange={(event) => onChange({ eyebrow: event.target.value })}
        />
      </label>
      <label className="settings-field">
        <span>Headline</span>
        <textarea
          rows={2}
          value={settings.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>
      <label className="settings-field">
        <span>Detail</span>
        <input
          type="text"
          value={settings.detail}
          onChange={(event) => onChange({ detail: event.target.value })}
        />
      </label>
    </>
  );
}
