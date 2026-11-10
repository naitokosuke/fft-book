<script setup lang="ts">
import { useId } from "vue";
import MathBlock from "../components/MathBlock.vue";
import MathInline from "../components/MathInline.vue";

// Prefix for the form-control ids, so labels stay linked even if a chapter renders twice.
const uid = useId();
</script>

<template>
  <section id="ch1">
    <h2>
      <span class="no">01</span><span class="ttl">信号を正弦波に分解する（フーリエ級数）</span>
    </h2>

    <h3>信号の分解</h3>
    <p>
      音や電圧のように、時間とともに変わる量を<b>信号</b>と呼びます。フーリエ解析は、信号を<b>単純な正弦波の重ね合わせに分解する</b>考え方です。「変換」と聞くと難しそうですが、まずは「分解」と考えてください。逆に言えば、正弦波を足し合わせれば複雑な波形が作れます。
    </p>
    <figure id="d-synth" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>正弦波を足し合わせる</span></div>
      <p class="try-line">
        「例」のボタンを押して、左の合計の波形と右のスペクトルが一緒に変わるのを見る
      </p>
      <div class="btns">
        <span class="t">例：</span><button type="button" data-syp="two">2 つの正弦波</button
        ><button type="button" data-syp="square">矩形波に近づく</button
        ><button type="button" data-syp="saw">のこぎり波に近づく</button
        ><button type="button" data-syp="beat">うなり（5 Hz と 6 Hz）</button
        ><button type="button" data-syp="rnd">ランダム</button>
      </div>
      <div class="comps4">
        <div class="cc rc-accent" data-card="0">
          <label class="ck"
            ><input type="checkbox" data-p="c0on" checked /><span class="sw bg-accent" />成分
            1</label
          >
          <div class="row">
            <label :for="uid + '-sy0f'" title="周波数 f">f</label
            ><input
              :id="uid + '-sy0f'"
              type="range"
              data-p="c0f"
              min="0.5"
              max="10"
              step="any"
              value="1"
            /><output data-o="c0f" />
          </div>
          <div class="row">
            <label :for="uid + '-sy0a'" title="振幅 A">A</label
            ><input
              :id="uid + '-sy0a'"
              type="range"
              data-p="c0a"
              min="0"
              max="2"
              step="any"
              value="1"
            /><output data-o="c0a" />
          </div>
          <div class="row">
            <label :for="uid + '-sy0p'" title="位相 φ">φ</label
            ><input
              :id="uid + '-sy0p'"
              type="range"
              data-p="c0p"
              min="-180"
              max="180"
              step="any"
              value="0"
            /><output data-o="c0p" />
          </div>
        </div>
        <div class="cc rc-trace3" data-card="1">
          <label class="ck"
            ><input type="checkbox" data-p="c1on" checked /><span class="sw bg-trace3" />成分
            2</label
          >
          <div class="row">
            <label :for="uid + '-sy1f'" title="周波数 f">f</label
            ><input
              :id="uid + '-sy1f'"
              type="range"
              data-p="c1f"
              min="0.5"
              max="10"
              step="any"
              value="3"
            /><output data-o="c1f" />
          </div>
          <div class="row">
            <label :for="uid + '-sy1a'" title="振幅 A">A</label
            ><input
              :id="uid + '-sy1a'"
              type="range"
              data-p="c1a"
              min="0"
              max="2"
              step="any"
              value="0.5"
            /><output data-o="c1a" />
          </div>
          <div class="row">
            <label :for="uid + '-sy1p'" title="位相 φ">φ</label
            ><input
              :id="uid + '-sy1p'"
              type="range"
              data-p="c1p"
              min="-180"
              max="180"
              step="any"
              value="0"
            /><output data-o="c1p" />
          </div>
        </div>
        <div class="cc rc-trace2" data-card="2">
          <label class="ck"
            ><input type="checkbox" data-p="c2on" /><span class="sw bg-trace2" />成分 3</label
          >
          <div class="row">
            <label :for="uid + '-sy2f'" title="周波数 f">f</label
            ><input
              :id="uid + '-sy2f'"
              type="range"
              data-p="c2f"
              min="0.5"
              max="10"
              step="any"
              value="5"
            /><output data-o="c2f" />
          </div>
          <div class="row">
            <label :for="uid + '-sy2a'" title="振幅 A">A</label
            ><input
              :id="uid + '-sy2a'"
              type="range"
              data-p="c2a"
              min="0"
              max="2"
              step="any"
              value="0.3"
            /><output data-o="c2a" />
          </div>
          <div class="row">
            <label :for="uid + '-sy2p'" title="位相 φ">φ</label
            ><input
              :id="uid + '-sy2p'"
              type="range"
              data-p="c2p"
              min="-180"
              max="180"
              step="any"
              value="0"
            /><output data-o="c2p" />
          </div>
        </div>
        <div class="cc rc-ink" data-card="3">
          <label class="ck"
            ><input type="checkbox" data-p="c3on" /><span class="sw bg-ink" />成分 4</label
          >
          <div class="row">
            <label :for="uid + '-sy3f'" title="周波数 f">f</label
            ><input
              :id="uid + '-sy3f'"
              type="range"
              data-p="c3f"
              min="0.5"
              max="10"
              step="any"
              value="7"
            /><output data-o="c3f" />
          </div>
          <div class="row">
            <label :for="uid + '-sy3a'" title="振幅 A">A</label
            ><input
              :id="uid + '-sy3a'"
              type="range"
              data-p="c3a"
              min="0"
              max="2"
              step="any"
              value="0.2"
            /><output data-o="c3a" />
          </div>
          <div class="row">
            <label :for="uid + '-sy3p'" title="位相 φ">φ</label
            ><input
              :id="uid + '-sy3p'"
              type="range"
              data-p="c3p"
              min="-180"
              max="180"
              step="any"
              value="0"
            /><output data-o="c3p" />
          </div>
        </div>
      </div>
      <div class="sy-plots">
        <div class="pl-wrap">
          <div class="pl-h">時間領域 ─ 4 つの波とその合計</div>
          <div class="plot h-420"><canvas data-c="a" /></div>
        </div>
        <div class="pl-wrap">
          <div class="pl-h">周波数領域 ─ スペクトル</div>
          <div class="plot h-420"><canvas data-c="b" /></div>
        </div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            <b>上の図（時間領域）</b>　上の 4 段が成分 1〜4 の正弦波
            A<sub>m</sub>cos(2πf<sub>m</sub>t+φ<sub>m</sub>)、一番下がそれらを足した x(t)
            です。図の上にカーソルを置くと、その時刻での各成分の値と、それらを足した合計が表示されます。
          </p>
          <p>
            <b>下の図（周波数領域）</b>　同じ x(t) をスペクトルで表したものです。成分ごとに、周波数
            f<sub>m</sub> の位置に高さ A<sub>m</sub> の線が 1 本立ち、位相 φ<sub>m</sub>
            はラベルで示しています。点をドラッグすると周波数と振幅を直接変えられます。
          </p>
          <p>
            成分のカードや、どちらかの図の上の線にカーソルを置くと、その成分が両方の図で強調されます。時間領域では形の読み取りにくい合計の波形も、周波数領域では
            4 本以下の線になります。
          </p>
        </div>
      </details>
    </figure>
    <h3>フーリエ級数</h3>
    <p>
      周期 <MathInline tex="T_0" /> で繰り返す信号は、<b
        >基本周波数 <MathInline tex="1/T_0" /> の整数倍</b
      >の cos と sin、それに定数を足し合わせて表せます。
    </p>
    <MathBlock
      tex="x(t) = a_0 + \sum_{k=1}^{\infty}\left(a_k\cos k\Omega_0 t + b_k \sin k\Omega_0 t\right),\qquad \Omega_0 = \frac{2\pi}{T_0}"
    />
    <p>
      上の図の表示時間 2 秒も 1 周期で、成分は 0.5 Hz
      の整数倍だけを選べるようにしてあります。周期信号に、それ以外の周波数は出てきません。<MathInline
        tex="a_k, b_k"
      />
      を<b>フーリエ係数</b>と呼びます。
    </p>
    <figure id="d-gibbs" class="demo">
      <div class="dh"><span class="pill">TRY</span><span>矩形波を正弦波で組み立てる</span></div>
      <p class="try-line">成分を増やしても、段差の横の出っ張りが消えないのを見る</p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-dg-K'">使う成分の数</label
          ><input
            :id="uid + '-dg-K'"
            type="range"
            data-p="K"
            min="1"
            max="60"
            step="1"
            value="3"
          /><output data-o="K" />
        </div>
      </div>
      <div class="plots2">
        <div class="plot h-230"><canvas data-c="a" /></div>
        <div class="plot h-230"><canvas data-c="b" /></div>
      </div>
      <div class="read" data-o="read" />
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            矩形波は奇数次の正弦波 (4/πn)·sin(2πnt)
            の和です。成分を増やすほど形は矩形に近づきますが、段差のすぐ横の行き過ぎは約 9%
            のまま残ります（ギブス現象）。
          </p>
        </div>
      </details>
    </figure>
    <h3>係数をどうやって求めるか</h3>
    <p>
      合計の波形だけを渡されたとき、どうやって
      <MathInline tex="a_k, b_k" /> を突き止めればよいでしょうか。カギは、2 つの波を<b
        >掛けて 1 周期で平均する</b
      >ことです。
    </p>
    <ul>
      <li>同じ周波数どうし：山と山、谷と谷が重なって積はいつも +。平均は 0 にならない</li>
      <li>違う周波数どうし：積は + と − を同じだけ行き来し、平均は 0</li>
    </ul>
    <p>
      この性質を<b>三角関数の直交性</b>と呼びます。調べたい周波数の波を「ものさし」として信号に当てれば、その周波数の成分だけが平均に残り、ほかの成分はすべて消えます。
    </p>
    <figure id="d-match" class="demo side">
      <div class="dh"><span class="pill">TRY</span><span>ものさしの波を当ててみる</span></div>
      <p class="try-line">
        「ものさしを動かす」を押して、下のグラフが 1 Hz と 3 Hz でだけ山になるのを見る
      </p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-mt-fp'">ものさし</label
          ><input
            :id="uid + '-mt-fp'"
            type="range"
            data-p="fp"
            min="0"
            max="6"
            step="any"
            value="0.4"
          /><output data-o="fp" />
        </div>
        <div class="btns"><button type="button" data-play>▶ ものさしを動かす</button></div>
      </div>
      <div class="read" data-o="read" />
      <div class="plots-col">
        <div class="plot h-190"><canvas data-c="a" /></div>
        <div class="plot h-170"><canvas data-c="b" /></div>
        <div class="plot h-220"><canvas data-c="c" /></div>
      </div>
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            信号は 1 Hz と 3 Hz（振幅 1 と
            0.5）の合計ですが、そのことは知らないものとします。上段の背景は、信号とものさしの波が同じ向きの時刻（緑）と逆向きの時刻（赤）です。中段は
            2
            つの掛け算（積）と、その平均（白い線）です。下段は、ものさしの周波数ごとに平均を記録したグラフで、これがスペクトルです。
          </p>
        </div>
      </details>
    </figure>
    <MathBlock
      tex="\frac{1}{T_0}\int_0^{T_0}\cos m\Omega_0 t\,\cos k\Omega_0 t\,dt = \begin{cases}1/2 & (m=k)\\ 0 & (m\neq k)\end{cases}"
    />
    <h3>直交性の証明</h3>
    <p>
      証明に使うのは、次の 2 つだけです。以下では m, k は 1 以上の整数、<MathInline
        tex="\Omega_0 T_0 = 2\pi"
      />
      です。
    </p>
    <p>
      <b>(1) 0 でない整数回だけ振動する波は、1 周期で平均すると 0。</b> n を 0 でない整数とすると、
    </p>
    <MathBlock
      tex="\frac{1}{T_0}\int_0^{T_0}\cos n\Omega_0 t\,dt = \frac{1}{T_0}\left[\frac{\sin n\Omega_0 t}{n\Omega_0}\right]_0^{T_0} = \frac{\sin 2\pi n}{2\pi n} = 0"
    />
    <MathBlock
      tex="\frac{1}{T_0}\int_0^{T_0}\sin n\Omega_0 t\,dt = \frac{1}{T_0}\left[-\frac{\cos n\Omega_0 t}{n\Omega_0}\right]_0^{T_0} = \frac{1-\cos 2\pi n}{2\pi n} = 0"
    />
    <p>
      <MathInline tex="\sin 2\pi n = 0" />、<MathInline tex="\cos 2\pi n = 1" /> だからです。n = 0
      のときだけは cos が定数 1 になり、平均も 1 です。
    </p>
    <p>
      <b>(2) 積和の公式。</b> 2 つの波の積は、「差の周波数」と「和の周波数」の 2
      つの波の和に書き直せます。
    </p>
    <MathBlock
      tex="\begin{aligned}\cos a\cos b &= \frac{1}{2}\left[\cos(a-b) + \cos(a+b)\right]\\ \sin a\sin b &= \frac{1}{2}\left[\cos(a-b) - \cos(a+b)\right]\\ \sin a\cos b &= \frac{1}{2}\left[\sin(a+b) + \sin(a-b)\right]\end{aligned}"
    />
    <p>
      <MathInline tex="a = m\Omega_0 t" />、<MathInline tex="b = k\Omega_0 t" />
      を入れると、右辺は周波数 <MathInline tex="(m-k)\Omega_0" /> と
      <MathInline tex="(m+k)\Omega_0" /> の波になります。m + k は常に 1 以上なので、和の周波数の項は
      (1) により必ず平均 0 です。残るかどうかは差の周波数の項で決まります。
    </p>
    <ul>
      <li>
        <b>m ≠ k のとき</b>：m − k も 0 でない整数なので、差の項も平均 0。cos × cos と sin × sin
        の平均は <b>0</b>。
      </li>
      <li>
        <b>m = k のとき</b>：差の項は <MathInline tex="\cos 0 = 1" />、<MathInline
          tex="\sin 0 = 0"
        />
        になる。cos × cos と sin × sin では定数 <MathInline tex="\tfrac12" /> が残って平均
        <b>1/2</b>。
      </li>
      <li>
        <b>sin × cos は、m, k によらず常に 0</b>：積和の公式の右辺が sin だけの和になるからです。sin
        の項は、振動していれば (1) により平均 0、振動しない（m = k の差の項）ときは
        <MathInline tex="\sin 0 = 0" /> で値そのものが 0 です。
      </li>
    </ul>
    <p>まとめると次のとおりです。sin と cos は、同じ周波数どうしでも直交しています。</p>
    <MathBlock
      tex="\overline{\cos m\Omega_0 t\,\cos k\Omega_0 t} = \overline{\sin m\Omega_0 t\,\sin k\Omega_0 t} = \begin{cases}1/2 & (m=k)\\ 0 & (m\neq k)\end{cases},\qquad \overline{\sin m\Omega_0 t\,\cos k\Omega_0 t} = 0"
    />
    <figure id="d-ortho" class="demo side">
      <div class="dh">
        <span class="pill">TRY</span><span>積を和に分けると、平均が 0 になる理由が見える</span>
      </div>
      <p class="try-line">
        m と k を同じにすると、差の周波数の項が「定数 1/2」になって平均に残るのを見る
      </p>
      <div class="dc">
        <div class="sel">
          <label :for="uid + '-or-kind'">組み合わせ</label
          ><select :id="uid + '-or-kind'" data-p="kind">
            <option value="cc" selected>cos × cos</option>
            <option value="ss">sin × sin</option>
            <option value="sc">sin × cos</option>
          </select>
        </div>
        <div class="row">
          <label :for="uid + '-or-m'">m</label
          ><input
            :id="uid + '-or-m'"
            type="range"
            data-p="m"
            min="1"
            max="6"
            step="1"
            value="2"
          /><output data-o="m" />
        </div>
        <div class="row">
          <label :for="uid + '-or-k'">k</label
          ><input
            :id="uid + '-or-k'"
            type="range"
            data-p="k"
            min="1"
            max="6"
            step="1"
            value="3"
          /><output data-o="k" />
        </div>
      </div>
      <div class="read" data-o="read" />
      <div class="plots-col">
        <div class="plot h-190"><canvas data-c="a" /></div>
        <div class="plot h-190"><canvas data-c="b" /></div>
        <div class="plot h-206"><canvas data-c="c" /></div>
      </div>
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            上段が 2 つの波の積、中段と下段が積和の公式で分けた 2 つの項です。白い横線はそれぞれの 1
            周期の平均です。中段と下段の平均を足すと、上段の平均になります。0
            でない整数回だけ振動する項の平均は必ず 0 なので、残るのは m = k
            のときに振動しなくなる項（定数）だけです。
          </p>
        </div>
      </details>
    </figure>
    <p>
      cos の成分 <MathInline tex="a_k" /> は cos のものさしで、sin の成分
      <MathInline tex="b_k" /> は sin のものさしで測ります。定数
      <MathInline tex="a_0" /> は信号の平均（直流成分）です。
    </p>
    <MathBlock
      tex="a_0 = \overline{x(t)},\qquad a_k = 2\,\overline{x(t)\cos k\Omega_0 t},\qquad b_k = 2\,\overline{x(t)\sin k\Omega_0 t}"
    />
    <p>（上線は 1 周期の平均です。）</p>
    <figure id="d-probe" class="demo side">
      <div class="dh">
        <span class="pill">TRY</span><span>a<sub>k</sub> と b<sub>k</sub> を測る</span>
      </div>
      <p class="try-line">
        位相 φ を 90° にして cos の平均が 0 になるのを見る。次に f<sub>p</sub>
        を信号と違う値にして、両方 0 になるのを見る
      </p>
      <div class="dc">
        <div class="row">
          <label :for="uid + '-pb-f'">信号の f</label
          ><input
            :id="uid + '-pb-f'"
            type="range"
            data-p="f"
            min="1"
            max="5"
            step="1"
            value="3"
          /><output data-o="f" />
        </div>
        <div class="row">
          <label :for="uid + '-pb-A'">振幅 A</label
          ><input
            :id="uid + '-pb-A'"
            type="range"
            data-p="A"
            min="0.2"
            max="1.5"
            step="0.01"
            value="1"
          /><output data-o="A" />
        </div>
        <div class="row">
          <label :for="uid + '-pb-ph'">位相 φ</label
          ><input
            :id="uid + '-pb-ph'"
            type="range"
            data-p="ph"
            min="-180"
            max="180"
            step="5"
            value="30"
          /><output data-o="ph" />
        </div>
        <div class="row">
          <label :for="uid + '-pb-fp'">測る f<sub>p</sub></label
          ><input
            :id="uid + '-pb-fp'"
            type="range"
            data-p="fp"
            min="0.5"
            max="6"
            step="0.5"
            value="3"
          /><output data-o="fp" />
        </div>
      </div>
      <div class="left-stack">
        <div class="pl-h">2 つの平均を 1 本の矢印に</div>
        <div class="plot h-280"><canvas data-c="d" /></div>
        <div class="read" data-o="read" />
      </div>
      <div class="plots-col">
        <div class="plot h-170"><canvas data-c="a" /></div>
        <div class="plot h-170"><canvas data-c="b" /></div>
        <div class="plot h-196"><canvas data-c="c" /></div>
      </div>
      <details class="howto">
        <summary>図の読み方</summary>
        <div>
          <p>
            右上が調べたい信号 x(t) です。その下の 2 段は、x(t) に cos と
            sin（破線）をそれぞれ掛けたもので、塗りつぶした面積の平均が白い横線です。同じ周波数のときだけ、積が片側に偏って平均が
            0 から離れます。左下は、cos の平均を横、sin
            の平均（符号を反転）を縦にとった矢印です。長さが A/2、角度が φ になります。
          </p>
        </div>
      </details>
    </figure>
  </section>
</template>
