export interface ImpersonationState {
  active: boolean;
  role: string | null;
  from: string | null;
  realRole: string | null;
  realName: string | null;
}

export async function fetchImpersonation(): Promise<ImpersonationState> {
  try {
    const res = await fetch("/api/admin/impersonate");
    if (!res.ok) return { active: false, role: null, from: null, realRole: null, realName: null };
    const data = await res.json();
    return {
      active: Boolean(data.active),
      role: data.role ?? null,
      from: data.from ?? null,
      realRole: data.realRole ?? null,
      realName: data.realName ?? null,
    };
  } catch {
    return { active: false, role: null, from: null, realRole: null, realName: null };
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
