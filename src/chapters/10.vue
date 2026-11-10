<script setup lang="ts">
import { useId } from "vue";
import MathInline from "../components/MathInline.vue";

// Prefix for the form-control ids, so labels stay linked even if a chapter renders twice.
const uid = useId();
</script>

<template>
  <section id="ch10">
    <h2><span class="no">10</span><span class="ttl">サンプリング定理</span></h2>

    <p>サンプリングした信号から、元の連続信号を完全に戻せるのはどんなときでしょうか。</p>
    <h3>サンプリングはスペクトルを写す</h3>
    <p>
      サンプリングすると時間が離散になるので、第 8
      章の規則どおりスペクトルが周期的になります。周波数で言うと、元のスペクトルが
      <b><MathInline tex="f_s" /> ごとに写し取られて並びます</b>。
    </p>
    <figure id="d-rep" class="demo">
      <div class="dh">
        <span class="pill">TRY</span><span>サンプリングするとスペクトルが写される</span>
      </div>
      <p class="try-line">
        fs を下げていき、写し（緑）が元のスペクトル（黄緑）に重なり始める fs = 2B の境目を見る
      </p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-rp-B'">信号の帯域 B</label
          ><input
            :id="uid + '-rp-B'"
            type="range"
            data-p="B"
            min="1"
            max="10"
            step="0.5"
            value="4"
          /><output data-o="B" />
        </div>
        <div class="row">
          <label :for="uid + '-rp-fs'">fs</label
          ><input
            :id="uid + '-rp-fs'"
            type="range"
            data-p="fs"
            min="2"
            max="30"
            step="0.5"
            value="12"
          /><output data-o="fs" />
        </div>
      </div>
      <div class="plot h-280"><canvas data-c="a" /></div>
      <div class="read" data-o="read" />
    </figure>
    <h3>サンプリング定理</h3>
    <p>
      信号が <MathInline tex="B" /> Hz より高い周波数を含まない（帯域が
      <MathInline tex="B" />）とき、<MathInline tex="f_s > 2B" />
      なら写しが重なりません。このとき、<MathInline tex="-f_s/2" />〜<MathInline tex="f_s/2" />
      の範囲だけを取り出せば、元の連続信号を完全に戻せます。この上限
      <MathInline tex="f_s/2" />
      が<b>ナイキスト周波数</b>です。写しが重なると、取り出す範囲に別の周波数が混ざります。これが第
      4 章で見たエイリアシングの正体です。
    </p>
    <div class="callout">
      <span class="t">実務での注意</span>
      <p>
        エイリアシングは、サンプリングした後では取り除けません。実際の計測器では、AD 変換の前に
        <MathInline tex="f_s/2" />
        以上を落とす<b>アンチエイリアシングフィルタ</b>（アナログのローパスフィルタ）を入れます。
      </p>
    </div>
  </section>
</template>
