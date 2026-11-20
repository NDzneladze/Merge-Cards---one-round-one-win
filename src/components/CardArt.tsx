/**
 * Original illustrations for the seven card kinds. Flat vector shapes, one
 * family: a plated emblem on parchment. Nothing here is a borrowed character,
 * food, gem brand or logo.
 */

type Props = { className?: string };

export function GreenEmblem({ className = "" }: Props) {
  return (
    <svg className={`hero hero-green ${className}`.trim()} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="31" fill="#d7f3e3" />
      <circle cx="40" cy="40" r="31" fill="none" stroke="#0c6a40" strokeWidth="1.6" />
      <path d="M40 64c0-14 0-22 0-30" fill="none" stroke="#0e7a45" strokeWidth="3.2" strokeLinecap="round" />
      <path fill="#128a4e" d="M39 48c-2-8-10-14-18-14 1 9 8 16 16 17 1 0 2-1 2-3Z" />
      <path fill="#0e6b3e" d="M41 42c2-9 12-16 20-14-2 9-10 15-18 16-1 0-2-1-2-2Z" />
      <path fill="#f4fff8" stroke="#0e7a45" strokeWidth="1.6" d="M40 14.5 43.2 22l8 .6-6.1 4.6 1.9 7.4L40 30.8 33 34.6l1.9-7.4-6.1-4.6 8-.6L40 14.5Z" />
      <circle cx="22" cy="22" r="1.5" fill="#0e7a45" />
      <circle cx="58" cy="18" r="1.3" fill="#0e7a45" />
    </svg>
  );
}

export function BlueCrystal({ className = "" }: Props) {
  return (
    <svg className={`hero hero-blue ${className}`.trim()} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <polygon points="40,6 68,22 68,58 40,74 12,58 12,22" fill="#163e86" />
      <polygon points="40,6 68,22 40,40 12,22" fill="#8eb6f2" />
      <polygon points="12,22 40,40 40,74 12,58" fill="#2a62b8" />
      <polygon points="68,22 40,40 40,74 68,58" fill="#1a4c9c" />
      <polygon points="40,14 54,26 40,34 26,26" fill="#f7fbff" />
      <polygon points="40,40 52,34 40,62 28,34" fill="#d7e6ff" opacity="0.85" />
      <polygon points="40,6 68,22 68,58 40,74 12,58 12,22" fill="none" stroke="#0c2c66" strokeWidth="1.4" />
    </svg>
  );
}

export function GoldTrophy({ className = "" }: Props) {
  return (
    <svg className={`hero hero-gold ${className}`.trim()} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <path d="M26 16h28v8c0 10-6 18-14 18s-14-8-14-18v-8Z" fill="#e2b340" />
      <path d="M26 20h-9c.4 9 6.2 14 11.2 14" fill="none" stroke="#8a5a10" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M54 20h9c-.4 9-6.2 14-11.2 14" fill="none" stroke="#8a5a10" strokeWidth="3.2" strokeLinecap="round" />
      <path fill="#fff6d4" d="M40 22.5 42.2 28l6 .5-4.6 3.6 1.5 5.6L40 34.6 34.9 37.7 36.4 32.1 31.8 28.5l6-.5L40 22.5Z" />
      <rect x="36.2" y="42" width="7.6" height="10" rx="1.2" fill="#a56b12" />
      <rect x="27" y="52" width="26" height="5.5" rx="1.6" fill="#f0d48a" />
      <rect x="22" y="58.5" width="36" height="5" rx="1.6" fill="#a56b12" />
      <ellipse cx="18" cy="64" rx="5" ry="3.2" fill="#e2b340" />
      <ellipse cx="62" cy="64" rx="5" ry="3.2" fill="#e2b340" />
      <ellipse cx="18" cy="63.2" rx="2.2" ry="1.2" fill="#fff6d4" />
      <ellipse cx="62" cy="63.2" rx="2.2" ry="1.2" fill="#fff6d4" />
    </svg>
  );
}

