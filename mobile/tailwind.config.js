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
        // Paleta acogedora de la web y del panel de chat de la extensión
        cozy: {
          deep: "#1C1530",
          plum: "#2A2140",
          card: "#352A4F",
          lamp: "#FFC965",
          cream: "#F6EFF7",
          muted: "#C9BCD6",
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
