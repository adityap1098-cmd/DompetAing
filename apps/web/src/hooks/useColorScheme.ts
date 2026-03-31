import { useEffect } from "react";
import { useAuth } from "./useAuth";

export const COLOR_SCHEME_KEY = "da_scheme";

interface SchemeVars {
  accent: string;  // --accent  (main color)
  dark: string;    // --accent-dark  (lighter, for dark mode)
  s600: string;    // --accent-600  (darker shade)
  s50: string;     // --accent-50   (very light bg)
  s100: string;    // --accent-100  (light bg)
}

export const SCHEMES: Record<string, SchemeVars> = {
  sage_green:    { accent: "#2E7D5A", dark: "#4CAF7A", s600: "#256845", s50: "#F0FAF5", s100: "#DCF4E8" },
  ocean_blue:    { accent: "#1A56DB", dark: "#4879EB", s600: "#1444AF", s50: "#EBF5FE", s100: "#D2EBF9" },
  royal_purple:  { accent: "#7B3FA8", dark: "#AC70D2", s600: "#622F87", s50: "#F8F2FE", s100: "#EDDEFC" },
  sunset_orange: { accent: "#D65C2E", dark: "#EB8C5A", s600: "#B24923", s50: "#FEF5EF", s100: "#FCE6D7" },
  teal_green:    { accent: "#0E9494", dark: "#3CBEBE", s600: "#0A7676", s50: "#ECFCFC", s100: "#CCF7F7" },
  hot_pink:      { accent: "#C44569", dark: "#E47094", s600: "#A03455", s50: "#FEF2F7", s100: "#FBDDE9" },
  navy_blue:     { accent: "#1F3A93", dark: "#4C69BE", s600: "#182D73", s50: "#EEF2FF", s100: "#DBE5FF" },
  steel_gray:    { accent: "#475569", dark: "#64748B", s600: "#334155", s50: "#F8FAFC", s100: "#F1F5F9" },
};

export function applyColorScheme(scheme: string) {
  const c = SCHEMES[scheme] ?? SCHEMES.sage_green;
  const root = document.documentElement;
  // Inline style = highest CSS specificity — overrides all stylesheet rules
  root.style.setProperty("--accent",      c.accent);
  root.style.setProperty("--accent-dark", c.dark);
  root.style.setProperty("--accent-600",  c.s600);
  root.style.setProperty("--accent-50",   c.s50);
  root.style.setProperty("--accent-100",  c.s100);
  try {
    localStorage.setItem(COLOR_SCHEME_KEY, scheme);
  } catch {
    // localStorage unavailable (private mode etc.)
  }
}

export function useColorScheme() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.color_scheme) return;
    applyColorScheme(user.color_scheme);
  }, [user?.color_scheme]);
}
