/** Keeps digits only: "+7 (999) 123-45-67" → "79991234567" */
export function toDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/** International numbers are 10–15 digits (E.164) */
export function isValidPhone(input: string): boolean {
  const d = toDigits(input);
  return d.length >= 10 && d.length <= 15;
}

/** Pretty-prints RU/KZ (+7) and UZ (+998) numbers, falls back to +digits */
export function formatPhone(digits?: string): string {
  if (!digits) return '';
  const d = toDigits(digits);
  if (d.length === 11 && d.startsWith('7')) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  }
  if (d.length === 12 && d.startsWith('998')) {
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  }
  return `+${d}`;
}
