/** Parse a calendar date without Date's silent February/day rollover. */
export function parseCycleDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Cycle dates must be valid calendar dates in YYYY-MM-DD format.");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Cycle dates must be valid calendar dates in YYYY-MM-DD format.");
  }
  return date;
}

export function isValidCycleDate(value: string): boolean {
  try { parseCycleDate(value); return true; } catch { return false; }
}

export function validateCycleHistoryDates(history: ReadonlyArray<{ start_date: string }>, today: Date): void {
  if (!Number.isFinite(today.getTime())) throw new Error("Reference date must be valid.");
  const referenceDay = parseCycleDate(today.toISOString().slice(0, 10)).getTime();
  for (const entry of history) {
    if (parseCycleDate(entry.start_date).getTime() > referenceDay) {
      throw new Error("Period history contains a start date after the reference date. Correct the history before requesting guidance.");
    }
  }
}
