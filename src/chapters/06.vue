<script setup lang="ts">
import MathBlock from "../components/MathBlock.vue";
import MathInline from "../components/MathInline.vue";
</script>

<template>
  <section id="ch6">
    <h2><span class="no">06</span><span class="ttl">離散フーリエ変換（DFT）</span></h2>

    <h3>DTFT の困るところ</h3>
    <p>
      DTFT は時間こそ離散ですが、周波数
      <MathInline tex="\omega" />
      は連続のままです。連続な関数はコンピュータでは有限個の数で持てず、逆変換の積分も厳密には計算できません。<b>周波数も離散にしたい</b>のです。
    </p>
    <h3>周波数を離散にする</h3>
    <p>
      第 3 章で見たように、時間が周期的なら周波数は離散的（とびとびの線）になります。そこで、N
      点の信号を<b>周期 N で繰り返すもの</b>とみなします。すると周波数は
      <MathInline tex="2\pi/N" /> おきの N 点だけになり、時間も周波数も N
      個の数で表せます。これは、DTFT の曲線を <MathInline tex="2\pi/N" /> おきに N
      点だけ取り出すことと同じです。
    </p>
    <figure id="d-dtft2" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>DTFT の曲線を N 点で標本化する</span></div>
      <p class="try-line">
        N を 16
        から増やし、赤い点（DFT）が曲線を細かくなぞるようになるのを見る。そのとき上の図では、信号が周期
        N で繰り返されたものとして扱われている
      </p>
      <div class="dc">
        <div class="sel">
          <label for="d-dtft2-kind">信号</label
          ><select id="d-dtft2-kind" data-p="kind">
            <option value="rect" selected>矩形パルス</option>
            <option value="cos">cos 波 × なめらかな窓</option>
          </select>
        </div>
        <div class="row">
          <label for="d-dtft2-L">パルスの長さ</label
          ><input
            id="d-dtft2-L"
            type="range"
            data-p="L"
            min="1"
            max="16"
            step="1"
            value="4"
          /><output data-o="L" />
        </div>
        <div class="row">
          <label for="d-dtft2-N">DFT の点数 N</label
          ><input
            id="d-dtft2-N"
            type="range"
            data-p="N"
            min="16"
            max="48"
            step="1"
            value="16"
          /><output data-o="N" />
        </div>
      </div>
      <div class="plots2">
        <div class="plot" style="--h: 240px"><canvas data-c="a" /></div>
        <div class="plot" style="--h: 240px"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
    </figure>
    <h3>DFT と逆 DFT</h3>
    <MathBlock
      tex="X[k] = \sum_{n=0}^{N-1} x[n]\,e^{-i2\pi k n/N},\qquad x[n] = \frac{1}{N}\sum_{k=0}^{N-1} X[k]\,e^{i2\pi k n/N}"
    />
    <p>
      <MathInline tex="k" /> を<b>ビン</b>と呼びます。ビン <MathInline tex="k" /> は周波数
      <MathInline tex="f_k = k f_s/N" /> に対応し、<MathInline tex="k=N/2" /> がナイキスト周波数
      <MathInline tex="f_s/2" /> です。<MathInline tex="k>N/2" /> のビンは負の周波数
      <MathInline tex="(k-N)f_s/N" /> を表します（DFT の結果も周期 N で繰り返すため）。
    </p>
    <figure id="d-hand" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>8 点の DFT を手で計算する</span></div>
      <p class="try-line">左の棒を上下にドラッグして信号を描き、右の |X[k]| が変わるのを見る</p>
      <div class="dc">
        <div class="row">
          <label for="dh-k">ビン k</label
          ><input id="dh-k" type="range" data-p="k" min="0" max="7" step="1" value="1" /><output
            data-o="k"
          />
        </div>
        <div class="btns">
          <span class="t">信号：</span><button type="button" data-sig="imp">インパルス</button
          ><button type="button" data-sig="dc">定数</button
          ><button type="button" data-sig="c1">cos (k=1)</button
          ><button type="button" data-sig="c2">cos (k=2)</button
          ><button type="button" data-sig="alt">交互 ±1</button
          ><button type="button" data-sig="rnd">ランダム</button>
        </div>
      </div>
      <div class="legend">
        <span><i style="background: var(--trace2)" />x[n]（上下にドラッグ）</span
        ><span><i style="background: var(--accent)" />cos(2πkn/8)</span
        ><span><i style="background: var(--trace3)" />−sin(2πkn/8)</span>
      </div>
      <div class="plots2">
        <div class="plot" style="--h: 230px"><canvas data-c="a" /></div>
        <div class="plot" style="--h: 230px"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            X[k] の実部は、x[n] と黄緑の cos の値を点ごとに掛けて足したもの、虚部は緑の −sin
            と掛けて足したものです。左の棒をドラッグして信号を変えると、右の |X[k]|
            がすぐに更新されます。「cos (k=1)」では k=1 と k=7 の 2 本が立ちます（k=7 は負の周波数
            −1 に当たります）。「インパルス」はすべての周波数を同じ強さで含みます。
          </p>
        </div>
      </details>
    </figure>
    <p>
      DFT も「ものさしを掛けて足す」計算そのものです。ビン k
      ごとに、信号を回転に巻き付けて重心を見ると次のようになります。
    </p>
    <figure id="d-dwind" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>DFT のビンごとの巻き付け</span></div>
      <p class="try-line">
        「k を 0 から順に動かす」で、k = 5 と 12 のときだけ重心が飛び出すのを見る
      </p>
      <div class="dc">
        <div class="sel">
          <label for="dk-sig">信号</label
          ><select id="dk-sig" data-p="sig">
            <option value="two" selected>50 Hz + 120 Hz</option>
            <option value="one">50 Hz だけ</option>
            <option value="noisy">50 Hz + 120 Hz + ノイズ</option>
          </select>
        </div>
        <div class="row">
          <label for="dk-k">ビン k</label
          ><input id="dk-k" type="range" data-p="k" min="0" max="32" step="any" value="3" /><output
            data-o="k"
          />
        </div>
        <div class="btns"><button type="button" data-play>▶ k を 0 から順に動かす</button></div>
      </div>
      <div class="plots2">
        <div class="plot" style="--h: 320px"><canvas data-c="a" /></div>
        <div class="plot" style="--h: 320px"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            N = 64 点、f<sub>s</sub> = 640 Hz（Δf = 10 Hz）の信号です。左は、ビン k の回転 e<sup
              >−i2πkn/N</sup
            >
            で 64 個のサンプルを巻き付けた点と、その重心です。右は同じ信号の |X[k]|/N
            で、赤い縦線が今の k です。k = 5（50 Hz）と k = 12（120
            Hz）でだけ重心が原点から離れ、その長さが右の棒の高さと一致します。
          </p>
        </div>
      </details>
    </figure>
  </section>
</template>
