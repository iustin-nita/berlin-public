# Going Open Source — Step-by-Step Guide

This guide walks you through publishing **Berlin Public** as an open-source
project. It assumes no prior open-source experience. Follow the steps in order.

> Your repo already exists on GitHub as **`iustin-nita/berlin-toilets`** and is
> currently **private**. The plan: commit the prep work, push it, lock down your
> API tokens, then flip the repo to public.

> **Current state (as of this prep):** Steps 1–4 and 6–7 are DONE — prep work is
> committed, pushed, and the repo description/topics/issues are configured. The
> repo is still **private**, intentionally. See the ⚠️ Supabase blocker below
> before going public.

---

## ⚠️ Blocker before going public: dead Supabase project

The Supabase URL in your local `.env` — `ryeqylmoxygkjolhcpme.supabase.co` —
**does not resolve** (NXDOMAIN on Google + Cloudflare DNS). The project doesn't
exist. This means one of:

1. **You deleted the project / stopped using Supabase.** Community features
   (voting, status) silently fall back to local AsyncStorage. The dead Supabase
   code in `src/community/` should be cleaned up. The committed creds are
   harmless (nothing behind them).
2. **Your local `.env` is stale** and you have a *different* live project. In
   that case, before relying on it you MUST confirm **RLS is enabled** on every
   table of the real project.

**Action:** Figure out which case you're in (log into supabase.com). Then it's
safe to go public — the credentials referenced in the repo expose no live data
either way. Resume at **Step 5** below.

---

## What I already did for you

I prepared the repository so it's safe and welcoming to publish:

| Change | Why it matters for open source |
|--------|-------------------------------|
| Added `LICENSE` (MIT) | Without a license, legally **nobody** can use your code. MIT = anyone can use it, you keep credit + zero liability. |
| Added `.env.example` | Contributors copy this to `.env` and add their own keys. Documents what each secret is for — without exposing yours. |
| Added `CONTRIBUTING.md` | Tells newcomers how to set up and submit changes. |
| Added `CODE_OF_CONDUCT.md` | Standard expectation for public projects; sets behavior norms. |
| Added `.github/` templates | Structured bug reports, feature requests, and PR checklist. |
| `app.config.ts` — Mapbox token now reads from env (with fallback) | Cleaner; lets contributors use their own token. |
| `.gitignore` — added `tools/`, `public/`, `*.log`, `.venv/`, `.claude/settings.local.json` | Keeps a 437 MB screenshot tool, build logs, and personal settings out of the public repo. |
| Untracked `.claude/settings.local.json` | Personal local agent config — not meant to be shared. |
| Removed personal path from `eas.json` | It hardcoded `/Users/iustin/...` — machine-specific. |
| Updated `README.md` + `package.json` | Correct SDK version, license/author/repo metadata, env setup steps. |

**Security audit result:** ✅ No real secrets were ever committed to git history.
Your committed `.env` only ever contained `**` placeholders. Your real tokens
live only in local files (`.env`, `.env.local`) that are gitignored. **You do
not need to scrub git history or rewrite commits.**

---

## Step 1 — Review the changes

Look over what changed before committing:

```sh
git status
git diff
```

Nothing here is destructive — it's all additive docs + config cleanup.

---

## Step 2 — Decide on the loose brand-asset files

These are untracked image files sitting in the repo root:

- `berlin-public-app-icon-1024.png`
- `berlin-public-adaptive-foreground-1024.png`
- `berlin-public-logo.png`
- `assets/splash.png`

They're harmless brand assets. Either commit them (they document your icons) or
delete them if they're just scratch files. To commit, include them in Step 3.
To skip them, leave them untracked.

---

## Step 3 — Commit the prep work

```sh
git add LICENSE .env.example CONTRIBUTING.md CODE_OF_CONDUCT.md .github \
        .gitignore README.md app.config.ts package.json plugins/
git rm --cached .claude/settings.local.json   # already staged for removal

git commit -m "chore: prepare repository for open-source release

- add MIT LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, issue/PR templates
- add .env.example; move Mapbox public token to env var
- ignore tools/, public/, logs, .venv, local agent settings
- remove machine-specific path from eas.json
- commit required config plugins/
- update README + package.json metadata"
```

