# Migration Plan: Mapbox → MapLibre + OpenFreeMap

> **STATUS: DONE (executed on `@maplibre/maplibre-react-native@11.3.2`).**
> The plan below was written assuming v10's near-1:1 rnmapbox API. The installed
> version is **v11**, a redesigned API — actual changes applied:
> `MapView`→`Map`, `ShapeSource`→`GeoJSONSource` (`shape`→`data`,
> `clusterMaxZoomLevel`→`clusterMaxZoom`), `CircleLayer`/`SymbolLayer`→`Layer type="..."`,
> `styleURL`→`mapStyle`, events `onDidFinishLoadingStyle`→`onDidFinishLoadingMap` /
> `onMapLoadingError`→`onDidFailLoadingMap` / `onCameraChanged`→`onRegionDidChange`
> (read via `e.nativeEvent`), feature press via `e.nativeEvent.features`,
> Camera `centerCoordinate`/`zoomLevel`→`initialViewState` + imperative `flyTo`
> (no `setCamera`; cluster zoom now uses `getClusterExpansionZoom`), ornaments
> `logoEnabled`/`scaleBarEnabled`→`logo`/`scaleBar`. OSM **attribution left enabled**
> (legal requirement). Verified: `tsc --noEmit`, `expo config`, `expo prebuild`.
> **Remaining: test on a real device build + add a proper dark style.**

Goal: drop proprietary Mapbox SDK + tokens. Use FOSS `@maplibre/maplibre-react-native`
+ free, keyless OpenFreeMap tiles. Removes the token barrier for open-source
contributors and kills the `sk.*` download token + `.netrc` build complexity.

## Why this works with low effort

`@maplibre/maplibre-react-native` is a **fork of `@rnmapbox/maps`**. The component
API is nearly 1:1 — same `MapView`, `Camera`, `ShapeSource`, `SymbolLayer`,
`CircleLayer`, `Images`, `UserLocation`. Style-spec expressions (`['step',…]`,
`['get',…]`, `['has',…]`, `['==',…]`) are identical. Main changes are import
style, the style URL, and dropping the access token.

## Scope (what touches Mapbox today)

| File | What's there | Change |
|------|-------------|--------|
| `package.json` | `@rnmapbox/maps: 10.3.0-rc.0` | Replace dep |
| `app.config.ts` | `@rnmapbox/maps` plugin, `mapboxPublicToken` in `extra` | Swap plugin, remove token |
| `src/navigation/screens/Map.tsx` | All map JSX + `setAccessToken` | Imports, drop token, `styleURL`→`mapStyle` |
| `src/hooks/useTheme.ts` | `mapbox://styles/...` light + dark URLs | OpenFreeMap URLs |
| `.env` / `.env.example` | `MAPBOX_*` tokens | Remove `sk.*` download token vars |
| `CLAUDE.md`, `README.md`, `eas.json` | netrc / download-token notes | Clean up |
| `src/constants/categories.ts`, `utils.ts` | Only comments say "Mapbox" | Optional comment rename |

Marker icon logic (`Images` + `iconImage` keys) is unaffected — works the same.

## Steps

### 1. Swap the dependency
```sh
npm uninstall @rnmapbox/maps
npx expo install @maplibre/maplibre-react-native
```

### 2. `app.config.ts` — swap plugin, remove token
```diff
   plugins: [
     ...
-    [
-      '@rnmapbox/maps',
-      {
-        RNMapboxMapsImpl: 'mapbox',
-      },
-    ],
+    '@maplibre/maplibre-react-native',
   ],
   extra: {
-    mapboxPublicToken: MAPBOX_PUBLIC_TOKEN,
     supabaseUrl: SUPABASE_URL,
     ...
```
Delete the `MAPBOX_PUBLIC_TOKEN` const at top. MapLibre is **tokenless**.

### 3. `src/hooks/useTheme.ts` — OpenFreeMap styles
```diff
- mapStyle: 'mapbox://styles/mapbox/outdoors-v12',   // light
+ mapStyle: 'https://tiles.openfreemap.org/styles/liberty',
...
- mapStyle: 'mapbox://styles/mapbox/dark-v11',        // dark
+ mapStyle: DARK_STYLE_URL,   // see "Dark mode" below
```
Light options: `liberty` (colorful, recommended), `bright`, `positron` (minimal).

