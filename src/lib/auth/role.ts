import type { UserRole } from "@/types/database";

export const IMP_ROLE_COOKIE = "imp_role";
export const IMP_FROM_COOKIE = "imp_from";
export const IMP_SID_COOKIE = "imp_sid";

export const ALL_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "doctor",
  "nurse",
  "lab",
  "staff",
  "patient",
];

export function isValidImpersonation(
  realRole: string | null | undefined,
  impFrom: string | undefined,
  impRole: string | undefined
): boolean {
  if (realRole !== "super_admin") return false;
  if (impFrom !== "super_admin") return false;
  if (!impRole || impRole === "super_admin") return false;
  return (ALL_ROLES as string[]).includes(impRole);
}

export function resolveEffectiveRole(
  realRole: string | null | undefined,
  impFrom: string | undefined,
  impRole: string | undefined
): UserRole {
  if (!realRole) return "patient";
  if (!isValidImpersonation(realRole, impFrom, impRole)) {
    return realRole as UserRole;
  }
  return impRole as UserRole;
}

export function readImpersonationCookies(
  getCookie: (name: string) => string | undefined
): { role?: string; from?: string; sid?: string } {
  return {
    role: getCookie(IMP_ROLE_COOKIE),
    from: getCookie(IMP_FROM_COOKIE),
    sid: getCookie(IMP_SID_COOKIE),
  };
}
