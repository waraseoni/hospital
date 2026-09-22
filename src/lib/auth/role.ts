import type { UserRole } from "@/types/database";

export const IMP_ROLE_COOKIE = "imp_role";
export const IMP_FROM_COOKIE = "imp_from";
export const IMP_SID_COOKIE = "imp_sid";
export const IMP_UID_COOKIE = "imp_uid";
export const IMP_MODE_COOKIE = "imp_mode";

export const IMP_MODE_RO = "ro" as const;
export const IMP_MODE_RW = "rw" as const;
export type ImpMode = typeof IMP_MODE_RO | typeof IMP_MODE_RW;

export const IMP_DEFAULT_MAX_AGE_SECONDS = 30 * 60;

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
): { role?: string; from?: string; sid?: string; uid?: string; mode?: string } {
  return {
    role: getCookie(IMP_ROLE_COOKIE),
    from: getCookie(IMP_FROM_COOKIE),
    sid: getCookie(IMP_SID_COOKIE),
    uid: getCookie(IMP_UID_COOKIE),
    mode: getCookie(IMP_MODE_COOKIE),
  };
}

export function isReadOnlyImpersonation(mode: string | undefined): boolean {
  return mode === IMP_MODE_RO;
}

export function isMutatingMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}
