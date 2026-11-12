<script setup lang="ts">
import { useId } from "vue";
import MathBlock from "../components/MathBlock.vue";

// Prefix for the form-control ids, so labels stay linked even if a chapter renders twice.
const uid = useId();
</script>

<template>
  <section id="ch9">
    <h2><span class="no">09</span><span class="ttl">フーリエ変換の性質</span></h2>

    <h3>時間シフト</h3>
    <p>
      信号を時間方向にずらしても、含まれる周波数とその大きさは変わりません。変わるのは位相だけで、<b>周波数に比例して回ります</b>。高い周波数ほど、同じ時間のずれが大きな位相のずれになるからです。
    </p>
    <MathBlock tex="x(t-\tau)\ \Longleftrightarrow\ X(f)\,e^{-i2\pi f\tau}" />
    <figure id="d-shift" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>時間をずらすと、位相だけが回る</span></div>
      <p class="try-line">
        ずらす量を動かし、大きさ（中段）は変わらず、位相（下段）だけが k に比例して傾くのを見る
      </p>
      <div class="dc">
        <div class="row">
          <label :id="uid + '-sh-tau-label'" :for="uid + '-sh-tau'">ずらす量</label
          ><input
            :id="uid + '-sh-tau'"
            type="range"
            data-p="tau"
            min="-10"
            max="10"
            step="0.1"
            value="4"
          /><output :for="uid + '-sh-tau'" :aria-labelledby="uid + '-sh-tau-label'" data-o="tau" />
        </div>
      </div>
      <div class="plot h-190"><canvas data-c="a" /></div>
      <div class="plots2">
        <div class="plot h-220"><canvas data-c="b" /></div>
        <div class="plot h-220"><canvas data-c="c" /></div>
      </div>
      <div class="read" data-o="read" />
    </figure>
    <h3>たたみこみと積</h3>
    <p>時間領域での<b>たたみこみ</b>は、周波数領域では<b>単なる掛け算</b>になります。</p>
    <MathBlock tex="(x * h)(t)\ \Longleftrightarrow\ X(f)\,H(f)" />
    <p>
      フィルタは「周波数ごとに通す量 H(f) を掛けるもの」と考えられます。下の図は、大きな成分以外を 0
      にする（H を 0 か 1 にする）だけの単純なフィルタです。
    </p>
    <figure id="d-denoise" class="demo">
      <div class="dh">
        <span class="pill">TRY</span><span>大きい成分だけ残してノイズを消す</span>
      </div>
      <p class="try-line">残す本数を 2 から増やしていき、ノイズが戻ってくるのを見る</p>
      <div class="dc">
        <div class="row">
          <label :id="uid + '-dn2-s-label'" :for="uid + '-dn2-s'">ノイズ σ</label
          ><input
            :id="uid + '-dn2-s'"
            type="range"
            data-p="s"
            min="0"
            max="1.2"
            step="0.01"
            value="0.6"
          /><output :for="uid + '-dn2-s'" :aria-labelledby="uid + '-dn2-s-label'" data-o="s" />
        </div>
        <div class="row">
          <label :id="uid + '-dn2-K-label'" :for="uid + '-dn2-K'">残す本数</label
          ><input
            :id="uid + '-dn2-K'"
            type="range"
            data-p="K"
            min="1"
            max="65"
            step="1"
            value="2"
          /><output :for="uid + '-dn2-K'" :aria-labelledby="uid + '-dn2-K-label'" data-o="K" />
        </div>
      </div>
      <div class="legend">
        <span><i class="bg-trace2" />ノイズを含むサンプル</span
        ><span><i class="bg-muted" />元の信号（ノイズなし）</span
        ><span><i class="bg-accent" />残した成分だけで逆 FFT</span>
      </div>
      <div class="plots2">
        <div class="plot h-300"><canvas data-c="a" /></div>
        <div class="plot h-300"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            5 Hz と 12 Hz の正弦波にノイズを加えた 128
            点の信号です。下のスペクトルで振幅の大きい順に「残す本数」だけ残し（黄緑）、残りを 0
            にして逆 FFT したものが上の黄緑の線です。2
            本残すと、ノイズがほぼ消えて元の信号（灰色の破線）に重なります。本数を増やすと、ノイズの成分まで戻ってきます。
          </p>
        </div>
      </details>
    </figure>
    <h3>パーセバルの等式</h3>
    <p>
      時間領域で計算したエネルギーと、周波数領域で計算したエネルギーは等しくなります。フーリエ変換は、信号を直交する成分（ものさし）に分ける操作なので、ベクトルを直交する軸に分解しても長さが変わらないのと同じです。
    </p>
    <MathBlock tex="\sum_{n=0}^{N-1}|x[n]|^2 = \frac{1}{N}\sum_{k=0}^{N-1}|X[k]|^2" />
  </section>
</template>
