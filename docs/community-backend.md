# Community reports: Cloudflare D1

The app uses a small Worker API, not direct database access. Public Berlin amenity datasets and map tiles are unchanged.

## API and privacy

- `GET /v1/status?featureId=…`, header `X-Device-ID`: counts, latest status/time, own vote, weighted confidence.
- `POST /v1/reports`, same header, JSON `{ featureId, status, coordinates?: { lat, lng } }`: saves/replaces one report for the installation and amenity. The server supplies the timestamp.
- `GET /health`: database-backed readiness check.
- HTTPS, bounded JSON bodies, prepared SQL, no-store responses, and CORS for the web client.
- Installation identifiers remain in AsyncStorage under `community:device_id`; updates preserve them.
- Anonymous identifiers are not authenticated identities. Users can reset identifiers by reinstalling, as before; rate limits reduce abuse but are not proof of personhood.
- Reports are not automatically deleted at 60 days: that is the summary window. Confidence uses a 14-day half-life, while displayed counts are unweighted.
- D1 is created with `--jurisdiction=eu`. This constrains database storage/execution, not all Worker/network processing.
- Worker request logging is disabled; no report payloads or identifiers are logged by application code. IPs are used only as ephemeral rate-limit keys, never stored in reports.

## Local development

```sh
npm --prefix backend install
npm run test:backend
npm --prefix backend run typecheck
npm --prefix backend run dev
```

Backend tests use Node's built-in test runner and Cloudflare's local D1 engine. The app's Jest tests are separate: `npm test -- --runInBand --watchman=false`.

## Deploy

Use the existing Cloudflare account. Do not commit API tokens. Wrangler login requires account/user read, Workers script write, and D1 write permissions.

```sh
cd backend
npx wrangler whoami
npx wrangler d1 create berlin-public-community --jurisdiction=eu
# Set the returned database_id in wrangler.jsonc before running anything remote.
npm run db:migrate
npm run deploy
```

Set `COMMUNITY_API_URL` to the returned HTTPS Worker URL in local/build configuration. It is public and contains no secret. Native binaries embed this URL, so a new store build is needed; this project has no Expo OTA update runtime.

## Supabase migration

Keep the legacy source project intact; no project deletion, billing upgrade, or RLS weakening is needed. Temporarily resume it to export. Old store binaries still use the legacy service until updated; later legacy writes are not automatically synchronized. Re-export/import before final cutover if the source changed.

```sh
# From the repository root; legacy credentials are only used for the private export.
node --env-file=.env.local --experimental-strip-types backend/scripts/exportSupabase.ts .asc/artifacts/supabase-reports-TIMESTAMP.json
cd backend
npx wrangler d1 execute berlin-public-community --remote --file ../.asc/artifacts/supabase-reports-TIMESTAMP.json.sql
node --experimental-strip-types scripts/verifyImport.ts ../.asc/artifacts/supabase-reports-TIMESTAMP.json
```

The exporter paginates all rows including older reports, checks exact counts and two consistent snapshots, validates values, and saves mode-0600 backups in ignored storage. Import SQL is idempotent and never overwrites a newer destination vote. Verification compares normalized records, not just counts. On a mismatch, stop before changing app configuration or submitting a release.

For subsequent imports after new D1 votes exist, exact snapshot equality no longer applies: inspect conflicts and verify that every source identity is represented without replacing newer destination timestamps.

## Operations

D1 does not use Supabase's inactivity-pause workflow, but the Free plan has daily read/write/storage limits. Workers also has daily request/CPU limits. Exceeding quotas or abuse can still cause unavailable responses; do not promise unlimited availability. Check dashboard usage before upgrading; paid plans require the owner's approval.

Use D1 Time Travel for recovery within the plan's retention window and private exports for longer-lived backups. Migration exports contain installation IDs and must never be committed, attached to store submissions, or included in an EAS build.

For deletion requests, identify the installation/amenity records and delete the matching rows from D1 and any retained legacy/migration copies; do not delete other users' votes.

## Migration status (2026-10-01)

- Local Worker, schema, migration tools, and mobile API client implemented.
- 12 backend integration/migration tests and 24 app tests pass; backend and app TypeScript pass. Worker deployment dry-run passes.
- Supabase resumed and all 32 reports exported, with two matching snapshots and a private mode-0600 backup. Fingerprint: `fc046696a0262414c1f83e4f4a87bc122dbec2d5873ac420efefa457434c27f1`.
- Owner approved the scoped Wrangler OAuth grant; login is encrypted with its encryption key held in macOS Keychain.
- D1 `565dbf5a-4ddc-4b2a-9012-d50488ef83fc` created in account `4c0d84d724368093cbd180c0691e187f`; `wrangler d1 info` confirms `jurisdiction: eu`.
- Schema applied and all 32 reports imported. Destination count, every normalized field, and the fingerprint match the October 1 source backup, including after synthetic live-test cleanup.
- Worker deployed at `https://berlin-public-community.iustin-nitza.workers.dev`, version `4aadea73-1aae-44ea-9c9f-9434c643c885`. Database-backed health, empty summary, report creation/replacement, other-device privacy, and invalid-status rejection pass.
- Public endpoint configured locally and in the EAS production project environment. Updated privacy policy published on GitHub in commit `010292009bb24d1095ebba0ae54a31ffab827cc0`.
- Standalone iOS build 10 passes iOS 27 iPhone/iPad startup, map rendering, community-summary loading, favorite persistence, and category-toggle checks. New manual offline/Android release checks remain pending.
- Signed iOS/Android builds and store updates remain pending. Initial attempts and retries exhausted disk space; only this task's old compiler caches were removed, preserving build 9's simulator app, archive, IPA, source, and private report backups. Owner direction is requested before another build attempt; retry serially and use a new Android versionCode.
- ASC checked: iOS 1.1.0 remains PREPARE_FOR_SUBMISSION with VALID build 9; migration requires build 10 or newer.
- Google Play checked: Android 1.1.0 (31) is Available on Google Play, released September 13, with no unpublished changes. It still embeds the legacy URL and needs a new signed bundle/review.

## Legacy Supabase exposure (2026-11-15)

The legacy Supabase project `ryeqylmoxygkjolhcpme` let anyone with the anon key, which is embedded in old store binaries, read every report, including `device_id`. The same IDs were migrated to D1, where they are the only credential for a user's own vote.

- The project is paused (DNS does not resolve), so the anon key reads nothing. **Do not resume it.**
- Once no supported store build points at Supabase (iOS build 10+ and the next Android release are live), delete the project. The private October 1 export in `.asc/` remains the backup.
- New installation IDs come from `expo-crypto` `randomUUID()` instead of `Math.random`. Existing IDs keep working.
