# Inked

Inked is a display studio for composing an 800 × 480 dashboard and sending the rendered BMP to the Photo Painter API. It is a pnpm monorepo with a React + Vite frontend, a Fastify server, and a shared TypeScript package.

## Workspace

```text
apps/
  web/       Vite + React configurator and live display preview
  server/    Fastify API, native canvas renderer, BMP conversion, paint client
packages/
  commons/   Display dimensions, layouts, widget catalog, types, validation
  eslint-config/ Shared typed ESLint presets for TypeScript, Node, and React
```

The browser preview and native renderer both consume the layout definitions in `@inked/commons`, so slot geometry is not maintained twice.

## Layouts and widgets

The catalog includes ten fixed, code-defined compositions, ranging from three to eight widget positions:

- **Editorial** — large + tall + small + wide, matching the supplied sketch.
- **Four-up** — four balanced panels.
- **Broadcast** — one full-width feature above two strips.
- **Sidebar** — a tall rail next to two wide panels.
- **Command split** — a side rail with four command modules.
- **Desk grid** — six equally weighted dashboard modules.
- **Newsroom** — a lead story surrounded by six compact blocks.
- **Score wall** — one wide headline and six live-data tiles.
- **Bento eight** — eight mixed-scale positions.
- **Data matrix** — eight consistent high-density tiles.

Five widgets are implemented for the standard small, wide, tall, large, and full placements: date, weather, calendar, sports, and message. Content density adapts to the available panel size—for example, Weather expands from current conditions to a seven-day forecast, while Date adds week context without showing a fast-changing clock.

Every widget has a typed input, its own React component, a native canvas renderer, and a counterpart server fetcher. The fetcher registry composes those independent inputs into the dashboard response; replace an individual demo fetcher with a production weather, calendar, or scores adapter without changing unrelated widgets.

### Per-widget options

Each placed widget carries its own settings, so the same widget can appear more than once in a layout with different content. Weather stores a resolved place (`location` name, `latitude`, `longitude`, `timezone`) plus a °C/°F `units` choice; Calendar stores `sources` (which Google accounts and calendars to show); Sports stores followed competitions, teams, and event types; Message takes an `eyebrow`, `title`, and `detail`. Two Weather panels can track different cities, one Sports panel can show F1 while another follows Arsenal, and several Calendar panels can show different calendar sets. Settings are typed per widget in `WidgetSettingsMap`, default through `DEFAULT_WIDGET_SETTINGS`, and are resolved independently for every slot before rendering.

### Weather

