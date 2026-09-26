(() => {
  const root = document.documentElement;
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("#site-menu");
  const stage = document.querySelector("[data-stage]");
  const layers = [...document.querySelectorAll("[data-depth]")];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const ready = () => root.classList.add("is-ready");
  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready, { once: true });
  requestAnimationFrame(ready);

  if (toggle && menu) {
    const setMenu = (open, returnFocus = false) => {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (!open && returnFocus) toggle.focus();
    };

    toggle.addEventListener("click", () => setMenu(menu.hidden));
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) setMenu(false, true);
    });
    document.addEventListener("pointerdown", (event) => {
      if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) {
        setMenu(false);
      }
    });
  }

  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let raf = 0;

  const resetLayers = () => {
    layers.forEach((el) => {
      el.style.transform = "translate(0px, 0px)";
    });
  };

  const tick = () => {
    tx += (mx - tx) * 0.085;
    ty += (my - ty) * 0.085;
    layers.forEach((el) => {
      const depth = Number(el.getAttribute("data-depth") || 0);
      el.style.transform = "translate(" + (tx * depth).toFixed(2) + "px, " + (ty * depth).toFixed(2) + "px)";
    });
    if (Math.abs(mx - tx) + Math.abs(my - ty) > 0.04) raf = requestAnimationFrame(tick);
    else raf = 0;
  };

  const enabled = () => !reduce.matches && finePointer.matches && layers.length && stage;

  const onMove = (event) => {
    if (!enabled()) return;
    const rect = stage.getBoundingClientRect();
    mx = ((event.clientX - rect.left) / rect.width - 0.5) * 16;
    my = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onLeave = () => {
    mx = 0;
    my = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const bindMotion = () => {
    if (!stage) return;
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerleave", onLeave);
    if (enabled()) {
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeave);
    } else {
      mx = my = tx = ty = 0;
      resetLayers();
    }
  };

  bindMotion();
  reduce.addEventListener("change", bindMotion);
  finePointer.addEventListener("change", bindMotion);
})();
