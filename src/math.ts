import katex from "katex";

/** Render TeX to KaTeX HTML, so formulas are already in the prerendered page. */
export function renderTex(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, { displayMode, output: "html", throwOnError: false });
}
