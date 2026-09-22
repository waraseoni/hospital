export interface ImpersonationState {
  active: boolean;
  role: string | null;
  from: string | null;
  uid: string | null;
  mode: "ro" | "rw" | null;
  realRole: string | null;
  realName: string | null;
  targetName: string | null;
  targetEmail: string | null;
  expiresAt: number | null;
}

export const EMPTY_IMPERSONATION: ImpersonationState = {
  active: false,
  role: null,
  from: null,
  uid: null,
  mode: null,
  realRole: null,
  realName: null,
  targetName: null,
  targetEmail: null,
  expiresAt: null,
};

export async function fetchImpersonation(): Promise<ImpersonationState> {
  try {
    const res = await fetch("/api/admin/impersonate", { cache: "no-store" });
    if (!res.ok) return EMPTY_IMPERSONATION;
    const data = await res.json();
    return {
      active: Boolean(data.active),
      role: data.role ?? null,
      from: data.from ?? null,
      uid: data.uid ?? null,
      mode: data.mode ?? null,
      realRole: data.realRole ?? null,
      realName: data.realName ?? null,
      targetName: data.targetName ?? null,
      targetEmail: data.targetEmail ?? null,
      expiresAt: data.expiresAt ?? null,
    };
  } catch {
    return EMPTY_IMPERSONATION;
  }
}

export function effectiveRoleOf(
  realRole: string | null | undefined,
  imp: ImpersonationState
): string | null {
  if (!realRole) return null;
  if (imp.active && imp.role) return imp.role;
  return realRole;
}