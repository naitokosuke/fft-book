<script setup lang="ts">
import MathBlock from "../components/MathBlock.vue";
import MathInline from "../components/MathInline.vue";
</script>

<template>
  <section id="ch7">
    <h2><span class="no">07</span><span class="ttl">高速フーリエ変換（FFT）</span></h2>

    <p>
      DFT を式どおり計算すると、N 個のビンそれぞれで N 回の掛け算が必要で、計算量は
      <MathInline tex="N^2" /> に比例します。<b>FFT</b> は、同じ結果を
      <MathInline tex="N\log_2 N" /> に比例する計算量で求める方法です。DFT
      の近似ではなく、まったく同じ値を速く計算します。
    </p>
    <h3>偶数番目と奇数番目に分ける</h3>
    <p>
      N が 2 のべき乗のとき、サンプルを偶数番目と奇数番目に分けると、N 点の DFT は N/2 点の DFT 2
      つに分かれます。回転因子を <MathInline tex="W_N = e^{-i2\pi/N}" /> と書くと、
    </p>
    <MathBlock tex="X[k] = E[k] + W_N^k\,O[k],\qquad X[k+N/2] = E[k] - W_N^k\,O[k]" />
    <p>
      のように、1 回の掛け算から 2 つの出力が得られます。この 2 入力 2
      出力の演算を<b>バタフライ</b>と呼びます。分割を繰り返すと、<MathInline tex="\log_2 N" />
      段、各段 N/2 個のバタフライで計算が終わります。入力の並び順は、添字を 2
      進数で表して<b>ビットを逆順</b>にした順番になります。
    </p>
    <figure id="d-bfly" class="demo">
      <div class="dh">
        <span class="pill">TRY</span><span>バタフライ演算を 1 段ずつ進める</span>
      </div>
      <p class="try-line">段を 0 → 3 と進めて、X[1] と X[7] に 4 が現れるのを見る</p>
      <div class="dc">
        <div class="row">
          <label for="db-s">段</label
          ><input id="db-s" type="range" data-p="s" min="0" max="3" step="1" value="0" /><output
            data-o="s"
          />
        </div>
        <div class="sel">
          <label for="db-sig">入力</label
          ><select id="db-sig" data-p="sig">
            <option value="imp">インパルス</option>
            <option value="dc">定数 1</option>
            <option value="c1" selected>cos(2πn/8)</option>
            <option value="alt">交互 ±1</option>
            <option value="ramp">0,1,2,…,7</option>
          </select>
        </div>
      </div>
      <div class="fig">
        <svg viewBox="0 0 740 500" role="img" aria-label="8点FFTのバタフライ図" />
      </div>
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            左端の入力はビット反転順に並べてあります。段を進めると、その段のバタフライ（赤の線）で計算した途中の値が各点に表示されます。赤の
            W は下側の入力に掛ける回転因子 W<sub>8</sub><sup>k</sup> = e<sup>−i2πk/8</sup> です。3
            段目で右端に X[k] が並びます。「cos(2πn/8)」では X[1] と X[7] だけが 4 になります。
          </p>
        </div>
      </details>
    </figure>
    <figure id="d-ops" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>計算量の差</span></div>
      <p class="try-line">N を大きくして、DFT と FFT の棒の差が開いていくのを見る</p>
      <div class="dc">
        <div class="row">
          <label for="do-p">N = 2^p</label
          ><input id="do-p" type="range" data-p="p" min="3" max="24" step="1" value="10" /><output
            data-o="p"
          />
        </div>
      </div>
      <div class="plot" style="--h: 124px"><canvas data-c="a" /></div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            横軸は掛け算の回数の桁数（対数目盛り）です。N = 2<sup>20</sup>（約 100 万点）では、DFT
            は 1 兆回を超えますが FFT は約 2000 万回で済みます。
          </p>
        </div>
      </details>
    </figure>
    <details class="ref">
      <summary>具体的な回数（表）</summary>
      <div class="tbl">
        <table>
          <thead>
            <tr>
              <th>N</th>
              <th>DFT（N²）</th>
              <th>FFT（N log₂N）</th>
              <th>速度比</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>256</td>
              <td>65,536</td>
              <td>2,048</td>
              <td>32 倍</td>
            </tr>
            <tr>
              <td>1,024</td>
              <td>1,048,576</td>
              <td>10,240</td>
              <td>102 倍</td>
            </tr>
            <tr>
              <td>65,536</td>
              <td>約 43 億</td>
              <td>1,048,576</td>
              <td>4,096 倍</td>
            </tr>
            <tr>
              <td>1,048,576</td>
              <td>約 1.1 兆</td>
              <td>約 2,100 万</td>
              <td>52,429 倍</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>