### 4. `src/navigation/screens/Map.tsx` — the core change
**Imports** (named, not default namespace):
```diff
- import Mapbox from '@rnmapbox/maps';
+ import {
+   MapView, Camera, ShapeSource, SymbolLayer, CircleLayer, Images, UserLocation,
+ } from '@maplibre/maplibre-react-native';
```
**Drop the access-token init** (lines ~42–48). MapLibre needs none:
```diff
- Mapbox.setAccessToken((Constants.expoConfig?.extra as any)?.mapboxPublicToken);
- Mapbox.setTelemetryEnabled(false);
```
Keep the `mapboxReady` deferral if it still helps Fabric timing, or simplify —
test both. `Constants` import may become unused.

**Refs:** `Mapbox.Camera` → `Camera`, `Mapbox.ShapeSource` → `ShapeSource`.

**JSX:** drop every `Mapbox.` prefix (`Mapbox.MapView` → `MapView`, etc.).

**MapView style prop:**
```diff
- <Mapbox.MapView styleURL={colors.mapStyle} ... >
+ <MapView mapStyle={colors.mapStyle} ... >
```

### 5. ⚠️ Verify event prop names (highest-risk step)
rnmapbox and MapLibre v10 mostly share event names, but confirm these on the
MapView before assuming they fire:
- `onDidFinishLoadingStyle` → controls `styleLoaded` gate (critical — layers only
  render after it)
- `onMapLoadingError`
- `onCameraChanged` → may be `onRegionDidChange` / `onRegionIsChanging` in MapLibre;
  adjust the `setCameraZoom` / `setCameraCenter` handler accordingly
- `ShapeSource.onPress` with `e.features` → confirm shape matches

If `onCameraChanged` differs, the zoom-dependent cluster expansion + scale bar
need the new event. Test cluster tap + recenter after the swap.

### 6. Dark mode (OpenFreeMap has no official dark)
Pick one:
- **A. Custom dark style (recommended for OSS):** open Liberty in Maputnik
  (`https://maputnik.github.io/editor?style=https://tiles.openfreemap.org/styles/liberty`),
  darken colors, export JSON, commit to `assets/map-style-dark.json`, load via
  `require()` or host on GitHub Pages. Keyless, fully yours.
- **B. Ship light-only first:** point dark mode at `positron` temporarily, add
  real dark later. Lowest effort to get the migration landed.

### 7. Clean up token machinery
- `.env` / `.env.example`: remove `MAPBOX_DOWNLOADS_TOKEN`,
  `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`, `MAPBOX_PUBLIC_TOKEN`, `GOOGLE_MAPS_API_KEY_*`
  if unused.
- `CLAUDE.md`: remove the netrc / download-token line.
- `eas.json` / `README.md`: drop any Mapbox download-token setup notes.
- Delete `~/.netrc` Mapbox entry locally (not in repo — just your machine).

### 8. Rebuild native + verify
```sh
npm run prebuild        # regenerate native dirs with new plugin
npm run ios             # or android
tsc --noEmit && npm test
```
Manual smoke test: map renders, markers show, cluster tap zooms, marker tap opens
details sheet, recenter works, light/dark toggle, offline cached view.

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Event prop names differ (`onCameraChanged`) | medium | Step 5 — verify against docs, adjust handlers |
| New Architecture (Fabric) compat — app is SDK 55 New Arch | medium | Confirm installed MapLibre RN version supports New Arch before committing; it's actively maintained but verify |
| Dark style needs custom work | high (expected) | Step 6 option B ships light-only first |
| Style expression edge cases | low | Fork shares Mapbox GL expression spec |
| Marker icon rendering differs | low | `Images`/`iconImage` API identical |

## Effort

~1–2 focused hours. One core file (`Map.tsx`), one styles file, config + deps.
Main time sink = verifying events (step 5) + a dark style (step 6).

## Rollback

Single commit. `git revert` if it misbehaves. Keep the Mapbox token in your
Mapbox account until the migration is verified in a real build.
```
