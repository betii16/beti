import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tokens « shadcn » mappés sur les variables de marque BETI, pour que les
        // composants importés (ex. components/ui/mapcn-*) s'affichent correctement.
        background: "var(--bg)",
        foreground: "var(--tx)",
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--accent)",
        muted: "var(--bg3)",
        "muted-foreground": "var(--tx2)",
        popover: "var(--bg2-solid)",
        "popover-foreground": "var(--tx)",
        accent: "var(--bg3)",
        "accent-foreground": "var(--tx)",
        primary: "var(--accent)",
        "primary-foreground": "#ffffff",
      },
    },
  },
  plugins: [],
};
export default config;
