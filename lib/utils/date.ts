export function nowIso(): string {
  return new Date().toISOString();
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isExpired(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}
