/* Lightweight signal field. Decorative only; the watercolor hero stays intact if this never runs. */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const compact = window.matchMedia("(max-width: 47.5rem)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const field = document.querySelector("[data-field]");

const VB_W = 1440;
const VB_H = 900;
const LINE = [
  [[283, 618], [360, 548], [448, 572], [548, 528]],
  [[548, 528], [640, 490], [732, 452], [822, 392]],
  [[822, 392], [910, 336], [1010, 292], [1118, 248]],
  [[1118, 248], [1228, 202], [1338, 162], [1468, 128]],
];
const NETWORK = [
  [638, 742], [704, 688], [786, 716], [868, 648], [952, 682], [1048, 628],
  [762, 642], [838, 668], [910, 722],
];
const NAVY = [32, 48, 68];
const BLUE = [127, 154, 180];
const CYAN = [150, 188, 198];
const CORAL = [201, 137, 106];

const eligible = () => Boolean(field) && !reduceMotion.matches && !compact.matches;

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bezier(seg, t) {
  const u = 1 - t;
  const [p0, p1, p2, p3] = seg;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function pointOnLine(u) {
  const x = Math.min(0.9999, Math.max(0, u)) * LINE.length;
  const seg = Math.floor(x);
  return bezier(LINE[seg], x - seg);
}

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function buildField() {
  const rand = mulberry32(0x51a7);
  const particles = [];
  const add = (x, y, group, color, anchor) => {
    const wide = !anchor && rand() < 0.66;
    const scatter = anchor ? 18 + rand() * 22 : wide ? 72 + rand() * 78 : 10 + rand() * 18;
    const angle = rand() * Math.PI * 2;
    particles.push({
      x,
      y,
      group,
      color,
      anchor,
      nx: Math.cos(angle) * scatter,
      ny: Math.sin(angle) * scatter * 0.68,
      phase: rand() * Math.PI * 2,
      drift: 1.4 + rand() * 1.6,
      depth: anchor ? 1 : 0.42 + rand() * 0.58,
      radius: anchor ? 4.6 + rand() * 0.8 : 2.45 + rand() * 1.55,
      alpha: anchor ? 0.96 : 0.68 + rand() * 0.24,
      jx: rand(),
      jy: rand(),
    });
  };
  const lineColor = () => {
    const roll = rand();
    if (roll < 0.06) return CORAL;
    if (roll < 0.16) return CYAN;
    if (roll < 0.42) return BLUE;
    return NAVY;
  };

  for (let i = 0; i < 92; i += 1) add(...pointOnLine(0.16 + (i / 91) * 0.84), "line", lineColor(), false);
  [
    [20, 560, 516, NAVY],
    [45, 836, 380, NAVY],
    [70, 1006, 314, NAVY],
    [88, 1134, 232, BLUE],
  ].forEach(([index, x, y, color]) => {
    particles[index].x = x;
    particles[index].y = y;
    particles[index].color = color;
    particles[index].anchor = true;
    particles[index].radius = 5.2;
    particles[index].alpha = 0.96;
    particles[index].depth = 1;
  });

  for (let i = 0; i < 34; i += 1) {
    add(0, 0, "sky", i === 12 ? CORAL : rand() < 0.35 ? BLUE : NAVY, i === 12);
  }
  for (let i = 0; i < 30; i += 1) {
    const base = NETWORK[i % NETWORK.length];
    const anchor = i === 4 || i === 16;
    add(
      base[0] + (rand() - 0.5) * 34,
      base[1] + (rand() - 0.5) * 26,
      "net",
      anchor ? NAVY : rand() < 0.72 ? NAVY : BLUE,
      anchor
    );
  }

  const links = [
    [8, 14], [14, 20], [20, 26], [26, 32], [32, 38], [38, 44],
    [44, 50], [50, 56], [56, 62], [62, 70], [70, 78], [78, 86],
    [126, 127], [127, 128], [128, 129], [129, 130], [130, 131], [127, 132],
  ];
  return { particles, links };
}

function mount() {
  const canvas = document.createElement("canvas");
  canvas.className = "it-field__canvas";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  field.appendChild(canvas);

  const { particles, links } = buildField();
  const xy = new Float32Array(particles.length * 2);
  const anchorCount = particles.reduce((sum, particle) => sum + (particle.anchor ? 1 : 0), 0);
  let width = 1;
  let height = 1;
  let scale = 1;
  let originX = 0;
  let originY = 0;
  let visible = true;
  let running = false;
  let frame = 0;
  let last = 0;
  let pointerX = 0;
  let pointerY = 0;
  let aimX = 0;
  let aimY = 0;
  const started = performance.now();
  const stage = document.querySelector("[data-stage]") || field;

  const placeSky = () => {
    let index = 0;
    particles.forEach((particle) => {
      if (particle.group !== "sky") return;
      const col = index % 8;
      const row = Math.floor(index / 8);
      index += 1;
      const px = width * (0.66 + (col + (particle.jx - 0.5) * 0.8) * 0.038);
      const py = height * (0.03 + (row + (particle.jy - 0.5) * 0.65) * 0.052);
      particle.x = (px - originX) / scale;
      particle.y = (py - originY) / scale;
    });
  };

  const layout = () => {
    const rect = field.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    scale = Math.max(width / VB_W, height / VB_H);
    originX = (width - VB_W * scale) / 2;
    originY = height - VB_H * scale;
    placeSky();
  };

  const project = (x, y, out, index) => {
    out[index] = x * scale + originX;
    out[index + 1] = y * scale + originY;
  };

  const draw = (now) => {
    const raw = Math.min(1, Math.max(0, (now - started - 180) / 1280));
    const calm = ease(raw);
    aimX += (pointerX - aimX) * 0.08;
    aimY += (pointerY - aimY) * 0.08;
    context.clearRect(0, 0, width, height);

    particles.forEach((particle, index) => {
      const drift = Math.sin(now * 0.00042 + particle.phase) * particle.drift;
      const driftY = Math.cos(now * 0.00036 + particle.phase) * particle.drift * 0.65;
      project(
        particle.x + particle.nx * (1 - calm),
        particle.y + particle.ny * (1 - calm),
        xy,
        index * 2
      );
      xy[index * 2] += drift + aimX * particle.depth;
      xy[index * 2 + 1] += driftY + aimY * particle.depth;
    });

    links.forEach((pair) => {
      const ax = xy[pair[0] * 2];
      const ay = xy[pair[0] * 2 + 1];
      const bx = xy[pair[1] * 2];
      const by = xy[pair[1] * 2 + 1];
      const dist = Math.hypot(ax - bx, ay - by);
      if (dist > 210) return;
      const fade = Math.min((ax / width - 0.4) / 0.16, (bx / width - 0.4) / 0.16, 1);
      const alpha = calm * 0.62 * (1 - dist / 210) * Math.max(0, fade);
      if (alpha < 0.02) return;
      context.beginPath();
      context.moveTo(ax, ay);
      context.lineTo(bx, by);
      context.strokeStyle = "rgba(32, 48, 68, " + alpha.toFixed(3) + ")";
      context.lineWidth = 1.15;
      context.stroke();
    });

    particles.forEach((particle, index) => {
      const x = xy[index * 2];
      const y = xy[index * 2 + 1];
      if (x < -12 || y < -12 || x > width + 12 || y > height + 12) return;
      const fade = Math.max(0, Math.min(1, (x / width - 0.4) / 0.16));
      if (fade <= 0) return;
      const reveal = particle.anchor ? 0.35 + calm * 0.65 : 0.72 + calm * 0.28;
      const alpha = particle.alpha * fade * reveal;
      const [red, green, blue] = particle.color;
      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = "rgba(" + red + ", " + green + ", " + blue + ", " + alpha.toFixed(3) + ")";
      context.fill();
      if (!particle.anchor || calm < 0.2) return;
      context.beginPath();
      context.arc(x, y, particle.radius + 4.6, 0, Math.PI * 2);
      context.strokeStyle = "rgba(" + red + ", " + green + ", " + blue + ", " + (0.78 * calm * fade).toFixed(3) + ")";
      context.lineWidth = 1.25;
      context.stroke();
    });
    frame += 1;
    if (frame % 15 === 0) canvas.dataset.frames = String(frame);
  };

  let raf = 0;
  const loop = (now) => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (now - last < 33) return;
    last = now;
    draw(now);
  };

  const sync = () => {
    const active = visible && document.visibilityState !== "hidden" && eligible();
    if (active && !running) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!active && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };

  const onMove = (event) => {
    if (!finePointer.matches) return;
    const rect = field.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 16;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
  };
  const onLeave = () => {
    pointerX = 0;
    pointerY = 0;
  };
  const onResize = () => layout();
  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    sync();
  }, { threshold: 0.08 });

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener("visibilitychange", sync);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("resize", onResize);
    canvas.remove();
  };

  layout();
  draw(started);
  observer.observe(field);
  document.addEventListener("visibilitychange", sync);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerleave", onLeave);
  window.addEventListener("resize", onResize);
  canvas.dataset.ready = "1";
  canvas.dataset.renderer = "canvas2d";
  canvas.dataset.points = String(particles.length);
  canvas.dataset.links = String(links.length);
  canvas.dataset.anchors = String(anchorCount);
  canvas.dataset.frames = "0";
  sync();
  return stop;
}

let teardown = null;
function syncEligibility() {
  if (eligible()) {
    if (!teardown) teardown = mount();
    return;
  }
  if (teardown) {
    teardown();
    teardown = null;
  }
}

if (field) {
  reduceMotion.addEventListener("change", syncEligibility);
  compact.addEventListener("change", syncEligibility);
  syncEligibility();
}

