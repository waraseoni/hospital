import { format, parseISO } from "date-fns";

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "dd MMM yyyy");
}

export function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), "dd MMM yyyy, hh:mm a");
}

export function formatDuration(fromMs: number, toMs: number): string {
  const ms = Math.max(0, toMs - fromMs);
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (totalMinutes === 0) return "<1m";
  return `${minutes}m`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatPhone(phone: string): string {
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  }
  return phone;
}

export function calculateAge(dob: string): number {
  const birthDate = parseISO(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
