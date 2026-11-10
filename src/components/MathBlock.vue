<script setup lang="ts">
import { computed } from "vue";
import { renderTex } from "../math";

const { tex } = defineProps<{ tex: string }>();
const html = computed(() => renderTex(tex, true));
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- trusted KaTeX output of static TeX -->
  <div class="eq" role="img" :aria-label="tex" v-html="html" />
</template>
