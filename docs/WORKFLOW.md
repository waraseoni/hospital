# Workflow — Feature/Change ka Documentation & Versioning

Har change is process se guzarta hai. Isse har naya feature traceable, documented, aur versioned rehta hai.

## 1. Plan

- Feature ko `docs/IMPLEMENTATION_PLAN.md` ke uske phase se match karo.
- Hassle: DB schema change? → nayi migration file. UI? → route. API? → route handler.

## 2. Implement

- Code + migration + types (`src/types/database.ts` sync karo).
- Migration file naming: `NNNN_snake_case.sql` (next highest number).
- Nayi migration ke baad full schema regenerate karo: `npm run schema` → `supabase/schema.sql` update hota hai.
- New UI route inline `docs/IMPLEMENTATION_PLAN.md` mein phase ke under note karo.

## 3. Document

- Kya feature aaya, kaise use hota hai → relevant doc file update karo (ya nayi banao + `docs/README.md` index mein add karo).
- DB tables/API endpooints → unki doc file mein update karo (jo bhi ho).

## 4. Changelog

`CHANGELOG.md` ke **`## [Unreleased]`** section mein entry:

```markdown
## [Unreleased]

### Added
- **Doctor Schedule**: weekly availability + slot booking ...
### Changed
- ...
### Fixed
- ...
```

Categories: **Added / Changed / Fixed / Deprecated / Removed / Security**.

## 5. Verify

```bash
npm run lint
npm run build
```

Zero errors, build pass — tabhi aage badho.

## 6. Version Bump

| Change | Command |
|---|---|
| Feature/Phase | `npm run version:minor` |
| Bugfix | `npm run version:patch` |
| Breaking | `npm run version:major` |
| Chhota iteration | `npm run version:build` |

`[Unreleased]` entry ko naye version number wale section mein move karo (release date ke saath).

## 7. Commit + Tag

```bash
git add -A
git commit -m "feat(scope): description"      # fix(scope)/docs(scope) bhi theek
git tag -a v$(npm run version:tag --silent | tail -1) -m "Release v$(npm run version:tag --silent | tail -1)"
git push origin main --tags
```

Commit message convention:
- `feat(doctor): doctor schedule & slot booking`
- `fix(inventory): correct table name inventory_items`
- `docs(plan): phase 0 status update`
- `chore(deps): upgrade packages`

## Checklist (short)

- [ ] Feature implemented
- [ ] Migration added (agar DB change)
- [ ] `npm run schema` (full schema `supabase/schema.sql` refresh)
- [ ] Types updated
- [ ] Docs updated (`docs/` + `docs/README.md` index)
- [ ] `CHANGELOG.md` entry added
- [ ] `npm run lint` + `npm run build` pass
- [ ] Version bumped (`npm run version:*`)
- [ ] Committed + tagged `vX.Y.Z.W` + pushed