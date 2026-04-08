export function formatDateLabelInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8); // MMDDYYYY
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return mm;
  if (digits.length <= 4) return `${mm}/${dd}`;
  return `${mm}/${dd}/${yyyy}`;
}

export function parseMMDDYYYY(label: string): number | null {
  const s = label.trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy))
    return null;
  if (yyyy < 1000 || yyyy > 9999) return null;
  if (mm < 1 || mm > 12) return null;
  const maxDay = new Date(yyyy, mm, 0).getDate();
  if (dd < 1 || dd > maxDay) return null;
  return new Date(yyyy, mm - 1, dd).getTime();
}

/** Returns normalized `MM/DD/YYYY` if complete+valid; otherwise null. */
export function normalizeMMDDYYYY(input: string): string | null {
  const formatted = formatDateLabelInput(input);
  if (formatted.length !== 10) return null;
  return parseMMDDYYYY(formatted) === null ? null : formatted;
}

