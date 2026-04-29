/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0f172a",
        primary: "var(--primary)",
        bright: "var(--bright)",
        light: "var(--light)",
        action: "var(--action)",
        "dark-ui": "var(--dark-ui)",
        accent: "var(--accent)",
        border: "var(--border)",
        bg: "var(--bg)",
        card: "#161927",
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