> ⚠️ **`plugins/` is required to build the app** — it was untracked before. The
> command above adds it. Don't skip it or builds will fail for everyone.

---

## Step 4 — Push to GitHub

```sh
git push origin main
```

(The repo is still private at this point — safe.)

---

## Step 5 — Lock down your API tokens (do this BEFORE going public)

Your tokens aren't *secret* leaks, but once the repo is public, the `pk.*`
Mapbox token in `app.config.ts` is visible to everyone. Protect it:

1. **Mapbox public token** — go to
   [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/),
   open your `pk.*` token, and add **URL restrictions** (your app's bundle IDs:
   `com.blobstudio.berlinpublic`). This stops strangers from racking up usage on
   your account.
2. **Mapbox secret token (`sk.*`)** — confirm it is **only** in your local
   `.env` (it is) and never referenced in tracked files. ✅ Already verified.
3. **Supabase** — open your project → **Authentication → Policies** and confirm
   **Row-Level Security (RLS) is enabled** on every table. The anon key is safe
   to ship *only* if RLS gates what it can read/write. This is the single most
   important check before going public.
4. **Google Maps key** (if used) — restrict it by Android package name + SHA-1
   in the [Google Cloud console](https://console.cloud.google.com/apis/credentials).

---

## Step 6 — Flip the repo to public

On GitHub:

1. Go to `https://github.com/iustin-nita/berlin-toilets/settings`
2. Scroll to **Danger Zone** → **Change repository visibility** → **Make public**
3. Type the repo name to confirm.

Or with the CLI:

```sh
gh repo edit iustin-nita/berlin-toilets --visibility public --accept-visibility-change-consequences
```

---

## Step 7 — Polish the public repo

Make it look maintained and discoverable:

```sh
# Add a description + topics (helps people find it)
gh repo edit iustin-nita/berlin-toilets \
  --description "Find public fountains, toilets & amenities in Berlin — Expo/React Native, offline-first." \
  --add-topic expo --add-topic react-native --add-topic berlin \
  --add-topic mapbox --add-topic open-data --add-topic typescript
```

Then in the GitHub UI:

- **Settings → Features**: enable **Issues** and (optionally) **Discussions**.
- The **MIT** badge appears automatically once GitHub detects your `LICENSE`.
- Consider renaming the repo `berlin-toilets` → `berlin-public` to match the app
  name (**Settings → General → Repository name**). GitHub auto-redirects the old
  URL. If you do, update the `repository.url` in `package.json` afterward.

---

## Step 8 — Ongoing maintenance (the open-source part)

- **Issues** are now public — watch for bug reports and feature requests.
- **Pull requests** from strangers: review them, run `tsc --noEmit` + `npm test`,
  merge what's good. The PR template reminds contributors of the checklist.
- Never paste real secrets into issues, PRs, or commits. If you ever do leak one,
  **rotate the key immediately** (regenerate it in the provider's dashboard) —
  deleting the commit is not enough once it's public.
- Tag releases (`git tag v1.0.0 && git push --tags`) so people can track versions.

---

## Quick reference: what's secret vs. public

| Item | Public-safe? | Notes |
|------|-------------|-------|
| Mapbox `pk.*` token | ✅ Yes (by design) | Ships in app binary. Restrict by URL/bundle ID. |
| Mapbox `sk.*` token | ❌ **Secret** | Build-time only. Keep in local `.env`. Never commit. |
| Supabase URL + anon key | ✅ Yes *if RLS on* | Anon key is meant for clients; RLS is what protects data. |
| Google Maps Android key | ⚠️ Restrict it | Lock to package name + SHA-1. |
| EAS project ID | ✅ Yes | Tied to your account; contributors use their own. |
| `.env` / `.env.local` | ❌ Never commit | Already gitignored. |

You're ready. 🚀
