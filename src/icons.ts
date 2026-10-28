const wrap = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ELEMENT_ICONS: Record<string, string> = {
  frost: wrap(
    '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/><path d="M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5"/>',
  ),
  blaze: wrap(
    '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.2-2-5.5-3.6-7.4-.4 1.9-1.4 3-2.6 3.4.4-3.3-1-6.6-3.8-9.2.2 3.4-1.6 5.6-3 7.5C4.9 11.1 5 12.8 5 15.2 5 19.3 8 22 12 22Z"/>',
  ),
  verdant: wrap('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>'),
  tide: wrap('<path d="M12 2.5S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5Z"/><path d="M9 15a3 3 0 0 0 3 3"/>'),
  turbo: wrap(
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
  ),
  gale: wrap('<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>'),
};
