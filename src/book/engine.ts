// Interactive engine of the FFT book: canvas demos and page effects.
// Ported from the original single-file page; it runs only in the browser.

type Num = (v: number) => number;
type Pt = number[];
type Ctx = CanvasRenderingContext2D & { _glow?: boolean };
type Prep = { ctx: Ctx; W: number; H: number };
type AxesOpts = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  ml?: number;
  xlabel?: string;
  ylabel?: string;
  xticks?: number[];
  yticks?: number[];
  xfmt?: (v: number) => string;
  yfmt?: (v: number) => string;
  zero?: boolean;
};
type Axes = Prep & {
  X: Num;
  Y: Num;
  m: { l: number; r: number; t: number; b: number };
  pw: number;
  ph: number;
  Xi: Num;
  Yi: Num;
};
type Plane = Prep & { X: Num; Y: Num; s: number; ox: number; oy: number };
type Demo = { r: HTMLElement; draw: () => void };
type Anim = { v: number; from: number; target: number; t0: number };

export function mountBook(): void {
  // ---------- DOM helpers ----------
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const CSSC = new Map<string, string>();
  const css = (n: string): string => {
    let v = CSSC.get(n);
    if (v === undefined) {
      v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      CSSC.set(n, v);
    }
    return v;
  };
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    REDUCED_GLOW = false;
  const tweenIds: Record<string, number> = {};
  function tween(key: string, ms: number, step: (u: number) => void, done?: () => void) {
    // step(u) with u in 0..1 eased; one running tween per key
    cancelAnimationFrame(tweenIds[key] ?? 0);
    if (REDUCED || ms <= 0) {
      step(1);
      done?.();
      return;
    }
    const t0 = performance.now();
    const f = (now: number) => {
      const u = Math.min(1, (now - t0) / ms);
      step(ease(u));
      if (u < 1) tweenIds[key] = requestAnimationFrame(f);
      else done?.();
    };
    tweenIds[key] = requestAnimationFrame(f);
  }
  // animated values: av(key,target) glides to target and keeps frames coming until it arrives
  const AV: Record<string, Anim> = {};
  function av(key: string, target: number, ms = 280): number {
    const now = performance.now();
    let a = AV[key];
    if (!a || REDUCED) {
      AV[key] = { v: target, from: target, target, t0: now };
      return target;
    }
    if (a.target !== target) {
      a.from = a.v;
      a.target = target;
      a.t0 = now;
    }
    if (a.v !== a.target) {
      const u = Math.min(1, (now - a.t0) / ms);
      a.v = u >= 1 ? a.target : a.from + (a.target - a.from) * ease(u);
      if (a.v !== a.target) {
        if (CUR) requestDemo(CUR);
        else schedule();
      }
    }
    return a.v;
  }
  // cross-fade a canvas from its previous picture to the new one (for discrete switches)
  const FADES = new Map<HTMLCanvasElement, { img: HTMLCanvasElement; t0: number }>(),
    DRAWN = new Set<HTMLCanvasElement>();
  function snapFade(cv: HTMLCanvasElement) {
    if (REDUCED || !cv || !cv.width || !cv.offsetParent) return;
    const c = document.createElement("canvas");
    c.width = cv.width;
    c.height = cv.height;
    c.getContext("2d")!.drawImage(cv, 0, 0);
    FADES.set(cv, { img: c, t0: performance.now() });
  }
  function overlayFades() {
    const now = performance.now();
    let more = false;
    for (const cv of DRAWN) {
      const f = FADES.get(cv);
      if (!f) continue;
      const u = (now - f.t0) / 320;
      if (u >= 1 || f.img.width !== cv.width || f.img.height !== cv.height) {
        FADES.delete(cv);
        continue;
      }
      const e = ease(u),
        ctx = cv.getContext("2d")!;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.globalAlpha = e;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1 - e;
      ctx.drawImage(f.img, 0, 0);
      ctx.restore();
      more = true;
    }
    DRAWN.clear();
    if (more) {
      for (const cv of FADES.keys()) {
        const d = cv.closest(".demo");
        if (d) requestDemo(d.id);
      }
    }
  }
  // ---------- DSP ----------
  function mulberry32(a: number) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussNoise(n: number, seed: number) {
    const r = mulberry32(seed * 9973 + 17),
      out = new Float64Array(n);
    for (let i = 0; i < n; i += 2) {
      const u = Math.max(r(), 1e-12),
        v = r();
      const m = Math.sqrt(-2 * Math.log(u));
      out[i] = m * Math.cos(2 * Math.PI * v);
      if (i + 1 < n) out[i + 1] = m * Math.sin(2 * Math.PI * v);
    }
    return out;
  }
  function windowFn(type: string, N: number) {
    const w = new Float64Array(N),
      D = N; // periodic-ish (DFT-even) windows
    for (let n = 0; n < N; n++) {
      const x = (2 * Math.PI * n) / D;
      switch (type) {
        case "hann":
          w[n] = 0.5 - 0.5 * Math.cos(x);
          break;
        case "hamming":
          w[n] = 0.54 - 0.46 * Math.cos(x);
          break;
        case "blackman":
          w[n] = 0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x);
          break;
        case "flattop":
          w[n] =
            0.21557895 -
            0.41663158 * Math.cos(x) +
            0.277263158 * Math.cos(2 * x) -
            0.083578947 * Math.cos(3 * x) +
            0.006947368 * Math.cos(4 * x);
          break;
        default:
          w[n] = 1;
      }
    }
    return w;
  }
  function fft(re: Float64Array | number[], im: Float64Array | number[], inverse?: boolean) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j]!, re[i]!];
        [im[i], im[j]] = [im[j]!, im[i]!];
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = ((inverse ? 2 : -2) * Math.PI) / len,
        wr = Math.cos(ang),
        wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1,
          ci = 0;
        for (let j = 0; j < len / 2; j++) {
          const a = i + j,
            b = a + len / 2;
          const tr = re[b]! * cr - im[b]! * ci,
            ti = re[b]! * ci + im[b]! * cr;
          re[b] = re[a]! - tr;
          im[b] = im[a]! - ti;
          re[a]! += tr;
          im[a]! += ti;
          const nr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = nr;
        }
      }
    }
    if (inverse)
      for (let i = 0; i < n; i++) {
        re[i]! /= n;
        im[i]! /= n;
      }
  }

  // ---------- Plot helpers ----------
  function prep(canvas: HTMLCanvasElement): Prep {
    const dpr = window.devicePixelRatio || 1,
      W = Math.max(1, canvas.clientWidth),
      H = Math.max(1, canvas.clientHeight);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    const ctx: Ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    DRAWN.add(canvas);
    if (!ctx._glow) {
      const st = ctx.stroke.bind(ctx) as (...a: unknown[]) => void;
      ctx._glow = true;
      // thick traces get a soft phosphor halo in their own colour, like an oscilloscope beam
      ctx.stroke = function (this: Ctx, ...a: unknown[]) {
        if (this.lineWidth >= 1.6 && !REDUCED_GLOW) {
          const lw = this.lineWidth,
            ga = this.globalAlpha;
          this.lineWidth = lw + 5;
          this.globalAlpha = ga * 0.13;
          st(...a);
          this.lineWidth = lw;
          this.globalAlpha = ga;
        }
        st(...a);
      } as Ctx["stroke"];
    }
    return { ctx, W, H };
  }
  function ticks(min: number, max: number, count: number): number[] {
    const span = max - min;
    if (!(span > 0)) return [min];
    const s0 = span / count,
      mag = Math.pow(10, Math.floor(Math.log10(s0))),
      r = s0 / mag;
    const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
    const out: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step)
      out.push(+v.toFixed(10));
    return out;
  }
  function fmt(v: number): string {
    const a = Math.abs(v);
    if (a === 0) return "0";
    if (a >= 1000) return v.toFixed(0);
    if (a >= 10) return +v.toFixed(1) + "";
    if (a >= 1) return +v.toFixed(2) + "";
    return +v.toPrecision(2) + "";
  }
  function axes(cv: HTMLCanvasElement, o: AxesOpts): Axes {
    const { ctx, W, H } = prep(cv);
    const m = { l: o.ml ?? 66, r: 14, t: o.ylabel ? 28 : 12, b: o.xlabel ? 46 : 18 };
    const pw = W - m.l - m.r,
      ph = H - m.t - m.b;
    const X = (v: number) => m.l + ((v - o.x0) / (o.x1 - o.x0)) * pw,
      Y = (v: number) => m.t + (1 - (v - o.y0) / (o.y1 - o.y0)) * ph;
    const grid = css("--grid"),
      line = css("--line"),
      muted = css("--muted");
    ctx.font = "16px " + css("--f-mono");
    ctx.lineWidth = 1;
    const xt = o.xticks || ticks(o.x0, o.x1, Math.max(2, Math.floor(pw / 95)));
    const yt = o.yticks || ticks(o.y0, o.y1, Math.max(2, Math.floor(ph / 44)));
    ctx.strokeStyle = grid;
    ctx.fillStyle = muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const v of xt) {
      const px = X(v);
      ctx.beginPath();
      ctx.moveTo(px, m.t);
      ctx.lineTo(px, m.t + ph);
      ctx.stroke();
      if (o.xlabel) ctx.fillText((o.xfmt || fmt)(v), px, m.t + ph + 4);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const v of yt) {
      const py = Y(v);
      ctx.beginPath();
      ctx.moveTo(m.l, py);
      ctx.lineTo(m.l + pw, py);
      ctx.stroke();
      ctx.fillText((o.yfmt || fmt)(v), m.l - 6, py);
    }
    ctx.strokeStyle = line;
    ctx.strokeRect(m.l + 0.5, m.t + 0.5, pw, ph);
    if (o.zero && o.y0 < 0 && o.y1 > 0) {
      ctx.strokeStyle = muted;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(m.l, Y(0));
      ctx.lineTo(m.l + pw, Y(0));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (o.xlabel) {
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = muted;
      ctx.fillText(o.xlabel, m.l + pw, H - 1);
    }
    if (o.ylabel) {
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(o.ylabel, 4, 2);
      ctx.restore();
    }
    return {
      ctx,
      W,
      H,
      X,
      Y,
      m,
      pw,
      ph,
      Xi: (px) => o.x0 + ((px - m.l) / pw) * (o.x1 - o.x0),
      Yi: (py) => o.y0 + (1 - (py - m.t) / ph) * (o.y1 - o.y0),
    };
  }

  const toDb = (a: number) => 20 * Math.log10(Math.max(a, 1e-7));
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      drawBook();
      overlayFades();
    });
  }
  // ---------- Textbook demos ----------
  const BOOK: Record<string, Demo> = {};
  const isBook = () => true;
  const field = (r: HTMLElement, n: string) =>
    r.querySelector(`[data-p="${n}"]`) as HTMLInputElement | HTMLSelectElement;
  /** numeric control value (range, number or numeric select) */
  const P = (r: HTMLElement, n: string): number => +field(r, n).value;
  /** select value as text */
  const Ps = (r: HTMLElement, n: string): string => field(r, n).value;
  /** checkbox state */
  const Pb = (r: HTMLElement, n: string): boolean => (field(r, n) as HTMLInputElement).checked;
  const O = (r: HTMLElement, n: string, t: string | number) => {
    const e = r.querySelector(`[data-o="${n}"]`);
    if (e) e.innerHTML = String(t);
  };
  const C = (r: HTMLElement, n: string) => r.querySelector(`[data-c="${n}"]`) as HTMLCanvasElement;
  let CUR: string | null = null;
  const PEND = new Set<string>();
  let pendRaf = 0;
  const VIS = new Set<string>(),
    DIRTY = new Set<string>();
  function requestDemo(id: string) {
    PEND.add(id);
    if (!pendRaf)
      pendRaf = requestAnimationFrame(() => {
        pendRaf = 0;
        const ids = [...PEND];
        PEND.clear();
        ids.forEach((i) => BOOK[i] && BOOK[i].draw());
      });
  }
  const visIO = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          VIS.add(e.target.id);
          if (DIRTY.has(e.target.id)) {
            DIRTY.delete(e.target.id);
            requestDemo(e.target.id);
          }
        } else VIS.delete(e.target.id);
      }),
    { rootMargin: "300px 0px" },
  );
  function demo(id: string, draw: (r: HTMLElement) => void, init?: (r: HTMLElement) => void) {
    const r = $(id);
    if (!r) return;
    const d: Demo = {
      r,
      draw: () => {
        if (!isBook()) return;
        if (!VIS.has(id)) {
          DIRTY.add(id);
          return;
        }
        CUR = id;
        try {
          draw(r);
        } finally {
          CUR = null;
        }
        fillRanges(r);
        overlayFades();
      },
    };
    BOOK[id] = d;
    visIO.observe(r);
    if (init) init(r);
    r.addEventListener(
      "input",
      (e) => {
        if ((e.target as Element).tagName === "SELECT")
          r.querySelectorAll("canvas").forEach(snapFade);
      },
      true,
    );
    r.addEventListener("input", d.draw);
    r.addEventListener("change", d.draw);
  }
  function drawBook() {
    if (!isBook()) return;
    for (const k in BOOK) {
      try {
        BOOK[k]!.draw();
      } catch (e) {
        console.error(k, e);
      }
    }
  }
  function rgb(h: string): number[] {
    h = h.trim().replace("#", "");
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a: number[], b: number[], t: number) =>
    a.map((v, i) => Math.round(v + (b[i]! - v) * t));
  function line(ctx: Ctx, pts: Pt[], X: Num, Y: Num) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();
  }
  function dot(ctx: Ctx, x: number, y: number, r: number) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  }
  function arrow(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0),
      L = Math.hypot(x1 - x0, y1 - y0);
    if (L > 9) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 9 * Math.cos(a - 0.4), y1 - 9 * Math.sin(a - 0.4));
      ctx.lineTo(x1 - 9 * Math.cos(a + 0.4), y1 - 9 * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
    }
  }
  function vline(P: Axes, x: number, color: string, dash?: number[]) {
    const c = P.ctx;
    c.save();
    c.strokeStyle = color;
    c.lineWidth = 1;
    if (dash) c.setLineDash(dash);
    c.beginPath();
    c.moveTo(P.X(x), P.m.t);
    c.lineTo(P.X(x), P.m.t + P.ph);
    c.stroke();
    c.restore();
  }
  function plane(cv: HTMLCanvasElement, R: number): Plane {
    const { ctx, W, H } = prep(cv);
    const s = Math.max(10, Math.min(W, H) / 2 - 16),
      ox = W / 2,
      oy = H / 2;
    const X = (v: number) => ox + (v / R) * s,
      Y = (v: number) => oy - (v / R) * s;
    ctx.strokeStyle = css("--grid");
    ctx.lineWidth = 1;
    for (const t of ticks(0, R, 3)) {
      if (t <= 0) continue;
      ctx.beginPath();
      ctx.arc(ox, oy, (t / R) * s, 0, 7);
      ctx.stroke();
    }
    ctx.strokeStyle = css("--line");
    ctx.beginPath();
    ctx.moveTo(ox - s, oy);
    ctx.lineTo(ox + s, oy);
    ctx.moveTo(ox, oy - s);
    ctx.lineTo(ox, oy + s);
    ctx.stroke();
    ctx.fillStyle = css("--muted");
    ctx.font = "16px " + css("--f-mono");
    ctx.textBaseline = "bottom";
    ctx.textAlign = "right";
    ctx.fillText("Re", ox + s, oy - 3);
    ctx.textAlign = "left";
    ctx.fillText("Im", ox + 4, oy - s + 12);
    return { ctx, W, H, X, Y, s, ox, oy };
  }
  function player(
    r: HTMLElement,
    param: string,
    rate: number,
    max: number,
    loop: boolean | ((v: number) => number),
    sel = "[data-play]",
  ) {
    const b = r.querySelector(sel) as HTMLButtonElement,
      s = r.querySelector(`[data-p="${param}"]`) as HTMLInputElement,
      label = b.textContent;
    b.innerHTML = `<span class="l1">${label}</span><span class="l2">■ 停止</span>`;
    b.classList.add("lbl-swap");
    let id = 0,
      last = 0,
      cur = 0;
    const stop = () => {
      cancelAnimationFrame(id);
      id = 0;
      b.classList.remove("on");
    };
    b.addEventListener("click", () => {
      if (id) {
        stop();
        return;
      }
      b.classList.add("on");
      if (!loop && +s.value >= max - 1e-9) s.value = s.min;
      cur = +s.value;
      last = performance.now();
      const tick = (now: number) => {
        if (!isBook()) {
          stop();
          return;
        }
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (Math.abs(+s.value - cur) > (+s.step || 0.01) * 1.5) cur = +s.value; // the user moved the slider meanwhile
        cur += rate * dt;
        if (cur > max) {
          if (typeof loop === "function") cur = loop(cur);
          else if (loop) cur = +s.min;
          else {
            s.value = String(max);
            BOOK[r.id]!.draw();
            stop();
            return;
          }
        }
        s.value = String(cur);
        BOOK[r.id]!.draw();
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
    });
  }

  // on-canvas label with ^{superscript} support and a backing plate
  function tag(
    ctx: Ctx,
    text: string,
    x: number,
    y: number,
    color: string,
    align: "left" | "right" | "center" = "left",
    base: "top" | "middle" | "bottom" = "middle",
  ) {
    const segs: [string, boolean][] = [];
    text.split(/(\^\{[^}]*\})/).forEach((p) => {
      if (!p) return;
      const m = p.match(/^\^\{(.*)\}$/);
      segs.push(m ? [m[1]!, true] : [p, false]);
    });
    const fN = "16px " + css("--f-mono"),
      fS = "16px " + css("--f-mono");
    let w = 0;
    for (const [t, sup] of segs) {
      ctx.font = sup ? fS : fN;
      w += ctx.measureText(t).width;
    }
    let x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    const y0 = base === "top" ? y + 8 : base === "bottom" ? y - 8 : y;
    const cw = ctx.canvas.clientWidth || 9999;
    x0 = Math.max(4, Math.min(x0, cw - w - 4));
    const ga = ctx.globalAlpha;
    ctx.save();
    ctx.globalAlpha = 0.82 * ga;
    ctx.fillStyle = css("--bg");
    ctx.fillRect(x0 - 4, y0 - 16, w + 8, 28);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (const [t, sup] of segs) {
      ctx.font = sup ? fS : fN;
      ctx.fillText(t, x0, sup ? y0 - 7 : y0);
      x0 += ctx.measureText(t).width;
    }
  }
  const sgn = (v: number) => {
    v = Math.abs(v) < 0.0005 ? 0 : v;
    return (v < 0 ? "−" : "") + Math.abs(v).toFixed(2);
  };
  const cpx = (a: number, b: number) => {
    a = Math.abs(a) < 0.005 ? 0 : a;
    b = Math.abs(b) < 0.005 ? 0 : b;
    return `${sgn(a)}${b < 0 ? "−" : "+"}${Math.abs(b).toFixed(2)}i`;
  };

  // 1. phasor (single canvas: complex plane on top, cos waveform below sharing the real axis)
  const PH: {
    mode: string;
    geo: { ox: number; oy: number; u: number; Hc: number; wt: number; wb: number } | null;
  } = { mode: "two", geo: null };
  demo(
    "d-phasor",
    (r) => {
      const f = P(r, "f"),
        phd = P(r, "ph"),
        ph = (phd * Math.PI) / 180,
        t = P(r, "t"),
        two = PH.mode === "two";
      const th = 2 * Math.PI * f * t + ph,
        c = Math.cos(th),
        s = Math.sin(th),
        deg = ((((th * 180) / Math.PI) % 360) + 360) % 360;
      O(r, "f", f.toFixed(2) + " Hz");
      O(r, "ph", phd + "°");
      O(r, "t", t.toFixed(2) + " s");
      r.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.mode === PH.mode)),
      );
      O(
        r,
        "read",
        `θ = 2π·${f.toFixed(2)}·${t.toFixed(2)} + ${phd}° = ${deg.toFixed(1)}°<br>` +
          (two
            ? `½e<sup>iθ</sup> = ${cpx(c / 2, s / 2)}　＋　½e<sup>−iθ</sup> = ${cpx(c / 2, -s / 2)}　＝　<b>${sgn(c)}</b>（= cos θ）`
            : `e<sup>iθ</sup> = ${cpx(c, s)}　→ 実部 <b>${sgn(c)}</b>（= cos θ）`),
      );
      const { ctx, W, H } = prep(C(r, "a"));
      const nar = W < 460,
        Hc = Math.min(W * (nar ? 0.95 : 0.78), 340),
        ox = W / 2 + (nar ? 28 : 0),
        oy = Hc / 2,
        u = Math.min((Hc / 2 - 28) / 1.25, (W / 2 - 60) / 1.25),
        X = (v: number) => ox + v * u,
        Y = (v: number) => oy - v * u;
      const wt = Hc + 30,
        wb = H - 28,
        Yt = (tau: number) => wt + (tau / 2) * (wb - wt);
      PH.geo = { ox, oy, u, Hc, wt, wb }; // tau = seconds before now
      const lime = css("--accent"),
        mint = css("--trace3"),
        red = css("--trace2"),
        mut = css("--muted");
      // shared vertical grid (−1, 0, 1 line up in both parts)
      ctx.lineWidth = 1;
      ctx.strokeStyle = css("--grid");
      for (const v of [-1, -0.5, 0.5, 1]) {
        ctx.beginPath();
        ctx.moveTo(X(v), Y(1.25));
        ctx.lineTo(X(v), wb);
        ctx.stroke();
      }
      for (const tt of [0.5, 1, 1.5, 2]) {
        ctx.beginPath();
        ctx.moveTo(X(-1.25), Yt(tt));
        ctx.lineTo(X(1.25), Yt(tt));
        ctx.stroke();
      }
      ctx.strokeStyle = css("--line");
      ctx.beginPath();
      ctx.moveTo(X(-1.25), oy);
      ctx.lineTo(X(1.25), oy);
      ctx.moveTo(ox, Y(1.25));
      ctx.lineTo(ox, Y(-1.25));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, wt);
      ctx.lineTo(ox, wb);
      ctx.stroke();
      ctx.strokeStyle = mut;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(ox, oy, u, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = "16px " + css("--f-mono");
      ctx.fillStyle = mut;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("実部 Re", X(1.25) - 48, oy - 3);
      ctx.fillText("虚部 Im", ox + 5, Y(1.25) + 12);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const v of [-1, 1]) ctx.fillText(String(v), X(v), wb + 4);
      ctx.fillText("0", ox, wb + 4);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (const tt of [0, 0.5, 1, 1.5, 2])
        ctx.fillText(tt === 0 ? "今" : nar ? tt + "s前" : tt + " s 前", X(-1.25) - 6, Yt(tt));
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        nar ? "↓ 過去　赤い点の跡" : "↓ 過去へ　赤い点の跡 = cos(2πft+φ)",
        X(-1.25),
        wt - 6,
      );
      // waveform: past bright, future faint
      // trace of the red point: value at tau seconds ago is cos(θ − 2πfτ). It depends only on θ, so it scrolls without seams.
      ctx.strokeStyle = lime;
      ctx.lineWidth = 1.9;
      const CH = 24,
        SPC = 40;
      for (let c0 = 0; c0 < CH; c0++) {
        ctx.globalAlpha = 1 - (0.72 * c0) / (CH - 1);
        ctx.beginPath();
        for (let j = 0; j <= SPC; j++) {
          const tau = (2 * (c0 + j / SPC)) / CH,
            v = Math.cos(th - 2 * Math.PI * f * tau);
          if (j) ctx.lineTo(X(v), Yt(tau));
          else ctx.moveTo(X(v), Yt(tau));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // angle arc θ
      {
        const tm = Math.atan2(s, c),
          rad = Math.max(16, u * 0.22);
        ctx.strokeStyle = mut;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ox, oy, rad, 0, -tm, tm > 0);
        ctx.stroke();
        tag(
          ctx,
          `θ=${deg.toFixed(0)}°`,
          ox + (rad + 16) * Math.cos(tm / 2),
          oy - (rad + 16) * Math.sin(tm / 2),
          mut,
          "center",
        );
      }
      // label placed beside the middle of a segment, on the side away from `away`
      const side = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        awx: number,
        awy: number,
        txt: string,
        col: string,
      ) => {
        const mx = (ax + bx) / 2,
          my = (ay + by) / 2;
        let nx = -(by - ay),
          ny = bx - ax;
        const L = Math.hypot(nx, ny) || 1;
        nx /= L;
        ny /= L;
        if (nx * (awx - mx) + ny * (awy - my) > 0) {
          nx = -nx;
          ny = -ny;
        }
        const px = X(mx) + nx * 16,
          py = Y(my) - ny * 16;
        tag(ctx, txt, px, py, col, nx < -0.3 ? "right" : nx > 0.3 ? "left" : "center");
      };
      // m = 0: one vector e^{iθ};  m = 1: ½e^{iθ} + ½e^{−iθ}. Intermediate frames morph between them.
      const m = av("phm", two ? 1 : 0, 420),
        k1 = 1 - 0.5 * m,
        lx = c * k1,
        ly = s * k1,
        ex = c,
        ey = s * (1 - m);
      ctx.globalAlpha = 1 - m;
      if (1 - m > 0.01) {
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = mut;
        ctx.beginPath();
        ctx.moveTo(X(c), Y(ey));
        ctx.lineTo(X(c), Y(0));
        ctx.stroke();
        ctx.setLineDash([]);
        tag(
          ctx,
          nar ? "sin θ" : `虚部 sin θ = ${sgn(s)}`,
          X(c) + (c >= 0 ? 8 : -8),
          Y(ey / 2),
          mut,
          c >= 0 ? "left" : "right",
        );
      }
      ctx.globalAlpha = m;
      if (m > 0.01) {
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = lime;
        ctx.beginPath();
        ctx.moveTo(X(lx), Y(0));
        ctx.lineTo(X(lx), Y(ly));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = ctx.fillStyle = lime;
      arrow(ctx, X(0), Y(0), X(lx), Y(ly));
      if (m > 0.01) {
        ctx.globalAlpha = Math.min(1, m * 1.5);
        ctx.strokeStyle = ctx.fillStyle = mint;
        arrow(ctx, X(lx), Y(ly), X(ex), Y(ey));
      }
      ctx.globalAlpha = 1 - m;
      if (1 - m > 0.01) side(0, 0, lx, ly, c, 0, nar ? "e^{iθ}" : `e^{iθ} = ${cpx(c, s)}`, lime);
      ctx.globalAlpha = m;
      if (m > 0.01) {
        side(0, 0, lx, ly, c, 0, nar ? "½e^{iθ}" : `½e^{iθ} = ${cpx(c / 2, s / 2)}`, lime);
        side(lx, ly, ex, ey, 0, 0, nar ? "½e^{−iθ}" : `½e^{−iθ} = ${cpx(c / 2, -s / 2)}`, mint);
      }
      ctx.globalAlpha = 1;
      // the sum / real part, dropped straight down to the waveform
      ctx.strokeStyle = red;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X(c), oy);
      ctx.lineTo(X(c), Yt(0));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = red;
      dot(ctx, X(c), oy, 5.5);
      dot(ctx, X(c), Yt(0), 5.5);
      if (nar) tag(ctx, `cos θ = ${sgn(c)}`, X(c), oy + (s > 0 ? 16 : -16), red, "center");
      else {
        const ly0 = oy + (s > 0 ? 16 : -16);
        if (m > 0.01) {
          ctx.globalAlpha = m;
          tag(ctx, `和 = cos θ = ${sgn(c)}`, X(c), ly0, red, "center");
        }
        if (m < 0.99) {
          ctx.globalAlpha = 1 - m;
          tag(ctx, `実部 = cos θ = ${sgn(c)}`, X(c), ly0, red, "center");
        }
        ctx.globalAlpha = 1;
      }
      tag(
        ctx,
        nar ? `今 ${sgn(c)}` : `今（t = ${t.toFixed(2)} s）の値 ${sgn(c)}`,
        X(c) + (c > 0 ? -10 : 10),
        Yt(0) + 2,
        red,
        c > 0 ? "right" : "left",
      );
    },
    (r) => {
      player(r, "t", 0.4, 10, (cur) => {
        const per = 1 / P(r, "f");
        return cur - per * Math.floor(cur / per);
      }); // wrap by whole periods: the picture is identical
      r.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) =>
        b.addEventListener("click", () => {
          PH.mode = b.dataset.mode!;
          BOOK["d-phasor"].draw();
        }),
      );
      const cv = C(r, "a"),
        ts = r.querySelector<HTMLInputElement>('[data-p="t"]')!;
      let drag = false;
      cv.style.touchAction = "none";
      cv.style.cursor = "grab";
      const set = (e: PointerEvent) => {
        const g = PH.geo;
        if (!g) return;
        const rc = cv.getBoundingClientRect(),
          x = e.clientX - rc.left,
          y = e.clientY - rc.top;
        const f = P(r, "f"),
          ph = (P(r, "ph") * Math.PI) / 180;
        let tt;
        if (y < g.Hc) {
          const ang = Math.atan2(-(y - g.oy), x - g.ox),
            per = 1 / f,
            cur = +ts.value;
          tt = ((((ang - ph) / (2 * Math.PI * f)) % per) + per) % per;
          tt += Math.floor(cur / per) * per;
          if (tt > 10) tt -= per;
        } else return;
        ts.value = String(Math.max(0, Math.min(10, tt)));
        BOOK["d-phasor"].draw();
      };
      cv.addEventListener("pointerdown", (e) => {
        drag = true;
        cv.setPointerCapture(e.pointerId);
        set(e);
      });
      cv.addEventListener("pointermove", (e) => {
        if (drag) set(e);
      });
      cv.addEventListener("pointerup", () => {
        drag = false;
      });
      cv.addEventListener("pointercancel", () => {
        drag = false;
      });
    },
  );

  // 1b. sum of sinusoids: component lanes + sum lane + spectrum (linked hover, draggable stems)
  type SyGeo = {
    ml: number;
    mr: number;
    top: number;
    laneH: number;
    gap: number;
    sumTop: number;
    sumH: number;
    W: number;
  };
  type SyComp = { on: boolean; w: number; f: number; a: number; ph: number };
  const SY: { hi: number; tx: number | null; geo: SyGeo | null; sg: Axes | null; drag: number } = {
    hi: -1,
    tx: null,
    geo: null,
    sg: null,
    drag: -1,
  };
  const SYC = ["--accent", "--trace3", "--trace2", "--ink"];
  const SYPRE: Record<string, number[][]> = {
    two: [
      [1, 1, 1, 0],
      [1, 3, 0.5, 0],
      [0, 5, 0.3, 0],
      [0, 7, 0.2, 0],
    ],
    square: [
      [1, 1, 1.27, -90],
      [1, 3, 0.42, -90],
      [1, 5, 0.25, -90],
      [1, 7, 0.18, -90],
    ],
    saw: [
      [1, 1, 0.64, -90],
      [1, 2, 0.32, 90],
      [1, 3, 0.21, -90],
      [1, 4, 0.16, 90],
    ],
    beat: [
      [1, 5, 1, 0],
      [1, 6, 1, 0],
      [0, 2, 0.5, 0],
      [0, 8, 0.3, 0],
    ],
  };
  function syComps(r: HTMLElement): SyComp[] {
    return [0, 1, 2, 3].map((i) => {
      const on = Pb(r, `c${i}on`);
      return {
        on,
        w: av("sy" + i, on ? 1 : 0),
        f: P(r, `c${i}f`),
        a: P(r, `c${i}a`),
        ph: P(r, `c${i}p`),
      };
    });
  }
  const syVal = (c: SyComp, t: number) =>
    c.w ? c.w * c.a * Math.cos(2 * Math.PI * c.f * t + (c.ph * Math.PI) / 180) : 0;
  const syLbl = (c: SyComp) =>
    `${c.a.toFixed(2)}·cos(2π·${+c.f.toFixed(2)}t ${c.ph < 0 ? "−" : "+"} ${Math.abs(Math.round(c.ph))}°)`;
  demo(
    "d-synth",
    (r) => {
      const cs = syComps(r),
        on = cs.map((c, i) => [c, i] as const).filter(([c]) => c.on);
      cs.forEach((c, i) => {
        O(r, `c${i}f`, +c.f.toFixed(2) + " Hz");
        O(r, `c${i}a`, c.a.toFixed(2));
        O(r, `c${i}p`, Math.round(c.ph) + "°");
        const card = r.querySelector(`[data-card="${i}"]`)!;
        card.classList.toggle("off", !c.on);
        card.classList.toggle("hi", SY.hi === i);
      });
      O(
        r,
        "read",
        on.length
          ? "x(t) = " +
              on
                .map(([c, i]) => `<span class="fg-${SYC[i]!.slice(2)}">${syLbl(c)}</span>`)
                .join(" + ")
          : "x(t) = 0（成分がすべてオフ）",
      );
      const dim = (i: number) => SY.hi >= 0 && SY.hi !== i;
      // ---- time canvas
      const { ctx, W, H } = prep(C(r, "a")),
        ml = 96,
        mr = 14,
        top = 6,
        gap = 8,
        sumH = Math.round(H * 0.32),
        laneH = (H - top - 40 - 12 - sumH - 4 * gap) / 4,
        sumTop = top + 4 * (laneH + gap) + 12;
      const TW = 2,
        X = (t: number) => ml + (t / TW) * (W - ml - mr),
        pw = W - ml - mr; // 2 s holds a whole number of periods for every f (multiples of 0.5 Hz) SY.geo={ml,mr,top,laneH,gap,sumTop,sumH,W};
      const amax = av("syamax", Math.max(0.5, ...cs.map((c) => c.a)));
      const N = Math.max(400, Math.round(pw * 1.5)),
        sum = new Float64Array(N + 1);
      let smax = 0.5;
      for (let k = 0; k <= N; k++) {
        const t = (TW * k) / N;
        let v = 0;
        for (const c of cs) v += syVal(c, t);
        sum[k] = v;
        smax = Math.max(smax, Math.abs(v));
      }
      smax = av("sysmax", smax);
      ctx.strokeStyle = css("--grid");
      ctx.lineWidth = 1;
      for (let t = 0; t <= TW + 1e-4; t += 0.25) {
        ctx.beginPath();
        ctx.moveTo(X(t), top);
        ctx.lineTo(X(t), sumTop + sumH);
        ctx.stroke();
      }
      cs.forEach((c, i) => {
        const y0 = top + i * (laneH + gap),
          cy = y0 + laneH / 2,
          sc = (laneH / 2 - 4) / amax;
        const hv = av("syh" + i, SY.hi === i ? 1 : 0);
        if (hv > 0.01) {
          ctx.globalAlpha = hv;
          ctx.fillStyle = css("--accent-soft");
          ctx.fillRect(ml, y0, pw, laneH);
          ctx.globalAlpha = 1;
        }
        const dv = av("syd" + i, dim(i) ? 0.3 : 1);
        ctx.strokeStyle = css("--line");
        ctx.beginPath();
        ctx.moveTo(ml, cy);
        ctx.lineTo(W - mr, cy);
        ctx.stroke();
        ctx.globalAlpha = (0.18 + 0.82 * c.w) * dv;
        ctx.strokeStyle = css(SYC[i]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k <= N; k++) {
          const t = (TW * k) / N,
            y = cy - c.a * Math.cos(2 * Math.PI * c.f * t + (c.ph * Math.PI) / 180) * sc;
          if (k) ctx.lineTo(X(t), y);
          else ctx.moveTo(X(t), y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.on ? css(SYC[i]) : css("--muted");
        ctx.globalAlpha = dim(i) ? 0.45 : 1;
        ctx.font = "16px " + css("--f-body");
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(c.on ? `成分 ${i + 1}` : `成分 ${i + 1}（オフ）`.slice(0, 4), 24, cy);
        ctx.globalAlpha = 1;
        if (SY.hi === i && c.on && SY.tx == null)
          tag(ctx, syLbl(c), W - mr - 6, y0 + 12, css(SYC[i]), "right");
        ctx.fillStyle = css("--muted");
        ctx.font = "16px " + css("--f-mono");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (i > 0) ctx.fillText("+", 10, y0 - gap / 2 + 2);
      });
      ctx.fillStyle = css("--ink");
      ctx.font = "bold 18px " + css("--f-mono");
      ctx.textAlign = "center";
      ctx.fillText("=", 10, sumTop + sumH / 2);
      ctx.fillStyle = css("--accent2");
      ctx.font = "16px " + css("--f-body");
      ctx.textAlign = "left";
      ctx.fillText("合計", 24, sumTop + sumH / 2 - 11);
      ctx.fillText("x(t)", 24, sumTop + sumH / 2 + 11);
      {
        const cy = sumTop + sumH / 2,
          sc = (sumH / 2 - 6) / smax;
        ctx.strokeStyle = css("--line");
        ctx.strokeRect(ml + 0.5, sumTop + 0.5, pw, sumH);
        ctx.beginPath();
        ctx.moveTo(ml, cy);
        ctx.lineTo(W - mr, cy);
        ctx.stroke();
        ctx.strokeStyle = css("--accent2");
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let k = 0; k <= N; k++) {
          const y = cy - sum[k] * sc;
          if (k) ctx.lineTo(X((TW * k) / N), y);
          else ctx.moveTo(X((TW * k) / N), y);
        }
        ctx.stroke();
        // cursor: values at one instant, showing the addition
        if (SY.tx != null) {
          const t = SY.tx,
            px = X(t);
          ctx.strokeStyle = css("--ink");
          ctx.globalAlpha = 0.6;
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px, top);
          ctx.lineTo(px, sumTop + sumH);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          const parts: number[] = [];
          let tot = 0;
          cs.forEach((c, i) => {
            if (c.w < 0.02) return;
            const v = syVal(c, t);
            tot += v;
            parts.push(v);
            const y0 = top + i * (laneH + gap),
              y = y0 + laneH / 2 - (v * (laneH / 2 - 4)) / amax;
            ctx.fillStyle = css(SYC[i]);
            dot(ctx, px, y, 4.5);
            tag(ctx, sgn(v), px + (t < 1.6 ? 8 : -8), y, css(SYC[i]), t < 1.6 ? "left" : "right");
          });
          const y = cy - tot * sc;
          ctx.fillStyle = css("--accent2");
          dot(ctx, px, y, 5.5);
          tag(
            ctx,
            `t=${t.toFixed(2)} s：${parts.map(sgn).join(" + ").replace(/\+ −/g, "− ")} = ${sgn(tot)}`,
            px + (t < 1 ? 10 : -10),
            Math.min(sumTop + sumH - 14, Math.max(sumTop + 36, y)),
            css("--accent2"),
            t < 1 ? "left" : "right",
          );
        }
      }
      ctx.fillStyle = css("--muted");
      ctx.font = "16px " + css("--f-mono");
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let t = 0; t <= TW + 1e-4; t += 0.5) ctx.fillText(t.toFixed(1), X(t), sumTop + sumH + 5);
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("時間 t [s]", W - mr, H - 1);
      // ---- spectrum
      const B = axes(C(r, "b"), {
          x0: 0,
          x1: 10.5,
          y0: 0,
          y1: 2.3,
          xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          xlabel: "周波数 [Hz]",
          ylabel: "振幅 A",
        }),
        b = B.ctx;
      SY.sg = B;
      tag(
        b,
        "点をドラッグすると f と A が変わります",
        B.m.l + B.pw - 4,
        B.m.t + 12,
        css("--muted"),
        "right",
      );
      cs.forEach((c, i) => {
        if (c.w < 0.005) return;
        const ah = c.a * c.w;
        b.globalAlpha = c.w * av("syd" + i, dim(i) ? 0.3 : 1);
        const col = css(SYC[i]);
        b.strokeStyle = b.fillStyle = col;
        b.lineWidth = 3 + av("syh" + i, SY.hi === i ? 1 : 0);
        b.beginPath();
        b.moveTo(B.X(c.f), B.Y(0));
        b.lineTo(B.X(c.f), B.Y(ah));
        b.stroke();
        dot(b, B.X(c.f), B.Y(ah), 6.5 + 1.5 * av("syh" + i, SY.hi === i ? 1 : 0));
        const al = c.f < 1.5 ? "left" : c.f > 9 ? "right" : "center";
        tag(b, `f=${+c.f.toFixed(2)} A=${c.a.toFixed(2)}`, B.X(c.f), B.Y(ah) - 38, col, al);
        tag(b, `φ=${Math.round(c.ph)}°`, B.X(c.f), B.Y(ah) - 16, col, al);
        b.globalAlpha = 1;
      });
    },
    (r) => {
      r.querySelectorAll<HTMLElement>("[data-syp]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const pr = btn.dataset.syp!;
          const q = (i: number, k: string) =>
            r.querySelector<HTMLInputElement>(`[data-p="c${i}${k}"]`)!;
          const tg = [0, 1, 2, 3].map((i) =>
            SYPRE[pr]
              ? SYPRE[pr][i]!
              : [
                  1,
                  0.5 * Math.ceil(Math.random() * 20),
                  Math.round(Math.random() * 150) / 100 + 0.1,
                  5 * Math.round(Math.random() * 72 - 36),
                ],
          );
          const fr = [0, 1, 2, 3].map((i) => [
            q(i, "on").checked,
            +q(i, "f").value,
            q(i, "on").checked ? +q(i, "a").value : 0,
            +q(i, "p").value,
          ]);
          tg.forEach((v, i) => {
            if (v[0]) q(i, "on").checked = true;
          });
          tween(
            "synth",
            600,
            (u) => {
              tg.forEach((v, i) => {
                const f = fr[i],
                  L = (x: number, y: number) => String(x + (y - x) * u);
                q(i, "f").value = L(+f[1], v[1]);
                q(i, "a").value = L(+f[2], v[0] ? v[2] : 0);
                q(i, "p").value = L(+f[3], v[3]);
              });
              requestDemo("d-synth");
            },
            () => {
              tg.forEach((v, i) => {
                q(i, "on").checked = !!v[0];
                q(i, "f").value = String(v[1]);
                q(i, "a").value = String(v[2]);
                q(i, "p").value = String(v[3]);
              });
              BOOK["d-synth"].draw();
            },
          );
        }),
      );
      r.querySelectorAll<HTMLInputElement>("input[type=range]").forEach((el) =>
        el.addEventListener("input", () => {
          const k = el.dataset.p!.slice(-1),
            q = k === "f" ? 0.5 : k === "p" ? 5 : 0.01;
          el.value = String(Math.round(+el.value / q) * q);
        }),
      );
      r.querySelectorAll<HTMLElement>("[data-card]").forEach((cd) => {
        cd.addEventListener("pointerenter", () => {
          SY.hi = +cd.dataset.card!;
          BOOK["d-synth"].draw();
        });
        cd.addEventListener("pointerleave", () => {
          SY.hi = -1;
          BOOK["d-synth"].draw();
        });
      });
      const ca = C(r, "a"),
        cb = C(r, "b");
      ca.addEventListener("pointermove", (e) => {
        const g = SY.geo;
        if (!g) return;
        const rc = ca.getBoundingClientRect(),
          x = e.clientX - rc.left,
          y = e.clientY - rc.top;
        SY.tx = Math.max(0, Math.min(2, (2 * (x - g.ml)) / (g.W - g.ml - g.mr)));
        const li = Math.floor((y - g.top) / (g.laneH + g.gap));
        SY.hi = y < g.sumTop && li >= 0 && li < 4 ? li : -1;
        BOOK["d-synth"].draw();
      });
      ca.addEventListener("pointerleave", () => {
        SY.tx = null;
        SY.hi = -1;
        BOOK["d-synth"].draw();
      });
      const near = (e: PointerEvent) => {
        const B = SY.sg;
        if (!B) return -1;
        const rc = cb.getBoundingClientRect(),
          x = e.clientX - rc.left,
          y = e.clientY - rc.top;
        const cs = syComps(r);
        let best = -1,
          bd = 24;
        cs.forEach((c, i) => {
          if (!c.on) return;
          const d = Math.hypot(x - B.X(c.f), y - B.Y(c.a));
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        return best;
      };
      cb.style.touchAction = "none";
      cb.addEventListener("pointerdown", (e) => {
        const i = near(e);
        if (i < 0) return;
        SY.drag = i;
        SY.hi = i;
        cb.setPointerCapture(e.pointerId);
        cb.style.cursor = "grabbing";
      });
      cb.addEventListener("pointermove", (e) => {
        const B = SY.sg;
        if (!B) return;
        if (SY.drag < 0) {
          const i = near(e);
          cb.style.cursor = i >= 0 ? "grab" : "default";
          if (i !== SY.hi) {
            SY.hi = i;
            BOOK["d-synth"].draw();
          }
          return;
        }
        const rc = cb.getBoundingClientRect(),
          x = e.clientX - rc.left,
          y = e.clientY - rc.top,
          i = SY.drag;
        const f = Math.max(0.5, Math.min(10, Math.round(B.Xi(x) * 2) / 2)),
          a = Math.max(0, Math.min(2, Math.round(B.Yi(y) * 20) / 20));
        r.querySelector<HTMLInputElement>(`[data-p="c${i}f"]`)!.value = String(f);
        r.querySelector<HTMLInputElement>(`[data-p="c${i}a"]`)!.value = String(a);
        BOOK["d-synth"].draw();
      });
      const end = () => {
        SY.drag = -1;
        cb.style.cursor = "default";
      };
      cb.addEventListener("pointerup", end);
      cb.addEventListener("pointercancel", end);
      cb.addEventListener("pointerleave", () => {
        if (SY.drag < 0) {
          SY.hi = -1;
          BOOK["d-synth"].draw();
        }
      });
    },
  );

  // 1c. why a real signal has peaks at +f and −f
  const TS = { mode: "real" };
  demo(
    "d-twoside",
    (r) => {
      const f = P(r, "f"),
        A = P(r, "A"),
        phd = P(r, "ph"),
        ph = (phd * Math.PI) / 180,
        t = P(r, "t");
      const real = TS.mode === "real",
        m = av("tsm", real ? 1 : 0, 420); // m=1: A·cos  (½A at +f and ½A at −f);  m=0: A·e^{iθ} (A at +f only)
      r.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.mode === TS.mode)),
      );
      O(r, "f", f.toFixed(1) + " Hz");
      O(r, "A", A.toFixed(2));
      O(r, "ph", phd + "°");
      O(r, "t", t.toFixed(2) + " s");
      const th = 2 * Math.PI * f * t + ph,
        c = Math.cos(th),
        s = Math.sin(th);
      const ap = A * (1 - 0.5 * m),
        an = A * 0.5 * m; // lengths of the +f and −f vectors
      const px = ap * c,
        py = ap * s,
        sx = px + an * c,
        sy = py - an * s; // tip of +f vector, tip of the sum
      O(
        r,
        "read",
        real
          ? `+f の矢印 ${cpx((A / 2) * c, (A / 2) * s)}　＋　−f の矢印 ${cpx((A / 2) * c, (-A / 2) * s)}　＝　<b>${sgn(A * c)}</b>（虚部が打ち消されて実数）`
          : `+f の矢印だけ ${cpx(A * c, A * s)}　→ 虚部 ${sgn(A * s)} が残るので<b>実数にならない</b>`,
      );
      const lime = css("--accent"),
        mint = css("--trace3"),
        red = css("--trace2"),
        mut = css("--muted");
      // ---- complex plane
      const Pl = plane(C(r, "a"), 1.6),
        ctx = Pl.ctx;
      ctx.strokeStyle = mut;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(Pl.ox, Pl.oy, (Pl.s / 1.6) * A, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // path of the sum over one period
      ctx.strokeStyle = red;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const a = (2 * Math.PI * i) / 120,
          X0 = A * (1 - 0.5 * m) * Math.cos(a) + A * 0.5 * m * Math.cos(a),
          Y0 = A * (1 - 0.5 * m) * Math.sin(a) - A * 0.5 * m * Math.sin(a);
        if (i) ctx.lineTo(Pl.X(X0), Pl.Y(Y0));
        else ctx.moveTo(Pl.X(X0), Pl.Y(Y0));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = ctx.fillStyle = lime;
      arrow(ctx, Pl.ox, Pl.oy, Pl.X(px), Pl.Y(py));
      if (an > 0.005) {
        ctx.strokeStyle = ctx.fillStyle = mint;
        ctx.globalAlpha = Math.min(1, m * 1.5);
        arrow(ctx, Pl.X(px), Pl.Y(py), Pl.X(sx), Pl.Y(sy));
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = red;
      dot(ctx, Pl.X(sx), Pl.Y(sy), 6);
      tag(
        ctx,
        "+f：反時計回り",
        Pl.X(px / 2) + (c >= 0 ? -10 : 10),
        Pl.Y(py / 2) - 14,
        lime,
        c >= 0 ? "right" : "left",
      );
      if (m > 0.05) {
        ctx.globalAlpha = m;
        tag(
          ctx,
          "−f：時計回り",
          Pl.X((px + sx) / 2) + (c >= 0 ? 10 : -10),
          Pl.Y((py + sy) / 2) + (s >= 0 ? -14 : 14),
          mint,
          c >= 0 ? "left" : "right",
        );
        ctx.globalAlpha = 1;
      }
      tag(
        ctx,
        real ? "和は実軸の上だけを往復" : "和は円を回り続ける（虚部が残る）",
        8,
        Pl.H - 16,
        red,
        "left",
      );
      // ---- two-sided spectrum
      const fm = 4,
        B = axes(C(r, "b"), {
          x0: -fm,
          x1: fm,
          y0: 0,
          y1: 2.1,
          xticks: [-4, -3, -2, -1, 0, 1, 2, 3, 4],
          xlabel: "周波数 [Hz]（左が負、右が正）",
          ylabel: "矢印の長さ",
        }),
        b = B.ctx;
      b.fillStyle = css("--accent-soft");
      b.globalAlpha = 0.6;
      b.fillRect(B.X(-fm), B.m.t, B.X(0) - B.X(-fm), B.ph);
      b.globalAlpha = 1;
      tag(b, "− 側：時計回り", B.X(-fm) + 6, B.m.t + 14, mint, "left");
      tag(b, "+ 側：反時計回り", B.X(fm) - 6, B.m.t + 14, lime, "right");
      const stem = (x: number, h: number, col: string, lines: string[]) => {
        if (h < 0.005) return;
        b.strokeStyle = b.fillStyle = col;
        b.lineWidth = 4;
        b.beginPath();
        b.moveTo(B.X(x), B.Y(0));
        b.lineTo(B.X(x), B.Y(h));
        b.stroke();
        dot(b, B.X(x), B.Y(h), 7);
        const right = x > 0,
          lx = B.X(x) + (right ? 12 : -12);
        lines.forEach((t, i) => tag(b, t, lx, B.Y(h) - 6 + i * 24, col, right ? "left" : "right"));
      };
      b.globalAlpha = 1;
      stem(f, ap, lime, [`+${f} Hz`, `長さ ${ap.toFixed(2)}`, `位相 ${phd}°`]);
      b.globalAlpha = Math.min(1, m * 1.5);
      stem(-f, an, mint, [`−${f} Hz`, `長さ ${an.toFixed(2)}`, `位相 ${-phd}°`]);
      b.globalAlpha = 1;
    },
    (r) => {
      player(r, "t", 0.4, 10, (cur) => {
        const per = 1 / P(r, "f");
        return cur - per * Math.floor(cur / per);
      });
      r.querySelectorAll<HTMLElement>("[data-mode]").forEach((b) =>
        b.addEventListener("click", () => {
          TS.mode = b.dataset.mode!;
          BOOK["d-twoside"].draw();
        }),
      );
    },
  );

  // 1e. thought experiment: hold a "ruler" wave against the signal, score the likeness, sweep the ruler
  const MT: { T: number; N: number; curve: Pt[] | null } = { T: 2, N: 600, curve: null };
  const mtX = (t: number) => Math.cos(2 * Math.PI * 1 * t) + 0.5 * Math.cos(2 * Math.PI * 3 * t);
  function mtScore(fp: number) {
    const { T, N } = MT;
    let s = 0;
    for (let i = 0; i < N; i++) {
      const t = (T * i) / N;
      s += mtX(t) * Math.cos(2 * Math.PI * fp * t);
    }
    return s / N;
  }
  demo(
    "d-match",
    (r) => {
      const fp = P(r, "fp"),
        T = MT.T,
        lime = css("--accent"),
        mint = css("--trace3"),
        red = css("--trace2"),
        ink = css("--ink"),
        mut = css("--muted");
      O(r, "fp", fp.toFixed(2) + " Hz");
      if (!MT.curve) {
        MT.curve = [];
        for (let i = 0; i <= 300; i++) {
          const f = i * 0.02;
          MT.curve.push([f, mtScore(f)]);
        }
      }
      const sc = mtScore(fp);
      // 1) signal vs ruler, with agreement strips
      const A = axes(C(r, "a"), {
          x0: 0,
          x1: T,
          y0: -1.7,
          y1: 1.7,
          zero: true,
          ylabel: "信号（黄緑）と ものさしの波（白）",
        }),
        a = A.ctx,
        M = 400;
      for (let i = 0; i < M; i++) {
        const t0 = (T * i) / M,
          t1 = (T * (i + 1)) / M,
          tm = (t0 + t1) / 2,
          same = mtX(tm) * Math.cos(2 * Math.PI * fp * tm) >= 0;
        a.fillStyle = same ? mint : red;
        a.globalAlpha = 0.13;
        a.fillRect(A.X(t0), A.m.t, A.X(t1) - A.X(t0) + 0.5, A.ph);
      }
      a.globalAlpha = 1;
      const xs = [],
        ps = [],
        pr = [];
      for (let i = 0; i <= 600; i++) {
        const t = (T * i) / 600,
          x = mtX(t),
          c = Math.cos(2 * Math.PI * fp * t);
        xs.push([t, x]);
        ps.push([t, c]);
        pr.push([t, x * c]);
      }
      a.strokeStyle = ink;
      a.lineWidth = 1.4;
      a.setLineDash([5, 4]);
      line(a, ps, A.X, A.Y);
      a.setLineDash([]);
      a.strokeStyle = lime;
      a.lineWidth = 2.2;
      line(a, xs, A.X, A.Y);
      tag(a, "同じ向き", A.m.l + 8, A.m.t + 14, mint, "left");
      tag(a, "逆向き", A.m.l + 100, A.m.t + 14, red, "left");
      // 2) product and its average
      const B = axes(C(r, "b"), {
          x0: 0,
          x1: T,
          y0: -1.7,
          y1: 1.7,
          zero: true,
          ylabel: "掛け算（積）と その平均",
        }),
        b = B.ctx;
      b.beginPath();
      b.moveTo(B.X(0), B.Y(0));
      for (const [t, v] of pr) b.lineTo(B.X(t), B.Y(v));
      b.lineTo(B.X(T), B.Y(0));
      b.closePath();
      b.fillStyle = mint;
      b.globalAlpha = 0.2;
      b.fill();
      b.globalAlpha = 1;
      b.strokeStyle = mint;
      b.lineWidth = 1.6;
      line(b, pr, B.X, B.Y);
      const scd = av("mtsc", sc, 200);
      b.strokeStyle = ink;
      b.lineWidth = 2.4;
      b.beginPath();
      b.moveTo(B.X(0), B.Y(scd));
      b.lineTo(B.X(T), B.Y(scd));
      b.stroke();
      tag(b, `平均 = ${sgn(sc)}`, B.X(T) - 6, B.Y(scd) + (scd >= 0 ? -16 : 16), ink, "right");
      // 3) the average recorded for every ruler frequency = the spectrum
      const G = axes(C(r, "c"), {
          x0: 0,
          x1: 6,
          y0: -0.2,
          y1: 0.65,
          zero: true,
          xlabel: "ものさしの周波数 [Hz]",
          ylabel: "似ている度合い（積の平均）",
        }),
        g = G.ctx;
      g.strokeStyle = mut;
      g.globalAlpha = 0.35;
      g.lineWidth = 1.4;
      line(g, MT.curve, G.X, G.Y);
      g.globalAlpha = 1;
      g.strokeStyle = lime;
      g.lineWidth = 2.4;
      line(
        g,
        MT.curve.filter((p) => p[0] <= fp + 1e-9),
        G.X,
        G.Y,
      );
      vline(G, fp, red, [3, 3]);
      g.fillStyle = red;
      dot(g, G.X(fp), G.Y(sc), 5.5);
      if (fp > 0.9) tag(g, "1 Hz が入っている", G.X(1), G.Y(0.5) - 16, lime, "center");
      if (fp > 2.9) tag(g, "3 Hz が入っている", G.X(3), G.Y(0.25) - 16, lime, "center");
      const near = Math.abs(fp - 1) < 0.08 ? "1 Hz" : Math.abs(fp - 3) < 0.08 ? "3 Hz" : "";
      O(
        r,
        "read",
        near
          ? `ものさし ${fp.toFixed(2)} Hz：平均 <b>${sgn(sc)}</b>　← 信号に ${near} が入っている`
          : `ものさし ${fp.toFixed(2)} Hz：平均 ${sgn(sc)}（ほぼ 0 ＝ 入っていない）`,
      );
    },
    (r) => {
      player(r, "fp", 0.5, 6, false);
    },
  );

  // 1d. measuring "how much of frequency f is in x": multiply by cos / sin and average
  demo(
    "d-probe",
    (r) => {
      const f = P(r, "f"),
        A = P(r, "A"),
        phd = P(r, "ph"),
        ph = (phd * Math.PI) / 180,
        fp = P(r, "fp"),
        T = 2,
        N = 800;
      O(r, "f", f + " Hz");
      O(r, "A", A.toFixed(2));
      O(r, "ph", phd + "°");
      O(r, "fp", fp + " Hz");
      const lime = css("--accent"),
        mint = css("--trace3"),
        red = css("--trace2"),
        ink = css("--ink"),
        mut = css("--muted");
      const xs = [],
        pc = [],
        ps = [];
      let Cm = 0,
        Sm = 0;
      for (let i = 0; i <= N; i++) {
        const t = (T * i) / N,
          x = A * Math.cos(2 * Math.PI * f * t + ph),
          c = Math.cos(2 * Math.PI * fp * t),
          s = Math.sin(2 * Math.PI * fp * t);
        xs.push([t, x]);
        pc.push([t, x * c, c]);
        ps.push([t, x * s, s]);
        if (i < N) {
          Cm += x * c;
          Sm += x * s;
        }
      }
      Cm /= N;
      Sm /= N;
      const Cd = av("pbC", Cm, 320),
        Sd = av("pbS", Sm, 320),
        Ad = av("pbA", A, 320);
      const ylim = Math.max(1.2, A * 1.15);
      // signal
      const P1 = axes(C(r, "a"), {
        x0: 0,
        x1: T,
        y0: -ylim,
        y1: ylim,
        zero: true,
        ylabel: "x(t)　調べたい信号",
      });
      P1.ctx.strokeStyle = lime;
      P1.ctx.lineWidth = 2;
      line(P1.ctx, xs, P1.X, P1.Y);
      // a product panel: probe (dashed), product (filled), mean (bar on the right)
      const panel = (
        cv: HTMLCanvasElement,
        pts: number[][],
        col: string,
        name: string,
        mean: number,
        meanD: number,
      ) => {
        const Q = axes(cv, {
            x0: 0,
            x1: T,
            y0: -ylim,
            y1: ylim,
            zero: true,
            ylabel: name,
            xlabel: cv === C(r, "c") ? "時間 t [s]" : "",
          }),
          q = Q.ctx;
        q.strokeStyle = mut;
        q.lineWidth = 1.2;
        q.setLineDash([4, 4]);
        line(
          q,
          pts.map((p) => [p[0], p[2]]),
          Q.X,
          Q.Y,
        );
        q.setLineDash([]);
        q.beginPath();
        q.moveTo(Q.X(0), Q.Y(0));
        for (const p of pts) q.lineTo(Q.X(p[0]), Q.Y(p[1]));
        q.lineTo(Q.X(T), Q.Y(0));
        q.closePath();
        q.fillStyle = col;
        q.globalAlpha = 0.22;
        q.fill();
        q.globalAlpha = 1;
        q.strokeStyle = col;
        q.lineWidth = 1.8;
        line(
          q,
          pts.map((p) => [p[0], p[1]]),
          Q.X,
          Q.Y,
        );
        q.strokeStyle = ink;
        q.lineWidth = 2.4;
        q.beginPath();
        q.moveTo(Q.X(0), Q.Y(meanD));
        q.lineTo(Q.X(T), Q.Y(meanD));
        q.stroke();
        tag(
          q,
          `平均 = ${sgn(mean)}`,
          Q.X(T) - 6,
          Q.Y(meanD) + (meanD >= 0 ? -16 : 16),
          ink,
          "right",
        );
      };
      panel(C(r, "b"), pc, mint, "x(t) × cos(2π·fp·t)", Cm, Cd);
      panel(C(r, "c"), ps, red, "x(t) × sin(2π·fp·t)", Sm, Sd);
      // the two measurements as one arrow
      const R = Math.max(0.7, Ad * 0.62),
        Pl = plane(C(r, "d"), R),
        g = Pl.ctx,
        ex = Cd,
        ey = -Sd,
        L = Math.hypot(ex, ey);
      g.strokeStyle = mut;
      g.globalAlpha = 0.4;
      g.beginPath();
      g.arc(Pl.ox, Pl.oy, (Pl.s * (Ad / 2)) / R, 0, 7);
      g.stroke();
      g.globalAlpha = 1;
      g.setLineDash([3, 3]);
      g.lineWidth = 1.2;
      g.strokeStyle = mint;
      g.beginPath();
      g.moveTo(Pl.X(ex), Pl.Y(ey));
      g.lineTo(Pl.X(ex), Pl.Y(0));
      g.stroke();
      g.strokeStyle = red;
      g.beginPath();
      g.moveTo(Pl.X(ex), Pl.Y(ey));
      g.lineTo(Pl.X(0), Pl.Y(ey));
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = g.fillStyle = lime;
      g.lineWidth = 2.8;
      arrow(g, Pl.ox, Pl.oy, Pl.X(ex), Pl.Y(ey));
      dot(g, Pl.X(ex), Pl.Y(ey), 4);
      if (L > 0.02) {
        const tm = Math.atan2(ey, ex),
          rad = 22;
        g.strokeStyle = mut;
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(Pl.ox, Pl.oy, rad, 0, -tm, tm > 0);
        g.stroke();
      }
      tag(g, "cos の平均", Pl.X(ex), Pl.oy + (ey >= 0 ? 16 : -16), mint, "center");
      tag(g, "sin の平均（符号反転）", 8, Pl.Y(ey) + (ey >= 0 ? -16 : 16), red, "left");
      const match = Math.abs(fp - f) < 1e-9;
      O(
        r,
        "read",
        match
          ? `矢印の長さ ${L.toFixed(2)} ＝ A/2 ＝ ${(A / 2).toFixed(2)}　　角度 ${((Math.atan2(-Sm, Cm) * 180) / Math.PI).toFixed(0)}° ＝ φ`
          : `f<sub>p</sub> = ${fp} Hz は信号の ${f} Hz と違うので、どちらの平均も 0 → 矢印は消える`,
      );
    },
    () => {},
  );

  // ===== demos added for the restructured chapters =====
  const sincN = (x: number) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  const piTicks = (lo: number, hi: number) => {
    const t: number[] = [];
    for (let k = Math.ceil(lo / Math.PI); k <= Math.floor(hi / Math.PI); k++) t.push(k * Math.PI);
    return t;
  };
  const piFmt = (v: number) => {
    const k = Math.round(v / Math.PI);
    return k === 0 ? "0" : k === 1 ? "π" : k === -1 ? "−π" : (k < 0 ? "−" : "") + Math.abs(k) + "π";
  };

  // 3.1 make the period longer: line spectrum -> continuous spectrum
  const PD = { T0: 2, w: 0.5 };
  demo(
    "d-period",
    (r) => {
      const T0 = PD.T0,
        w = PD.w,
        inf = !isFinite(T0),
        lime = css("--accent"),
        red = css("--trace2"),
        mut = css("--muted"),
        ink = css("--ink");
      r.querySelectorAll<HTMLElement>("[data-t0]").forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(+b.dataset.t0! === T0 || (b.dataset.t0 === "inf" && inf)),
        ),
      );
      // time
      const A = axes(C(r, "a"), {
          x0: -8,
          x1: 8,
          y0: -0.2,
          y1: 1.35,
          zero: true,
          xlabel: "時間 t [s]",
          ylabel: "信号（幅 0.5 s のパルス）",
        }),
        a = A.ctx;
      a.fillStyle = lime;
      a.globalAlpha = 0.25;
      a.strokeStyle = lime;
      a.lineWidth = 2;
      const starts = inf
        ? [0]
        : (() => {
            const s = [];
            for (let m = Math.floor(-8 / T0) - 1; m <= Math.ceil(8 / T0) + 1; m++) s.push(m * T0);
            return s;
          })();
      for (const c of starts) {
        if (c + w / 2 < -8 || c - w / 2 > 8) continue;
        a.globalAlpha = 0.25;
        a.fillRect(A.X(c - w / 2), A.Y(1), A.X(c + w / 2) - A.X(c - w / 2), A.Y(0) - A.Y(1));
        a.globalAlpha = 1;
        a.beginPath();
        a.moveTo(A.X(c - w / 2), A.Y(0));
        a.lineTo(A.X(c - w / 2), A.Y(1));
        a.lineTo(A.X(c + w / 2), A.Y(1));
        a.lineTo(A.X(c + w / 2), A.Y(0));
        a.stroke();
      }
      if (!inf) {
        a.strokeStyle = mut;
        a.lineWidth = 1;
        a.setLineDash([3, 3]);
        a.beginPath();
        a.moveTo(A.X(0), A.Y(1.2));
        a.lineTo(A.X(T0), A.Y(1.2));
        a.stroke();
        a.setLineDash([]);
        tag(a, `周期 T₀ = ${T0} s`, A.X(T0 / 2), A.Y(1.2) - 14, ink, "center");
      } else tag(a, "周期 ∞（パルスは 1 回だけ）", A.X(0), A.Y(1.2) - 10, ink, "center");
      // spectrum: lines at k/T0 with height T0·F_k = w·sinc(k w/T0); envelope = Fourier transform
      const B = axes(C(r, "b"), {
          x0: -6,
          x1: 6,
          y0: -0.15,
          y1: 0.6,
          zero: true,
          xlabel: "周波数 [Hz]",
          ylabel: "スペクトル（× T₀）",
        }),
        b = B.ctx;
      const env = [];
      for (let i = 0; i <= 600; i++) {
        const f = -6 + (12 * i) / 600;
        env.push([f, w * sincN(f * w)]);
      }
      b.strokeStyle = mut;
      b.lineWidth = 1.4;
      b.setLineDash([5, 4]);
      line(b, env, B.X, B.Y);
      b.setLineDash([]);
      if (inf) {
        b.strokeStyle = lime;
        b.lineWidth = 2.6;
        line(b, env, B.X, B.Y);
      } else {
        b.strokeStyle = b.fillStyle = lime;
        b.lineWidth = 2.2;
        for (let k = Math.ceil(-6 * T0); k <= Math.floor(6 * T0); k++) {
          const f = k / T0,
            h = w * sincN(f * w);
          b.beginPath();
          b.moveTo(B.X(f), B.Y(0));
          b.lineTo(B.X(f), B.Y(h));
          b.stroke();
          dot(b, B.X(f), B.Y(h), T0 >= 8 ? 1.8 : 3);
        }
        b.strokeStyle = red;
        b.lineWidth = 1.5;
        const y = B.Y(0.52);
        b.beginPath();
        b.moveTo(B.X(0), y);
        b.lineTo(B.X(1 / T0), y);
        b.stroke();
        tag(b, `線の間隔 1/T₀ = ${(1 / T0).toFixed(3)} Hz`, B.X(1 / T0) + 8, y, red, "left");
      }
      tag(b, "破線：フーリエ変換（sinc）", B.X(6) - 6, B.Y(-0.08), mut, "right");
      O(
        r,
        "read",
        inf
          ? "周期が無限大になると線の間隔が 0 になり、スペクトルは<b>連続した曲線</b>になります。これがフーリエ変換です。"
          : `周期 ${T0} s → 線は ${(1 / T0).toFixed(3)} Hz おきに並ぶ（フーリエ級数）。周期を伸ばすほど線が密になり、破線の曲線に近づきます。`,
      );
    },
    (r) => {
      r.querySelectorAll<HTMLElement>("[data-t0]").forEach((b) =>
        b.addEventListener("click", () => {
          r.querySelectorAll("canvas").forEach(snapFade);
          PD.T0 = b.dataset.t0 === "inf" ? Infinity : +b.dataset.t0!;
          BOOK["d-period"].draw();
        }),
      );
    },
  );

  // 5 / 6. DTFT of a short sequence; DFT = N samples of it (one demo, two instances)
  function makeDtft(id: string, showDft: boolean) {
    const ST = { kind: "rect" };
    demo(id, (r) => {
      const L = P(r, "L"),
        N = showDft ? P(r, "N") : 0,
        lime = css("--accent"),
        red = css("--trace2"),
        mut = css("--muted"),
        mint = css("--trace3"),
        ink = css("--ink");
      O(r, "L", L + " 点");
      if (showDft) O(r, "N", N + " 点");
      ST.kind = Ps(r, "kind");
      const x = (n: number) => {
        if (n < 0 || n >= 16) return 0;
        if (ST.kind === "rect") return n < L ? 1 : 0;
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * (n + 0.5)) / 16);
        return Math.cos((Math.PI / 3) * n) * w;
      };
      // time
      const A = axes(C(r, "a"), {
          x0: -6,
          x1: showDft ? 2 * N + 4 : 24,
          y0: -1.15,
          y1: 1.25,
          zero: true,
          xlabel: "n（サンプル番号）",
          ylabel: showDft ? "x[n]（白）と、周期 N で繰り返したもの（緑）" : "x[n]",
        }),
        a = A.ctx;
      const lim = showDft ? 2 * N + 4 : 24;
      for (let n = -6; n <= lim; n++) {
        let v = x(n),
          col = lime,
          al = 1;
        if (showDft) {
          const m = ((n % N) + N) % N;
          const vp = x(m);
          if ((n < 0 || n >= N) && Math.abs(vp) > 1e-9) {
            v = vp;
            col = mint;
            al = 0.65;
          } else if (n < 0 || n >= N) v = 0;
        }
        a.globalAlpha = al;
        a.strokeStyle = a.fillStyle = col;
        a.lineWidth = 2;
        a.beginPath();
        a.moveTo(A.X(n), A.Y(0));
        a.lineTo(A.X(n), A.Y(v));
        a.stroke();
        dot(a, A.X(n), A.Y(v), Math.abs(v) > 1e-9 ? 3.6 : 2);
      }
      a.globalAlpha = 1;
      if (showDft) {
        a.strokeStyle = mut;
        a.setLineDash([3, 3]);
        a.lineWidth = 1;
        for (const c of [0, N]) {
          a.beginPath();
          a.moveTo(A.X(c - 0.5), A.m.t);
          a.lineTo(A.X(c - 0.5), A.m.t + A.ph);
          a.stroke();
        }
        a.setLineDash([]);
        tag(a, `1 周期 = N = ${N}`, A.X(N / 2), A.m.t + 14, ink, "center");
      }
      // DTFT magnitude
      const w0 = -3 * Math.PI,
        w1 = 3 * Math.PI,
        pts = [];
      let mx = 0;
      for (let i = 0; i <= 900; i++) {
        const om = w0 + ((w1 - w0) * i) / 900;
        let re = 0,
          im = 0;
        for (let n = 0; n < 16; n++) {
          const v = x(n);
          re += v * Math.cos(om * n);
          im -= v * Math.sin(om * n);
        }
        const m = Math.hypot(re, im);
        pts.push([om, m]);
        mx = Math.max(mx, m);
      }
      const B = axes(C(r, "b"), {
          x0: w0,
          x1: w1,
          y0: 0,
          y1: av(id + "mx", mx * 1.18 || 1),
          xticks: piTicks(w0, w1),
          xfmt: piFmt,
          xlabel: "正規化角周波数 ω",
          ylabel: "|X(ω)|",
        }),
        b = B.ctx;
      b.fillStyle = css("--accent-soft");
      b.fillRect(B.X(-Math.PI), B.m.t, B.X(Math.PI) - B.X(-Math.PI), B.ph);
      tag(b, "−π〜π の 1 周期", B.X(0), B.m.t + 14, lime, "center");
      b.strokeStyle = lime;
      b.lineWidth = 2.2;
      line(b, pts, B.X, B.Y);
      if (showDft) {
        const Xk = (k: number) => {
          const om = (2 * Math.PI * k) / N;
          let re = 0,
            im = 0;
          for (let n = 0; n < 16; n++) {
            const v = x(n);
            re += v * Math.cos(om * n);
            im -= v * Math.sin(om * n);
          }
          return Math.hypot(re, im);
        };
        b.strokeStyle = b.fillStyle = red;
        b.lineWidth = 1.8;
        for (
          let k = Math.ceil((w0 * N) / (2 * Math.PI));
          k <= Math.floor((w1 * N) / (2 * Math.PI));
          k++
        ) {
          const om = (2 * Math.PI * k) / N,
            m = Xk(k);
          b.beginPath();
          b.moveTo(B.X(om), B.Y(0));
          b.lineTo(B.X(om), B.Y(m));
          b.stroke();
          dot(b, B.X(om), B.Y(m), 3.2);
        }
        O(
          r,
          "read",
          `DTFT の曲線を 2π/N = 2π/${N} おきに ${N} 点だけ取り出したもの（赤）が DFT です。N を増やすほど点が細かくなり、曲線の形がよく分かります。`,
        );
      } else
        O(
          r,
          "read",
          "ω を 2π ずらすと、まったく同じ形が繰り返されます（周期 2π）。そのため −π〜π の 1 周期だけを見れば十分です。",
        );
    });
  }
  makeDtft("d-dtft", false);
  makeDtft("d-dtft2", true);

  // 8. four Fourier transforms on one sheet
  const FQ = { disc: false, per: false };
  demo(
    "d-four",
    (r) => {
      r.querySelector('[data-q="disc"]')!.setAttribute("aria-pressed", String(FQ.disc));
      r.querySelector('[data-q="per"]')!.setAttribute("aria-pressed", String(FQ.per));
      const { ctx, W, H } = prep(C(r, "a")),
        lime = css("--accent"),
        mut = css("--muted"),
        ink = css("--ink"),
        mint = css("--trace3");
      const cells = [
        { d: false, p: false, name: "フーリエ変換" },
        { d: false, p: true, name: "フーリエ級数" },
        { d: true, p: false, name: "離散時間フーリエ変換 (DTFT)" },
        { d: true, p: true, name: "離散フーリエ変換 (DFT)" },
      ];
      const gx = 56,
        gy = 34,
        cw = (W - gx - 12) / 2,
        ch = (H - gy - 10) / 2;
      ctx.font = "16px " + css("--f-body");
      ctx.fillStyle = mut;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("時間が 非周期", gx + cw / 2, 16);
      ctx.fillText("時間が 周期的", gx + cw * 1.5, 16);
      ctx.save();
      ctx.translate(18, gy + ch / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("時間が 連続", 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(18, gy + ch * 1.5);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("時間が 離散", 0, 0);
      ctx.restore();
      cells.forEach((c) => {
        const x0 = gx + (c.p ? cw : 0) + 6,
          y0 = gy + (c.d ? ch : 0) + 6,
          w = cw - 12,
          h = ch - 12,
          on = c.d === FQ.disc && c.p === FQ.per,
          a = av("fq" + c.name, on ? 1 : 0.3, 300);
        ctx.globalAlpha = 1;
        ctx.fillStyle = css("--panel2");
        ctx.fillRect(x0, y0, w, h);
        ctx.strokeStyle = on ? lime : css("--line");
        ctx.lineWidth = on ? 2 : 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
        ctx.globalAlpha = a;
        tag(ctx, c.name, x0 + 10, y0 + 16, on ? lime : ink, "left");
        // mini plots: left = time, right = frequency
        const pw = (w - 36) / 2,
          ph = h - 64,
          py = y0 + 40 + ph,
          tx = x0 + 12,
          fx = x0 + 24 + pw;
        ctx.globalAlpha = a;
        ctx.font = "16px " + css("--f-body");
        ctx.fillStyle = mut;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("時間", tx, py + 4);
        ctx.fillText("周波数", fx, py + 4);
        ctx.strokeStyle = css("--line");
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, py);
        ctx.lineTo(tx + pw, py);
        ctx.moveTo(fx, py);
        ctx.lineTo(fx + pw, py);
        ctx.stroke();
        const sig = (u: number) => Math.exp(-Math.pow(u * 6, 2)),
          spec = (u: number) => Math.exp(-Math.pow(u * 3.5, 2)); // u in [-1,1]
        const draw = (
          x: number,
          y0p: number,
          fn: (u: number) => number,
          disc: boolean,
          per: boolean,
          col: string,
        ) => {
          ctx.strokeStyle = ctx.fillStyle = col;
          ctx.lineWidth = 2;
          const val = (u: number) => {
            if (!per) return fn(u);
            const P = 0.5;
            const m = ((((u + P / 2) % P) + P) % P) - P / 2;
            return fn(m * 2);
          };
          if (disc) {
            for (let i = -12; i <= 12; i++) {
              const u = i / 12,
                v = val(u);
              const X = x + (pw * (u + 1)) / 2,
                Y = py - v * (ph - 6);
              ctx.beginPath();
              ctx.moveTo(X, py);
              ctx.lineTo(X, Y);
              ctx.stroke();
              dot(ctx, X, Y, 2.2);
            }
          } else {
            ctx.beginPath();
            for (let i = 0; i <= 120; i++) {
              const u = -1 + (2 * i) / 120,
                v = val(u),
                X = x + (pw * (u + 1)) / 2,
                Y = py - v * (ph - 6);
              if (i) ctx.lineTo(X, Y);
              else ctx.moveTo(X, Y);
            }
            ctx.stroke();
          }
        };
        draw(tx, py, sig, c.d, c.p, lime); // time: discrete if c.d, periodic if c.p
        draw(fx, py, spec, c.p, c.d, mint); // frequency: discrete if time periodic, periodic if time discrete
        ctx.globalAlpha = 1;
      });
      const rules = [];
      rules.push(
        FQ.per
          ? "時間が<b>周期的</b> → 周波数が<b>離散的</b>（とびとびの線）"
          : "時間が非周期 → 周波数は連続",
      );
      rules.push(
        FQ.disc
          ? "時間が<b>離散的</b> → 周波数が<b>周期的</b>（2π ごとに繰り返す）"
          : "時間が連続 → 周波数は非周期",
      );
      O(r, "read", rules.join("<br>"));
    },
    (r) => {
      r.querySelectorAll<HTMLElement>("[data-q]").forEach((b) =>
        b.addEventListener("click", () => {
          const q = b.dataset.q as "disc" | "per";
          FQ[q] = !FQ[q];
          BOOK["d-four"].draw();
        }),
      );
    },
  );

  // 9.1 time shift: magnitude unchanged, phase rotates in proportion to frequency
  demo("d-shift", (r) => {
    const tau = P(r, "tau"),
      N = 64,
      lime = css("--accent"),
      red = css("--trace2"),
      mint = css("--trace3"),
      mut = css("--muted");
    O(r, "tau", (tau >= 0 ? "+" : "") + tau.toFixed(1) + " サンプル");
    const x = (n: number) =>
      Math.exp(-Math.pow((n - 20 - tau) / 3, 2)) + 0.6 * Math.exp(-Math.pow((n - 34 - tau) / 2, 2));
    const x0 = (n: number) =>
      Math.exp(-Math.pow((n - 20) / 3, 2)) + 0.6 * Math.exp(-Math.pow((n - 34) / 2, 2));
    const A = axes(C(r, "a"), {
        x0: 0,
        x1: N - 1,
        y0: -0.1,
        y1: 1.25,
        zero: true,
        xlabel: "n",
        ylabel: "信号（灰：ずらす前）",
      }),
      a = A.ctx;
    a.strokeStyle = mut;
    a.lineWidth = 1.4;
    a.setLineDash([4, 3]);
    line(
      a,
      [...Array(N).keys()].map((n) => [n, x0(n)]),
      A.X,
      A.Y,
    );
    a.setLineDash([]);
    a.strokeStyle = a.fillStyle = lime;
    a.lineWidth = 2;
    for (let n = 0; n < N; n++) {
      const v = x(n);
      a.beginPath();
      a.moveTo(A.X(n), A.Y(0));
      a.lineTo(A.X(n), A.Y(v));
      a.stroke();
      dot(a, A.X(n), A.Y(v), 2.4);
    }
    const re = new Float64Array(N),
      im = new Float64Array(N),
      r0 = new Float64Array(N),
      i0 = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      re[n] = x(n);
      r0[n] = x0(n);
    }
    fft(re, im, false);
    fft(r0, i0, false);
    const K = 16,
      mags = [],
      phs = [];
    for (let k = 0; k <= K; k++) {
      mags.push([k, Math.hypot(re[k], im[k])]);
      phs.push([k, Math.atan2(im[k], re[k]) - Math.atan2(i0[k], r0[k])]);
    }
    const B = axes(C(r, "b"), {
        x0: -0.5,
        x1: K + 0.5,
        y0: 0,
        y1: Math.max(...mags.map((p) => p[1])) * 1.2,
        xlabel: "k",
        ylabel: "大きさ |X[k]|（ずらしても同じ）",
      }),
      b = B.ctx;
    b.strokeStyle = b.fillStyle = mint;
    b.lineWidth = 2.4;
    for (const [k, m] of mags) {
      b.beginPath();
      b.moveTo(B.X(k), B.Y(0));
      b.lineTo(B.X(k), B.Y(m));
      b.stroke();
      dot(b, B.X(k), B.Y(m), 3);
    }
    const wrap = (v: number) => {
      v = ((((v + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      return v;
    };
    const G = axes(C(r, "c"), {
        x0: -0.5,
        x1: K + 0.5,
        y0: -Math.PI * 1.1,
        y1: Math.PI * 1.1,
        yticks: [-Math.PI, 0, Math.PI],
        yfmt: piFmt,
        zero: true,
        xlabel: "k",
        ylabel: "位相の変化（ずらす前との差）",
      }),
      g = G.ctx;
    g.fillStyle = red;
    for (const [k, v] of phs) dot(g, G.X(k), G.Y(wrap(v)), 3.6);
    O(
      r,
      "read",
      `${tau.toFixed(1)} サンプルずらすと、周波数 k の位相は −2πk·${tau.toFixed(1)}/${N} だけ回ります（k に比例）。大きさは変わりません。`,
    );
  });

  // 10. sampling theorem: spectrum copies every fs
  demo("d-rep", (r) => {
    const Bw = P(r, "B"),
      fs = P(r, "fs"),
      lime = css("--accent"),
      red = css("--trace2"),
      mint = css("--trace3");
    O(r, "B", Bw + " Hz");
    O(r, "fs", fs + " Hz");
    const tri = (f: number) => Math.max(0, 1 - Math.abs(f) / Bw),
      fmax = Math.max(3 * fs, 3 * Bw, 20);
    const A = axes(C(r, "a"), {
        x0: -fmax,
        x1: fmax,
        y0: 0,
        y1: 1.55,
        xlabel: "周波数 [Hz]",
        ylabel: "サンプリング後のスペクトル",
      }),
      a = A.ctx;
    a.save();
    a.beginPath();
    a.rect(A.m.l, A.m.t, A.pw, A.ph);
    a.clip();
    a.fillStyle = css("--accent-soft");
    a.fillRect(A.X(-fs / 2), A.m.t, A.X(fs / 2) - A.X(-fs / 2), A.ph);
    // overlap areas
    const M = Math.ceil(fmax / fs) + 1,
      sum = (f: number) => {
        let s = 0;
        for (let m = -M; m <= M; m++) s += tri(f - m * fs);
        return s;
      };
    a.fillStyle = red;
    a.globalAlpha = 0.35;
    for (let i = 0; i < 800; i++) {
      const f = -fmax + (2 * fmax * i) / 800,
        f2 = f + (2 * fmax) / 800;
      let cnt = 0;
      for (let m = -M; m <= M; m++) if (tri((f + f2) / 2 - m * fs) > 0) cnt++;
      if (cnt > 1)
        a.fillRect(
          A.X(f),
          A.Y(sum((f + f2) / 2)),
          A.X(f2) - A.X(f) + 0.5,
          A.Y(0) - A.Y(sum((f + f2) / 2)),
        );
    }
    a.globalAlpha = 1;
    for (let m = -M; m <= M; m++) {
      const pts = [];
      for (let i = 0; i <= 80; i++) {
        const f = m * fs - Bw + (2 * Bw * i) / 80;
        pts.push([f, tri(f - m * fs)]);
      }
      a.strokeStyle = m === 0 ? lime : mint;
      a.globalAlpha = m === 0 ? 1 : 0.6;
      a.lineWidth = m === 0 ? 2.4 : 1.6;
      line(a, pts, A.X, A.Y);
      a.globalAlpha = 1;
    }
    a.restore();
    tag(a, "−fs/2〜fs/2：取り出す範囲", A.X(0), A.m.t + 14, lime, "center");
    for (let m = -M; m <= M; m++)
      if (m !== 0 && Math.abs(m * fs) < fmax * 0.95)
        tag(
          a,
          `${m > 0 ? "+" : "−"}${Math.abs(m) === 1 ? "" : Math.abs(m)}fs`,
          A.X(m * fs),
          A.Y(1) - 16,
          mint,
          "center",
        );
    const ok = fs > 2 * Bw;
    O(
      r,
      "read",
      ok
        ? `fs = ${fs} Hz ＞ 2B = ${2 * Bw} Hz → 写しが重ならないので、黄緑の範囲だけを取り出せば<b>元の信号に戻せる</b>`
        : `fs = ${fs} Hz ≦ 2B = ${2 * Bw} Hz → 写しが重なり（赤）、取り出す範囲に別の成分が混ざる＝<b>エイリアシング</b>`,
    );
  });

  // 1f. orthogonality, made visible: product = difference-frequency term + sum-frequency term
  demo("d-ortho", (r) => {
    const kind = Ps(r, "kind"),
      m = P(r, "m"),
      k = P(r, "k"),
      md = av("orm", m, 260),
      kd = av("ork", k, 260),
      W = 2 * Math.PI;
    O(r, "m", String(m));
    O(r, "k", String(k));
    const lime = css("--accent"),
      mint = css("--trace3"),
      red = css("--trace2"),
      ink = css("--ink");
    const f1 = (t: number) =>
        kind === "sc"
          ? Math.sin(W * md * t)
          : kind === "ss"
            ? Math.sin(W * md * t)
            : Math.cos(W * md * t),
      f2 = (t: number) => (kind === "ss" ? Math.sin(W * kd * t) : Math.cos(W * kd * t));
    // difference / sum terms of the product-to-sum formula
    const dTerm = (t: number) =>
      kind === "sc" ? 0.5 * Math.sin(W * (md - kd) * t) : 0.5 * Math.cos(W * (md - kd) * t);
    const sTerm = (t: number) =>
      kind === "sc"
        ? 0.5 * Math.sin(W * (md + kd) * t)
        : kind === "ss"
          ? -0.5 * Math.cos(W * (md + kd) * t)
          : 0.5 * Math.cos(W * (md + kd) * t);
    const N = 600,
      avg = (fn: (t: number) => number) => {
        let a = 0;
        for (let i = 0; i < N; i++) a += fn((i + 0.5) / N);
        return a / N;
      };
    const panel = (
      cv: HTMLCanvasElement,
      fn: (t: number) => number,
      col: string,
      label: string,
      xl: boolean,
    ) => {
      const Q = axes(cv, {
          x0: 0,
          x1: 1,
          y0: -1.15,
          y1: 1.15,
          zero: true,
          yticks: [-1, -0.5, 0, 0.5, 1],
          ylabel: label,
          xlabel: xl ? "時間 t / T₀（1 周期）" : "",
        }),
        q = Q.ctx,
        pts = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        pts.push([t, fn(t)]);
      }
      q.beginPath();
      q.moveTo(Q.X(0), Q.Y(0));
      for (const [t, v] of pts) q.lineTo(Q.X(t), Q.Y(v));
      q.lineTo(Q.X(1), Q.Y(0));
      q.closePath();
      q.fillStyle = col;
      q.globalAlpha = 0.2;
      q.fill();
      q.globalAlpha = 1;
      q.strokeStyle = col;
      q.lineWidth = 2;
      line(q, pts, Q.X, Q.Y);
      const mv = avg(fn),
        mvd = av("ora" + label, mv, 260);
      q.strokeStyle = ink;
      q.lineWidth = 2.4;
      q.beginPath();
      q.moveTo(Q.X(0), Q.Y(mvd));
      q.lineTo(Q.X(1), Q.Y(mvd));
      q.stroke();
      tag(
        q,
        `平均 ${sgn(Math.abs(mv) < 5e-4 ? 0 : mv)}`,
        Q.X(1) - 6,
        Q.Y(mvd) + (mvd >= 0 ? -16 : 16),
        ink,
        "right",
      );
      return mv;
    };
    const nm = kind === "cc" ? ["cos", "cos"] : kind === "ss" ? ["sin", "sin"] : ["sin", "cos"];
    const p0 = panel(
      C(r, "a"),
      (t: number) => f1(t) * f2(t),
      lime,
      `${nm[0]} ${m}Ω₀t × ${nm[1]} ${k}Ω₀t`,
      false,
    );
    const nk = (v: number) => (v === 1 ? "" : v === -1 ? "−" : String(v).replace("-", "−")),
      dl = kind === "sc" ? `½ sin ${nk(m - k)}Ω₀t` : `½ cos ${nk(m - k)}Ω₀t`,
      sl =
        kind === "sc"
          ? `½ sin ${nk(m + k)}Ω₀t`
          : kind === "ss"
            ? `−½ cos ${nk(m + k)}Ω₀t`
            : `½ cos ${nk(m + k)}Ω₀t`;
    panel(C(r, "b"), dTerm, mint, "差の周波数の項  " + dl, false);
    panel(C(r, "c"), sTerm, red, "和の周波数の項  " + sl, true);
    const res = Math.abs(p0) < 5e-4 ? 0 : p0;
    O(
      r,
      "read",
      kind === "sc"
        ? `sin × cos は <b>m, k によらず常に平均 0</b>。積和の公式で ½ sin(m+k)Ω₀t ＋ ½ sin(m−k)Ω₀t と、<b>sin だけ</b>の和になる。sin は整数回振動すれば平均 0、振動しない（m = k）ときは sin 0 = 0 そのものなので、どちらの項も必ず 0。`
        : m === k
          ? `m = k なので差の項が ½cos 0 = <b>定数 ½</b> になり、平均 ${sgn(res)} が残る`
          : `m − k = ${String(m - k).replace("-", "−")}、m + k = ${m + k} はどちらも 0 でないので、どちらの項も平均 0 → 積の平均 <b>0</b>`,
    );
  });

  // 2. aliasing
  demo("d-alias", (r) => {
    const f = P(r, "f"),
      fs = P(r, "fs"),
      fa = Math.abs(f - fs * Math.round(f / fs)),
      al = Math.abs(fa - f) > 1e-9;
    O(r, "f", f + " Hz");
    O(r, "fs", fs + " Hz");
    O(
      r,
      "read",
      !al
        ? `f = ${f} Hz はナイキスト周波数 ${fs / 2} Hz 以下なので、そのまま ${f} Hz として見えます。`
        : `f = ${f} Hz はナイキスト周波数 ${fs / 2} Hz を超えるので、|${f} − ${Math.round(f / fs)}×${fs}| = <b>${fa} Hz</b> に化けて見えます。`,
    );
    const A = axes(C(r, "a"), {
        x0: 0,
        x1: 1,
        y0: -1.3,
        y1: 1.3,
        xlabel: "時間 t [s]",
        zero: true,
      }),
      ctx = A.ctx;
    const pts = [];
    for (let i = 0; i <= 3000; i++) {
      const t = i / 3000;
      pts.push([t, Math.cos(2 * Math.PI * f * t)]);
    }
    ctx.strokeStyle = css("--muted");
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    line(ctx, pts, A.X, A.Y);
    ctx.globalAlpha = 1;
    if (al) {
      const ap = [];
      for (let i = 0; i <= 1000; i++) {
        const t = i / 1000;
        ap.push([t, Math.cos(2 * Math.PI * fa * t)]);
      }
      ctx.strokeStyle = css("--trace3");
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      line(ctx, ap, A.X, A.Y);
      ctx.setLineDash([]);
    }
    ctx.fillStyle = css("--trace2");
    for (let n = 0; n / fs <= 1 + 1e-9; n++) {
      const t = n / fs;
      dot(ctx, A.X(t), A.Y(Math.cos(2 * Math.PI * f * t)), 4);
    }
    // ---- frequency number line: where f sits, and where it folds to ----
    const fmax = Math.max(fs * 1.5, f + 2, 10),
      { ctx: b, W: BW, H: BH } = prep(C(r, "b"));
    const xl = 28,
      xr = BW - 28,
      yA = BH - 96,
      FX = (v: number) => xl + (v / fmax) * (xr - xl);
    const lime = css("--accent"),
      mint = css("--trace3"),
      red = css("--trace2"),
      mut = css("--muted"),
      ink = css("--ink");
    // representable band
    b.fillStyle = css("--accent-soft");
    b.fillRect(FX(0), yA - 90, FX(fs / 2) - FX(0), 90);
    // axis with ticks
    b.strokeStyle = ink;
    b.lineWidth = 1.5;
    b.beginPath();
    b.moveTo(xl, yA);
    b.lineTo(xr, yA);
    b.stroke();
    b.beginPath();
    b.moveTo(xr, yA);
    b.lineTo(xr - 8, yA - 5);
    b.lineTo(xr - 8, yA + 5);
    b.closePath();
    b.fillStyle = ink;
    b.fill();
    const step = fmax > 24 ? 4 : 2;
    b.font = "16px " + css("--f-mono");
    b.fillStyle = mut;
    b.textAlign = "center";
    b.textBaseline = "top";
    b.lineWidth = 1;
    b.strokeStyle = mut;
    for (let v = 0; v <= fmax - 0.5; v += step) {
      b.beginPath();
      b.moveTo(FX(v), yA);
      b.lineTo(FX(v), yA + 5);
      b.stroke();
      b.fillText(String(v), FX(v), yA + 8);
    }
    b.textAlign = "right";
    b.textBaseline = "top";
    b.fillText("周波数 [Hz]", xr, 4);
    // folding points f_s/2, f_s, 3f_s/2 … as labelled ticks (not lines)
    const nm = ["f_s/2", "f_s", "3f_s/2", "2f_s", "5f_s/2", "3f_s"];
    for (let m = 1; (m * fs) / 2 < fmax && m <= 6; m++) {
      const x = FX((m * fs) / 2);
      b.strokeStyle = m === 1 ? lime : mut;
      b.lineWidth = 2;
      b.beginPath();
      b.moveTo(x, yA - 10);
      b.lineTo(x, yA + 30);
      b.stroke();
      tag(b, nm[m - 1].replace("_s", "s"), x, yA + 44, m === 1 ? lime : mut, "center");
    }
    tag(b, `表せる範囲 0〜${fs / 2} Hz`, FX(0) + 2, yA - 104, lime, "left");
    // pins
    const pin = (v: number, col: string, txt: string, h: number) => {
      const x = FX(v);
      b.strokeStyle = b.fillStyle = col;
      b.lineWidth = 2.5;
      b.beginPath();
      b.moveTo(x, yA);
      b.lineTo(x, yA - h);
      b.stroke();
      dot(b, x, yA - h, 6);
      tag(b, txt, x, yA - h - 18, col, "center");
    };
    if (al) {
      // arrow from the real frequency to where it appears
      const x1 = FX(f),
        x2 = FX(fa),
        yT = yA - 26;
      b.strokeStyle = b.fillStyle = mint;
      b.lineWidth = 2;
      b.setLineDash([6, 4]);
      b.beginPath();
      b.moveTo(x1, yT);
      b.quadraticCurveTo((x1 + x2) / 2, yA - 4, x2 + (x1 > x2 ? 10 : -10), yT + 2);
      b.stroke();
      b.setLineDash([]);
      const ang = Math.atan2(yT + 2 - (yA - 4), x2 + (x1 > x2 ? 10 : -10) - (x1 + x2) / 2);
      b.beginPath();
      const hx = x2 + (x1 > x2 ? 10 : -10),
        hy = yT + 2;
      b.moveTo(hx, hy);
      b.lineTo(hx - 10 * Math.cos(ang - 0.45), hy - 10 * Math.sin(ang - 0.45));
      b.lineTo(hx - 10 * Math.cos(ang + 0.45), hy - 10 * Math.sin(ang + 0.45));
      b.closePath();
      b.fill();
      pin(f, red, `元の f = ${f} Hz`, 36);
      pin(fa, mint, `見える f = ${fa} Hz`, 36);
      const mm = Math.round(f / fs),
        mirror = f < mm * fs,
        c0 = (mm * fs) / 2;
      const why = mirror
        ? `${c0} Hz を軸に鏡写し（どちらも ${+Math.abs(f - c0).toFixed(2)} Hz 離れている）`
        : `${mm * fs} Hz（${mm === 1 ? "" : mm}fs）だけ左へずらした位置`;
      tag(b, why, (x1 + x2) / 2, yA + 78, mint, "center");
      if (mirror) {
        b.strokeStyle = mint;
        b.lineWidth = 1;
        b.setLineDash([2, 3]);
        b.beginPath();
        b.moveTo(FX(c0), yA - 90);
        b.lineTo(FX(c0), yA);
        b.stroke();
        b.setLineDash([]);
      }
    } else pin(f, red, `f = ${f} Hz（範囲内なのでそのまま）`, 36);
  });

  // 3. DFT by hand
  const HD: { x: number[]; A: Axes | null } = {
    x: [...Array(8)].map((_, n) => Math.cos((2 * Math.PI * n) / 8)),
    A: null,
  };
  demo(
    "d-hand",
    (r) => {
      const N = 8,
        k = P(r, "k"),
        x = HD.x,
        re: number[] = [],
        im: number[] = [];
      for (let kk = 0; kk < N; kk++) {
        let a = 0,
          b = 0;
        for (let n = 0; n < N; n++) {
          a += x[n] * Math.cos((2 * Math.PI * kk * n) / N);
          b -= x[n] * Math.sin((2 * Math.PI * kk * n) / N);
        }
        re.push(a);
        im.push(b);
      }
      O(r, "k", `${k}`);
      O(
        r,
        "read",
        `X[${k}] = ${re[k].toFixed(2)} ${im[k] < 0 ? "−" : "+"} ${Math.abs(im[k]).toFixed(2)}i　　|X[${k}]| = <b>${Math.hypot(re[k], im[k]).toFixed(2)}</b>　　位相 ${(Math.hypot(re[k], im[k]) > 1e-6 ? (Math.atan2(im[k], re[k]) * 180) / Math.PI : 0).toFixed(0)}°`,
      );
      const A = axes(C(r, "a"), {
          x0: -0.5,
          x1: 7.5,
          y0: -1.3,
          y1: 1.3,
          xticks: [0, 1, 2, 3, 4, 5, 6, 7],
          xlabel: "n",
          zero: true,
        }),
        ctx = A.ctx;
      HD.A = A;
      const kd = av("hk", k, 260),
        cp = [],
        sp = [];
      for (let i = 0; i <= 320; i++) {
        const t = -0.5 + i / 40;
        cp.push([t, Math.cos((2 * Math.PI * kd * t) / N)]);
        sp.push([t, -Math.sin((2 * Math.PI * kd * t) / N)]);
      }
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 4]);
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = css("--accent");
      line(ctx, cp, A.X, A.Y);
      ctx.strokeStyle = css("--trace3");
      line(ctx, sp, A.X, A.Y);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ctx.fillStyle = css("--trace2");
      ctx.lineWidth = 3;
      for (let n = 0; n < N; n++) {
        ctx.beginPath();
        ctx.moveTo(A.X(n), A.Y(0));
        ctx.lineTo(A.X(n), A.Y(x[n]));
        ctx.stroke();
        dot(ctx, A.X(n), A.Y(x[n]), 6.5);
      }
      const mags = re.map((v, i) => Math.hypot(v, im[i])),
        mx = av("hmx", Math.max(1, ...mags) * 1.15);
      const B = axes(C(r, "b"), {
        x0: -0.5,
        x1: 7.5,
        y0: 0,
        y1: mx,
        xticks: [0, 1, 2, 3, 4, 5, 6, 7],
        xlabel: "k",
        ylabel: "|X[k]|",
      });
      const w = Math.min(30, (B.X(1) - B.X(0)) * 0.6);
      for (let i = 0; i < N; i++) {
        const sel = Math.max(0, 1 - Math.abs(kd - i));
        B.ctx.fillStyle = css("--accent");
        B.ctx.fillRect(B.X(i) - w / 2, B.Y(mags[i]), w, B.Y(0) - B.Y(mags[i]));
        if (sel > 0) {
          B.ctx.globalAlpha = sel;
          B.ctx.fillStyle = css("--trace2");
          B.ctx.fillRect(B.X(i) - w / 2, B.Y(mags[i]), w, B.Y(0) - B.Y(mags[i]));
          B.ctx.globalAlpha = 1;
        }
      }
    },
    (r) => {
      const cv = C(r, "a");
      let drag = false;
      cv.style.cursor = "ns-resize";
      cv.style.touchAction = "none";
      const set = (e: PointerEvent) => {
        const A = HD.A;
        if (!A) return;
        const rc = cv.getBoundingClientRect(),
          px = e.clientX - rc.left,
          py = e.clientY - rc.top;
        const n = Math.round(-0.5 + ((px - A.m.l) / A.pw) * 8);
        if (n < 0 || n > 7) return;
        const v = 1.3 - ((py - A.m.t) / A.ph) * 2.6;
        HD.x[n] = Math.max(-1.2, Math.min(1.2, Math.round(v * 20) / 20));
        BOOK["d-hand"].draw();
      };
      cv.addEventListener("pointerdown", (e) => {
        drag = true;
        cv.setPointerCapture(e.pointerId);
        set(e);
      });
      cv.addEventListener("pointermove", (e) => {
        if (drag) set(e);
      });
      cv.addEventListener("pointerup", () => {
        drag = false;
      });
      cv.addEventListener("pointercancel", () => {
        drag = false;
      });
      r.querySelectorAll<HTMLElement>("[data-sig]").forEach((b) =>
        b.addEventListener("click", () => {
          const t = b.dataset.sig!;
          const to = [...Array(8)].map((_, n) =>
              t === "imp"
                ? n === 0
                  ? 1
                  : 0
                : t === "dc"
                  ? 0.6
                  : t === "c1"
                    ? Math.cos((2 * Math.PI * n) / 8)
                    : t === "c2"
                      ? Math.cos((2 * Math.PI * 2 * n) / 8)
                      : t === "alt"
                        ? n % 2
                          ? -1
                          : 1
                        : Math.round((Math.random() * 2 - 1) * 20) / 20,
            ),
            from = HD.x.slice();
          tween("hd", 380, (u) => {
            HD.x = from.map((v, i) => v + (to[i] - v) * u);
            BOOK["d-hand"].draw();
          });
        }),
      );
    },
  );

  // 4. continuous winding (rod + trace + centroid, with the source signal underneath)
  const WC: { key: number | null; curve: Pt[] | null; D: number[][] | null; E: number[][] | null } =
    {
      key: null,
      curve: null,
      D: null,
      E: null,
    };
  demo(
    "d-wind",
    (r) => {
      const fsig = P(r, "fsig"),
        fw = P(r, "fw"),
        dc = Pb(r, "dc"),
        tc = P(r, "t");
      O(r, "fsig", fsig + " Hz");
      O(r, "fw", fw.toFixed(2) + " Hz");
      O(r, "t", tc.toFixed(2) + " s");
      const dw = av("wdc", dc ? 1 : 0),
        T = 4,
        M = 1600,
        ts = new Float64Array(M),
        xs = new Float64Array(M),
        sig = (t: number) => dw + Math.cos(2 * Math.PI * fsig * t);
      for (let i = 0; i < M; i++) {
        ts[i] = (i / M) * T;
        xs[i] = sig(ts[i]);
      }
      if (WC.key !== fsig) {
        const D = [],
          E = [];
        for (let j = 0; j <= 600; j++) {
          const w = j / 100;
          let da = 0,
            db = 0,
            ea = 0,
            eb = 0;
          for (let i = 0; i < M; i++) {
            const th = 2 * Math.PI * w * ts[i],
              co = Math.cos(th),
              si = Math.sin(th),
              cv = Math.cos(2 * Math.PI * fsig * ts[i]);
            da += co;
            db -= si;
            ea += cv * co;
            eb -= cv * si;
          }
          D.push([da / M, db / M]);
          E.push([ea / M, eb / M]);
        }
        WC.D = D;
        WC.E = E;
        WC.key = fsig;
      }
      const E = WC.E!;
      WC.curve = WC.D!.map((d, j) => [
        j / 100,
        Math.hypot(dw * d[0]! + E[j]![0]!, dw * d[1]! + E[j]![1]!),
      ]);
      const lime = css("--accent"),
        mint = css("--trace3"),
        red = css("--trace2");
      const A = plane(C(r, "a"), 1.25 + dw),
        ctx = A.ctx;
      let cx = 0,
        cy = 0;
      const zx = new Float64Array(M),
        zy = new Float64Array(M);
      for (let i = 0; i < M; i++) {
        const th = -2 * Math.PI * fw * ts[i];
        zx[i] = xs[i] * Math.cos(th);
        zy[i] = xs[i] * Math.sin(th);
        cx += zx[i];
        cy += zy[i];
      }
      cx /= M;
      cy /= M;
      const d = Math.hypot(cx, cy);
      const trace = (upto: number, alpha: number) => {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < M && ts[i] <= upto; i++)
          if (i) ctx.lineTo(A.X(zx[i]), A.Y(zy[i]));
          else ctx.moveTo(A.X(zx[i]), A.Y(zy[i]));
        ctx.stroke();
        ctx.globalAlpha = 1;
      };
      ctx.strokeStyle = lime;
      ctx.lineWidth = 1.2;
      trace(T, 0.18);
      ctx.lineWidth = 1.5;
      trace(tc, 0.95);
      // the rod: x(t)·e^{-i2πft}
      const xt = sig(tc),
        th = -2 * Math.PI * fw * tc,
        rx = xt * Math.cos(th),
        ry = xt * Math.sin(th);
      ctx.strokeStyle = ctx.fillStyle = mint;
      ctx.lineWidth = 2.4;
      arrow(ctx, A.ox, A.oy, A.X(rx), A.Y(ry));
      const ang = ((fw * tc * 360) % 360).toFixed(0),
        ra = Math.atan2(ry, rx),
        lx = A.X(rx) + Math.cos(ra) * 12,
        ly = A.Y(ry) - Math.sin(ra) * 12,
        al = Math.cos(ra) < -0.3 ? "right" : Math.cos(ra) > 0.3 ? "left" : "center";
      tag(ctx, "x(t)·e^{−i2πft}", lx, ly - 15, mint, al);
      tag(ctx, `長さ ${sgn(xt)}　時計回りに ${ang}°`, lx, ly + 15, mint, al);
      // centroid
      ctx.strokeStyle = ctx.fillStyle = red;
      ctx.lineWidth = 2.6;
      arrow(ctx, A.ox, A.oy, A.X(cx), A.Y(cy));
      dot(ctx, A.X(cx), A.Y(cy), 4.5);
      tag(
        ctx,
        `重心（曲線全体の平均）距離 ${d.toFixed(3)}`,
        A.X(cx) + (cx >= 0 ? 10 : -10),
        A.Y(cy) + (cy >= 0 ? -14 : 14),
        red,
        cx >= 0 ? "left" : "right",
      );
      O(
        r,
        "read",
        `重心の距離 <b>${d.toFixed(3)}</b>${Math.abs(fw - fsig) < 0.03 ? "　← 巻き付け周波数が信号の周波数と一致" : ""}${fw < 0.03 && dc ? "　← 0 Hz では回転しないので、重心は信号の平均（直流 1）になる" : ""}`,
      );
      // right: centroid distance vs winding frequency
      const ymax = av("wymax", Math.max(...WC.curve.map((p) => p[1]!)) * 1.15 || 1);
      const B = axes(C(r, "b"), {
        x0: 0,
        x1: 6,
        y0: 0,
        y1: ymax,
        xlabel: "巻き付け周波数 f [Hz]",
        ylabel: "重心の距離",
      });
      B.ctx.strokeStyle = lime;
      B.ctx.lineWidth = 1.8;
      line(B.ctx, WC.curve, B.X, B.Y);
      vline(B, fw, red, [3, 3]);
      B.ctx.fillStyle = red;
      dot(B.ctx, B.X(fw), B.Y(d), 5);
      tag(
        B.ctx,
        `今の f = ${fw.toFixed(2)} Hz`,
        B.X(fw) + (fw < 4 ? 8 : -8),
        B.Y(d) - 14,
        red,
        fw < 4 ? "left" : "right",
      );
      // bottom: the signal itself
      const lo = Math.min(0, ...xs) - 0.2,
        hi = Math.max(...xs) + 0.2;
      const S = axes(C(r, "c"), {
        x0: 0,
        x1: T,
        y0: lo,
        y1: hi,
        xlabel: "時間 t [s]",
        ylabel: "x(t)",
        zero: true,
      });
      S.ctx.strokeStyle = lime;
      S.ctx.lineWidth = 1.6;
      line(
        S.ctx,
        [...ts].map((t, i) => [t, xs[i]]),
        S.X,
        S.Y,
      );
      vline(S, tc, mint, [3, 3]);
      S.ctx.strokeStyle = mint;
      S.ctx.lineWidth = 2.4;
      S.ctx.beginPath();
      S.ctx.moveTo(S.X(tc), S.Y(0));
      S.ctx.lineTo(S.X(tc), S.Y(xt));
      S.ctx.stroke();
      S.ctx.fillStyle = mint;
      dot(S.ctx, S.X(tc), S.Y(xt), 4.5);
      tag(
        S.ctx,
        `x(${tc.toFixed(2)}) = ${sgn(xt)} → 左の緑の矢印の長さ`,
        S.X(tc) + (tc < 2.6 ? 10 : -10),
        S.Y(xt),
        mint,
        tc < 2.6 ? "left" : "right",
      );
    },
    (r) => {
      player(r, "t", 0.24, 4, false, '[data-play="t"]');
      player(r, "fw", 0.6, 6, false, '[data-play="fw"]');
    },
  );

  // 5. resolution & zero padding
  demo("d-res", (r) => {
    const dd = P(r, "d"),
      N = P(r, "N"),
      pad = P(r, "pad"),
      win = Ps(r, "win"),
      fs = 1000,
      f1 = 100,
      f2 = 100 + dd;
    O(r, "d", dd.toFixed(1) + " Hz");
    const w = windowFn(win, N);
    let sw = 0;
    for (const v of w) sw += v;
    const spec = (M: number) => {
      const re = new Float64Array(M),
        im = new Float64Array(M);
      for (let n = 0; n < N; n++)
        re[n] =
          w[n] * (Math.cos((2 * Math.PI * f1 * n) / fs) + Math.cos((2 * Math.PI * f2 * n) / fs));
      fft(re, im, false);
      const o = [];
      for (let k = 0; k <= M / 2; k++) o.push([(k * fs) / M, (2 * Math.hypot(re[k], im[k])) / sw]);
      return o;
    };
    const raw = spec(N),
      fine = spec(N * pad),
      dense = spec(Math.max(8192, N)),
      df = fs / N;
    let pk = 0;
    for (let i = 1; i < dense.length - 1; i++) {
      const [f, a] = dense[i];
      if (f < f1 - 30 || f > f2 + 30) continue;
      if (a > dense[i - 1][1] && a >= dense[i + 1][1] && a > 0.25) pk++;
    }
    O(
      r,
      "read",
      `Δf = ${df.toFixed(1)} Hz　2 つの差 = ${(dd / df).toFixed(2)} Δf　→ ${pk >= 2 ? "<b>2 つの山に分かれる</b>" : "<b>1 つの山にくっついて見える</b>"}`,
    );
    const vis = (p: Pt) => p[0]! <= 300,
      mx =
        Math.max(...fine.filter(vis).map((p) => p[1]), ...raw.filter(vis).map((p) => p[1])) * 1.15;
    const A = axes(C(r, "a"), {
        x0: 0,
        x1: 300,
        y0: 0,
        y1: mx,
        xlabel: "周波数 [Hz]",
        ylabel: "振幅",
      }),
      ctx = A.ctx;
    vline(A, f1, css("--muted"), [2, 4]);
    vline(A, f2, css("--muted"), [2, 4]);
    if (pad > 1) {
      ctx.strokeStyle = css("--accent");
      ctx.lineWidth = 1.8;
      line(ctx, fine.filter(vis), A.X, A.Y);
    }
    ctx.strokeStyle = ctx.fillStyle = css("--trace2");
    ctx.lineWidth = 1.6;
    for (const [f, a] of raw.filter(vis)) {
      ctx.beginPath();
      ctx.moveTo(A.X(f), A.Y(0));
      ctx.lineTo(A.X(f), A.Y(a));
      ctx.stroke();
      dot(ctx, A.X(f), A.Y(a), 3.2);
    }
  });

  // 6. leakage
  demo("d-leak", (r) => {
    const dl = P(r, "dl"),
      win = Ps(r, "win"),
      N = 32,
      k0 = 8 + dl;
    O(r, "dl", dl.toFixed(2) + " ビン");
    const w = windowFn(win, N);
    let sw = 0;
    for (const v of w) sw += v;
    const spec = (M: number) => {
      const re = new Float64Array(M),
        im = new Float64Array(M);
      for (let n = 0; n < N; n++) re[n] = w[n] * Math.cos((2 * Math.PI * k0 * n) / N);
      fft(re, im, false);
      const o = [];
      for (let k = 0; k <= M / 2; k++)
        o.push([(k * N) / M, Math.max(-100, toDb((2 * Math.hypot(re[k], im[k])) / sw))]);
      return o;
    };
    const raw = spec(N),
      fine = spec(N * 32);
    const A = axes(C(r, "a"), {
        x0: 0,
        x1: 16,
        y0: -100,
        y1: 6,
        xticks: [0, 2, 4, 6, 8, 10, 12, 14, 16],
        xlabel: "ビン k",
        ylabel: "dB",
      }),
      ctx = A.ctx;
    ctx.strokeStyle = css("--accent");
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.3;
    line(
      ctx,
      fine.filter((p) => p[0] <= 16),
      A.X,
      A.Y,
    );
    ctx.globalAlpha = 1;
    vline(A, k0, css("--muted"), [2, 3]);
    ctx.strokeStyle = ctx.fillStyle = css("--trace2");
    ctx.lineWidth = 1.6;
    for (const [k, v] of raw) {
      if (k > 16) break;
      ctx.beginPath();
      ctx.moveTo(A.X(k), A.Y(-100));
      ctx.lineTo(A.X(k), A.Y(v));
      ctx.stroke();
      dot(ctx, A.X(k), A.Y(v), 3.5);
    }
    const pk = Math.max(...raw.map((p) => p[1])),
      far = Math.max(...raw.filter((p) => Math.abs(p[0] - k0) > 4).map((p) => p[1]));
    O(
      r,
      "read",
      `ピークの高さ <b>${pk.toFixed(2)} dB</b>（0 dB との差がスカロップ損失）　4 ビン以上離れた漏れの最大 <b>${far.toFixed(1)} dB</b>`,
    );
    const B = axes(C(r, "b"), { x0: 0, x1: N - 1, y0: -1.1, y1: 1.1, xlabel: "n", zero: true });
    B.ctx.strokeStyle = css("--trace3");
    B.ctx.lineWidth = 1.3;
    B.ctx.setLineDash([4, 3]);
    line(
      B.ctx,
      [...w].map((v, n) => [n, v]),
      B.X,
      B.Y,
    );
    B.ctx.setLineDash([]);
    const xs = [];
    for (let n = 0; n < N; n++) xs.push([n, Math.cos((2 * Math.PI * k0 * n) / N) * w[n]]);
    B.ctx.strokeStyle = css("--accent");
    B.ctx.lineWidth = 1.6;
    line(B.ctx, xs, B.X, B.Y);
    B.ctx.fillStyle = css("--accent");
    for (const [n, v] of xs) dot(B.ctx, B.X(n), B.Y(v), 2.4);
  });

  // 7a. dB
  demo("d-db", (r) => {
    const e = P(r, "e"),
      a = Math.pow(10, e),
      db = 20 * e,
      f3 = (v: number) => (v >= 0.01 ? (+v.toPrecision(3)).toString() : v.toExponential(1));
    O(r, "e", "×" + f3(a));
    O(
      r,
      "read",
      `振幅比 ${f3(a)} → <b>${db.toFixed(1)} dB</b>　　パワー比 ${f3(a * a)} → 10·log₁₀ = ${db.toFixed(1)} dB`,
    );
    const A = axes(C(r, "a"), {
        x0: -100,
        x1: 20,
        y0: 0,
        y1: 1,
        yticks: [],
        xticks: [-100, -80, -60, -40, -20, 0, 20],
        xlabel: "dB",
        ml: 14,
      }),
      ctx = A.ctx;
    ctx.fillStyle = css("--accent");
    ctx.globalAlpha = 0.85;
    ctx.fillRect(A.X(-100), A.Y(0.62), A.X(db) - A.X(-100), A.Y(0.38) - A.Y(0.62));
    ctx.globalAlpha = 1;
    ctx.font = "16px " + css("--f-mono");
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = css("--muted");
    for (const [d, t] of <[number, string][]>[
      [20, "×10"],
      [0, "×1"],
      [-20, "×0.1"],
      [-40, "×0.01"],
      [-60, "×10⁻³"],
      [-80, "×10⁻⁴"],
    ])
      ctx.fillText(t, A.X(d), A.Y(0.66));
  });

  // 7b. noise floor
  demo("d-noise", (r) => {
    const N = P(r, "N"),
      amp = P(r, "A"),
      fs = 1000,
      f = 125;
    O(r, "A", amp.toFixed(2));
    const nz = gaussNoise(N, 7),
      w = windowFn("hann", N);
    let sw = 0;
    for (const v of w) sw += v;
    const re = new Float64Array(N),
      im = new Float64Array(N);
    for (let n = 0; n < N; n++) re[n] = w[n] * (amp * Math.cos((2 * Math.PI * f * n) / fs) + nz[n]);
    fft(re, im, false);
    const pts = [];
    for (let k = 0; k <= N / 2; k++)
      pts.push([(k * fs) / N, toDb((2 * Math.hypot(re[k], im[k])) / sw)]);
    const srt = pts.map((p) => p[1]).sort((a, b) => a - b),
      floor = srt[Math.floor(srt.length / 2)],
      peak = pts[Math.round((f * N) / fs)][1];
    O(
      r,
      "read",
      `ノイズ床 ${floor.toFixed(1)} dB　125 Hz のピーク ${peak.toFixed(1)} dB　差 <b>${(peak - floor).toFixed(1)} dB</b>`,
    );
    const A = axes(C(r, "a"), {
        x0: 0,
        x1: 500,
        y0: -75,
        y1: 10,
        xlabel: "周波数 [Hz]",
        ylabel: "dB",
      }),
      ctx = A.ctx;
    ctx.strokeStyle = css("--accent");
    ctx.lineWidth = 1;
    line(
      ctx,
      pts.map(([x, y]) => [x, Math.max(y, -75)]),
      A.X,
      A.Y,
    );
    ctx.strokeStyle = css("--trace3");
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.6;
    line(
      ctx,
      [
        [0, floor],
        [500, floor],
      ],
      A.X,
      A.Y,
    );
    ctx.setLineDash([]);
    ctx.fillStyle = css("--trace2");
    dot(ctx, A.X(f), A.Y(Math.max(peak, -75)), 4.5);
  });

  // 8a. butterfly
  function bflyStages(x: number[]): number[][][] {
    const N = 8,
      rev = (i: number) => ((i & 1) << 2) | (i & 2) | ((i & 4) >> 2);
    let re = [...Array(N)].map((_, i) => x[rev(i)]),
      im = Array(N).fill(0);
    const st = [[re.slice(), im.slice()]];
    for (let len = 2; len <= N; len <<= 1) {
      re = re.slice();
      im = im.slice();
      for (let i = 0; i < N; i += len)
        for (let j = 0; j < len / 2; j++) {
          const a = i + j,
            b = a + len / 2,
            ang = (-2 * Math.PI * j) / len,
            wr = Math.cos(ang),
            wi = Math.sin(ang);
          const tr = re[b] * wr - im[b] * wi,
            ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      st.push([re.slice(), im.slice()]);
    }
    return st;
  }
  function cfmt(a: number, b: number) {
    const z = (v: number) => (Math.abs(v) < 0.005 ? 0 : v),
      n = (v: number) => (+v.toFixed(2)).toString().replace("-", "−");
    a = z(a);
    b = z(b);
    if (b === 0) return n(a);
    if (a === 0) return (b < 0 ? "−" : "") + n(Math.abs(b)) + "i";
    return n(a) + (b < 0 ? "−" : "+") + n(Math.abs(b)) + "i";
  }
  type BfEls = {
    ln: [number, SVGElement][];
    w: [number, SVGElement][];
    nd: [number, SVGElement][];
    val: [number, number, SVGElement][];
    lab: SVGElement[];
    fin: SVGElement[];
  };
  const BF: { built: boolean; el: BfEls | null } = { built: false, el: null };
  demo("d-bfly", (r) => {
    const stage = P(r, "s"),
      sig = Ps(r, "sig"),
      N = 8;
    const x = [...Array(N)].map((_, n) =>
      sig === "imp"
        ? n === 0
          ? 1
          : 0
        : sig === "dc"
          ? 1
          : sig === "c1"
            ? Math.cos((2 * Math.PI * n) / 8)
            : sig === "alt"
              ? n % 2
                ? -1
                : 1
              : n,
    );
    O(r, "s", stage === 0 ? "並べ替え" : `${stage} 段目`);
    const st = bflyStages(x),
      // `.fig` scopes this to the diagram: the try-line also carries an <svg class="run"> decoration
      svg = r.querySelector<SVGSVGElement>(".fig svg")!,
      ns = "http://www.w3.org/2000/svg";
    const rev = (i: number) => ((i & 1) << 2) | (i & 2) | ((i & 4) >> 2),
      X = (s: number) => 96 + s * 160,
      Y = (i: number) => 40 + i * 56;
    if (!BF.built) {
      svg.innerHTML = "";
      const els: BfEls = (BF.el = { ln: [], w: [], nd: [], val: [], lab: [], fin: [] });
      const el = (t: string, a: Record<string, string | number>, txt?: string) => {
        const e = document.createElementNS(ns, t);
        for (const k in a) e.setAttribute(k, String(a[k]));
        if (txt != null) e.textContent = txt;
        svg.appendChild(e);
        return e;
      };
      for (let s = 0; s < 3; s++) {
        const len = 2 << s,
          half = len >> 1;
        for (let i = 0; i < N; i += len)
          for (let j = 0; j < half; j++) {
            const a = i + j,
              b = a + half;
            els.ln.push([
              s,
              el("path", {
                class: "ln",
                pathLength: 100,
                d: `M${X(s)},${Y(a)}L${X(s + 1)},${Y(a)}M${X(s)},${Y(b)}L${X(s + 1)},${Y(b)}M${X(s)},${Y(a)}L${X(s + 1)},${Y(b)}M${X(s)},${Y(b)}L${X(s + 1)},${Y(a)}`,
              }),
            ]);
            const tw = el("text", { class: "w", x: X(s) + 24, y: Y(b) + 24 }, "W");
            const t1 = document.createElementNS(ns, "tspan");
            t1.setAttribute("dy", "5");
            t1.textContent = "8";
            const t2 = document.createElementNS(ns, "tspan");
            t2.setAttribute("dy", "-13");
            t2.textContent = String(j * (N / len));
            tw.appendChild(t1);
            tw.appendChild(t2);
            els.w.push([s, tw]);
          }
        el(
          "text",
          { class: "st", x: X(s) + 80, y: Y(N - 1) + 42, "text-anchor": "middle" },
          `段 ${s + 1}`,
        );
      }
      for (let i = 0; i < N; i++) {
        for (let s = 0; s <= 3; s++)
          els.nd.push([s, el("circle", { class: "nd", cx: X(s), cy: Y(i), r: 3.5 })]);
        el("text", { x: X(0) - 14, y: Y(i) + 5, "text-anchor": "end" }, `x[${rev(i)}]`);
        els.lab.push(el("text", { class: "xl", x: X(3) + 14, y: Y(i) + 5 }, `X[${i}]`));
        els.fin.push(el("text", { class: "val fin", x: X(3) + 14, y: Y(i) + 5 }, ""));
        for (let s = 0; s < 3; s++)
          els.val.push([s, i, el("text", { class: "val", x: X(s) + 6, y: Y(i) - 8 }, "")]);
      }
      BF.built = true;
    }
    const els = BF.el!;
    els.ln.forEach(([s, e]) => {
      e.classList.toggle("cur", s === stage - 1);
      e.classList.toggle("off", s >= stage);
    });
    els.w.forEach(([s, e]) => e.classList.toggle("off", s >= stage));
    els.nd.forEach(([s, e]) => e.classList.toggle("off", s > stage));
    els.val.forEach(([s, i, e]) => {
      e.textContent = cfmt(st[s][0][i], st[s][1][i]);
      e.classList.toggle("off", s > stage);
    });
    els.lab.forEach((e) => e.classList.toggle("off", stage === 3));
    els.fin.forEach((e, i) => {
      e.textContent = `X[${i}] = ` + cfmt(st[3][0][i], st[3][1][i]);
      e.classList.toggle("off", stage !== 3);
    });
  });

  // 8b. operation count
  demo("d-ops", (r) => {
    const p = P(r, "p"),
      N = 2 ** p,
      d = N * N,
      f = N * p;
    O(r, "p", N.toLocaleString());
    O(
      r,
      "read",
      `DFT ${d.toLocaleString()} 回　FFT ${f.toLocaleString()} 回　→ <b>${Math.round(d / f).toLocaleString()} 倍</b>速い`,
    );
    const A = axes(C(r, "a"), {
        x0: 0,
        x1: 15,
        y0: 0,
        y1: 1,
        yticks: [],
        xticks: [0, 3, 6, 9, 12],
        xfmt: (v) => "10^" + v,
        xlabel: "掛け算の回数",
        ml: 52,
      }),
      ctx = A.ctx;
    ctx.font = "16px " + css("--f-body");
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    (<[number, number, string, string][]>[
      [Math.log10(d), 0.72, "--trace2", "DFT"],
      [Math.log10(f), 0.28, "--accent", "FFT"],
    ]).forEach(([v, y, c, t]) => {
      ctx.fillStyle = css(c);
      ctx.fillRect(A.X(0), A.Y(y) - 9, A.X(Math.min(v, 15)) - A.X(0), 18);
      ctx.fillStyle = css("--ink");
      ctx.fillText(t, A.m.l - 6, A.Y(y));
    });
  });

  // 9. Gibbs
  demo("d-gibbs", (r) => {
    const K = P(r, "K"),
      Kd = av("gK", K, 300);
    O(r, "K", `${K}（〜${2 * K - 1} 次）`);
    const KW = (m: number) => Math.max(0, Math.min(1, Kd - m)),
      Kn = Math.ceil(Kd);
    const pts = [];
    let mx = -9;
    for (let i = 0; i <= 1600; i++) {
      const t = i / 800;
      let s = 0;
      for (let m = 0; m < Kn; m++) {
        const n = 2 * m + 1;
        s += ((KW(m) * 4) / (Math.PI * n)) * Math.sin(2 * Math.PI * n * t);
      }
      pts.push([t, s]);
      if (t < 0.5) mx = Math.max(mx, s);
    }
    O(
      r,
      "read",
      `最大値 ${mx.toFixed(3)}　段差 2 に対する行き過ぎ <b>${(((mx - 1) / 2) * 100).toFixed(1)}%</b>`,
    );
    const A = axes(C(r, "a"), {
        x0: 0,
        x1: 2,
        y0: -1.45,
        y1: 1.45,
        xlabel: "時間（周期）",
        zero: true,
      }),
      ctx = A.ctx;
    ctx.strokeStyle = css("--muted");
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    line(
      ctx,
      [
        [0, 0],
        [0, 1],
        [0.5, 1],
        [0.5, -1],
        [1, -1],
        [1, 1],
        [1.5, 1],
        [1.5, -1],
        [2, -1],
        [2, 0],
      ],
      A.X,
      A.Y,
    );
    ctx.setLineDash([]);
    ctx.strokeStyle = css("--accent");
    ctx.lineWidth = 1.8;
    line(ctx, pts, A.X, A.Y);
    const nmax = av("gN", Math.max(11, 2 * K + 1), 300),
      B = axes(C(r, "b"), {
        x0: 0,
        x1: nmax,
        y0: 0,
        y1: 1.4,
        xlabel: "高調波の次数 n",
        ylabel: "振幅",
      }),
      b = B.ctx;
    b.strokeStyle = b.fillStyle = css("--trace2");
    b.lineWidth = 1.6;
    for (let m = 0; m < Kn; m++) {
      const n = 2 * m + 1,
        a = (KW(m) * 4) / (Math.PI * n);
      if (n > nmax) break;
      b.globalAlpha = KW(m);
      b.beginPath();
      b.moveTo(B.X(n), B.Y(0));
      b.lineTo(B.X(n), B.Y(a));
      b.stroke();
      dot(b, B.X(n), B.Y(a), K > 30 ? 1.8 : 3);
    }
    b.globalAlpha = 1;
  });

  // 10. STFT
  demo("d-stft", (r) => {
    const L = P(r, "L"),
      fs = 1000,
      Ns = 1000,
      x = new Float64Array(Ns);
    for (let n = 0; n < Ns; n++) {
      const t = n / fs;
      x[n] =
        Math.cos(2 * Math.PI * (50 * t + 200 * t * t)) +
        0.7 * Math.cos(2 * Math.PI * 300 * t) +
        0.7 * Math.cos(2 * Math.PI * 320 * t);
    }
    x[300] += 12;
    const w = windowFn("hann", L),
      hop = Math.max(2, L / 8),
      M = 512,
      frames = [];
    let gmax = 0;
    for (let s = 0; s + L <= Ns; s += hop) {
      const re = new Float64Array(M),
        im = new Float64Array(M);
      for (let n = 0; n < L; n++) re[n] = x[s + n] * w[n];
      fft(re, im, false);
      const col = new Float64Array(M / 2);
      for (let k = 0; k < M / 2; k++) {
        col[k] = Math.hypot(re[k], im[k]);
        if (col[k] > gmax) gmax = col[k];
      }
      frames.push({ t: (s + L / 2) / fs, col });
    }
    O(
      r,
      "read",
      `時間分解能 ≈ ${L} ms　周波数分解能 Δf = ${(fs / L).toFixed(1)} Hz　（300 Hz と 320 Hz の差は 20 Hz）`,
    );
    const A = axes(C(r, "a"), { x0: 0, x1: 1, y0: 0, y1: 500, xlabel: "時間 [s]", ylabel: "Hz" }),
      ctx = A.ctx;
    const c0 = rgb(css("--panel")),
      c1 = rgb(css("--accent")),
      c2 = rgb(css("--trace2")),
      H = M / 2,
      Wd = frames.length;
    const img = new ImageData(Wd, H);
    frames.forEach((fr, i) => {
      for (let k = 0; k < H; k++) {
        const db = 20 * Math.log10(fr.col[k] / gmax + 1e-12),
          v = Math.max(0, Math.min(1, (db + 50) / 50));
        const c = v < 0.6 ? mix(c0, c1, v / 0.6) : mix(c1, c2, (v - 0.6) / 0.4),
          idx = ((H - 1 - k) * Wd + i) * 4;
        img.data[idx] = c[0];
        img.data[idx + 1] = c[1];
        img.data[idx + 2] = c[2];
        img.data[idx + 3] = 255;
      }
    });
    const off = document.createElement("canvas");
    off.width = Wd;
    off.height = H;
    off.getContext("2d")!.putImageData(img, 0, 0);
    const x0 = A.X(frames[0].t - hop / 2 / fs),
      x1 = A.X(frames[Wd - 1].t + hop / 2 / fs);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, x0, A.Y(500), x1 - x0, A.Y(0) - A.Y(500));
    ctx.strokeStyle = css("--line");
    ctx.strokeRect(A.m.l + 0.5, A.m.t + 0.5, A.pw, A.ph);
  });

  // 4b. discrete winding: the actual DFT bins of a 64-point signal
  const DW = { N: 64, fs: 640 };
  function dwSignal(kind: string) {
    const { N, fs } = DW,
      x = new Float64Array(N),
      nz = gaussNoise(N, 3);
    for (let n = 0; n < N; n++) {
      const t = n / fs;
      x[n] =
        kind === "one"
          ? Math.cos(2 * Math.PI * 50 * t)
          : kind === "noisy"
            ? Math.cos(2 * Math.PI * 50 * t) +
              0.5 * Math.cos(2 * Math.PI * 120 * t + 0.7) +
              0.6 * nz[n]
            : Math.cos(2 * Math.PI * 50 * t) + 0.5 * Math.cos(2 * Math.PI * 120 * t + 0.7);
    }
    return x;
  }
  demo(
    "d-dwind",
    (r) => {
      const { N, fs } = DW,
        kind = Ps(r, "sig"),
        k = P(r, "k"),
        kd = av("dwk", k, 260),
        x = dwSignal(kind);
      O(r, "k", kd.toFixed(Number.isInteger(k) && Math.abs(kd - k) < 1e-3 ? 0 : 1));
      // centroid for (possibly fractional) k
      let cx = 0,
        cy = 0;
      const zx = new Float64Array(N),
        zy = new Float64Array(N);
      for (let n = 0; n < N; n++) {
        const th = (-2 * Math.PI * kd * n) / N;
        zx[n] = x[n] * Math.cos(th);
        zy[n] = x[n] * Math.sin(th);
        cx += zx[n];
        cy += zy[n];
      }
      cx /= N;
      cy /= N;
      const d = Math.hypot(cx, cy);
      O(
        r,
        "read",
        `k = ${kd.toFixed(Math.abs(kd - Math.round(kd)) < 1e-3 ? 0 : 2)}　f<sub>k</sub> = k·f<sub>s</sub>/N = ${((kd * fs) / N).toFixed(1)} Hz　|X[k]|/N = <b>${d.toFixed(3)}</b>`,
      );
      let rmax = 0;
      for (const v of x) rmax = Math.max(rmax, Math.abs(v));
      const A = plane(C(r, "a"), av("dwr", rmax * 1.15)),
        ctx = A.ctx,
        lime = css("--accent"),
        red = css("--trace2");
      ctx.strokeStyle = lime;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let n = 0; n < N; n++)
        if (n) ctx.lineTo(A.X(zx[n]), A.Y(zy[n]));
        else ctx.moveTo(A.X(zx[n]), A.Y(zy[n]));
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = lime;
      for (let n = 0; n < N; n++) dot(ctx, A.X(zx[n]), A.Y(zy[n]), 3);
      ctx.globalAlpha = 1;
      tag(ctx, "各点 = x[n]·e^{−i2πkn/N}", 8, A.H - 16, lime);
      ctx.strokeStyle = ctx.fillStyle = red;
      ctx.lineWidth = 2.6;
      arrow(ctx, A.ox, A.oy, A.X(cx), A.Y(cy));
      dot(ctx, A.X(cx), A.Y(cy), 4.5);
      tag(
        ctx,
        `重心 = X[k]/N（長さ ${d.toFixed(3)}）`,
        A.X(cx) + (cx >= 0 ? 10 : -10),
        A.Y(cy) + (cy >= 0 ? -14 : 14),
        red,
        cx >= 0 ? "left" : "right",
      );
      // spectrum of the same signal: |X[k]|/N for k = 0..N/2
      const re = new Float64Array(N),
        im = new Float64Array(N);
      re.set(x);
      fft(re, im, false);
      const mags = [];
      let mx = 0;
      for (let kk = 0; kk <= N / 2; kk++) {
        const m = Math.hypot(re[kk], im[kk]) / N;
        mags.push(m);
        mx = Math.max(mx, m);
      }
      const B = axes(C(r, "b"), {
          x0: -0.5,
          x1: N / 2 + 0.5,
          y0: 0,
          y1: av("dwmx", Math.max(0.1, mx * 1.25)),
          xlabel: "k",
          ylabel: "|X[k]|/N",
        }),
        b = B.ctx;
      b.strokeStyle = b.fillStyle = lime;
      b.lineWidth = 2;
      mags.forEach((m, kk) => {
        b.beginPath();
        b.moveTo(B.X(kk), B.Y(0));
        b.lineTo(B.X(kk), B.Y(m));
        b.stroke();
        dot(b, B.X(kk), B.Y(m), 2.8);
      });
      vline(B, kd, red, [3, 3]);
      b.fillStyle = red;
      dot(b, B.X(kd), B.Y(d), 5.5);
      tag(
        b,
        `今の k（${((kd * fs) / N).toFixed(0)} Hz）`,
        B.X(kd) + (kd < N / 2 - 8 ? 10 : -10),
        B.Y(d) - 16,
        red,
        kd < N / 2 - 8 ? "left" : "right",
      );
    },
    (r) => {
      const ks = r.querySelector<HTMLInputElement>('[data-p="k"]')!;
      ks.addEventListener("input", () => {
        ks.value = String(Math.round(+ks.value));
      });
      player(r, "k", 4, DW.N / 2, false);
    },
  );

  // 9b. denoise by keeping the largest components
  const DN = { N: 128 };
  demo("d-denoise", (r) => {
    const N = DN.N,
      fs = N,
      sigma = P(r, "s"),
      K = P(r, "K"),
      Kd = av("dnK", K, 300);
    O(r, "s", sigma.toFixed(2));
    O(r, "K", `${K}`);
    const clean = new Float64Array(N),
      x = new Float64Array(N),
      nz = gaussNoise(N, 11);
    for (let n = 0; n < N; n++) {
      const t = n / fs;
      clean[n] = Math.cos(2 * Math.PI * 5 * t) + 0.5 * Math.cos(2 * Math.PI * 12 * t + 0.7);
      x[n] = clean[n] + sigma * nz[n];
    }
    const re = new Float64Array(N),
      im = new Float64Array(N);
    re.set(x);
    fft(re, im, false);
    const amp = (k: number) => (Math.hypot(re[k], im[k]) * (k === 0 || k === N / 2 ? 1 : 2)) / N;
    const order = [...Array(N / 2 + 1).keys()].sort((a, b) => amp(b) - amp(a)),
      rank = Array.from<number>({ length: N / 2 + 1 });
    order.forEach((k, i) => (rank[k] = i));
    const wt = (k: number) => Math.max(0, Math.min(1, Kd - rank[k]));
    const fr = new Float64Array(N),
      fi = new Float64Array(N);
    for (let k = 0; k <= N / 2; k++) {
      const w = wt(k);
      if (!w) continue;
      fr[k] = re[k] * w;
      fi[k] = im[k] * w;
      if (k > 0 && k < N / 2) {
        fr[N - k] = re[N - k] * w;
        fi[N - k] = im[N - k] * w;
      }
    }
    fft(fr, fi, true);
    let e0 = 0,
      e1 = 0;
    for (let n = 0; n < N; n++) {
      e0 += (x[n] - clean[n]) ** 2;
      e1 += (fr[n] - clean[n]) ** 2;
    }
    O(
      r,
      "read",
      `元の信号との差（RMS）：ノイズあり ${Math.sqrt(e0 / N).toFixed(3)} → 再構成 <b>${Math.sqrt(e1 / N).toFixed(3)}</b>`,
    );
    let lo = 0,
      hi = 0;
    for (let n = 0; n < N; n++) {
      lo = Math.min(lo, x[n], fr[n]);
      hi = Math.max(hi, x[n], fr[n]);
    }
    const A = axes(C(r, "a"), {
        x0: 0,
        x1: 1,
        y0: av("dnlo", lo - 0.2),
        y1: av("dnhi", hi + 0.2),
        xlabel: "時間 t [s]",
        zero: true,
      }),
      ctx = A.ctx;
    const cl = [];
    for (let i = 0; i <= 600; i++) {
      const t = i / 600;
      cl.push([t, Math.cos(2 * Math.PI * 5 * t) + 0.5 * Math.cos(2 * Math.PI * 12 * t + 0.7)]);
    }
    ctx.strokeStyle = css("--muted");
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.4;
    line(ctx, cl, A.X, A.Y);
    ctx.setLineDash([]);
    ctx.fillStyle = css("--trace2");
    ctx.globalAlpha = 0.85;
    for (let n = 0; n < N; n++) dot(ctx, A.X(n / fs), A.Y(x[n]), 2.4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = css("--accent");
    ctx.lineWidth = 2.2;
    line(
      ctx,
      [...fr].map((v, n) => [n / fs, v]),
      A.X,
      A.Y,
    );
    const B = axes(C(r, "b"), {
        x0: -0.5,
        x1: N / 2 + 0.5,
        y0: 0,
        y1: 1.3,
        xlabel: "周波数 [Hz]",
        ylabel: "振幅",
      }),
      b = B.ctx;
    for (let k = 0; k <= N / 2; k++) {
      const a = amp(k),
        w = wt(k);
      b.lineWidth = 2;
      b.strokeStyle = b.fillStyle = css("--muted");
      b.globalAlpha = 0.55 * (1 - w);
      b.beginPath();
      b.moveTo(B.X(k), B.Y(0));
      b.lineTo(B.X(k), B.Y(a));
      b.stroke();
      dot(b, B.X(k), B.Y(a), 2.4);
      if (w > 0) {
        b.globalAlpha = w;
        b.strokeStyle = b.fillStyle = css("--accent");
        b.beginPath();
        b.moveTo(B.X(k), B.Y(0));
        b.lineTo(B.X(k), B.Y(a));
        b.stroke();
        dot(b, B.X(k), B.Y(a), 3.2);
      }
    }
    b.globalAlpha = 1;
    tag(
      b,
      `残す ${K} 本（黄緑）／捨てる（灰）`,
      B.m.l + B.pw - 4,
      B.m.t + 12,
      css("--muted"),
      "right",
    );
  });

  // 6b. window gallery: shapes and spectra side by side
  const WG: {
    sel: string;
    hov: string | null;
    cols: Record<string, string>;
    names: Record<string, string>;
    spec: Record<string, string[]>;
    cache: Record<string, { w: Float64Array; pts: Pt[] }>;
  } = {
    sel: "hann",
    hov: null,
    cols: {
      rect: "--ink",
      hann: "--accent",
      hamming: "--accent2",
      blackman: "--trace3",
      flattop: "--trace2",
    },
    names: {
      rect: "矩形",
      hann: "ハン",
      hamming: "ハミング",
      blackman: "ブラックマン",
      flattop: "フラットトップ",
    },
    spec: {
      rect: ["2 ビン", "−13 dB", "3.92 dB"],
      hann: ["4 ビン", "−31 dB", "1.42 dB"],
      hamming: ["4 ビン", "−43 dB", "1.78 dB"],
      blackman: ["6 ビン", "−58 dB", "1.10 dB"],
      flattop: ["10 ビン", "−93 dB", "≈0.01 dB"],
    },
    cache: {},
  };
  function wgSpec(type: string) {
    if (WG.cache[type]) return WG.cache[type];
    const N = 64,
      M = N * 64,
      w = windowFn(type, N);
    let sw = 0;
    for (const v of w) sw += v;
    const re = new Float64Array(M),
      im = new Float64Array(M);
    re.set(w);
    fft(re, im, false);
    const pts: Pt[] = [];
    for (let i = -12 * 64; i <= 12 * 64; i++) {
      const k = (i + M) % M;
      pts.push([i / 64, Math.max(-110, toDb(Math.hypot(re[k], im[k]) / sw))]);
    }
    return (WG.cache[type] = { w, pts });
  }
  demo(
    "d-wins",
    (r) => {
      const types = Object.keys(WG.names),
        focus = WG.hov || WG.sel;
      r.querySelectorAll<HTMLElement>("[data-win]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.win === WG.sel)),
      );
      const A = axes(C(r, "a"), {
          x0: 0,
          x1: 63,
          y0: -0.05,
          y1: 1.1,
          xlabel: "n（0〜N−1）",
          ylabel: "w[n]",
        }),
        B = axes(C(r, "b"), {
          x0: -12,
          x1: 12,
          y0: -110,
          y1: 6,
          xticks: [-12, -8, -4, 0, 4, 8, 12],
          xlabel: "中心からのずれ [ビン]",
          ylabel: "dB",
        });
      for (const t of types) {
        const d = wgSpec(t),
          on = t === focus,
          a = av("wga" + t, on ? 1 : 0.16, 250),
          col = css(WG.cols[t]);
        A.ctx.globalAlpha = a;
        A.ctx.strokeStyle = col;
        A.ctx.lineWidth = on ? 2.6 : 1.4;
        line(
          A.ctx,
          [...d.w].map((v, n) => [n, v]),
          A.X,
          A.Y,
        );
        B.ctx.globalAlpha = a;
        B.ctx.strokeStyle = col;
        B.ctx.lineWidth = on ? 2.2 : 1.2;
        line(B.ctx, d.pts, B.X, B.Y);
      }
      A.ctx.globalAlpha = B.ctx.globalAlpha = 1;
      const col = css(WG.cols[focus]),
        sp = WG.spec[focus];
      tag(A.ctx, WG.names[focus] + "窓", A.m.l + 10, A.m.t + 14, col);
      // annotate main lobe and highest side lobe on the spectrum
      const hw = parseFloat(sp[0]) / 2;
      B.ctx.strokeStyle = col;
      B.ctx.lineWidth = 1.5;
      B.ctx.setLineDash([4, 3]);
      B.ctx.beginPath();
      B.ctx.moveTo(B.X(-hw), B.Y(-104));
      B.ctx.lineTo(B.X(hw), B.Y(-104));
      B.ctx.stroke();
      const sl = parseFloat(sp[1].replace("−", "-"));
      B.ctx.beginPath();
      B.ctx.moveTo(B.X(-12), B.Y(sl));
      B.ctx.lineTo(B.X(12), B.Y(sl));
      B.ctx.stroke();
      B.ctx.setLineDash([]);
      tag(B.ctx, `メインローブ ${sp[0]}`, B.X(0), B.Y(-104) - 16, col, "center");
      tag(B.ctx, `最大サイドローブ ${sp[1]}`, B.X(12) - 6, B.Y(sl) - 16, col, "right");
      O(
        r,
        "kv",
        `<div><span>メインローブ幅</span><b>${sp[0]}</b></div><div><span>最大サイドローブ</span><b>${sp[1]}</b></div><div><span>スカロップ損失</span><b>${sp[2]}</b></div>`,
      );
    },
    (r) => {
      r.querySelectorAll<HTMLElement>("[data-win]").forEach((b) => {
        b.addEventListener("click", () => {
          WG.sel = b.dataset.win!;
          BOOK["d-wins"].draw();
        });
        b.addEventListener("pointerenter", () => {
          WG.hov = b.dataset.win!;
          BOOK["d-wins"].draw();
        });
        b.addEventListener("pointerleave", () => {
          WG.hov = null;
          BOOK["d-wins"].draw();
        });
      });
    },
  );

  // ---------- hero instrument: three sines, their sum, and the spectrum ----------
  (function hero() {
    const cv = $<HTMLCanvasElement>("heroCv");
    if (!cv) return;
    let vis = true,
      raf = 0;
    const t0 = performance.now();
    const comps: [number, number, string][] = [
      [1, 1, "--accent"],
      [3, 0.5, "--trace3"],
      [5, 0.3, "--trace2"],
    ];
    const draw = (now: number) => {
      raf = 0;
      const { ctx, W, H } = prep(cv);
      DRAWN.delete(cv);
      const t = REDUCED ? 0 : ((now - t0) / 1000) * 0.18,
        split = W < 520 ? W * 0.56 : Math.max(W * 0.62, W - 260),
        lx = 22,
        lw = split - lx - 30,
        top = 46,
        laneH = (H - top - 70) / 3;
      ctx.font = "16px " + css("--f-mono");
      ctx.textBaseline = "middle";
      ctx.fillStyle = css("--muted");
      ctx.textAlign = "left";
      ctx.fillText("時間領域", lx, 22);
      ctx.textAlign = "left";
      ctx.fillText("周波数領域", split + 20, 22);
      // component lanes, faint
      comps.forEach(([f, a, col], i) => {
        const cy = top + laneH * i + laneH / 2;
        ctx.strokeStyle = css(col);
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let k = 0; k <= 240; k++) {
          const x = k / 240,
            y = cy - a * Math.sin(2 * Math.PI * f * (x * 2 + t)) * laneH * 0.36;
          if (k) ctx.lineTo(lx + x * lw, y);
          else ctx.moveTo(lx + x * lw, y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      // the sum, glowing
      const sy = H - 36;
      ctx.strokeStyle = css("--accent");
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let k = 0; k <= 320; k++) {
        const x = k / 320;
        let v = 0;
        for (const [f, a] of comps) v += a * Math.sin(2 * Math.PI * f * (x * 2 + t));
        const y = sy - v * 18;
        if (k) ctx.lineTo(lx + x * lw, y);
        else ctx.moveTo(lx + x * lw, y);
      }
      ctx.stroke();
      ctx.fillStyle = css("--ink");
      ctx.textAlign = "right";
      ctx.fillText("= 合計", lx + lw + 26, sy - 34);
      // arrow
      ctx.strokeStyle = css("--muted");
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(split, 30);
      ctx.lineTo(split, H - 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = css("--accent");
      ctx.textAlign = "center";
      ctx.fillText("FFT →", split, 30 + (H - 44) * 0.3);
      // spectrum bars
      const bx0 = split + 30,
        bw = W - bx0 - 24,
        base = H - 40;
      ctx.strokeStyle = css("--line");
      ctx.beginPath();
      ctx.moveTo(bx0, base);
      ctx.lineTo(bx0 + bw, base);
      ctx.stroke();
      comps.forEach(([f, a, col]) => {
        const x = bx0 + bw * (f / 6),
          h = (base - 60) * a;
        ctx.strokeStyle = ctx.fillStyle = css(col);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, base - h);
        ctx.stroke();
        dot(ctx, x, base - h, 5);
        ctx.fillStyle = css("--muted");
        ctx.textAlign = "center";
        ctx.fillText(String(f), x, base + 18);
      });
      ctx.textAlign = "right";
      ctx.fillStyle = css("--muted");
      ctx.fillText("Hz", W - 10, base + 18);
      if (vis && !REDUCED)
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(draw);
        });
    };
    new IntersectionObserver((es) => {
      vis = es[0]!.isIntersecting;
      cv.parentElement!.classList.toggle("off", !vis);
      cv.parentElement!.style.setProperty("--sw", cv.clientWidth + "px");
      if (vis && !raf) raf = requestAnimationFrame(draw);
    }).observe(cv);
    new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(draw);
    }).observe(cv);
  })();
  // slider fill
  function fillRanges(root: HTMLElement) {
    root.querySelectorAll<HTMLInputElement>("input[type=range]").forEach((el) => {
      const mn = +el.min || 0,
        mx = +el.max || 100;
      el.style.setProperty(
        "--p",
        Math.max(0, Math.min(100, ((+el.value - mn) / (mx - mn)) * 100)) + "%",
      );
    });
  }
  document.addEventListener("input", (e) => {
    const el = e.target as HTMLElement;
    if (el.matches("input[type=range]")) fillRanges(el.parentElement!);
  });

  // ---------- background: quiet ripples spreading from two points ----------

  // ---------- scroll reveal: each block opens from a point like a ripple ----------
  // rings drawn on one overlay canvas (no DOM, no layout); follows the element while the page scrolls
  type Burst = { el: HTMLElement; ox: number; oy: number; R: number; t0: number };
  const FX: { cv: HTMLCanvasElement | null; list: Burst[]; raf: number } = {
    cv: null,
    list: [],
    raf: 0,
  };
  function burst(el: HTMLElement, ox: number, oy: number, R: number) {
    if (REDUCED) return;
    if (!FX.cv) {
      FX.cv = document.createElement("canvas");
      FX.cv.id = "fxRings";
      FX.cv.setAttribute("aria-hidden", "true");
      document.body.appendChild(FX.cv);
    }
    FX.list.push({ el, ox, oy, R, t0: performance.now() });
    if (!FX.raf) FX.raf = requestAnimationFrame(fxDraw);
  }
  function fxDraw(now: number) {
    const cv = FX.cv!,
      W = innerWidth,
      H = innerHeight;
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1.2;
    FX.list = FX.list.filter((b) => now - b.t0 < 1300);
    for (const b of FX.list) {
      const r = b.el.getBoundingClientRect(),
        cx = r.left + b.ox,
        cy = r.top + b.oy;
      (<[string, number][]>[
        ["--accent", 0],
        ["--trace3", 160],
      ]).forEach(([col, d]) => {
        const u = Math.max(0, Math.min(1, (now - b.t0 - d) / 1100));
        if (u <= 0 || u >= 1) return;
        const e = 1 - Math.pow(1 - u, 3);
        ctx.strokeStyle = css(col);
        ctx.globalAlpha = 0.7 * (1 - u);
        ctx.beginPath();
        ctx.arc(cx, cy, 6 + e * b.R, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    ctx.globalAlpha = 1;
    if (FX.list.length) FX.raf = requestAnimationFrame(fxDraw);
    else {
      FX.raf = 0;
      ctx.clearRect(0, 0, W, H);
    }
  }
  (function reveal() {
    if (REDUCED || !("IntersectionObserver" in window)) return;
    const items = [
      ...document.querySelectorAll<HTMLElement>(
        ".article h2, .article h3, .article .eq, .article .demo, .article .callout, .article details.ref",
      ),
    ];
    const vh = innerHeight;
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.95) return; // already visible at load: leave as is
      el.classList.add("rv-item");
      if (el.matches("h2")) {
        el.style.setProperty("--rx", "36px");
        el.style.setProperty("--ry", "36px");
      } else if (el.matches("h3")) {
        el.style.setProperty("--rx", "5px");
        el.style.setProperty("--ry", "50%");
      } else if (el.matches(".demo")) {
        el.style.setProperty("--rx", "52px");
        el.style.setProperty("--ry", "38px");
      } // from the TRY pill
      else {
        el.style.setProperty("--rx", "50%");
        el.style.setProperty("--ry", "50%");
      }
    });
    document.documentElement.classList.add("rv");
    // clip-path hides the element from IntersectionObserver in Chromium, so check positions on scroll instead
    let pend = items.filter((el) => el.classList.contains("rv-item")),
      tick = 0;
    const check = () => {
      tick = 0;
      const lim = innerHeight * 0.9;
      pend = pend.filter((el) => {
        if (el.getBoundingClientRect().top < lim) {
          open_(el);
          return false;
        }
        return true;
      });
      if (!pend.length) removeEventListener("scroll", onS);
    };
    const onS = () => {
      if (!tick) tick = requestAnimationFrame(check);
    };
    addEventListener("scroll", onS, { passive: true });
    addEventListener("resize", onS);
    function open_(el: HTMLElement) {
      el.classList.add("rv-in");
      if (el.matches("h2, .demo")) {
        const big = el.matches(".demo");
        burst(el, big ? 52 : 36, big ? 38 : 36, big ? el.offsetWidth * 0.75 : 240);
      } else if (el.matches("h3")) burst(el, 5, el.offsetHeight / 2, 90);
      setTimeout(() => {
        el.classList.remove("rv-item", "rv-in");
        el.style.removeProperty("--rx");
        el.style.removeProperty("--ry");
      }, 950);
    }
    check();
  })();

  // ---------- chapter jump with a ripple cut instead of scrolling ----------
  (function rippleNav() {
    const cut = $("rippleCut"),
      lbl = cut.querySelector<HTMLElement>(".lbl")!,
      rings = [...cut.querySelectorAll<HTMLElement>(".rings i")];
    let busy = false;
    const go = (target: HTMLElement, x: number, y: number) => {
      if (busy) return;
      busy = true;
      const W = innerWidth,
        H = innerHeight,
        R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 20;
      cut.style.setProperty("--cx", x + "px");
      cut.style.setProperty("--cy", y + "px");
      cut.classList.add("on");
      const no = target.querySelector("h2 .no");
      lbl.textContent = no ? no.textContent : "";
      const ease = (t: number) => 1 - Math.pow(1 - t, 3),
        T1 = 420,
        HOLD = 140,
        T2 = 520,
        t0 = performance.now();
      let jumped = false;
      const f = (now: number) => {
        const e = now - t0;
        if (e < T1) {
          const u = ease(e / T1);
          cut.style.clipPath = `circle(${u * R}px at ${x}px ${y}px)`;
          lbl.style.opacity = String(u * 0.9);
          rings.forEach((r, i) => {
            const v = Math.max(0, Math.min(1, (e - i * 70) / T1));
            r.style.width = r.style.height = ease(v) * R * 2 + "px";
            r.style.opacity = String((1 - v) * 0.8);
          });
        } else if (e < T1 + HOLD) {
          if (!jumped) {
            jumped = true;
            cut.style.clipPath = "none";
            window.scrollTo({
              top: target.getBoundingClientRect().top + scrollY - 8,
              behavior: "instant",
            });
            history.replaceState(null, "", "#" + target.id);
          }
        } else if (e < T1 + HOLD + T2) {
          const u = ease((e - T1 - HOLD) / T2),
            cx = W / 2,
            cy = H * 0.18,
            R2 = Math.hypot(W, H);
          // open the new page from the chapter number: a hole grows in the cover
          cut.style.clipPath = `path(evenodd,'M0 0H${W}V${H}H0Z M${cx - u * R2} ${cy} a${u * R2} ${u * R2} 0 1 0 ${u * R2 * 2} 0 a${u * R2} ${u * R2} 0 1 0 ${-u * R2 * 2} 0Z')`;
          lbl.style.opacity = String((1 - u) * 0.9);
          rings.forEach((r, i) => {
            const v = Math.max(0, Math.min(1, (e - T1 - HOLD - i * 70) / T2));
            cut.style.setProperty("--cx", cx + "px");
            cut.style.setProperty("--cy", cy + "px");
            r.style.width = r.style.height = ease(v) * R2 * 2 + "px";
            r.style.opacity = String((1 - v) * 0.7);
          });
        } else {
          cut.classList.remove("on");
          cut.style.clipPath = "";
          busy = false;
          return;
        }
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    };
    document.addEventListener("click", (e) => {
      const a = (e.target as Element).closest('a[href^="#ch"]');
      if (!a) return;
      const t = document.querySelector<HTMLElement>(a.getAttribute("href")!);
      if (!t) return;
      e.preventDefault();
      if (REDUCED) {
        t.scrollIntoView({ block: "start" });
        history.replaceState(null, "", "#" + t.id);
        return;
      }
      go(t, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
    });
  })();

  // light running around each "what to do" line: dash moved along the perimeter at a fixed px/s
  (function runLights() {
    if (REDUCED) return;
    const NS = "http://www.w3.org/2000/svg",
      SPEED = 260,
      LEN = 70,
      items: { el: HTMLElement; rs: SVGRectElement[]; per: number; vis: boolean }[] = [];
    document.querySelectorAll<HTMLElement>(".demo .try-line").forEach((el) => {
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "run");
      svg.setAttribute("aria-hidden", "true");
      const mk = (c: string) => {
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("class", c);
        r.setAttribute("x", "0.5");
        r.setAttribute("y", "0.5");
        r.setAttribute("rx", "10");
        svg.appendChild(r);
        return r;
      };
      const rs = [mk("glow"), mk("core")],
        it = { el, rs, per: 1, vis: false };
      el.appendChild(svg);
      items.push(it);
      const size = () => {
        const w = el.offsetWidth + 1,
          h = el.offsetHeight + 1;
        rs.forEach((r) => {
          r.setAttribute("width", String(w));
          r.setAttribute("height", String(h));
        });
        it.per = 2 * (w + h) - (8 - 2 * Math.PI) * 10;
        rs.forEach((r) => r.setAttribute("stroke-dasharray", `${LEN} ${it.per - LEN}`));
      };
      size();
      new ResizeObserver(size).observe(el);
    });
    const io = new IntersectionObserver((es) =>
      es.forEach((e) => {
        const it = items.find((i) => i.el === e.target);
        if (it) it.vis = e.isIntersecting;
      }),
    );
    items.forEach((i) => io.observe(i.el));
    const tick = (now: number) => {
      for (const it of items) {
        if (!it.vis) continue;
        const off = -(((now / 1000) * SPEED) % it.per);
        it.rs.forEach((r) => r.setAttribute("stroke-dashoffset", String(off)));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  // ---------- page wiring ----------
  // highlight the chapter being read in the table of contents
  {
    const links = new Map(
      [...document.querySelectorAll<HTMLElement>(".toc a")].map((a) => [
        a.getAttribute("href")!.slice(1),
        a,
      ]),
    );
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((a) => a.removeAttribute("aria-current"));
            const a = links.get(e.target.id);
            if (a) a.setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    document
      .querySelectorAll<HTMLElement>(".article section[id]")
      .forEach((sec) => io.observe(sec));
  }
  if (/^#ch\d+$/.test(location.hash)) {
    const t = document.querySelector(location.hash);
    if (t) requestAnimationFrame(() => t.scrollIntoView({ block: "start" }));
  }
  if (window.innerWidth < 980) $<HTMLDetailsElement>("tocDetails").open = false;
  schedule();
  const ro = new ResizeObserver(() => schedule());
  document.querySelectorAll<HTMLElement>(".plot").forEach((p) => ro.observe(p));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  if (document.fonts) document.fonts.ready.then(schedule);
}
