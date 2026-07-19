import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        blink: "blink 1s step-start infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      colors: {
        // Palette Manobra alignée sur le logo (#00CC5D = brand-600, couleur principale)
        brand: {
          50:  "#EDFDF4",
          100: "#D5F9E4",
          200: "#ABF2CB",
          300: "#76E6AC",
          400: "#3FDA8C",
          500: "#1FD473",
          600: "#00CC5D",
          700: "#06A34B",
          800: "#057A38",
          900: "#045227",
          950: "#02301A",
        },
        // Les classes Tailwind standard green-*/emerald-* pointent vers la même échelle
        green: {
          50:  "#EDFDF4",
          100: "#D5F9E4",
          200: "#ABF2CB",
          300: "#76E6AC",
          400: "#3FDA8C",
          500: "#1FD473",
          600: "#00CC5D",
          700: "#06A34B",
          800: "#057A38",
          900: "#045227",
          950: "#02301A",
        },
        emerald: {
          50:  "#EDFDF4",
          100: "#D5F9E4",
          200: "#ABF2CB",
          300: "#76E6AC",
          400: "#3FDA8C",
          500: "#1FD473",
          600: "#00CC5D",
          700: "#06A34B",
          800: "#057A38",
          900: "#045227",
          950: "#02301A",
        },
      },
      fontFamily: {
        sans: ["var(--font-raleway)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
