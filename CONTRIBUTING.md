# Contributing to Berlin Public

Thanks for your interest in improving Berlin Public! This guide covers how to
get set up and how to propose changes.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

This is an [Expo](https://expo.dev) / React Native app. It uses native modules
(Mapbox), so it **requires a development build** — it will not run in Expo Go.

1. **Fork and clone** the repository.

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set up environment variables:**
   ```sh
   cp .env.example .env
   ```
   Fill in your own tokens. You'll need a free [Mapbox](https://account.mapbox.com)
   account (for both a public `pk.*` token and a secret `sk.*` download token)
   and, for community features, a [Supabase](https://supabase.com) project.

4. **Start the dev server:**
   ```sh
   npm start
   ```

5. **Build and run on a device/simulator:**
   ```sh
   npm run ios
   # or
   npm run android
   ```

## Before You Submit a Pull Request

Please make sure the following pass locally:

```sh
tsc --noEmit   # type check (strict mode, no `any`)
npm test       # Jest tests
```

## Conventions

- **TypeScript strict mode.** No `any`. Explicit types for exported APIs.
- **Functional components + hooks only.** No classes.
- Navigation uses `@react-navigation` v7 static config — do **not** migrate to `expo-router`.
- Prefer Expo modules and config plugins over manual native edits. Use `expo install` for dependencies.
- Do **not** hand-edit `android/` or `ios/` — they are generated. Use `app.config.ts` and config plugins.
- New screens go in `src/navigation/screens/` and are registered in `src/navigation/index.tsx`.

See [CLAUDE.md](CLAUDE.md) for a fuller architecture overview.

## Pull Request Process

1. Create a feature branch off `main`.
2. Keep PRs focused — one logical change per PR.
3. Write a clear description of *what* changed and *why*.
4. Link any related issue.
5. Ensure CI / type checks / tests pass.

## Reporting Bugs & Requesting Features

Open an issue. For bugs, include steps to reproduce, expected vs. actual
behavior, your platform (iOS/Android), and screenshots if relevant.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
