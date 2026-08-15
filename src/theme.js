// Header color tokens per section. Kept intentionally small — only what
// Header.jsx needs — so adding a theme for a future third section is a
// 4-line object, not a layout change. Each page keeps its own full color
// palette locally (see COLORS in CatalogoMerch.jsx / Globos.jsx) for its
// cards/buttons; theme.js only drives the shared header bar.
export const MERCH_THEME = {
  bg: "#2B2A27",
  accent: "#E8952E",
  pillBg: "#F3E7D3",
  pillText: "#2B2A27",
};

// Blush/rose palette lifted from the "Decoración Globos" PDF (soft pink
// balloons, warm brown script headings, dusty-rose price tiles).
export const GLOBOS_THEME = {
  bg: "#4A3B36",
  accent: "#E39AA6",
  pillBg: "#F7DFE0",
  pillText: "#4A3B36",
};
