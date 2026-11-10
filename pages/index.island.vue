<script setup lang="ts">
import "katex/dist/katex.min.css";
import "../src/styles/book.css";
import Chapter01 from "../src/chapters/01.vue";
import Chapter02 from "../src/chapters/02.vue";
import Chapter03 from "../src/chapters/03.vue";
import Chapter04 from "../src/chapters/04.vue";
import Chapter05 from "../src/chapters/05.vue";
import Chapter06 from "../src/chapters/06.vue";
import Chapter07 from "../src/chapters/07.vue";
import Chapter08 from "../src/chapters/08.vue";
import Chapter09 from "../src/chapters/09.vue";
import Chapter10 from "../src/chapters/10.vue";
import Chapter11 from "../src/chapters/11.vue";
import Chapter12 from "../src/chapters/12.vue";
import Chapter13 from "../src/chapters/13.vue";
import BookEngine from "../src/components/BookEngine.vue" with { island: "load" };
import BookHero from "../src/components/BookHero.vue";
import BookToc from "../src/components/BookToc.vue";
</script>

<template>
  <div id="bgGlow" aria-hidden="true" />
  <div id="rippleCut" aria-hidden="true">
    <div class="rings"><i /><i /><i /></div>
    <div class="lbl" />
  </div>
  <div class="app">
    <BookHero />

    <div id="book" class="book">
      <BookToc />

      <article class="article">
        <Chapter01 />
        <Chapter02 />
        <Chapter03 />
        <Chapter04 />
        <Chapter05 />
        <Chapter06 />
        <Chapter07 />
        <Chapter08 />
        <Chapter09 />
        <Chapter10 />
        <Chapter11 />
        <Chapter12 />
        <Chapter13 />
      </article>
    </div>
  </div>
  <!--
    Void's island transform rewrites raw `.island.vue` source, which Vize precompiles before it runs,
    so the wrapper it would generate is written here. The `with { island }` import above still
    registers the component for the islands client; the id is its path from the root, minus extension.
  -->
  <div data-island="src/components/BookEngine" data-hydrate="load"><BookEngine /></div>
</template>
