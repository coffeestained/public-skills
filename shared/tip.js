// One tooltip for the page. Anything carrying data-tip shows it while the pointer is over it.
(() => {
  const tip = document.body.appendChild(Object.assign(document.createElement("div"), { className: "tip", hidden: true }));
  let over = null;
  const hide = () => { over = null; tip.hidden = true; };
  addEventListener("pointermove", e => {
    const el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if (el !== over) { over = el; tip.hidden = !el; if (el) tip.innerHTML = el.dataset.tip; }
    if (!el) return;
    const w = tip.offsetWidth, h = tip.offsetHeight;   // beside the pointer, kept inside the window
    tip.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - w - 8)) + "px";
    tip.style.top = (e.clientY + 18 + h > innerHeight ? e.clientY - h - 10 : e.clientY + 18) + "px";
  });
  addEventListener("scroll", hide, true); addEventListener("beforeprint", hide);
  document.documentElement.addEventListener("pointerleave", hide);
})();
