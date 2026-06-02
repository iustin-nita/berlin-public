# Going Open Source — Step-by-Step Guide

This guide walks you through publishing **Berlin Public** as an open-source
project. It assumes no prior open-source experience. Follow the steps in order.

> Your repo already exists on GitHub as **`iustin-nita/berlin-public`** and is
> currently **private**. The plan: commit the prep work, push it, lock down your
> API tokens, then flip the repo to public.

> **Current state:** Prep work (Steps 1–4) is committed and pushed. Mapbox tokens
> are revoked and Supabase RLS is verified (Step 5). The repo is still
> **private** — the only remaining step is flipping it to public (Step 6).

---

## Supabase status — verified, safe to go public

Your Supabase project (**`berlin-public`**, free tier) is **live** and
**Row-Level Security (RLS) is enabled** — the Security Advisor reports **0
errors**. Going public is safe: the only Supabase values the app exposes are the
project URL and the **anon key**, both of which already ship inside your app
binary (any user can extract them from the APK/IPA). Publishing the repo adds no
new exposure.

**Open items (app integrity, not blockers for going public):** the Security
Advisor shows 4 warnings on `public.reports`:

- **RLS Policy Always True (×2)** — two policies use `USING (true)`, i.e. they
  allow the operation unconditionally. For a `SELECT` (read) policy this is fine
  (report data is public). For `INSERT` / `UPDATE` / `DELETE` it means **anyone
  with the anon key can write, edit, or delete any row**. Open Supabase →
  Authentication → Policies, check which command each policy targets, and
  tighten the write policies so users can only insert/modify their own rows.
- **Public / Signed-In Can See Object in GraphQL Schema** — normal; the table is
  exposed via the auto-generated API. Fine for public read data.

Fix the write policies when convenient — it protects your data, but it is
independent of whether the GitHub repo is public.

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
| Migrated maps Mapbox → MapLibre + OpenFreeMap | Removed all Mapbox tokens; maps now use free, keyless vector tiles. No API key for contributors to obtain. |
| `.gitignore` — added `tools/`, `public/`, `*.log`, `.venv/`, `.claude/settings.local.json` | Keeps a 437 MB screenshot tool, build logs, and personal settings out of the public repo. |
| Untracked `.claude/settings.local.json` | Personal local agent config — not meant to be shared. |
| Removed personal path from `eas.json` | It hardcoded `/Users/iustin/...` — machine-specific. |
| Updated `README.md` + `package.json` | Correct SDK version, license/author/repo metadata, env setup steps. |

**Security audit result:** Your `.env` was never committed with real values
(only `**` placeholders), and the current code tree is clean. **However, git
*history* did contain real Mapbox tokens** — a secret `sk.*` downloads token (in
`android/gradle.properties`, `ios/Podfile`, `app.json`) and a `pk.*` public
token (in `app.config.ts`), both from before the MapLibre migration.

**These tokens have been revoked,** so the strings left in history are now dead
and harmless. Because the app no longer uses Mapbox at all, revoking was the
clean fix — **you do not need to rewrite git history.** (A rewrite wouldn't help
anyway: the repo is already on GitHub, where old commits persist in caches and
forks. Revoking the credentials is the only thing that actually closes the
risk.)

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

## Step 5 — Lock down your API credentials (do BEFORE going public)

1. **Mapbox tokens — DONE.** ✅ Both the secret `sk.*` and public `pk.*` tokens
   have been revoked. The app migrated to keyless OpenFreeMap, so no Mapbox
   credential exists anymore. The dead tokens left in git history are harmless.
2. **Supabase RLS — VERIFIED.** ✅ RLS is enabled (Security Advisor: 0 errors).
   The anon key is safe to ship. See the **Supabase status** section above for
   the non-blocking write-policy warnings worth tightening later.
3. **Google Maps key** — not used by this app (maps are MapLibre / OpenFreeMap).
   Nothing to restrict.

---

## Step 6 — Flip the repo to public

On GitHub:

1. Go to `https://github.com/iustin-nita/berlin-public/settings`
2. Scroll to **Danger Zone** → **Change repository visibility** → **Make public**
3. Type the repo name to confirm.

Or with the CLI:

```sh
gh repo edit iustin-nita/berlin-public --visibility public --accept-visibility-change-consequences
```

---

## Step 7 — Polish the public repo

Make it look maintained and discoverable:

```sh
# Add a description + topics (helps people find it)
gh repo edit iustin-nita/berlin-public \
  --description "Find public fountains, toilets & amenities in Berlin — Expo/React Native, offline-first." \
  --add-topic expo --add-topic react-native --add-topic berlin \
  --add-topic maplibre --add-topic open-data --add-topic typescript
```

Then in the GitHub UI:

- **Settings → Features**: enable **Issues** and (optionally) **Discussions**.
- The **MIT** badge appears automatically once GitHub detects your `LICENSE`.
- ✅ The repo has been **renamed to `berlin-public`** to match the app name.
  GitHub auto-redirects the old URL, and `package.json` already points to the
  new repository.

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
| OpenFreeMap tiles | ✅ Yes | Keyless and free. No token to protect. |
| (Legacy) Mapbox `sk.*` / `pk.*` tokens | ❌ Were secret — now **revoked** | Existed in old git history; dead after the MapLibre migration. |
| Supabase URL + anon key | ✅ Yes (RLS is on) | Anon key is meant for clients; RLS is what protects the data. |
| EAS project ID | ✅ Yes | Tied to your account; contributors use their own. |
| `.env` / `.env.local` | ❌ Never commit | Already gitignored. |

You're ready. 🚀
