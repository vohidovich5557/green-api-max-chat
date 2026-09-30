const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const full = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatTime = (ts: number) => time.format(ts);

export function isSameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function formatDay(ts: number): string {
  const now = Date.now();
  if (isSameDay(ts, now)) return 'Сегодня';
  if (isSameDay(ts, now - 86_400_000)) return 'Вчера';
  return new Date(ts).getFullYear() === new Date().getFullYear() ? dayMonth.format(ts) : full.format(ts);
}

/** Sidebar timestamp: time for today, date otherwise */
export function formatListTime(ts: number): string {
  if (isSameDay(ts, Date.now())) return formatTime(ts);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(ts);
}

export function initials(name: string): string {
  const parts = name.replace(/[+\d\s-]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '#';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

const AVATAR_GRADIENTS = [
  ['#2f7bff', '#62a8ff'],
  ['#8b4dff', '#b98bff'],
  ['#ff5e8a', '#ff9bb4'],
  ['#12b886', '#63e6be'],
  ['#fd7e14', '#ffb366'],
  ['#15aabf', '#66d9e8'],
];

export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const [a, b] = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
