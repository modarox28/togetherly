/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#0D0D1A",
          900: "#12121F",
          800: "#1A1A2E",
          700: "#252540",
          600: "#303050",
        },
        neon: {
          purple: "#C084FC",
          pink: "#F472B6",
        },
      },
    },
  },
  plugins: [],
};
