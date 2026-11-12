import { voidVue } from "@void/vue/plugin";
import { vitePlusConfig } from "@vizejs/vite-plugin/vite-plus";
import { defineConfig } from "vite-plus";
import { voidPlugin } from "void";

// voidVue() bundles @vitejs/plugin-vue; vitePlusConfig() swaps it for Vize's native SFC compiler.
const vize = await vitePlusConfig({
  plugins: [voidPlugin(), voidVue()],
  fmt: {
    ignorePatterns: ["pnpm-lock.yaml"],
    // Oxfmt formats the Vue files too.
    vue: false,
  },
  // Shared Vize settings, read by the plugin, the `vize` CLI and the editor.
  vue: {
    // The book is prose-heavy markup: keep HTML whitespace semantics so formatter line breaks never glue words together.
    compile: { whitespace: "preserve" },
    // tsrs (TypeScript 7 in Rust) as the native checker for `vize check` and the editor.
    typeCheck: {
      tsrsPath: "node_modules/.bin/tsrs",
    },
    linter: {
      preset: "opinionated",
      crossFile: true,
      rules: {
        // Chapters are named by number (01.vue …) and Void routes pages by file name (index.vue).
        "vue/multi-word-component-names": "off",
        "vue/component-definition-name-casing": "off",
      },
      ruleOptions: {
        // Oxfmt owns formatting and writes void elements as `<input />`.
        "vue/html-self-closing": { html: { void: "always" } },
      },
    },
  },
});

export default defineConfig({
  ...vize,
  run: {
    tasks: {
      // Kept literal so `vp run` reads the tasks without evaluating this config.
      check: { command: "vize-vp-task check", cache: false },
    },
  },
});
