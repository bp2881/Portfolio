/* Hand-drawn project visuals. Flat fills only. Each returns markup; app.js adds
   the "run" class when the figure scrolls into view so it plays once. */
(function () {
  // ---- SatHarmoGAN: a real scene, block by block ---------------------------
  // Put a satellite image at assets/img/sat-sample.png. It is cropped to a square,
  // shown as the finer sensor, and block-averaged into the coarser sensor.
  // Without the file, a generated scene is used so the figure still works.
  const SAT_SRC = "assets/img/sat-sample.png";
  const FN = 72, K = 6, CN = FN / K; // fine pixels, block size, coarse pixels

  function sat() {
    return `<div class="sat">
      <div><p class="lbl">Finer sensor</p><div class="cv"><canvas class="fine" width="${FN}" height="${FN}"></canvas><span class="box" data-fbox></span></div></div>
      <div class="mid"><i></i><span>point spread function and generator</span><i></i></div>
      <div><p class="lbl">Coarser sensor</p><div class="cv"><canvas class="coarse" width="${CN}" height="${CN}"></canvas><span class="box" data-cbox></span></div></div>
    </div>
    <p class="cap">A fixed block average shows what the coarser sensor's pixels look like. The network learns the sensor's real blur and band response instead of using one fixed kernel.</p>`;
  }

  function drawGenerated(ctx) {
    const tones = [[22, 32, 46], [31, 45, 66], [44, 65, 96], [64, 96, 140], [111, 147, 194]];
    const img = ctx.createImageData(FN, FN);
    for (let y = 0; y < FN; y++) {
      for (let x = 0; x < FN; x++) {
        const v = Math.max(0, Math.min(0.999, 0.5 + 0.28 * Math.sin(x * 0.23 + 1) + 0.22 * Math.cos(y * 0.18) + 0.15 * Math.sin((x + y) * 0.13) + 0.05 * Math.sin(x * 1.7 + y * 2.3)));
        const t = tones[Math.floor(v * 5)], i = (y * FN + x) * 4;
        img.data[i] = t[0]; img.data[i + 1] = t[1]; img.data[i + 2] = t[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function prepSat(root) {
    const fine = root.querySelector("canvas.fine"), coarse = root.querySelector("canvas.coarse");
    const f = fine.getContext("2d"), c = coarse.getContext("2d");
    const st = { fine, coarse, f, c, avg: null, ready: false, token: 0, raf: 0, pending: null };
    root.__sat = st;
    const finish = () => {
      try {
        const d = f.getImageData(0, 0, FN, FN).data, avg = [];
        for (let by = 0; by < CN; by++) for (let bx = 0; bx < CN; bx++) {
          let r = 0, g = 0, b = 0;
          for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
            const i = ((by * K + y) * FN + bx * K + x) * 4;
            r += d[i]; g += d[i + 1]; b += d[i + 2];
          }
          avg.push(`rgb(${Math.round(r / (K * K))},${Math.round(g / (K * K))},${Math.round(b / (K * K))})`);
        }
        st.avg = avg;
      } catch (e) { st.avg = null; } // canvas tainted (opened from disk): fall back to drawImage
      st.ready = true;
      if (st.pending) st.pending();
    };
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      f.imageSmoothingEnabled = true; f.imageSmoothingQuality = "high";
      f.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, FN, FN);
      finish();
    };
    img.onerror = () => { drawGenerated(f); finish(); };
    img.src = SAT_SRC;
  }

  function paintBlock(st, i) {
    const bx = i % CN, by = Math.floor(i / CN);
    if (st.avg) { st.c.fillStyle = st.avg[i]; st.c.fillRect(bx, by, 1, 1); }
    else st.c.drawImage(st.fine, bx * K, by * K, K, K, bx, by, 1, 1);
  }

  const STEP_MS = 36; // fixed time per coarse pixel, so every run is identical

  function stopSat(root) {
    const st = root.__sat;
    if (!st) return;
    st.token++; st.pending = null;
    cancelAnimationFrame(st.raf);
    st.c.clearRect(0, 0, CN, CN);
    root.querySelectorAll(".box").forEach((b) => b.classList.remove("on"));
  }

  function playSat(root, instant) {
    const st = root.__sat;
    if (!st) return;
    stopSat(root);
    const go = () => {
      const total = CN * CN;
      if (instant) { for (let i = 0; i < total; i++) paintBlock(st, i); return; }
      const t = ++st.token;
      const fb = root.querySelector("[data-fbox]"), cb = root.querySelector("[data-cbox]");
      const cell = (el) => el.parentElement.clientWidth / CN;
      const fc = cell(fb), cc = cell(cb);
      fb.style.width = fb.style.height = fc + "px";
      cb.style.width = cb.style.height = cc + "px";
      let painted = 0, t0 = null;
      const tick = (ts) => {
        if (st.token !== t) return;
        if (t0 === null) t0 = ts;
        const due = Math.min(total, Math.floor((ts - t0) / STEP_MS) + 1);
        while (painted < due) paintBlock(st, painted++); // never skips a block, whatever the frame rate
        const i = painted - 1, bx = i % CN, by = Math.floor(i / CN);
        fb.style.transform = `translate(${bx * fc}px,${by * fc}px)`;
        cb.style.transform = `translate(${bx * cc}px,${by * cc}px)`;
        fb.classList.add("on"); cb.classList.add("on");
        if (painted >= total && ts - t0 >= total * STEP_MS) { fb.classList.remove("on"); cb.classList.remove("on"); return; }
        st.raf = requestAnimationFrame(tick);
      };
      st.raf = requestAnimationFrame(tick);
    };
    if (st.ready) go(); else st.pending = go;
  }

  // ---- PLUTO: periodic bursts, sliding window, flagged windows ------------
  function pluto() {
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const base = 150, x0 = 30, x1 = 600, bursts = [120, 240, 360, 480];
    let bars = "";
    for (let x = x0; x < x1; x += 7) {
      const inBurst = bursts.some((b) => x >= b && x < b + 28);
      const h = inBurst ? 62 + rnd() * 28 : 4 + rnd() * 12;
      bars += `<rect x="${x}" y="${base - h}" width="4" height="${h}" fill="${inBurst ? "#e9e6dd" : "#5f6a7b"}"/>`;
    }
    const flags = bursts.map((b) => {
      const d = ((b - x0 - 30) / 490) * 5.2;
      return `<rect class="pl-flag" x="${b - 14}" y="160" width="56" height="10" style="--d:${Math.max(0.4, d).toFixed(2)}s"/>`;
    }).join("");
    return `<svg viewBox="0 0 640 200" role="img" aria-label="Periodic attack bursts in traffic, a sliding detection window, and flagged windows under each burst">
      <line x1="${x0}" y1="${base}" x2="${x1}" y2="${base}" stroke="#2b3849" stroke-width="1"/>
      ${bars}
      <g class="pl-win"><rect x="${x0}" y="40" width="88" height="112"/><text class="svg-m" x="${x0}" y="30">window</text></g>
      <text class="svg-t" x="${x0}" y="186">Flagged windows</text>
      ${flags}
    </svg>
    <p class="cap">Low-rate attacks arrive as short bursts on a fixed period. Each window is scored from entropy, variance and wavelet features, and flagged flows are filtered in the data plane.</p>`;
  }

  // ---- YAG: commit graph pushed to a central repo -------------------------
  function yag() {
    const c = (x, y, d, h, up) =>
      `<circle class="yg-c" cx="${x}" cy="${y}" r="8" style="--d:${d}s"/><text class="svg-m yg-h" x="${x}" y="${up ? y - 18 : y + 28}" text-anchor="middle" style="--d:${d}s">${h}</text>`;
    return `<svg viewBox="0 0 700 210" role="img" aria-label="A commit graph with a branch and merge, pushed over SSH to a central repository">
      <path class="yg-l" d="M40 70 H480"/>
      <path class="yg-l" d="M150 70 C 175 70 175 140 205 140 H 345 C 375 140 375 70 400 70"/>
      ${c(40, 70, 0.1, "a3f9c1e", true)}${c(150, 70, 0.4, "7be20d4", true)}${c(400, 70, 1.5, "c81a5f0", true)}${c(480, 70, 1.8, "2d94b7a", true)}
      ${c(205, 140, 0.8, "e0417cb", false)}${c(345, 140, 1.2, "5a1f9d3", false)}
      <text class="svg-t" x="205" y="188">feature branch, merged</text>
      <path class="yg-l" d="M488 70 H 560"/>
      <path class="yg-p" pathLength="1" d="M488 70 H 560"/>
      <rect x="566" y="46" width="112" height="48" fill="#0a0e15" stroke="#2b3849" stroke-width="1.5"/>
      <text class="svg-b" x="622" y="75" text-anchor="middle">central repo</text>
      <text class="svg-t" x="524" y="34" text-anchor="middle">SSH and SCP</text>
      <text class="svg-t" x="622" y="120" text-anchor="middle">verify, retry x3</text>
    </svg>
    <p class="cap">Commit IDs are SHA-256 hashes and match across operating systems. A push only goes out when the branch heads differ, and every transfer is checked by hash.</p>`;
  }

  // ---- home-stream: one request, from click to bytes ----------------------
  function stream() {
    const P1 = "M 130 112 H 320", P2 = "M 350 100 V 58", P3 = "M 400 58 V 100", P4 = "M 430 112 H 630", P5 = "M 630 132 H 130";
    const T = [[0.3, 1.6], [2.1, 1.4], [3.7, 1.4], [5.3, 1.5], [7.0, 3.2]]; // [delay, length] per step, seconds
    const v = (d, l) => `--d:${d}s;--l:${l}s`;
    const dot = (path, d, l, cls) => `<circle class="st-dot ${cls || ""}" r="6" style="offset-path:path('${path}');${v(d, l)}"/>`;
    const box = (x, y, w, t, lit) =>
      `<rect class="st-box ${lit ? "st-lit" : ""}" x="${x}" y="${y}" width="${w}" height="48" ${lit ? `style="${v(lit[0], lit[1])}"` : ""}/><text class="svg-b" x="${x + w / 2}" y="${y + 29}" text-anchor="middle">${t}</text>`;
    const steps = [
      ["The browser asks for a range", "GET with Range: bytes=0-. Every seek sends a new range."],
      ["Nginx passes it to Flask", "Only the request travels, never the file."],
      ["Flask checks access", "It answers with an X-Accel-Redirect header and no body."],
      ["Nginx opens the file itself", "An internal redirect. sendfile copies disk to socket inside the kernel."],
      ["206 Partial Content streams back", "Python is not in this path."],
    ];
    return `<svg viewBox="0 0 760 180" role="img" aria-label="One request: the browser asks Nginx for a byte range, Nginx asks Flask who may read the file, Flask replies with an X-Accel-Redirect header, and Nginx sends the bytes from disk to the browser">
      <path class="st-l st-lit" d="${P1}" style="${v(...T[0])}"/>
      <path class="st-d st-lit" d="${P2}" style="${v(...T[1])}"/>
      <path class="st-d st-lit" d="${P3}" style="${v(...T[2])}"/>
      <path class="st-l st-lit" d="${P4}" style="${v(...T[3])}"/>
      <path class="st-x st-keep" d="${P5}" style="${v(...T[4])}"/>
      ${dot(P1, 0.3, 1.4)}${dot(P2, 2.1, 1.0)}${dot(P3, 3.7, 1.0)}${dot(P4, 5.3, 1.2)}
      ${dot(P5, 7.0, 1.9, "b")}${dot(P5, 7.7, 1.9, "b")}${dot(P5, 8.4, 1.9, "b")}
      ${box(20, 100, 110, "Browser")}${box(320, 100, 110, "Nginx")}${box(320, 10, 110, "Flask", [2.1, 3.0])}${box(630, 100, 110, "Disk", T[3])}
      <text class="svg-m" x="225" y="84" text-anchor="middle">GET /movie.mp4</text>
      <text class="svg-m" x="225" y="98" text-anchor="middle">Range: bytes=0-</text>
      <text class="svg-t" x="306" y="38" text-anchor="end">asks Flask</text>
      <text class="svg-m" x="444" y="34">X-Accel-Redirect:</text>
      <text class="svg-m" x="444" y="50">/files/movie.mp4</text>
      <text class="svg-t" x="530" y="98" text-anchor="middle">internal redirect</text>
      <text class="svg-t" x="225" y="164" text-anchor="middle">206 Partial Content</text>
      <text class="svg-t" x="530" y="164" text-anchor="middle">sendfile, disk to socket</text>
    </svg>
    <ol class="stp">${steps.map((s, i) => `<li style="${v(...T[i])}"><span class="n">${i + 1}</span><b>${s[0]}</b><span>${s[1]}</span></li>`).join("")}</ol>
    <p class="cap">Flask decides. Nginx delivers. Seeking in the player repeats the five steps with a new range.</p>`;
  }

  window.Viz = { sat, pluto, yag, stream, prepSat, playSat, stopSat };
})();
