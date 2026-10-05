export const OBJECTION_WINDOW_MS = 168 * 60 * 60 * 1000;
export function withinWindow(now: Date, anchor: Date) {
  return now.getTime() < anchor.getTime() + OBJECTION_WINDOW_MS;
}
