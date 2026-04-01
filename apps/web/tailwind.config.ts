import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"DM Mono"', "monospace"],
      },
      colors: {
        // All accent colors reference CSS variables (hex).
        // Set via style.setProperty in useColorScheme.ts.
        // Console test: document.documentElement.style.setProperty('--accent', '#1A56DB')
        accent: {
          DEFAULT: "var(--accent)",
          500: "var(--accent)",
          600: "var(--accent-600)",
          dark: "var(--accent-dark)",
          50: "var(--accent-50)",
          100: "var(--accent-100)",
        },
        income: {
          DEFAULT: "#1E8A5A",
          dark: "#4CAF7A",
        },
        expense: {
          DEFAULT: "#C94A1C",
          dark: "#E87340",
        },
      },
      borderRadius: {
        card: "14px",
        btn: "12px",
        chip: "8px",
        shell: "34px",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-top": "env(safe-area-inset-top)",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
