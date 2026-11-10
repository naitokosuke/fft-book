<script setup lang="ts">
import { useId } from "vue";
import MathBlock from "../components/MathBlock.vue";
import MathInline from "../components/MathInline.vue";

// Prefix for the form-control ids, so labels stay linked even if a chapter renders twice.
const uid = useId();
</script>

<template>
  <section id="ch5">
    <h2><span class="no">05</span><span class="ttl">離散時間フーリエ変換（DTFT）</span></h2>

    <h3>離散時間信号をフーリエ変換するには</h3>
    <p>
      フーリエ変換の積分を、サンプルのある時刻だけの和に置き換えます。ものさし
      <MathInline tex="e^{-i\omega n}" /> を各サンプルに掛けて足すのは、これまでと同じです。
    </p>
    <MathBlock tex="X(\omega) = \sum_{n=-\infty}^{\infty} x[n]\,e^{-i\omega n}" />
    <p>
      これを<b>離散時間フーリエ変換（DTFT）</b>と呼びます。結果は
      <MathInline tex="\omega" /> の連続関数です。
    </p>
    <h3>DTFT は周期 2π で繰り返す</h3>
    <p>
      第 4 章で見たとおり、<MathInline tex="\omega" /> と
      <MathInline tex="\omega+2\pi" /> の波はサンプルの上では区別できません。そのため DTFT も
      <b><MathInline tex="2\pi" /> ごとに同じ形を繰り返します</b
      >。時間を離散にすると、周波数が周期的になるのです。
    </p>
    <figure id="d-dtft" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>有限長の数列とその DTFT</span></div>
      <p class="try-line">ω を −3π〜3π まで見て、同じ形が 2π ごとに繰り返されるのを確かめる</p>
      <div class="dc">
        <div class="sel">
          <label :for="uid + '-d-dtft-kind'">信号</label
          ><select :id="uid + '-d-dtft-kind'" data-p="kind">
            <option value="rect" selected>矩形パルス</option>
            <option value="cos">cos 波 × なめらかな窓</option>
          </select>
        </div>
        <div class="row">
          <label :for="uid + '-d-dtft-L'">パルスの長さ</label
          ><input
            :id="uid + '-d-dtft-L'"
            type="range"
            data-p="L"
            min="1"
            max="16"
            step="1"
            value="4"
          /><output data-o="L" />
        </div>
      </div>
      <div class="plots2">
        <div class="plot h-240"><canvas data-c="a" /></div>
        <div class="plot h-240"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
    </figure>
    <p>
      逆変換は、1 周期分（<MathInline tex="-\pi" />〜<MathInline tex="\pi" />）の積分になります。
    </p>
    <MathBlock tex="x[n] = \frac{1}{2\pi}\int_{-\pi}^{\pi} X(\omega)\,e^{i\omega n}\,d\omega" />
  </section>
</template>
