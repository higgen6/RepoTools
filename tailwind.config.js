/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/app.js"],
  theme: {
    extend: {
      colors: {
        ink: "#172126",
        slate: "#5b6770",
        mist: "#eef2f0",
        line: "#dbe4df",
        pine: "#244c43",
        pineSoft: "#dfeee9",
        sand: "#f6f4ef",
        warn: "#9a3412",
        danger: "#991b1b"
      },
      boxShadow: {
        panel: "0 14px 30px rgba(23, 33, 38, 0.08)"
      },
      fontFamily: {
        sans: ["Segoe UI", "Tahoma", "Geneva", "Verdana", "sans-serif"],
        mono: ["Consolas", "Monaco", "monospace"]
      }
    }
  },
  plugins: []
};
