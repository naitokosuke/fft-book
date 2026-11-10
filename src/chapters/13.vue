<template>
  <section id="ch13">
    <h2><span class="no">13</span><span class="ttl">用語集</span></h2>
    <dl class="gloss">
      <dt>サンプリング周波数 f<sub>s</sub></dt>
      <dd>1 秒あたりに取るサンプルの数。単位は Hz。</dd>
      <dt>ナイキスト周波数</dt>
      <dd>f<sub>s</sub>/2。サンプリングで正しく表せる周波数の上限。</dd>
      <dt>ビン</dt>
      <dd>DFT の出力の 1 つ 1 つ。ビン k は周波数 k·f<sub>s</sub>/N に対応する。</dd>
      <dt>周波数分解能 Δf</dt>
      <dd>ビンの間隔 f<sub>s</sub>/N = 1/T。観測時間が長いほど細かい。</dd>
      <dt>エイリアシング</dt>
      <dd>f<sub>s</sub>/2 を超える周波数が、低い周波数に化けて見える現象。</dd>
      <dt>スペクトル漏れ</dt>
      <dd>観測区間に周期が整数個入らないことで、ピークが周囲のビンに広がる現象。</dd>
      <dt>窓関数</dt>
      <dd>データの両端をなめらかに 0 に近づける重み。漏れを抑える。</dd>
      <dt>メインローブ / サイドローブ</dt>
      <dd>窓のスペクトルの中央の山と、その周りの小さな山。</dd>
      <dt>ゼロ詰め</dt>
      <dd>データの後ろに 0 を足して FFT の点数を増やすこと。スペクトルを補間する。</dd>
      <dt>回転因子</dt>
      <dd>FFT で掛ける複素数 W<sub>N</sub><sup>k</sup> = e<sup>−i2πk/N</sup>。</dd>
      <dt>バタフライ</dt>
      <dd>FFT の基本演算。2 つの入力から和と差を作る。</dd>
      <dt>ENBW</dt>
      <dd>等価雑音帯域幅。窓を掛けたときに 1 ビンが拾うノイズの量をビン数で表したもの。</dd>
      <dt>STFT</dt>
      <dd>短時間フーリエ変換。区間をずらしながら FFT を繰り返し、周波数の時間変化を見る方法。</dd>
    </dl>
  </section>
</template>
