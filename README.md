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

Five widgets are implemented for the standard small, wide, tall, large, and full placements: date, weather, calendar, sports scores, and message. Content density adapts to the available panel size—for example, Weather expands from current conditions to a seven-day forecast, while Date adds week context without showing a fast-changing clock.

Every widget has a typed input, its own React component, a native canvas renderer, and a counterpart server fetcher. The fetcher registry composes those independent inputs into the dashboard response; replace an individual demo fetcher with a production weather, calendar, or scores adapter without changing unrelated widgets.

### Per-widget options

Each placed widget carries its own settings, so the same widget can appear more than once in a layout with different content. Weather takes a `location`, and Message takes an `eyebrow`, `title`, and `detail`—two Weather panels can therefore track different cities, and several Message panels can each show a distinct note. Settings are typed per widget in `WidgetSettingsMap`, default through `DEFAULT_WIDGET_SETTINGS`, and are resolved independently for every slot before rendering. Widgets without options (Date, Calendar, Sports scores) simply carry empty settings and read live data.

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
