# Plan: Super Admin Audited Impersonation

> **Status: COMPLETE — Phases 1–10 implemented.** Phase 10 enhancements (history page, timer auto-expire, view-as everywhere, role switcher, dashboard widget, reason prompt, target context, read-only mode, toasts, Esc shortcut, dark mode) are done. Known limitation: per-user session sign-out requires the target JWT which the service-role SDK cannot obtain — request is still audited (<"IMPERSONATE_END" new_data.signed_out_target>).

## Goal

Super admin can view/edit any role's dashboard while impersonating, with a persistent banner, audit trail, and secure start/stop. Plus fix 3 pre-existing security holes.

## Architecture

**Mechanism:** HttpOnly cookie `imp_*` stores impersonation state. All 3 enforcement layers (middleware, layout guards, API guards) read it to compute an *effective role*. Real session (Supabase auth) never changes — super admin stays logged in as themselves.

**Cookie design (set only via Route Handler):**

- `imp_role` — target role (e.g. `doctor`)
- `imp_from` — original role (`super_admin`) for exit validation
- `imp_sid` — random session id, stored in `audit_logs` for correlation
- `HttpOnly`, `SameSite=Lax`, `Path=/`

---

## Phase 1 — Security fixes (do first)

| # | Fix | File |
|---|---|---|
| 1 | Restrict `PUT/DELETE/POST` to `super_admin` only (keep GET for admin) | `src/app/api/admin/users/[id]/route.ts:5-12` |
| 2 | Guard `/setup` — only allow when zero super_admins exist (or require existing super_admin session) | `src/app/api/setup/route.ts:18-46` |
| 3 | Remove `is_active` write **or** add migration `ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true` | `src/app/api/admin/users/[id]/route.ts:24` |

**Recommendation:** add the column (useful for disable-instead-of-delete later).

---

## Phase 2 — Shared auth helper (new)

**Create `src/lib/auth/role.ts`:**

```ts
getEffectiveRole(profile, cookies): UserRole  // reads imp_role if imp_from === profile.role
requireRole(allowed: UserRole[]): Promise<{ user, profile, effectiveRole } | NextResponse>
```

- First shared guard in the codebase (replaces 13+ inline duplicates gradually).
- Validates `imp_role` is not `super_admin` (no impersonating a super admin).

---

## Phase 3 — Impersonation API

**Create `src/app/api/admin/impersonate/route.ts`:**

| Method | Action |
|---|---|
| `POST` | Body `{ targetUserId }`. Guard: real role === `super_admin`. Fetch target profile → set `imp_role`/`imp_from`/`imp_sid` cookies. **Audit insert** via `createAdminClient()` (action: `IMPERSONATE_START`, record_id: target, new_data: `{sid, target_role}`) → return `{ redirectTo: "/<role>" }` |
| `DELETE` | Clear cookies. Audit `IMPERSONATE_END` (match by `imp_sid`) → redirect `/super-admin` |

Audit write must use service-role client — `audit_logs` has no client INSERT RLS policy (only SELECT for admin/super_admin, `schema.sql:1103`).

---

## Phase 4 — Middleware

**Edit `src/lib/supabase/middleware.ts:48-79`:**

```
effectiveRole = (imp_role cookie valid && imp_from === profile.role) ? imp_role : profile.role
allowedPrefixes = roleRoutes[effectiveRole]
```

Also add `imp_role`/`imp_from`/`imp_sid` to cookie forward list (lines 14–27 pattern) so they survive refresh.

---

## Phase 5 — Layout guards (7 files)

In each `src/app/<role>/layout.tsx` role check:

```ts
// before: if (!data || data.role !== "doctor") → /login
if (!data || getEffectiveRole(data, cookies) !== "doctor") → /login
```

Files:

- `src/app/super-admin/layout.tsx:32`
- `src/app/admin/layout.tsx:43`
- `src/app/doctor/layout.tsx:30`
- `src/app/nurse/layout.tsx:27`
- `src/app/lab/layout.tsx:26`
- `src/app/staff/layout.tsx:32`
- `src/app/patient/layout.tsx:31`

Note: super_admin's own layout checks **real** role only (always allow real super_admin; impersonation redirects them into the target role).

---

## Phase 6 — Impersonation Banner

**Create `src/components/layout/impersonation-banner.tsx`:**

- Cookie is HttpOnly so client can't read it; expose `GET /api/admin/impersonate` returning `{ active, role }`, or pass via server layout → AppShell prop.
- Amber/red strip: `⚠ Impersonating <role> — as super_admin <name>` + **Exit** button → `DELETE /api/admin/impersonate` → `router.push("/super-admin")`.
- Uses existing `Button` + `cn`.

**Mount in `src/components/layout/app-shell.tsx:131`** — wrapper div before topbars, so all 7 role layouts get it automatically.

---

## Phase 7 — UI entry point (Start impersonation)

**Edit `src/app/super-admin/users/page.tsx`:** add "View as" / impersonate button per row (next to existing role-change/reset/delete at lines 61–80). onClick → `POST /api/admin/impersonate` → `router.push(redirectTo)`.

Optionally same on `src/app/super-admin/admins/page.tsx`.

---

## Phase 8 — Audit visibility

- Audit page already reads `audit_logs` (`src/app/super-admin/audit/page.tsx:17`) — new `IMPERSONATE_START/END` actions appear automatically as colored pills (line 46: non-DELETE/INSERT → blue; optionally add amber for `IMPERSONATE_*`).
- During impersonation, DB trigger `log_audit_change()` already records `auth.uid()` = **real super admin** on every row they edit — so all edits are attributable to the real user, not the target. Correlate with `imp_sid` if needed.

