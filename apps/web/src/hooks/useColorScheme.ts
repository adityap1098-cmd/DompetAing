import { useEffect } from "react";
import { useAuth } from "./useAuth";

export const COLOR_SCHEME_KEY = "da_scheme";

interface SchemeVars {
  accent: string;
  dark: string;
  s600: string;
  s50: string;
  s100: string;
}

interface ThemePattern {
  css: string;          // CSS background value
  colorLight: string;   // pattern color for light mode
  colorDark: string;    // pattern color for dark mode
  opacity: number;      // 0.03 - 0.05
}

export interface ThemeScheme extends SchemeVars {
  label: string;
  pattern?: ThemePattern;
  premium?: boolean;    // premium-only themed schemes
}

// ── Solid color schemes (free) ──
export const SOLID_SCHEMES: Record<string, ThemeScheme> = {
  sage_green:    { label: "Sage Green",    accent: "#2E7D5A", dark: "#4CAF7A", s600: "#256845", s50: "#F0FAF5", s100: "#DCF4E8" },
  ocean_blue:    { label: "Ocean Blue",    accent: "#1A56DB", dark: "#4879EB", s600: "#1444AF", s50: "#EBF5FE", s100: "#D2EBF9" },
  royal_purple:  { label: "Royal Purple",  accent: "#7B3FA8", dark: "#AC70D2", s600: "#622F87", s50: "#F8F2FE", s100: "#EDDEFC" },
  sunset_orange: { label: "Sunset Orange", accent: "#D65C2E", dark: "#EB8C5A", s600: "#B24923", s50: "#FEF5EF", s100: "#FCE6D7" },
  teal_green:    { label: "Teal Green",    accent: "#0E9494", dark: "#3CBEBE", s600: "#0A7676", s50: "#ECFCFC", s100: "#CCF7F7" },
  hot_pink:      { label: "Hot Pink",      accent: "#C44569", dark: "#E47094", s600: "#A03455", s50: "#FEF2F7", s100: "#FBDDE9" },
  navy_blue:     { label: "Navy Blue",     accent: "#1F3A93", dark: "#4C69BE", s600: "#182D73", s50: "#EEF2FF", s100: "#DBE5FF" },
  steel_gray:    { label: "Steel Gray",    accent: "#475569", dark: "#64748B", s600: "#334155", s50: "#F8FAFC", s100: "#F1F5F9" },
};

