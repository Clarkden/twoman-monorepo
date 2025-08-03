import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      backgroundColor: {
        mainPurple: "#a364f5",
        mainBackgroundColor: "#0c0c0d",
        secondaryBackgroundColor: "#242428",
        accentColor: "#7f7985",
        borderColor: "#2e2c2c",
      },
      textColor: {
        mainPurple: "#a364f5",
        mainBackgroundColor: "#0c0c0d",
        secondaryBackgroundColor: "#242428",
        accentColor: "#7f7985",
        borderColor: "#2e2c2c",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
