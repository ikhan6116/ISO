/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef6ff", 100: "#d9eaff", 500: "#2f6fed", 600: "#1f5ad6", 700: "#1a47a8", 900: "#0f2552" },
      },
    },
  },
  plugins: [],
};