export function PurpleSigil({ className = "" }: Props) {
  return (
    <svg className={`hero hero-purple ${className}`.trim()} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <rect x="18" y="16" width="28" height="40" rx="4" fill="#c4b5fd" transform="rotate(-14 32 36)" />
      <rect x="34" y="18" width="28" height="40" rx="4" fill="#7c3aed" transform="rotate(12 48 38)" />
      <rect x="34" y="18" width="28" height="40" rx="4" fill="none" stroke="#3b0764" strokeWidth="1.3" transform="rotate(12 48 38)" />
      <circle cx="42" cy="40" r="11" fill="#f6edff" stroke="#4c1d95" strokeWidth="1.5" />
      <path fill="#5b21b6" d="M42 32.2 44.2 38h6.1l-4.9 3.6 1.9 5.8L42 43.8 36.7 47.4 38.6 41.6 33.7 38h6.1L42 32.2Z" />
    </svg>
  );
}

export function PackGlyph({ className = "" }: Props) {
  return (
    <svg className={`hero hero-extra ${className}`.trim()} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <rect x="22" y="18" width="36" height="46" rx="5" fill="#115e59" />
      <path d="M22 28h36v6H22z" fill="#0f3f3c" />
      <rect x="22" y="18" width="36" height="12" rx="5" fill="#14b8a6" />
      <path d="M34 18c2 4 10 4 12 0" fill="none" stroke="#042f2e" strokeWidth="1.4" />
      <rect x="28" y="40" width="24" height="4" rx="1" fill="#f0d48a" />
      <path fill="#f6fffd" d="M40 36.5v7.2M36.4 40.1h7.2" stroke="#f6fffd" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="22" y="18" width="36" height="46" rx="5" fill="none" stroke="#042f2e" strokeWidth="1.4" />
    </svg>
  );
}

export function GreyVoid({ className = "" }: Props) {
  return (
    <svg className={`hero hero-grey ${className}`.trim()} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <rect x="16" y="14" width="48" height="52" rx="6" fill="#f4f3ef" stroke="#8b938c" strokeWidth="1.6" strokeDasharray="3 2.5" />
      <circle cx="40" cy="38" r="12" fill="none" stroke="#6b7280" strokeWidth="2" />
      <path d="M32 50h16" stroke="#6b7280" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** One danger mark. No second copy, and no cross, so it is not a close button. */
export function Skull({ className = "" }: Props) {
  return (
    <svg className={`hero hero-red glyph ${className}`.trim()} viewBox="0 0 80 80" data-mark="skull" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="30" fill="none" stroke="#f0d48a" strokeWidth="1.4" />
      <circle cx="40" cy="40" r="25" fill="none" stroke="#f0d48a" strokeWidth="0.6" opacity="0.7" />
      <path
        fill="#f6e7c8"
        d="M40 16c-10.2 0-18 7.2-18 16.6 0 5.4 2.6 9.6 6.2 12.2v4.6c0 1.5 1.2 2.6 2.6 2.6h3.2V56h4.2v-4h1.6V56h4.2v-4h3.2c1.4 0 2.6-1.1 2.6-2.6v-4.6c3.6-2.6 6.2-6.8 6.2-12.2C58 23.2 50.2 16 40 16Z"
      />
      <ellipse cx="32.2" cy="36.5" rx="3.3" ry="3.8" fill="#3a0c14" />
      <ellipse cx="47.8" cy="36.5" rx="3.3" ry="3.8" fill="#3a0c14" />
      <path fill="#3a0c14" d="M36.4 45.2h7.2v3.1c0 .9-.7 1.5-1.7 1.5h-3.8c-1 0-1.7-.6-1.7-1.5v-3.1Z" />
      <path fill="#f6e7c8" d="M33.2 56.2h3v4.2h-3Zm5.2 0h3.1v4.2h-3.1Zm5.4 0h3v4.2h-3Z" />
    </svg>
  );
}

/** Card-back monogram: a diamond set in a four-point star. No wordmark. */
export function BackMark({ className = "" }: Props) {
  return (
    <svg className={`glyph back-mark ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 1.2 14.2 8.4 21.6 9.2 16.2 13.6 18 21.2 12 17.2 6 21.2 7.8 13.6 2.4 9.2 9.8 8.4 12 1.2Z" />
      <path fill="#12203a" d="M12 7.2 15.1 12 12 16.8 8.9 12 12 7.2Z" />
    </svg>
  );
}
