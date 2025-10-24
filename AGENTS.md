# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds production code. Key areas include `src/navigation/` (stack + tab navigators), `src/navigation/screens/map/` (Mapbox layers, caching hooks, UI shards), `src/favorites/` (context and storage), and `src/hooks/` (cross-cutting utilities like network status).
- Assets such as marker icons live in `assets/`. Keep new art optimized PNG/WebP and document usage in component props.
- Configuration lives in `app.config.ts`, `app.json`, and `tsconfig.json`; update the config plugin tokens here rather than editing `ios/` or `android/`.
- Product docs and roadmaps are in `docs/`; update `implementation-plan.md` when scope changes.

## Build, Test, and Development Commands
- `npm install` — sync dependencies before running anything else.
- `npm start` — launch the Expo dev server with the custom dev client.
- `npm run ios` / `npm run android` — build and install the native dev client on the current simulator/device. Use after native dependency changes.
- `npm run web` — quick smoke test in a browser; Mapbox features are native-only, so expect reduced functionality.
- For release artifacts, use `npm run build:apk` or `npm run build:aab`; both require a configured native toolchain.

## Coding Style & Naming Conventions
- TypeScript is mandatory; prefer explicit types for public APIs and React props. Favor functional components with hooks.
- Use 2-space indentation, single quotes, and trailing commas in multiline objects/arrays (follow existing files).
- Name files and modules in PascalCase for components (`MapHint.tsx`) and camelCase for utilities (`useCachedFountainsData.ts`). Assets use kebab-case (`water-drop.png`).
- Run `tsc --noEmit` before committing when you touch types to catch regressions early.

## Testing Guidelines
- Automated tests are not yet configured; perform manual verification covering map rendering, dataset toggles, favorites navigation, onboarding flow, and offline cache behavior.
- When adding new logic, include a checklist in the PR description describing manual steps taken (device, dataset toggles, offline mode, etc.).
- If you introduce a testing framework (e.g., Jest, Detox), add scripts to `package.json` and document usage here.

## Commit & Pull Request Guidelines
- Follow the existing short, imperative commit style (`add offline support`, `improve ux`). Scope each commit to a coherent change set.
- Reference issues in the commit body or PR description rather than the subject line.
- PRs should include: purpose summary, screenshots or screen recordings for UI changes, manual test checklist, and any follow-up tasks. Link to updated docs (`docs/`) when relevant.
- Request review from owners of affected modules (`navigation`, `favorites`, `map`) and ensure CI/Expo preview links are attached if available.

## Mapbox & Configuration Tips
- Mapbox tokens are injected via the Expo config plugin; rotate them in secure storage and update `app.config.ts`.
- The app relies on native dev builds. When adjusting native modules or permissions, increment config versions to trigger regeneration and document the change in `docs/implementation-plan.md`.
