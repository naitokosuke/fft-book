<template>
  <section id="ch8">
    <h2><span class="no">08</span><span class="ttl">4 種類のフーリエ変換のまとめ</span></h2>

    <p>
      ここまでに出てきた 4
      つの変換は、<b>時間が連続か離散か</b>と、<b>時間が周期的か非周期か</b>の組み合わせで並べると整理できます。
    </p>
    <figure id="d-four" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>4 種類のフーリエ変換</span></div>
      <p class="try-line">
        2
        つのボタンを切り替えて、時間の性質（離散・周期）が周波数の性質（周期・離散）に入れ替わるのを見る
      </p>
      <div class="btns">
        <button type="button" data-q="disc" class="tgl">時間を離散にする</button
        ><button type="button" data-q="per" class="tgl">時間を周期的にする</button>
      </div>
      <div class="plot h-520"><canvas data-c="a" /></div>
      <div class="read" data-o="read" />
    </figure>
    <ul>
      <li><b>時間が周期的 ⇔ 周波数が離散的</b>（フーリエ級数、DFT）</li>
      <li><b>時間が離散的 ⇔ 周波数が周期的</b>（DTFT、DFT）</li>
      <li>連続な変数は積分、離散な変数は和をとる。周期的なら 1 周期分、非周期なら全範囲で</li>
    </ul>
    <p>
      コンピュータで計算できるのは、時間も周波数も「離散かつ周期的（有限個）」な DFT
      だけです。実際の信号を DFT
      で解析するときに起きる現象（スペクトル漏れなど）は、すべてこの表の違いから説明できます。
    </p>
  </section>
</template>
