<script setup lang="ts">
import { useId } from "vue";
import MathBlock from "../components/MathBlock.vue";
import MathInline from "../components/MathInline.vue";

// Prefix for the form-control ids, so labels stay linked even if a chapter renders twice.
const uid = useId();
</script>

<template>
  <section id="ch2">
    <h2><span class="no">02</span><span class="ttl">複素指数関数型のフーリエ級数</span></h2>

    <h3>cos と sin を重ねる意味</h3>
    <p>
      第 1 章では、1 つの周波数に cos と sin の 2 つの係数が必要でした。加法定理を使うと、この 2
      つは<b>振幅と位相を持つ 1 つの波</b>にまとまります。
    </p>
    <MathBlock
      tex="a\cos\Omega t + b\sin\Omega t = A\cos(\Omega t + \varphi),\qquad A = \sqrt{a^2+b^2},\ \ \varphi = -\arctan\frac{b}{a}"
    />
    <p>
      第 1 章の最後の図の左下の矢印がこれです。横に <MathInline tex="a" />、縦に
      <MathInline tex="-b" />
      をとった矢印の<b>長さが振幅、向きが位相</b>になっていました。ただ、位相が cos
      の中に入った形は計算で扱いにくいので、矢印そのものを 1 つの数として扱う方法を考えます。
    </p>
    <h3>複素数と、回転する矢印 <MathInline tex="e^{i\theta}" /></h3>
    <p>
      横と縦の 2 つの数をまとめて 1
      つの数として扱えるのが<b>複素数</b>です（横が実部、縦が虚部）。長さ 1、角度 θ
      の矢印は、オイラーの公式で次のように書きます。
    </p>
    <MathBlock tex="e^{i\theta} = \cos\theta + i\sin\theta" />
    <p>
      θ を <MathInline tex="\Omega t" /> とすれば、<MathInline tex="e^{i\Omega t}" /> は 1 秒に
      <MathInline tex="\Omega/2\pi" /> 回、反時計回りに回る矢印です。横の位置が cos、縦の位置が sin
      です。そして cos の波は、<b>反対向きに回る 2 本の矢印の和</b>で書けます。
    </p>
    <MathBlock
      tex="\cos(\Omega t + \varphi) = \frac{1}{2}e^{i\varphi}e^{i\Omega t} + \frac{1}{2}e^{-i\varphi}e^{-i\Omega t}"
    />
    <p>
      2 本の虚部は <MathInline tex="+\tfrac12\sin\theta" /> と
      <MathInline tex="-\tfrac12\sin\theta" /> で打ち消し合い、和は実軸の上だけを動きます。
    </p>
    <figure id="d-phasor" class="demo side">
      <div class="dh"><span class="pill">TRY</span><span>回転ベクトルと余弦波</span></div>
      <p class="try-line">「再生」して、2 本の矢印の和（赤い点）が実軸の上だけを動くのを見る</p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-dp-f'">周波数 f</label
          ><input
            :id="uid + '-dp-f'"
            type="range"
            data-p="f"
            min="0.25"
            max="3"
            step="0.05"
            value="1"
          /><output data-o="f" />
        </div>
        <div class="row">
          <label :for="uid + '-dp-ph'">位相 φ</label
          ><input
            :id="uid + '-dp-ph'"
            type="range"
            data-p="ph"
            min="-180"
            max="180"
            step="1"
            value="0"
          /><output data-o="ph" />
        </div>
        <div class="row">
          <label :for="uid + '-dp-t'">時刻 t</label
          ><input
            :id="uid + '-dp-t'"
            type="range"
            data-p="t"
            min="0"
            max="10"
            step="any"
            value="0.1"
          /><output data-o="t" />
        </div>
        <div class="btns">
          <button type="button" data-play>▶ 再生</button
          ><span class="seg" role="group" aria-label="表示"
            ><button type="button" data-mode="one">1 本：e<sup>iθ</sup></button
            ><button type="button" data-mode="two">2 本に分ける</button></span
          >
        </div>
      </div>
      <div class="plot h-600"><canvas data-c="a" /></div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            <b>操作</b>　「再生」で時間が進みます。上の円の中をドラッグすると角度 θ
            を直接変えられます。
          </p>
          <ul>
            <li>
              <b>黄緑の矢印 ½e<sup>iθ</sup></b
              >：原点から出て、角度 θ の向きに長さ ½。時間とともに反時計回りに回ります。
            </li>
            <li>
              <b>緑の矢印 ½e<sup>−iθ</sup></b
              >：黄緑の矢印の先から出て、角度 −θ の向きに長さ ½。同じ速さで時計回りに回ります。
            </li>
            <li>
              2 本の上下方向の成分は +½sin θ と −½sin θ
              なので打ち消し合います。そのため緑の矢印の先（<b>赤い点</b>）は必ず実軸の上に来て、その横位置が
              cos θ になります。
            </li>
            <li>
              <b>下の波形</b
              >：赤い点の横位置を、時間とともに下へ流して記録した跡です。一番上が今の値で、下に行くほど過去（最大
              2 秒前）です。こうして記録した跡がちょうど cos(2πft+φ) の波形になります。
            </li>
          </ul>
          <p>
            「1 本」に切り替えると、長さ 1 の e<sup>iθ</sup>
            を描き、その先端から実軸へ真下におろした位置（実部 cos θ）を赤い点で示します。
          </p>
        </div>
      </details>
    </figure>
    <h3>複素指数関数型のフーリエ級数</h3>
    <p>
      第 1 章のフーリエ級数の cos と sin を、すべてこの 2
      本の矢印に書き直します。正の向き（<MathInline tex="k>0" />）と負の向き（<MathInline
        tex="k&lt;0"
      />）、定数（<MathInline tex="k=0" />）をまとめると、1 本の式になります。
    </p>
    <MathBlock
      tex="x(t) = \sum_{k=-\infty}^{\infty} F_k\, e^{ik\Omega_0 t},\qquad F_k = \overline{x(t)\,e^{-ik\Omega_0 t}}"
    />
    <p>
      係数 <MathInline tex="F_k" /> の求め方も第 1 章と同じ「掛けて平均」です。違いは、ものさしが
      <MathInline tex="e^{-ik\Omega_0 t} = \cos k\Omega_0 t - i\sin k\Omega_0 t" />
      になったことだけです。
    </p>
    <div class="callout">
      <span class="t">ここがポイント</span>
      <p>
        複素指数関数 <MathInline tex="e^{-ik\Omega_0 t}" /> は、<b
          >cos と sin の 2 本のものさしを 1 本にまとめたもの</b
        >です。結果の
        <MathInline tex="F_k" /> は矢印（複素数）で、長さが振幅、向きが位相をそのまま表します。
      </p>
    </div>
    <h3>正と負の周波数</h3>
    <p>
      <MathInline tex="k" />
      が負の項は、逆向き（時計回り）に回る矢印です。実数の信号では虚部が打ち消し合う必要があるので、<MathInline
        tex="+k"
      />
      と <MathInline tex="-k" /> の矢印は<b>同じ長さで、向きが逆</b>のペアになります（<MathInline
        tex="F_{-k} = \overline{F_k}"
      />）。
    </p>
    <figure id="d-twoside" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>+f と −f のペア</span></div>
      <p class="try-line">「複素数」に切り替えて、−f の線が消えると赤い点が円を回り出すのを見る</p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-dt-f'">周波数 f</label
          ><input
            :id="uid + '-dt-f'"
            type="range"
            data-p="f"
            min="0.5"
            max="3"
            step="0.5"
            value="1"
          /><output data-o="f" />
        </div>
        <div class="row">
          <label :for="uid + '-dt-A'">振幅 A</label
          ><input
            :id="uid + '-dt-A'"
            type="range"
            data-p="A"
            min="0.2"
            max="1.5"
            step="0.01"
            value="1"
          /><output data-o="A" />
        </div>
        <div class="row">
          <label :for="uid + '-dt-ph'">位相 φ</label
          ><input
            :id="uid + '-dt-ph'"
            type="range"
            data-p="ph"
            min="-180"
            max="180"
            step="5"
            value="30"
          /><output data-o="ph" />
        </div>
        <div class="row">
          <label :for="uid + '-dt-t'">時刻 t</label
          ><input
            :id="uid + '-dt-t'"
            type="range"
            data-p="t"
            min="0"
            max="10"
            step="any"
            value="0.15"
          /><output data-o="t" />
        </div>
        <div class="btns">
          <button type="button" data-play>▶ 再生</button
          ><span class="seg" role="group" aria-label="信号の種類"
            ><button type="button" data-mode="real">実数 A·cos</button
            ><button type="button" data-mode="cplx">複素数 A·e<sup>iθ</sup></button></span
          >
        </div>
      </div>
      <div class="plots2">
        <div class="plot h-320"><canvas data-c="a" /></div>
        <div class="plot h-320"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            <b>左</b>：黄緑が +f（反時計回り）、緑が −f（時計回り）の矢印で、赤い点が 2
            本の和です。<b>右</b>：同じ 2
            本を周波数軸に並べたスペクトルで、横の位置が回る速さと向き、高さが矢印の長さです。「実数
            A·cos」では 2 本が同じ長さ A/2 で、赤い点は実軸の上を往復するだけです。「複素数
            A·e<sup>iθ</sup>」に切り替えると −f の矢印が消え、+f の矢印が長さ A
            になって、赤い点は円を回り続けます。これは実数ではありません。
          </p>
        </div>
      </details>
    </figure>
    <p>
      <MathInline tex="|F_k|" /> を周波数ごとに並べたものを<b>振幅スペクトル</b>、<MathInline
        tex="\angle F_k"
      />
      を<b>位相スペクトル</b>、<MathInline tex="|F_k|^2" />
      を<b>パワースペクトル</b>と呼びます。実数の信号では <MathInline tex="-k" /> 側は
      <MathInline tex="+k" /> 側の鏡写しなので、普段は正の側だけを高さ 2
      倍にして描きます（<b>片側スペクトル</b>）。
    </p>
  </section>
</template>
