// Minimal RFC-4180-ish CSV parser. Handles quoted fields, embedded commas,
// escaped quotes ("") and quoted newlines. No dependency needed.

export type Row = Record<string, string>;

export function parseCSV(text: string): Row[] {
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  // Normalize line endings.
  const s = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n") {
      record.push(field);
      rows.push(record);
      record = [];
      field = "";
    } else {
      field += c;
    }
  }
  // Flush last field/record if the file didn't end with a newline.
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    rows.push(record);
  }

  // Drop fully-empty trailing rows.
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return [];

  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((cells) => {
    const obj: Row = {};
    header.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    return obj;
  });
}
