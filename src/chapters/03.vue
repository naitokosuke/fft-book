<script setup lang="ts">
import { useId } from "vue";
import MathBlock from "../components/MathBlock.vue";
import MathInline from "../components/MathInline.vue";

// Prefix for the form-control ids, so labels stay linked even if a chapter renders twice.
const uid = useId();
</script>

<template>
  <section id="ch3">
    <h2><span class="no">03</span><span class="ttl">フーリエ変換：周期をどんどん長くする</span></h2>

    <p>
      フーリエ級数は周期信号のためのものでした。では、1
      回しか起きないパルスのような<b>周期を持たない信号</b>はどうすればよいでしょうか。ここでは、周期を無限に長くした極限として考えます。
    </p>
    <h3>周期をどんどん長くする</h3>
    <p>
      同じパルスの繰り返しの間隔だけを 2 倍、4 倍と伸ばしていくと、基本周波数
      <MathInline tex="1/T_0" /> が小さくなり、スペクトルの線の間隔が詰まっていきます。
    </p>
    <figure id="d-period" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>周期をどんどん長くする</span></div>
      <p class="try-line">
        周期を 1 → 2 → 4 → 8 → ∞ と伸ばし、線の間隔が詰まって破線の曲線に近づくのを見る
      </p>
      <div class="btns">
        <span class="t">周期 T₀：</span
        ><span class="seg" role="group" aria-label="周期"
          ><button type="button" data-t0="1">1 s</button
          ><button type="button" data-t0="2">2 s</button
          ><button type="button" data-t0="4">4 s</button
          ><button type="button" data-t0="8">8 s</button
          ><button type="button" data-t0="inf">∞</button></span
        >
      </div>
      <div class="plots2">
        <div class="plot h-240"><canvas data-c="a" /></div>
        <div class="plot h-240"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            左は幅 0.5 s のパルスを周期 T₀
            で繰り返した信号、右はそのフーリエ級数の係数です。周期を伸ばすと 1 本あたりの係数は 1/T₀
            に比例して小さくなるので、ここでは T₀
            倍して描いています。こうすると線の高さは破線の曲線に乗ったまま、間隔 1/T₀
            だけが詰まっていきます。周期が無限大の極限が、パルス 1 個のフーリエ変換（sinc
            関数）です。
          </p>
        </div>
      </details>
    </figure>
    <h3>フーリエ変換と逆変換</h3>
    <p>
      周期を無限大にすると、線の間隔が 0
      になって和が積分に変わり、スペクトルは周波数の連続関数になります。
    </p>
    <MathBlock
      tex="X(f) = \int_{-\infty}^{\infty} x(t)\,e^{-i2\pi f t}\,dt,\qquad x(t) = \int_{-\infty}^{\infty} X(f)\,e^{i2\pi f t}\,df"
    />
    <p>
      やっていることはフーリエ級数と同じで、<b
        >ものさし <MathInline tex="e^{-i2\pi f t}" /> を掛けて足し合わせる</b
      >だけです。ものさしの周波数 f
      を連続的に動かせるようになった点だけが違います。下の図は、この計算を「信号を回る矢印に巻き付けて、重心を見る」として描いたものです。
    </p>
    <figure id="d-wind" class="demo side">
      <div class="dh"><span class="pill">TRY</span><span>巻き付けて重心を見る</span></div>
      <p class="try-line">
        「巻き付け f を掃引」して、右のグラフの山が信号の周波数にだけ立つのを見る
      </p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-dw-fsig'">信号の f</label
          ><input
            :id="uid + '-dw-fsig'"
            type="range"
            data-p="fsig"
            min="1"
            max="5"
            step="0.5"
            value="3"
          /><output data-o="fsig" />
        </div>
        <div class="row">
          <label :for="uid + '-dw-fw'">巻き付け f</label
          ><input
            :id="uid + '-dw-fw'"
            type="range"
            data-p="fw"
            min="0"
            max="6"
            step="any"
            value="1.2"
          /><output data-o="fw" />
        </div>
        <div class="row">
          <label :for="uid + '-dw-t'">時刻 t</label
          ><input
            :id="uid + '-dw-t'"
            type="range"
            data-p="t"
            min="0"
            max="4"
            step="any"
            value="0.6"
          /><output data-o="t" />
        </div>
        <div class="btns">
          <button type="button" data-play="t">▶ 巻き付けを再生</button
          ><button type="button" data-play="fw">▶ 巻き付け f を掃引</button
          ><label class="ck"><input type="checkbox" data-p="dc" checked /> 直流 +1 を足す</label>
        </div>
      </div>
      <div class="plots-col">
        <div class="plots2">
          <div class="plot h-320"><canvas data-c="a" /></div>
          <div class="plot h-320"><canvas data-c="b" /></div>
        </div>
        <div class="plot h-180"><canvas data-c="c" /></div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p><b>見る順番</b>　下の信号 → 左の緑の矢印 → 左の黄緑の曲線 → 赤い矢印 → 右のグラフ。</p>
          <ul>
            <li><b>下の図</b>：元の信号 x(t)。緑の縦線の時刻 t での値 x(t) を使います。</li>
            <li>
              <b>緑の矢印</b>：x(t)·e<sup>−i2πft</sup>。長さが x(t)（負なら逆向き）で、向きは時刻 t
              とともに巻き付け周波数 f の速さで時計回りに回ります。「巻き付けを再生」で t
              を進めると、この矢印の先端が黄緑の曲線を描きます。
            </li>
            <li>
              <b>赤い矢印</b>：0〜4
              秒の曲線上の全点の平均（重心）。信号の周期と回転の周期がそろうと、x(t)
              の大きい時刻がいつも同じ向きに来るので、重心が原点から離れます。
            </li>
            <li>
              <b>右の図</b>：巻き付け周波数 f を 0〜6 Hz
              で変えたときの、赤い矢印の長さ。信号の周波数のところだけ山になります。これがフーリエ変換です。
            </li>
          </ul>
        </div>
      </details>
    </figure>
    <h3>重要なフーリエ変換対</h3>
    <ul>
      <li>
        <b>矩形パルス ⇔ sinc 関数</b
        >：上の「周期をどんどん長くする」の破線です。パルスが短いほど、sinc は横に広がります。
      </li>
      <li>
        <b>インパルス（デルタ関数） ⇔ 定数</b
        >：一瞬だけの信号は、すべての周波数を同じ強さで含みます。
      </li>
      <li><b>cos 波 ⇔ ±f の 2 本の線</b>：第 2 章の「+f と −f のペア」そのものです。</li>
    </ul>
  </section>
</template>
