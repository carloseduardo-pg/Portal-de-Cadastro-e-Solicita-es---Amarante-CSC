export type IconName =
  | 'home'
  | 'users'
  | 'box'
  | 'cart'
  | 'logout'
  | 'settings'
  | 'help'
  | 'support'
  | 'bell'
  | 'menu'
  | 'grid'
  | 'plus-circle'
  | 'inbox'
  | 'list'
  | 'user-check'
  | 'database'
  | 'archive'
  | 'columns'
  | 'wallet'
  | 'file-alert'
  | 'clock'
  | 'shield'
  | 'sliders'
  | 'pencil'
  | 'check'
  | 'x';

const paths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z',
  users:
    'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm-4 5c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z',
  box: 'M3 7l9-4 9 4-9 4-9-4zm0 5 9 4 9-4M3 17l9 4 9-4',
  cart: 'M3 4h2l2.5 11h10l2-8H7M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  logout: 'M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M15 16l5-4-5-4M20 12H9',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4M12 17h.01',
  support:
    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 10h.01M12 10h.01M16 10h.01',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  'plus-circle': 'M12 8v8M8 12h8M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  inbox: 'M22 12H16l-2 3H10l-2-3H2M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6M22 12l-2-9H4L2 12',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  'user-check': 'M16 11a4 4 0 1 0-8 0M12 16c-4 0-7 2-7 4v1h6M17 18l2 2 4-4',
  database: 'M12 3c4.4 0 8 1.8 8 4s-3.6 4-8 4-8-1.8-8-4 3.6-4 8-4zM4 7v4c0 2.2 3.6 4 8 4s8-1.8 8-4V7M4 11v4c0 2.2 3.6 4 8 4s8-1.8 8-4v-4',
  archive: 'M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 7l2-4h14l2 4M10 11h4',
  columns: 'M9 3v18M15 3v18M3 3h18v18H3z',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3V7zM17 11h2M7 7V5a2 2 0 0 1 2-2h6',
  'file-alert': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 13v3M12 17h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
};

/** Ícone SVG outline — sem emojis (padrão Prottus). */
export function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
