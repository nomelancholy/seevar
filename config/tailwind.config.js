const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [
    "./public/*.html",
    "./app/helpers/**/*.rb",
    "./app/javascript/**/*.js",
    "./app/views/**/*.{erb,haml,html,slim}",
    "./app/components/**/*.{erb,haml,html,slim,rb}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Inter var", ...defaultTheme.fontFamily.sans],
        mono: ["JetBrains Mono", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        ledger: {
          bg: "var(--ledger-bg)",
          surface: "var(--ledger-surface)",
          border: "var(--ledger-border)",
        },
        accent: {
          var: "var(--accent-var)",
          respect: "var(--accent-respect)",
        },
      },
    },
  },
  plugins: [],
};
