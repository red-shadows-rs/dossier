import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--primary)",
        background: "var(--background)",
        foreground: "var(--text)",
        surface: "var(--surface)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--surface)",
          foreground: "var(--muted)",
        },
        accent: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        info: "var(--info)",
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
    },
  },
};

export default config;
