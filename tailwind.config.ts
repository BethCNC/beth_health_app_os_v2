import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f4f7f5",
        panel: "#ffffff",
        ink: "#10261f",
        muted: "#48625b",
        line: "#d3ded8",
        accent: "#1c7055",
        warning: "#855d12"
      },
      fontFamily: {
        sans: ["'Atkinson Hyperlegible'", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 1px rgba(10, 20, 16, 0.06), 0 8px 28px rgba(10, 20, 16, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
