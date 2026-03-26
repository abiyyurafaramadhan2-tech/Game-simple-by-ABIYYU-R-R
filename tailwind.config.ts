import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}","./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        game: {
          bg:     "#0a0a14",
          panel:  "rgba(10,10,20,0.85)",
          border: "rgba(255,200,50,0.3)",
          gold:   "#ffc832",
          red:    "#ff3344",
          blue:   "#33aaff",
          green:  "#33ff88",
        }
      },
      fontFamily: { game: ["monospace"] },
    },
  },
  plugins: [],
};
export default config;
