import { useEffect, useState, type KeyboardEvent } from 'react';

import {
  MAX_STOCK_SYMBOLS,
  STOCK_RANGES,
  STOCK_RANGE_LABELS,
  normalizeStockSymbol,
  type StockSearchResult,
  type StocksWidgetSettings
} from '@inked/commons';

/** Stocks options: ticker search and ordering, chart window, and chart visibility. */
export function StocksSettings({
  settings,
  onChange
}: {
  settings: StocksWidgetSettings;
  onChange: (patch: Partial<StocksWidgetSettings>) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const full = settings.symbols.length >= MAX_STOCK_SYMBOLS;

  useEffect(() => {
    const controller = new AbortController();
    const q = query.trim();
    const timer = window.setTimeout(() => {
      if (q.length < 1) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      void fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data: { results?: StockSearchResult[] }) => {
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

  function add(symbol: string, name?: string) {
    const normalized = normalizeStockSymbol(symbol);
    if (!normalized || full) return;
    if (name) setNames((current) => ({ ...current, [normalized]: name }));
    if (!settings.symbols.includes(normalized)) {
      onChange({ symbols: [...settings.symbols, normalized] });
    }
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function remove(symbol: string) {
    onChange({ symbols: settings.symbols.filter((candidate) => candidate !== symbol) });
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const symbols = [...settings.symbols];
    [symbols[index - 1], symbols[index]] = [symbols[index]!, symbols[index - 1]!];
    onChange({ symbols });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const typed = normalizeStockSymbol(query);
    const exact = results.find((result) => result.symbol === typed);
    if (exact) add(exact.symbol, exact.name);
    else if (typed) add(typed);
    else if (results[0]) add(results[0].symbol, results[0].name);
  }

  const noMatches = open && !loading && query.trim().length >= 1 && results.length === 0;

  return (
    <div className="stocks-settings">
      <div className="settings-field">
        <span>
          Tickers · {settings.symbols.length} of {MAX_STOCK_SYMBOLS}
        </span>
        {settings.symbols.length === 0 ? (
          <p className="city-hint">No tickers yet. Search below to add one.</p>
        ) : (
          <ol className="stocks-symbols">
            {settings.symbols.map((symbol, index) => (
              <li key={symbol}>
                <strong>{symbol}</strong>
                {names[symbol] && <small>{names[symbol]}</small>}
                <button
                  type="button"
                  aria-label={`Move ${symbol} up`}
                  disabled={index === 0}
                  onClick={() => moveUp(index)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${symbol}`}
                  onClick={() => remove(symbol)}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="settings-field city-search">
        <span>Add ticker</span>
        <input
          type="text"
          value={query}
          disabled={full}
          placeholder={full ? 'Ticker limit reached' : 'Search AAPL, Tesla, S&P 500…'}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {open && results.length > 0 && (
          <ul className="city-results">
            {results.map((result) => (
              <li key={result.symbol}>
                <button type="button" onClick={() => add(result.symbol, result.name)}>
                  <strong>
                    {result.symbol} <span className="stocks-result-name">{result.name}</span>
                  </strong>
                  <small>
                    {result.type} · {result.exchange}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
        {loading && <p className="city-hint">Searching…</p>}
        {noMatches && <p className="city-hint">No US matches. Press Enter to add it anyway.</p>}
        {!loading && !noMatches && (
          <p className="city-hint">
            US stocks, ETFs, and indexes. Order sets priority when a panel can’t fit them all.
          </p>
        )}
      </div>
      <div className="settings-field">
        <span>Chart range</span>
        <div className="unit-toggle stocks-range-toggle">
          {STOCK_RANGES.map((range) => (
            <button
              type="button"
              key={range}
              aria-pressed={settings.range === range}
              className={settings.range === range ? 'is-selected' : ''}
              title={STOCK_RANGE_LABELS[range].long}
              onClick={() => onChange({ range })}
            >
              {STOCK_RANGE_LABELS[range].short}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-field">
        <span>Chart</span>
        <div className="unit-toggle">
          {([true, false] as const).map((showChart) => (
            <button
              type="button"
              key={String(showChart)}
              aria-pressed={settings.showChart === showChart}
              className={settings.showChart === showChart ? 'is-selected' : ''}
              onClick={() => onChange({ showChart })}
            >
              {showChart ? 'Show' : 'Hide'}
            </button>
          ))}
        </div>
        <p className="city-hint">
          Charts appear where the panel has room. Smaller panels switch to compact quote rows rather
          than drop tickers.
        </p>
      </div>
    </div>
  );
}
