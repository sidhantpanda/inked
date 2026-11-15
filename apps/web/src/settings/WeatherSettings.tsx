import { useEffect, useState } from 'react';

import type { WeatherWidgetSettings } from '@inked/commons';

interface GeocodeResult {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** Weather options: a geocoding city search plus a temperature-unit toggle. */
export function WeatherSettings({
  settings,
  onChange
}: {
  settings: WeatherWidgetSettings;
  onChange: (patch: Record<string, string | number>) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const q = query.trim();
    const timer = window.setTimeout(() => {
      if (q.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      void fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data: { results?: GeocodeResult[] }) => {
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function pick(result: GeocodeResult) {
    onChange({
      location: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone
    });
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  const noMatches = open && !loading && query.trim().length >= 2 && results.length === 0;

  return (
    <div className="weather-settings">
      <div className="settings-field">
        <span>Location</span>
        <div className="city-current">{settings.location}</div>
      </div>
      <div className="settings-field city-search">
        <span>Change city</span>
        <input
          type="text"
          value={query}
          placeholder="Search a city…"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {open && results.length > 0 && (
          <ul className="city-results">
            {results.map((result) => (
              <li key={result.id}>
                <button type="button" onClick={() => pick(result)}>
                  <strong>{result.name}</strong>
                  <small>{[result.admin1, result.country].filter(Boolean).join(', ')}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        {loading && <p className="city-hint">Searching…</p>}
        {noMatches && <p className="city-hint">No matches.</p>}
      </div>
      <div className="settings-field">
        <span>Units</span>
        <div className="unit-toggle">
          {(['celsius', 'fahrenheit'] as const).map((unit) => (
            <button
              type="button"
              key={unit}
              aria-pressed={settings.units === unit}
              className={settings.units === unit ? 'is-selected' : ''}
              onClick={() => onChange({ units: unit })}
            >
              {unit === 'celsius' ? '°C' : '°F'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
