# Versioning Policy — Hospital HMS

Project version `X.Y.Z.W` (0.0.0.0 format) single source of truth `VERSION` file mein hai.

## Segment Meaning

| Segment | Kya hota jab: | Example |
|---|---|---|
| **X — Major** | Breaking change / naya major module (IPD, Billing re-write), production host ke saath incompatibility | `1.x.y.z` |
| **Y — Minor** | Naya feature/phase deploy hota hai | `0.2.0.0` |
| **Z — Patch** | Bugfix, security fix, small improvement (features ke bina) | `0.1.1.0` |
| **W — Build** | Iteration/counter — same release par chhote commits, hotfix re-runs | `0.1.0.1` |

## Kab Kaunsa Bump

| Change Type | Command |
|---|---|
| Naya feature ya pura phase | `npm run version:minor` |
| Bugfix / hotfix / security fix | `npm run version:patch` |
| Breaking / huge release | `npm run version:major` |
| Chhota internal iteration (same release deploy) | `npm run version:build` |

## Release Process

```bash
# 1. Version bump (+ package.json auto-sync for X.Y.Z)
npm run version:minor

# 2. CHANGELOG.md mein entry add karo (docs ke under "Unreleased" section)
# 3. Commit
git add -A
git commit -m "feat(phase-3): billing & finance module"

# 4. Tag banake push karo
git tag -a v$(npm run version:tag --silent | tail -1) -m "Release v$(npm run version:tag --silent | tail -1)"
git push origin main --tags
```

## Rules

1. `package.json` ka `version` hamesha `X.Y.Z` (first 3 segments) ke saath sync rahta hai (`npm run version:sync`).
2. Har release ka ek **git tag** `vX.Y.Z.W` zaroori hai.
3. Unreleased changes hamesha `CHANGELOG.md` ke `## [Unreleased]` section mein.
4. Version humesha **bakane** se nahi — uper diye rules se hi badalta hai.
5. Har phase `docs/IMPLEMENTATION_PLAN.md` se linked ho — feature complete hone par phase ko `[x]` mark karo aur minor bump.

## Current Version

`0.1.0.0` — baseline (initial HMS + login UX + dependency updates).