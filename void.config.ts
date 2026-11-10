import { defineConfig } from "void/config";

export default defineConfig({
  output: "static",
  routing: {
    typedRoutes: true,
  },
  head: {
    title: "FFT 教科書 for ナイトウコウスケ",
    htmlAttrs: { lang: "ja" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover" },
    ],
    link: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;600&family=Zen+Kaku+Gothic+New:wght@700;900&display=swap",
      },
    ],
  },
  worker: {
    compatibility_date: "2026-02-24",
  },
});
