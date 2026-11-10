<script setup lang="ts">
import { useId } from "vue";
import MathBlock from "../components/MathBlock.vue";
import MathInline from "../components/MathInline.vue";

// Prefix for the form-control ids, so labels stay linked even if a chapter renders twice.
const uid = useId();
</script>

<template>
  <section id="ch11">
    <h2><span class="no">11</span><span class="ttl">スペクトル解析と窓関数</span></h2>

    <h3>DFT でスペクトルを読む</h3>
    <p>
      実際の解析では、DFT の結果を次のように読みます。振幅 A の正弦波がビンにぴったり乗っているとき
      <MathInline tex="|X[k]| = AN/2" /> なので、片側スペクトルの振幅は
      <MathInline tex="2|X[k]|/N" />
      で求めます。大小の差が大きい信号は<b>デシベル（dB）</b>で表示します。
    </p>
    <MathBlock tex="L = 20\log_{10}\frac{A}{A_{\mathrm{ref}}}\ \text{[dB]}" />
    <figure id="d-db" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>dB の目盛り</span></div>
      <p class="try-line">振幅比を動かして、10 倍ごとに 20 dB ずつ変わるのを見る</p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-dd-e'">振幅比</label
          ><input
            :id="uid + '-dd-e'"
            type="range"
            data-p="e"
            min="-5"
            max="1"
            step="0.01"
            value="-1"
          /><output data-o="e" />
        </div>
      </div>
      <div class="plot h-100"><canvas data-c="a" /></div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div><p>振幅が 1/10 になるごとに −20 dB 下がります。1/2 はおよそ −6 dB です。</p></div>
      </details>
    </figure>
    <figure id="d-noise" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>ノイズ床と観測点数</span></div>
      <p class="try-line">N を大きくして、信号のピークはそのままノイズ床だけが下がるのを見る</p>
      <div class="dc">
        <div class="sel">
          <label :for="uid + '-dn-N'">点数 N</label
          ><select :id="uid + '-dn-N'" data-p="N">
            <option value="64">64</option>
            <option value="256" selected>256</option>
            <option value="1024">1024</option>
            <option value="4096">4096</option>
            <option value="16384">16384</option>
          </select>
        </div>
        <div class="row">
          <label :for="uid + '-dn-A'">信号の振幅</label
          ><input
            :id="uid + '-dn-A'"
            type="range"
            data-p="A"
            min="0.01"
            max="1"
            step="0.01"
            value="0.1"
          /><output data-o="A" />
        </div>
      </div>
      <div class="legend">
        <span><i class="bg-accent" />スペクトル</span
        ><span><i class="bg-trace3" />ノイズ床（中央値）</span
        ><span><i class="bg-trace2" />125 Hz の信号</span>
      </div>
      <div class="plot h-230"><canvas data-c="a" /></div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            標準偏差 1 の白色ノイズに 125 Hz の余弦波を加え、ハン窓で解析しています。N を 4
            倍にするごとにノイズ床は約 6 dB 下がり、信号のピークの高さは変わりません。振幅 0.03
            の信号も、N を大きくすれば見つけられます。
          </p>
        </div>
      </details>
    </figure>
    <h3>有限区間の切り出しとスペクトル漏れ</h3>
    <p>
      DFT は N 点のデータを<b>周期 N で繰り返すもの</b>とみなします（第 6 章）。信号の周期が N
      点にちょうど整数個入っていれば繰り返しのつなぎ目はなめらかですが、そうでなければ段差ができ、ピークが周囲のビンに広がります。これが<b>スペクトル漏れ</b>です。有限区間で切り出すことは、矩形の窓を掛けることと同じで、周波数領域では窓の
      sinc がたたみこまれます（第 3 章・第 9 章）。
    </p>
    <figure id="d-leak" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>スペクトル漏れと窓</span></div>
      <p class="try-line">ずれを 0 から 0.5 へ動かし、裾が一気に持ち上がるのを見る</p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-dl-dl'">ビンからのずれ</label
          ><input
            :id="uid + '-dl-dl'"
            type="range"
            data-p="dl"
            min="0"
            max="1"
            step="0.01"
            value="0.5"
          /><output data-o="dl" />
        </div>
        <div class="sel">
          <label :for="uid + '-dl-win'">窓関数</label
          ><select :id="uid + '-dl-win'" data-p="win">
            <option value="rect" selected>矩形</option>
            <option value="hann">ハン</option>
            <option value="hamming">ハミング</option>
            <option value="blackman">ブラックマン</option>
            <option value="flattop">フラットトップ</option>
          </select>
        </div>
      </div>
      <div class="legend">
        <span><i class="bg-trace2" />DFT のビン</span
        ><span><i class="bg-accent" />本当のスペクトル</span
        ><span><i class="bg-trace3" />窓 w[n]</span>
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
            N = 32 点の余弦波を、ビン 8 から「ずれ」だけ離れた周波数で作っています。ずれが 0
            なら、矩形窓でもビン 8 以外はすべて 0 になります（ビンが sinc
            の零点に当たるため）。ずれを 0.5
            にすると、赤の棒が裾の上に乗り、漏れが一気に増えます。窓を切り替えて、裾の高さとピークの太さがどう変わるかを比べてください。
          </p>
        </div>
      </details>
    </figure>
    <h3>窓関数</h3>
    <p>
      データの両端をなめらかに 0 に近づける重み
      <MathInline tex="w[n]" />
      を掛けると、つなぎ目の段差が消え、裾（サイドローブ）が大きく下がります。代わりにピーク（メインローブ）が太くなり、近い周波数どうしを分けにくくなります。
    </p>
    <figure id="d-wins" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>窓関数を見比べる</span></div>
      <p class="try-line">窓の名前にカーソルを置いて、形（左）とスペクトルの裾（右）を見比べる</p>
      <div class="wins">
        <button type="button" data-win="rect"><i class="bg-ink" />矩形</button
        ><button type="button" data-win="hann"><i class="bg-accent" />ハン</button
        ><button type="button" data-win="hamming"><i class="bg-accent2" />ハミング</button
        ><button type="button" data-win="blackman"><i class="bg-trace3" />ブラックマン</button
        ><button type="button" data-win="flattop"><i class="bg-trace2" />フラットトップ</button>
      </div>
      <div class="plots2">
        <div class="plot h-260"><canvas data-c="a" /></div>
        <div class="plot h-260"><canvas data-c="b" /></div>
      </div>
      <div class="kv" data-o="kv" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            左は窓の形
            w[n]、右はその窓で切り出した正弦波のスペクトル（中心が本当の周波数）です。両端をなめらかに
            0
            へ絞る窓ほど、右の裾（サイドローブ）は低くなり、中央の山（メインローブ）は太くなります。点線は、選んだ窓のメインローブの幅と最大サイドローブの高さです。
          </p>
        </div>
      </details>
    </figure>
    <details class="ref">
      <summary>数値で比べる（表）</summary>
      <div class="tbl">
        <table>
          <thead>
            <tr>
              <th>窓</th>
              <th>メインローブ幅</th>
              <th>最大サイドローブ</th>
              <th>裾の減衰</th>
              <th>ENBW</th>
              <th>スカロップ損失</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>矩形</td>
              <td>2 ビン</td>
              <td>−13 dB</td>
              <td>−6 dB/oct</td>
              <td>1.00</td>
              <td>3.92 dB</td>
            </tr>
            <tr>
              <td>ハン</td>
              <td>4 ビン</td>
              <td>−31 dB</td>
              <td>−18 dB/oct</td>
              <td>1.50</td>
              <td>1.42 dB</td>
            </tr>
            <tr>
              <td>ハミング</td>
              <td>4 ビン</td>
              <td>−43 dB</td>
              <td>−6 dB/oct</td>
              <td>1.36</td>
              <td>1.78 dB</td>
            </tr>
            <tr>
              <td>ブラックマン</td>
              <td>6 ビン</td>
              <td>−58 dB</td>
              <td>−18 dB/oct</td>
              <td>1.73</td>
              <td>1.10 dB</td>
            </tr>
            <tr>
              <td>フラットトップ</td>
              <td>10 ビン</td>
              <td>−93 dB</td>
              <td>—</td>
              <td>3.77</td>
              <td>≈0.01 dB</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
    <h3>周波数分解能とゼロ詰め</h3>
    <p>
      ビンの間隔は <MathInline tex="\Delta f = f_s/N = 1/T" /> で、観測時間 T
      だけで決まります。データの後ろに 0 を足して点数を増やす<b>ゼロ詰め</b>は、DTFT
      の曲線を細かく標本化し直すだけ（第 6 章の図で N を増やすのと同じ）なので、近い 2
      つの周波数を分ける力は上がりません。
    </p>
    <figure id="d-res" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>分解能とゼロ詰め</span></div>
      <p class="try-line">周波数の差を小さくしていき、2 つの山が 1 つにくっつく境目を探す</p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-dr-d'">周波数の差</label
          ><input
            :id="uid + '-dr-d'"
            type="range"
            data-p="d"
            min="1"
            max="60"
            step="0.5"
            value="12"
          /><output data-o="d" />
        </div>
        <div class="sel">
          <label :for="uid + '-dr-N'">点数 N</label
          ><select :id="uid + '-dr-N'" data-p="N">
            <option value="16">16</option>
            <option value="32">32</option>
            <option value="64" selected>64</option>
            <option value="128">128</option>
            <option value="256">256</option>
          </select>
        </div>
        <div class="sel">
          <label :for="uid + '-dr-pad'">ゼロ詰め</label
          ><select :id="uid + '-dr-pad'" data-p="pad">
            <option value="1">×1（なし）</option>
            <option value="4" selected>×4</option>
            <option value="16">×16</option>
          </select>
        </div>
        <div class="sel">
          <label :for="uid + '-dr-win'">窓</label
          ><select :id="uid + '-dr-win'" data-p="win">
            <option value="rect" selected>矩形</option>
            <option value="hann">ハン</option>
          </select>
        </div>
      </div>
      <div class="legend">
        <span><i class="bg-trace2" />N 点の FFT（ビン）</span
        ><span><i class="bg-accent" />ゼロ詰め後</span
        ><span><i class="bg-muted" />本当の周波数</span>
      </div>
      <div class="plot h-230"><canvas data-c="a" /></div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            100 Hz と 100+差 Hz の 2 つの余弦波（f<sub>s</sub> = 1000
            Hz）。ゼロ詰めを増やすと曲線は滑らかになりますが、2
            つの山に分かれるかどうかは変わりません。分けるには N
            を増やしてください。ハン窓にすると、同じ N
            でも分離に必要な差が大きくなることも確かめられます。
          </p>
        </div>
      </details>
    </figure>
    <h3>時間とともに変わる信号</h3>
    <p>
      DFT は区間全体に含まれる周波数しか教えてくれません。区間を少しずつずらしながら DFT
      を繰り返す<b>短時間フーリエ変換（STFT）</b>を使うと、周波数の時間変化が見えます。
    </p>
    <figure id="d-stft" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>スペクトログラム（STFT）</span></div>
      <p class="try-line">
        窓を短くするとクリックが細い縦線に、長くすると 300 / 320 Hz が 2 本に分かれるのを見る
      </p>
      <div class="dc">
        <div class="sel">
          <label :for="uid + '-ds-L'">窓の長さ</label
          ><select :id="uid + '-ds-L'" data-p="L">
            <option value="16">16 点 = 16 ms</option>
            <option value="32">32 点 = 32 ms</option>
            <option value="64" selected>64 点 = 64 ms</option>
            <option value="128">128 点 = 128 ms</option>
            <option value="256">256 点 = 256 ms</option>
          </select>
        </div>
      </div>
      <div class="plot h-300"><canvas data-c="a" /></div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            信号は 3 つの部品からできています。50→450 Hz のチャープ、300 Hz と 320 Hz
            の一定の音、0.3
            秒の一瞬のクリックです。窓を短くするとクリックの時刻がはっきりしますが、300 Hz と 320 Hz
            は 1
            本にくっつきます。窓を長くするとその逆になります。時間と周波数の分解能は、同時には上げられません。
          </p>
        </div>
      </details>
    </figure>
  </section>
</template>
