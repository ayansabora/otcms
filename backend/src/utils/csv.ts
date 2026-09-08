/**
 * Minimal, dependency-free CSV serializer. Escapes per RFC 4180 (quotes
 * doubled, field wrapped in quotes if it contains a comma/quote/newline).
 */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]!);

  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = cols.map(escape).join(",");
  const body = rows.map((row) => cols.map((col) => escape(row[col])).join(",")).join("\n");
  return `${header}\n${body}`;
}
