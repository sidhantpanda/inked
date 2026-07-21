# Bundled Inked fonts

These font files are checked into the shared package so Vite and the native BMP renderer use the same bytes on Linux, macOS, and Windows.

| Inked alias   | Family            | Source metadata commit                     | SHA-256                                                            |
| ------------- | ----------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `Inked Sans`  | Inter variable    | `66647c0bbbe41a850d79d9c76fb13add3378940f` | `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031` |
| `Inked Serif` | Libre Baskerville | `d20160cfa0ac4c532327f85b3ca4054acf92ed38` | `05a95421961341c5b2556285e8415df9db27dab4f4abe22b446b3c6a8b916c5d` |

Both families are distributed under the SIL Open Font License 1.1. Each directory contains its original `OFL.txt` and Google Fonts `METADATA.pb` files. Do not replace a TTF without updating its metadata, checksum, and `apps/server/src/fonts.test.ts`.
