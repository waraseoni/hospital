# Hospital HMS — Documentation System

Ek systematic documentation & version control system jo har feature/change ko traceable banata hai.

## Files & Unka Role

| File | Role |
|---|---|
| `VERSION` | Current project version — single source of truth (format `X.Y.Z.W`) |
| `CHANGELOG.md` | Har release ki entry — kya add/change/fix hua |
| `docs/README.md` | Ye index + documentation conventions |
| `docs/VERSIONING.md` | Versioning policy — kis change par kaunsa segment bump |
| `docs/WORKFLOW.md` | Step-by-step process: feature → code → docs → changelog → version → tag |
| `docs/IMPLEMENTATION_PLAN.md` | Roadmap — saare future features phase-wise |
| `scripts/version.mjs` | Version bump script (npm scripts se chalata hai) |
| `supabase/migrations/00001..N.sql` | Har DB change ek numbered migration file |
| `supabase/schema.sql` | Auto-generated full schema (`npm run schema`) — DO NOT hand-edit |
| `docs/BACKUP_RESTORE.md` | DB backup & restore process (pg_dump/psql scripts) |
| `public/openapi.json` | OpenAPI 3.0 spec — sabhi `/api/*` endpoints |

## Conventions (MUST follow)

1. **FREE & OPEN SOURCE only** — koi paid service/SDK/saas nahi. Har naya integration free + OSS hona chahiye (see `docs/IMPLEMENTATION_PLAN.md` → Free & Open Source Policy).
2. **Har DB change** → naya numbered migration file (`supabase/migrations/`), purani kabhi edit nahi karte → phir `npm run schema` se `supabase/schema.sql` refresh karo.
3. **Har release** → `CHANGELOG.md` mein entry, version bump, git tag `vX.Y.Z.W`.
4. **Har feature** (agr UI/API/PDF/WhatsApp involve kare) → docs ka relevant section update karo ya nayi doc file banao.
5. **Breaking change** → naya doc entry + changelog mein note + minor demo.
6. Naya features hamesha `docs/IMPLEMENTATION_PLAN.md` mein phase ke under document ho — ise roadmap + progress tracker ki tarah use karo.

## File Format Rules

- `CHANGELOG.md` → Keep a Changelog (https://keepachangelog.com) format, sections: **Added / Changed / Fixed / Deprecated / Removed / Security**.
- Migration files → `NNNN_short_snake_case_name.sql` (alphabetical order = execution order).
- Modular docs → ek file ek topic. Index `docs/README.md` mein update karo jab nayi doc ban jaye.

## Quick Start

```bash
# version dekhna
npm run version:get

# feature ke baad version bump + commit message suggest karne ke liye
npm run version:minor   # nayi feature/phase
npm run version:patch   # bugfix
npm run version:build   # chhota iteration
```

Detailed process: `docs/WORKFLOW.md`.