import { defineConfig } from "void/config";

// Production origin: social cards need absolute URLs.
const SITE_URL = "https://fft-book.naitokosuke.workers.dev";
const TITLE = "FFT 教科書 for ナイトウコウスケ";
const DESCRIPTION =
  "波を、周波数で見る。フーリエ級数からフーリエ変換、DFT、FFT、窓関数までを、1 段ずつ動かせる図で確かめながら進みます。";

export default defineConfig({
  output: "static",
  routing: {
    typedRoutes: true,
  },
  head: {
    title: TITLE,
    htmlAttrs: { lang: "ja" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover" },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "ja_JP" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      // public/og.png: a 1200×630 capture of the top of the page
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: TITLE },
      { name: "twitter:card", content: "summary_large_image" },
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
