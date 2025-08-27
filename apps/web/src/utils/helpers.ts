export function unixToDate(sec?: number | null) {
  return sec ? new Date(sec * 1000) : null;
}
