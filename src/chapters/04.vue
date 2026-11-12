<script setup lang="ts">
import { useId } from "vue";
import MathBlock from "../components/MathBlock.vue";
import MathInline from "../components/MathInline.vue";

// Prefix for the form-control ids, so labels stay linked even if a chapter renders twice.
const uid = useId();
</script>

<template>
  <section id="ch4">
    <h2><span class="no">04</span><span class="ttl">離散時間信号</span></h2>

    <p>
      ここからはコンピュータで扱う話です。コンピュータは連続した波形をそのまま持てないので、一定の時間間隔
      <MathInline tex="T_s" /> ごとに値を読み取ります（<b>サンプリング</b>）。1 秒あたりのサンプル数
      <MathInline tex="f_s = 1/T_s" /> を<b>サンプリング周波数</b>と呼びます。
    </p>
    <h3>離散時間信号の表し方</h3>
    <p>
      時刻を <MathInline tex="T_s" /> で割って、サンプルの番号 <MathInline tex="n" /> で表します。
    </p>
    <MathBlock tex="x[n] = x(nT_s),\qquad n = 0, 1, 2, \dots" />
    <h3>正規化角周波数</h3>
    <p>
      時間を「サンプル番号」で数えるなら、周波数も「<b>1 サンプルあたりに進む位相</b
      >」で測るのが自然です。これを<b>正規化角周波数</b> <MathInline tex="\omega" /> と呼びます。
    </p>
    <MathBlock tex="\omega = 2\pi\frac{f}{f_s}\quad\text{[rad/サンプル]}" />
    <h3>離散時間信号の不思議な性質</h3>
    <p>
      <MathInline tex="\omega" /> を
      <MathInline tex="2\pi" /> 増やしても、サンプルの値はまったく変わりません。<MathInline
        tex="\cos((\omega+2\pi)n) = \cos(\omega n + 2\pi n) = \cos(\omega n)"
      />
      だからです。そのため離散時間では、<b
        ><MathInline tex="-\pi" /> 〜 <MathInline tex="\pi" />（周波数で言えば
        <MathInline tex="-f_s/2" /> 〜 <MathInline tex="f_s/2" />）の範囲しか区別できません</b
      >。<MathInline tex="\omega=\pi" />
      が最も速い振動で、それを超えると遅い波に見えてしまいます。これが<b>エイリアシング</b>です。
    </p>
    <figure id="d-alias" class="demo side">
      <div class="dh"><span class="pill">TRY</span><span>エイリアシング</span></div>
      <p class="try-line">f を少しずつ上げて、緑のピンが帯の端で引き返すのを見る</p>
      <div class="dc">
        <div class="row">
          <label :id="uid + '-da-f-label'" :for="uid + '-da-f'">信号 f</label
          ><input
            :id="uid + '-da-f'"
            type="range"
            data-p="f"
            min="0"
            max="25"
            step="1"
            value="7"
          /><output :for="uid + '-da-f'" :aria-labelledby="uid + '-da-f-label'" data-o="f" />
        </div>
        <div class="row">
          <label :id="uid + '-da-fs-label'" :for="uid + '-da-fs'">f<sub>s</sub></label
          ><input
            :id="uid + '-da-fs'"
            type="range"
            data-p="fs"
            min="4"
            max="30"
            step="1"
            value="10"
          /><output :for="uid + '-da-fs'" :aria-labelledby="uid + '-da-fs-label'" data-o="fs" />
        </div>
      </div>
      <div class="plots-col">
        <div class="legend">
          <span><i class="bg-muted" />連続信号</span><span><i class="bg-trace2" />サンプル</span
          ><span><i class="bg-trace3" />サンプルから見える波</span>
        </div>
        <div class="plot h-220"><canvas data-c="a" /></div>
        <div class="plot h-260"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            f と f<sub>s</sub> は 1 Hz 刻みなので、1
            秒の表示には元の波・見える波・サンプルのどれもちょうど整数周期で収まります。下の数直線は周波数軸です。黄緑の帯が、このサンプリング周波数で表せる範囲（0〜f<sub>s</sub>/2）です。帯の外にある元の周波数（赤のピン）は、f<sub
              >s</sub
            >
            の整数倍だけずらすか、f<sub>s</sub>/2・3f<sub>s</sub>/2 …
            を軸に鏡写しにした位置に移り、帯の中の周波数（緑のピン）として見えます。どちらの操作だったかは、数直線の下に表示されます。f
            を 0 から少しずつ上げて、f<sub>s</sub>/2
            を超えたところで緑の点が逆向きに戻り始めるのを確かめてください。
          </p>
        </div>
      </details>
    </figure>
  </section>
</template>
