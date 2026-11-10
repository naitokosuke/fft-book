<template>
  <header class="top hero">
    <div>
      <p class="eyebrow"><b>●</b> Interactive textbook · 13 chapters</p>
      <h1><span>FFT</span><br />教科書<small class="for">for ナイトウコウスケ</small></h1>
      <p class="lede">
        波を、周波数で見る。フーリエ級数からフーリエ変換、DFT、FFT、窓関数までを、1
        段ずつ動かせる図で確かめながら進みます。
      </p>
      <div class="cautions">
        <aside class="callout warn caution" aria-label="免責事項">
          <p>
            本書は、<a
              href="https://twitter.com/naitokosuke"
              target="_blank"
              rel="noopener noreferrer"
              >ナイトウコウスケ</a
            >が FFT を学習するために AI に作らせた教材です。
          </p>
        </aside>
        <aside class="callout warn caution" aria-label="参考にした資料">
          <p>
            本書の章立ては、東北大学の講義資料「<a
              href="https://www.ic.is.tohoku.ac.jp/~swk/lecture/yaruodsp/main.html"
              target="_blank"
              rel="noopener noreferrer"
              >やる夫で学ぶディジタル信号処理</a
            >」の流れを参考にしています。フィルタ設計、ラプラス変換、z
            変換など、この先の内容はそちらで学べます。
          </p>
        </aside>
      </div>
      <div class="formula">
        <span>X[k] = Σ<sub>n=0</sub><sup>N−1</sup> x[n]·e<sup>−i2πkn/N</sup></span>
        <span>f<sub>k</sub> = k·f<sub>s</sub>/N</span>
        <span>Δf = f<sub>s</sub>/N</span>
      </div>
    </div>
    <div class="hero-art" aria-label="3 つの正弦波と、その合計、スペクトルのアニメーション">
      <canvas id="heroCv" />
    </div>
  </header>
</template>
