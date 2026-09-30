import { avatarGradient, initials } from '../utils/format';

export function Avatar({ seed, label, size = 48 }: { seed: string; label: string; size?: number }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: avatarGradient(seed), fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(label)}
    </div>
  );
}
