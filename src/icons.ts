const wrap = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ELEMENT_ICONS: Record<string, string> = {
  frost: wrap('<circle cx="12" cy="13" r="6"/><path d="M6 9h12M8 6.5a4 4 0 0 1 8 0"/><circle cx="12" cy="5" r="1"/>'),
  blaze: wrap('<circle cx="12" cy="9" r="4"/><path d="M8 10.5c.4 1.4 1.8 2 4 2s3.6-.6 4-2"/><path d="M7 16c1 3 9 3 10 0"/><path d="M5 14h14"/>'),
  verdant: wrap('<path d="M12 21c4 0 6-3 6-7 0-5-3-9-6-11-3 2-6 6-6 11 0 4 2 7 6 7Z"/><circle cx="12" cy="4" r="1.4"/>'),
  tide: wrap('<path d="M9 3h6v3a3 3 0 0 1-6 0V3Z"/><path d="M8 9h8l-1 10H9L8 9Z"/><path d="M9 14h6"/>'),
  turbo: wrap('<rect x="4" y="5" width="16" height="14" rx="2"/><rect x="7" y="8" width="10" height="5" rx="1"/><circle cx="9" cy="15" r="1"/><circle cx="13" cy="15" r="1"/>'),
  gale: wrap('<path d="M4 8h10a3 3 0 1 0-2.5-4"/><path d="M4 12h14a3 3 0 1 1-2.5 4"/><path d="M4 16h7"/><circle cx="17" cy="6" r="2"/>'),
};