The Weather widget fetches live conditions and a seven-day forecast from the free [Open-Meteo](https://open-meteo.com/) API (no API key). The studio's city field is a geocoding search backed by `GET /api/geocode`, which resolves a place to coordinates; results are cached and requests fall back to a neutral placeholder when the API is unreachable. Conditions use static [Meteocons](https://meteocons.com/) (fill style) mapped from WMO weather codes in `packages/commons/src/weather.ts`; the native renderer rasterizes them once at startup with `@resvg/resvg-js`. A deterministic `WeatherService` fake keeps the test suite offline.

### Calendar

The Calendar widget shows upcoming events from one or more connected Google accounts (read-only). Accounts are connected in the studio via OAuth 2.0 and stored, with their refresh/access tokens, in the `google_accounts` SQLite table; each widget's `sources` reference those accounts by id and pick which of their calendars to show. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI` (see `.env.example`) to enable it. `GoogleCalendarService` handles the OAuth exchange, token refresh, calendar list, and event fetch over the REST API; a `CalendarService` fake keeps the suite offline, and the widget falls back to a demo agenda before any calendars are selected.

### Sports

Each Sports panel is scoped to one sport category and can independently follow entire competitions or individual teams within that sport. A Football panel cannot also contain Formula 1; users add another Sports panel for Motorsport. The initial catalog contains the Premier League, Formula 1, NFL, NBA, MLB, and NHL, grouped by sport. F1 can be narrowed to practice, qualifying, sprint, and race sessions; team competitions can be narrowed to any number of teams. All event times are stored as UTC instants and formatted in the dashboard timezone.

ESPN's public site endpoints are the first adapter. They are unofficial and undocumented, so their schema and availability can change; review ESPN's terms before distributing or commercializing a deployment. Inked keeps ESPN identifiers out of saved dashboard settings and validates all responses at the adapter boundary.

The server-side sports layer is deliberately provider-neutral:

- `SportsProvider` in `apps/server/src/sports/types.ts` is the adapter contract.
- `EspnSportsProvider` in `apps/server/src/sports/espn.ts` normalizes ESPN teams, matches, and racing sessions.
- `createSportsProviders` in `apps/server/src/sports/providers.ts` is the provider registry.
- `SPORTS_COMPETITIONS` in `apps/server/src/sports/catalog.ts` owns Inked's stable sport and competition ids. Each competition has an ordered `sources` array.
- `DefaultSportsService` in `apps/server/src/sports/service.ts` selects sources, falls through to backups, coalesces concurrent requests, caches teams for 24 hours and events for 15 minutes, and temporarily cools down a failing source.

To add a provider, implement `SportsProvider`, register the adapter in `createSportsProviders`, then add its provider id and competition reference to a competition's `sources`. Put it first to make it primary or later to make it a backup. The widget settings, studio, normalized event model, and renderers do not need to change.

### Saved compositions

Configurations are persisted in SQLite via `node:sqlite` at `INKED_DB_PATH` (default `.data/inked.db`). The studio can hold any number of named compositions—each a chosen layout plus its customized widgets—and tracks which one is active. Tests use an in-memory store, so no native module or database file is required to run the suite.

Widgets are created with a shared widget maker that requires a content plan for every placement style and an e-ink-aware refresh policy. See the [widget authoring guide](docs/widget-authoring.md) for the integration flow, or copy the [widget plan template](docs/widget-plan-template.md) when designing a new widget.

## Run locally

Requires Node.js 22+ and pnpm 11.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

- Studio: `http://localhost:5173`
- Font calibration: `http://localhost:5173/font-test`
- API: `http://localhost:3001`

The Vite server proxies `/api` to Fastify. `Paint display` is the only action that contacts the configured Photo Painter endpoint; saving and downloading a BMP remain local.

## Checks

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

`pnpm lint` runs ESLint in every app and package with zero warnings allowed. Use `pnpm lint:fix` for safe automatic fixes. The shared flat config applies typed TypeScript rules everywhere, browser/React and hooks rules in the Vite app, and Node globals plus server-appropriate async rules in Fastify.

Prettier is the workspace formatter with a 100-character print width. Run `pnpm format` to format the repository or use Format Document in VS Code; the recommended workspace extension and default formatter are configured under `.vscode`.

The server tests assert the BMP signature and 800 × 480 dimensions, and separately verify that Photo Painter receives a file named `inked-dashboard.bmp` in multipart field `image` with MIME type `image/bmp`.

## API

- `GET /health`
- `GET /api/catalog`
- `GET /api/dashboard`
- `GET /api/dashboards`
- `GET /api/geocode?q=<place>`
- `GET /api/sports/catalog`
- `GET /api/sports/competitions/:id/teams`
- `GET /api/google/status`
- `GET /api/google/auth` · `GET /api/google/callback`
- `GET /api/google/accounts` · `DELETE /api/google/accounts/:id`
- `GET /api/google/accounts/:id/calendars`
- `GET /api/refresh-plan`
- `GET /api/font-test/render?format=png|bmp`
- `PUT /api/dashboard`
- `POST /api/dashboards`
- `POST /api/dashboards/:id/activate`
- `DELETE /api/dashboards/:id`
- `POST /api/render?format=png|bmp`
- `POST /api/paint`
- `POST /api/font-test/paint`

`POST /api/render` and `POST /api/paint` accept a `DashboardConfig`, including each slot's widget `settings`. Configuration is validated against the code-defined layout and widget catalog before it is saved or rendered; unknown or missing settings are normalized to the widget's defaults. `GET /api/dashboards` lists the saved compositions and marks the active one, `POST /api/dashboards` creates a new composition, `POST /api/dashboards/:id/activate` switches the active composition, and `DELETE /api/dashboards/:id` removes one (the last remaining composition cannot be deleted).