// ── Themed schemes with patterns (premium) ──
export const THEMED_SCHEMES: Record<string, ThemeScheme> = {
  islamic_gold: {
    label: "Islamic Gold",
    accent: "#B8860B", dark: "#D4A843", s600: "#8B6508", s50: "#FDF8ED", s100: "#FAF0D4",
    premium: true,
    pattern: {
      css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M20 0L40 20L20 40L0 20Z' fill='none' stroke='currentColor' stroke-width='0.5'/%3E%3Cpath d='M20 5L35 20L20 35L5 20Z' fill='none' stroke='currentColor' stroke-width='0.3'/%3E%3Ccircle cx='20' cy='20' r='3' fill='none' stroke='currentColor' stroke-width='0.3'/%3E%3C/svg%3E")`,
      colorLight: "#B8860B",
      colorDark: "#D4A843",
      opacity: 0.04,
    },
  },
  ocean_wave: {
    label: "Ocean Wave",
    accent: "#0077B6", dark: "#48B5E4", s600: "#005A8C", s50: "#ECF8FF", s100: "#D0EFFF",
    premium: true,
    pattern: {
      css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='30'%3E%3Cpath d='M0 15 Q15 0 30 15 Q45 30 60 15' fill='none' stroke='currentColor' stroke-width='0.8'/%3E%3Cpath d='M0 25 Q15 10 30 25 Q45 40 60 25' fill='none' stroke='currentColor' stroke-width='0.4'/%3E%3C/svg%3E")`,
      colorLight: "#0077B6",
      colorDark: "#48B5E4",
      opacity: 0.04,
    },
  },
  forest_nature: {
    label: "Forest Nature",
    accent: "#2D6A4F", dark: "#52B788", s600: "#1B4332", s50: "#EDFAF3", s100: "#D8F3DC",
    premium: true,
    pattern: {
      css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'%3E%3Cpath d='M22 4C22 4 28 14 28 20C28 23.3 25.3 26 22 26C18.7 26 16 23.3 16 20C16 14 22 4 22 4Z' fill='none' stroke='currentColor' stroke-width='0.5'/%3E%3Cpath d='M22 26V40' stroke='currentColor' stroke-width='0.3'/%3E%3C/svg%3E")`,
      colorLight: "#2D6A4F",
      colorDark: "#52B788",
      opacity: 0.03,
    },
  },
  sakura_pink: {
    label: "Sakura Pink",
    accent: "#C77D8A", dark: "#E8A8B4", s600: "#A85B6A", s50: "#FFF5F7", s100: "#FFE4EA",
    premium: true,
    pattern: {
      css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='10' cy='10' r='2' fill='currentColor'/%3E%3Ccircle cx='35' cy='20' r='1.5' fill='currentColor'/%3E%3Ccircle cx='20' cy='40' r='2.5' fill='currentColor'/%3E%3Ccircle cx='45' cy='42' r='1' fill='currentColor'/%3E%3Ccircle cx='5' cy='30' r='1.2' fill='currentColor'/%3E%3C/svg%3E")`,
      colorLight: "#C77D8A",
      colorDark: "#E8A8B4",
      opacity: 0.04,
    },
  },
  geometric_dark: {
    label: "Geometric",
    accent: "#6C63FF", dark: "#9B94FF", s600: "#5046CC", s50: "#F3F2FF", s100: "#E4E2FF",
    premium: true,
    pattern: {
      css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49'%3E%3Cpath d='M14 0L28 16.2L28 32.8L14 49L0 32.8L0 16.2Z' fill='none' stroke='currentColor' stroke-width='0.5'/%3E%3C/svg%3E")`,
      colorLight: "#6C63FF",
      colorDark: "#9B94FF",
      opacity: 0.03,
    },
  },
  batik_heritage: {
    label: "Batik Heritage",
    accent: "#8B4513", dark: "#C4793A", s600: "#6B3410", s50: "#FDF6EF", s100: "#F9E8D4",
    premium: true,
    pattern: {
      css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cellipse cx='18' cy='18' rx='8' ry='8' fill='none' stroke='currentColor' stroke-width='0.5'/%3E%3Cellipse cx='18' cy='18' rx='4' ry='4' fill='none' stroke='currentColor' stroke-width='0.4'/%3E%3Ccircle cx='18' cy='18' r='1.5' fill='currentColor' opacity='0.3'/%3E%3Ccircle cx='0' cy='0' r='2' fill='none' stroke='currentColor' stroke-width='0.3'/%3E%3Ccircle cx='36' cy='0' r='2' fill='none' stroke='currentColor' stroke-width='0.3'/%3E%3Ccircle cx='0' cy='36' r='2' fill='none' stroke='currentColor' stroke-width='0.3'/%3E%3Ccircle cx='36' cy='36' r='2' fill='none' stroke='currentColor' stroke-width='0.3'/%3E%3C/svg%3E")`,
      colorLight: "#8B4513",
      colorDark: "#C4793A",
      opacity: 0.04,
    },
  },
};

// Combined lookup
export const ALL_SCHEMES: Record<string, ThemeScheme> = { ...SOLID_SCHEMES, ...THEMED_SCHEMES };

// Legacy compat
export const SCHEMES = Object.fromEntries(
  Object.entries(ALL_SCHEMES).map(([k, v]) => [k, { accent: v.accent, dark: v.dark, s600: v.s600, s50: v.s50, s100: v.s100 }])
);

export function applyColorScheme(scheme: string) {
  const c = ALL_SCHEMES[scheme] ?? ALL_SCHEMES.sage_green;
  const root = document.documentElement;
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--accent-dark", c.dark);
  root.style.setProperty("--accent-600", c.s600);
  root.style.setProperty("--accent-50", c.s50);
  root.style.setProperty("--accent-100", c.s100);

  // Apply pattern
  const isDark = document.documentElement.classList.contains("dark");
  if (c.pattern) {
    const color = isDark ? c.pattern.colorDark : c.pattern.colorLight;
    // Replace currentColor with actual color in SVG
    const patternCss = c.pattern.css.replace(/currentColor/g, encodeURIComponent(color));
    root.style.setProperty("--bg-pattern", patternCss);
    root.style.setProperty("--bg-pattern-opacity", String(c.pattern.opacity));
  } else {
    root.style.setProperty("--bg-pattern", "none");
    root.style.setProperty("--bg-pattern-opacity", "0");
  }

  try {
    localStorage.setItem(COLOR_SCHEME_KEY, scheme);
  } catch {}
}

export function useColorScheme() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.color_scheme) return;
    applyColorScheme(user.color_scheme);
  }, [user?.color_scheme]);
}