---

## Phase 9 — API route guards during impersonation

APIs check real role via anon client. Two options:

- **A (recommended):** leave APIs checking **real** role — super_admin already passes `admin/super_admin` checks everywhere; target-role-only APIs (e.g. `/api/doctor/*`) would need `getEffectiveRole`.
- **B:** switch all guards to `requireRole` reading impersonation cookie.

Start with A; convert target-role-specific APIs (reception checks `admin/super_admin/staff` etc.) only if super admin needs them while impersonating `staff`.

---

## Phase 10 — Enhancements (12)

### High value

| # | Enhancement | Details |
|---|---|---|
| 1 | **Impersonation history page** | `/super-admin/impersonation` — sid correlation se: kaun kab kisko bana, kitni der, reason. Filter by date/user. |
| 2 | **Timer auto-expire** | Cookie `maxAge` + banner countdown (30 min default). Time khatam → automatic `DELETE /api/admin/impersonate` + redirect. |
| 3 | **View-as on all super-admin pages** | Eye button on `/super-admin/staff`, `/admins`, `/patients` (not just `/users`). |
| 4 | **Quick role switcher** | Banner me dropdown — ek click me doctor → nurse → staff, bapas super-admin jaye (POST se naya target, purana sid reuse/end). |
| 5 | **Dashboard widget** | `/super-admin` home: active impersonation count + last 5 impersonation logs. |

### Medium value

| # | Enhancement | Details |
|---|---|---|
| 6 | **Reason prompt** | Start se pehle modal: reason (support/debug/audit/other). Audit `new_data.reason` me store. |
| 7 | **Target user context** | Banner me target ka `full_name` + email — "Viewing Dr. Sharma as doctor". POST response me target name, GET status me bhi. |
| 8 | **End target sessions** | Exit modal option: "Also sign out target user" → `admin.auth.admin.signOut(userId)` (Supabase admin API: invalidate other sessions via `admin.auth.admin.signOut` — actually use `admin.auth.admin.signOut({ scope: 'global' })` not available per-user; use `admin.from` → will use `auth.admin.signOut` with userId if available, else document limitation + log only). |
| 9 | **Read-only mode** | Banner lock toggle → cookie `imp_mode=ro`. Middleware/API guard: `imp_mode=ro` blocks mutating methods (POST/PUT/PATCH/DELETE) at `/api/*` level with 403. Banner me lock icon. |

### Low effort

| # | Enhancement | Details |
|---|---|---|
| 10 | **Toast notifications** | Start/exit par toast (users page already has toast; banner exit par use `useToast`). |
| 11 | **Esc shortcut** | Banner mounted → `keydown Escape` triggers exit (confirm-free for speed, audit still logs). |
| 12 | **Dark-mode banner** | Amber palette with `dark:` variants — verify contrast in dark theme. |

**Phase 10 file changes** (all DONE — commit `impersonation phase 10`):

| Action | File | Status |
|---|---|---|
| New | `src/app/super-admin/impersonation/page.tsx` (history) | Done |
| Edit | `src/app/api/admin/impersonate/route.ts` — reason body, target name in GET, mode=ro handling, switch-target (POST `targetRole`), PATCH mode toggle | Done |
| Edit | `src/lib/auth/role.ts` — `imp_uid`/`imp_mode` cookies + `isReadOnlyImpersonation`/`isMutatingMethod` | Done |
| Edit | `src/lib/supabase/middleware.ts` — block mutations when `imp_mode=ro` | Done |
| Edit | `src/components/layout/impersonation-banner.tsx` — countdown, switcher, lock, target name, Esc, toast, dark colors | Done |
| Edit | `src/app/super-admin/page.tsx` — active count + last-5 widget | Done |
| Edit | `super-admin/layout.tsx` — nav item "Impersonation" | Done |
| Edit | super-admin users/admins/staff pages — reason modal (reusable `ImpersonateStarter`) + Eye button | Done |

---

## File change summary (Phase 1–9)

| Action | File |
|---|---|
| Fix | `src/app/api/admin/users/[id]/route.ts` (super_admin-only + is_active) |
| Fix | `src/app/api/setup/route.ts` (guard) |
| Migration | `supabase/migrations/000xx_profiles_add_is_active.sql` |
| New | `src/lib/auth/role.ts` |
| New | `src/app/api/admin/impersonate/route.ts` |
| Edit | `src/lib/supabase/middleware.ts` (effective role + cookie forward) |
| Edit | 7 × `src/app/<role>/layout.tsx` |
| New | `src/components/layout/impersonation-banner.tsx` |
| Edit | `src/components/layout/app-shell.tsx` (mount banner) |
| Edit | `src/app/super-admin/users/page.tsx` (View-as button) |
| Optional | `src/app/super-admin/audit/page.tsx` (action color) |

---

## Security considerations (built into plan)

1. Only `super_admin` can start impersonation; cannot target another `super_admin`.
2. Cookies HttpOnly — client JS can't forge them; server validates `imp_from === real role` every request.
3. Real auth session unchanged → exit always returns to super_admin, never stuck as target.
4. Every start/end written to `audit_logs` with correlation id; all edits during session attributed to real super admin by existing triggers.
5. Banner always visible — no silent impersonation.

---

## Recommendation

**Yes — implement it.** Hospital systems need super admin full oversight (emergency support, data correction, staff verification). Audited impersonation is the best balance: flexibility + accountability. Better than silent direct access because the audit trail is necessary for regulatory/compliance.

**Sequence:** Phase 1 (security fixes) → 2–3 (helper + API) → 4–5 (middleware + guards) → 6–7 (banner + UI) → 8–9 (polish) → 10 (enhancements).
