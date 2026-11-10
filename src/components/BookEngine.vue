<script setup lang="ts">
import { onMounted } from "vue";
import { mountBook } from "../book/engine";

// The only island on the page: it renders nothing and starts the demo engine in the browser.
// Everything else (chapters, formulas, hero) stays static HTML.
onMounted(mountBook);
</script>

<template>
  <span hidden />
</template>
