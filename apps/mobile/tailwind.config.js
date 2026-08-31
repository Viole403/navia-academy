/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0F1A",
          900: "#111827",
          800: "#1A2332",
          700: "#243040",
          600: "#2F3E52",
          500: "#41546F",
        },
        cinnabar: {
          500: "#E5484D",
          600: "#D13238",
          700: "#B3262C",
        },
        jade: {
          400: "#34D399",
          500: "#10B981",
        },
        gold: {
          400: "#FBBF24",
          500: "#F59E0B",
        },
        paper: "#F7F3EA",
        rice: "#EFE9DB",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
}
