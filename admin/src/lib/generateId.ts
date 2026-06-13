export function generateNextId(rows: any[], prefix: string) {
  const max = rows.reduce((acc, row) => {
    const num = parseInt(row.id.replace(`${prefix}_`, ""), 10);
    return Math.max(acc, num);
  }, 0);

  const next = max + 1;

  // pad to at least 3 digits, but allow growth beyond 999
  const padded = String(next).padStart(3, "0");

  return `${prefix}_${padded}`;
}
