import { voidVue } from "@void/vue/plugin";
import vize from "@vizejs/vite-plugin";
import { defineConfig } from "vite-plus";
import { voidPlugin } from "void";

// voidVue() bundles @vitejs/plugin-vue; swap it for Vize's native SFC compiler.
const voidVuePages = voidVue().filter((plugin) => plugin.name !== "vite:vue");

export default defineConfig({
  // The book is prose-heavy markup: keep HTML whitespace semantics so formatter line breaks never glue words together.
  plugins: [voidPlugin(), vize({ whitespace: "preserve" }), ...voidVuePages],
  fmt: {
    ignorePatterns: ["pnpm-lock.yaml"],
  },
  // Shared Vize settings, read by the plugin, the `vize` CLI and the editor.
  vue: {
    // tsrs (TypeScript 7 in Rust) as the native checker for `vize check` and the editor.
    typeChecker: {
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
