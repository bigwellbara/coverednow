import { harareDay } from "@/modules/billing/domain/public-bill";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A report's dates from the address bar, as whole days in Harare. Defaults to
 * this year so far. `to` is inclusive for people and exclusive for the query.
 */
export function reportRange(params: { from?: string | null; to?: string | null }, now = new Date()) {
  const today = harareDay(now);
  let from = params.from && DATE.test(params.from) ? params.from : `${today.slice(0, 4)}-01-01`;
  let to = params.to && DATE.test(params.to) ? params.to : today;
  if (from > to) [from, to] = [to, from];
  const start = new Date(`${from}T00:00:00+02:00`);
  const end = new Date(new Date(`${to}T00:00:00+02:00`).getTime() + 24 * 60 * 60 * 1000);
  return { from, to, start, end, valid: !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) };
}
