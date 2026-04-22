/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#04101f",
        primary: "#1a6bff",
        bright: "#2ec6ff",
        light: "#cadeff",
        action: "#3865f5",
        "dark-ui": "#2a303f",
        accent: "#f49e04",
        border: "#d0d2d5",
        bg: "#f8faff",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(4,16,31,0.08)",
        hard: "0 8px 24px rgba(4,16,31,0.15)",
        focus: "0 0 0 3px rgba(26,107,255,0.12)",
      },
      borderRadius: {
        sm: "4px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        full: "999px",
      },
    },
  },
  plugins: [],
};
