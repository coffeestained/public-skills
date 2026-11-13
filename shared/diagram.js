// The diagram engine: diagram(host, view) draws one C4 view into any element, as many per page as wanted.
// Needs the model helpers above it. view is {"level":"container"} or {"level":"component","container":"api"}.
const LEVELS = {
  context: { title: "System Context diagram", scope: "The whole software system", primary: "The software system",
    supporting: "People and external systems that use or are used by it", audience: "Everyone, technical or not" },
  container: { title: "Container diagram", scope: "Inside the system boundary", primary: "Containers (apps and data stores)",
    supporting: "People and external systems connected to them", audience: "Developers, architects, operations" },
  component: { title: "Component diagram", scope: "Inside one container", primary: "Components of that container",
    supporting: "Containers, people and systems they talk to", audience: "Developers and architects" }
};
// Paper: lay the diagram out at `layout` px, where the side column fits, then scale it to `fit` px (A4 inside 12mm margins).
const PRINT = { layout: 1180, fit: 700 };

// Decide what a view shows: people on top, the boundary in the middle, supporting systems at the side.
function buildView(view) {
  const level = view.level || "context";
  const people = els.filter(e => e.type === "person");
  const externals = els.filter(e => e.type === "system" && e.external);
  const subject = byId[view.container] || {};
  let inside, boundary, side;
  if (level === "context") {
    inside = [system]; boundary = null; side = externals;
  } else if (level === "container") {
    inside = els.filter(e => e.type === "container" && e.parent === system.id);
    boundary = { label: system.name, type: "Software System" }; side = externals;
  } else {
    inside = els.filter(e => e.type === "component" && e.parent === subject.id);
    boundary = { label: subject.name, type: "Container" + (subject.technology ? ": " + subject.technology : "") };
    side = [];  // filled below: only the neighbours that actually connect to a component
  }
  const ins = new Set(inside.map(e => e.id));
  let edges = mergeFlows(level, view.container).filter(e => level !== "component" || ins.has(e.from) || ins.has(e.to));
  if (level === "component") {
    const seen = new Set();
    for (const e of edges) for (const id of [e.from, e.to]) if (!ins.has(id) && byId[id] && !seen.has(id)) { seen.add(id); if (byId[id].type !== "person") side.push(byId[id]); }
  }
  const visible = new Set([...people, ...inside, ...side].map(e => e.id));
  edges = edges.filter(e => visible.has(e.from) && visible.has(e.to));
  const peopleShown = people.filter(p => level === "context" || edges.some(e => e.from === p.id || e.to === p.id));
  const name = level === "component" ? subject.name : system.name;
  return { level, name, title: `${LEVELS[level].title}: ${name}`, people: peopleShown, inside, boundary, side, edges };
}

// Rank the inside elements into layers so arrows mostly flow downward: entry points first.
function layers(inside, edges) {
  const ids = new Set(inside.map(e => e.id)), rank = new Map();
  const preds = id => edges.filter(e => e.to === id && ids.has(e.from)).map(e => e.from);
  const fromOutside = id => edges.some(e => e.to === id && !ids.has(e.from));
  let queue = inside.filter(e => fromOutside(e.id) || preds(e.id).length === 0).map(e => e.id);
  if (!queue.length) queue = [inside[0].id];
  queue.forEach(id => rank.set(id, 0));
  for (let i = 0; i < queue.length; i++) for (const e of edges) if (e.from === queue[i] && ids.has(e.to) && !rank.has(e.to)) { rank.set(e.to, rank.get(queue[i]) + 1); queue.push(e.to); }
  const max = Math.max(0, ...rank.values());
  inside.forEach(e => { if (!rank.has(e.id)) rank.set(e.id, max + 1); });
  const out = []; inside.forEach(e => (out[rank.get(e.id)] ||= []).push(e)); return out.filter(Boolean);
}

// What a relationship says when it is pointed at: both ends, every intent, the technology.
const flowTip = e => `<b>${esc(nameOf(e.from))} → ${esc(nameOf(e.to))}</b>${(e.labels.length ? e.labels : ["Uses"]).map(l => `<div>${esc(l)}</div>`).join("")}${e.techs.length ? `<div class="t">${esc(e.techs.join(", "))}</div>` : ""}`;

// view.componentPages lists the containers that have a page of their own to link to.
function card(e, v, view) {
  const kind = kindOf(e), external = !!e.external;
  const comps = els.filter(x => x.type === "component" && x.parent === e.id);
  const rels = v.edges.filter(r => r.from === e.id || r.to === e.id);
  const typeLine = TYPE_LABEL[e.type] + (e.technology ? ": " + e.technology : "");
  const linked = (view.componentPages || []).includes(e.id);
  const zoomTip = `<b>${comps.length} component${comps.length === 1 ? "" : "s"}</b><div>${esc(comps.map(c => c.name).join(", "))}</div>${linked ? '<div class="t">Click to open its diagram</div>' : ""}`;
  const zoom = comps.length && e.type === "container" ? `<span class="badge tl"${tipAttr(zoomTip)}>${linked ? `<a href="component-${esc(e.id)}.html">${ICON.zoom}</a>` : ICON.zoom} ${comps.length}</span>` : "";
  const relTip = `<b>${rels.length} relationship${rels.length === 1 ? "" : "s"} here</b>${rels.map(r => `<div>${r.from === e.id ? "→ " + esc(nameOf(r.to)) : "← " + esc(nameOf(r.from))}: ${esc(r.labels.join(" / ") || "Uses")}</div>`).join("")}`;
  const internal = e.type !== "person" && !external;
  return `<div class="card ${kind}${external ? " external" : ""}" data-id="${esc(e.id)}">
    ${zoom}<span class="badge tr"${tipAttr(relTip)}><span class="dot"></span>${rels.length}</span>
    <div class="head"><div class="tile k-${kind}">${ICON[kind]}</div><div><div class="name">${esc(e.name)}</div><div class="type">[${esc(typeLine)}]</div></div></div>
    ${e.description ? `<div class="desc">${esc(e.description)}</div>` : ""}
    <div class="foot"><span class="type">${esc(KIND_LABEL[kind])}</span>${internal ? `<span class="lock"${tipAttr("Inside the system boundary")}>${ICON.lock}</span>` : ""}</div>
    ${(e.tags || []).length ? `<div class="chips">${e.tags.map(tagChip).join("")}</div>` : ""}
  </div>`;
}

function legend(v) {
  const shown = [...v.people, ...v.inside, ...v.side];
  const kinds = [...new Set(shown.map(kindOf))];
  const cats = [...new Set(shown.flatMap(e => (e.tags || []).map(t => String(t).includes(":") ? t.split(":")[0] : "other")))];
  return `<h2>Key</h2><div class="items">
    ${kinds.map(k => `<span><span class="tile k-${k}">${ICON[k]}</span>${esc(KIND_LABEL[k])}</span>`).join("")}
    ${v.boundary ? `<span><span style="display:inline-block;width:22px;height:14px;border:1.5px dashed var(--boundary-line);background:var(--boundary);border-radius:3px;vertical-align:middle;margin-right:5px"></span>${esc(v.boundary.type.split(":")[0])} boundary</span>` : ""}
    <span><span class="arrow"></span>Relationship: intent [technology]</span>
    <span>${ICON.lock.replace("<svg", '<svg style="width:13px;height:13px;vertical-align:middle;color:#9aa5b4;margin-right:4px"')}Inside the boundary</span>
    ${cats.map(c => `<span class="chip ${ICON[c] ? c : "other"}">${ICON[ICON[c] ? c : "other"]}${esc(c)} tag</span>`).join("")}
    <span class="hint">Point at a line or a card to trace it</span>
  </div>`;
}

// A label is measured before it is drawn, so the router can give it room.
const ruler = document.createElement("canvas").getContext("2d");
function wrapText(text, max) {
  const out = []; let line = "";
  for (const word of String(text).split(/\s+/)) { if (line && (line + " " + word).length > max) { out.push(line); line = word; } else line = line ? line + " " + word : word; }
  if (line) out.push(line); return out;
}
function labelOf(e, family, max) {
  const lines = (e.labels.length ? e.labels : ["Uses"]).flatMap(l => wrapText(l, max)).map(t => ({ t }));
  if (e.techs.length) wrapText("[" + e.techs.join(", ") + "]", max + 4).forEach(t => lines.push({ t, tech: true }));
  let w = 0; for (const l of lines) { ruler.font = `${l.tech ? 10 : 11}px ${family}`; w = Math.max(w, ruler.measureText(l.t).width); }
  return { lines, w: Math.ceil(w) + 14, h: lines.length * 12 + 8 };
}
// An orthogonal path through the points, with its corners rounded.
function rounded(points, r = 7) {
  const p = points.filter((q, i) => !i || Math.abs(q[0] - points[i - 1][0]) > 0.5 || Math.abs(q[1] - points[i - 1][1]) > 0.5);
  let d = `M${p[0]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [x0, y0] = p[i - 1], [x1, y1] = p[i], [x2, y2] = p[i + 1];
    const c = Math.min(r, Math.hypot(x1 - x0, y1 - y0) / 2, Math.hypot(x2 - x1, y2 - y1) / 2);
    d += `L${x1 - Math.sign(x1 - x0) * c},${y1 - Math.sign(y1 - y0) * c}Q${x1},${y1} ${x1 + Math.sign(x2 - x1) * c},${y1 + Math.sign(y2 - y1) * c}`;
  }
  return d + `L${p[p.length - 1]}`;
}

// Route every relationship as an orthogonal wire that stays out of the cards, then draw it.
//   - Each wire leaves and enters a card at a port of its own, so two wires never share a stub.
//   - Between rows a wire runs along a lane in the gap; wires that do not overlap share a lane.
//   - A wire to the side column runs down a track of its own in the corridor, and its label sits beside the card it points to.
// Rows come from where cards actually landed, so wrapped layers and phone widths still work.
// Returns false when it made room (a taller gap, a wider corridor) instead of drawing: call it again until it returns true.
function wires(stage, edges, n) {
  const svg = stage.querySelector(".wires"), mid = stage.querySelector(".mid");
  const s = stage.getBoundingClientRect(), k = stage.style.zoom ? s.width / stage.offsetWidth : 1;   // k undoes the print zoom
  const W = s.width / k, family = getComputedStyle(stage).fontFamily;
  const rel = el => { const r = el.getBoundingClientRect(); return { l: (r.left - s.left) / k, t: (r.top - s.top) / k, r: (r.right - s.left) / k, b: (r.bottom - s.top) / k, cx: ((r.left + r.right) / 2 - s.left) / k, cy: ((r.top + r.bottom) / 2 - s.top) / k }; };
  const cards = [...stage.querySelectorAll(".card")].map(el => ({ id: el.dataset.id, zone: el.dataset.zone, el, ...rel(el) }));
  const at = Object.fromEntries(cards.map(c => [c.id, c]));
  const side = cards.filter(c => c.zone === "s"), bound = rel(stage.querySelector(".boundary"));
  const sideLeft = side.length ? Math.min(...side.map(c => c.l)) : 0;
  const corridor = side.length > 0 && sideLeft > bound.r;   // the side column really is at the side
  // Cluster everything except a true side column into rows by top edge.
  const rows = []; cards.filter(c => !(corridor && c.zone === "s")).sort((p, q) => p.t - q.t)
    .forEach(c => { const r = rows[rows.length - 1]; if (r && c.t < r.t + 20) { r.cards.push(c); c.row = rows.length - 1; } else { rows.push({ t: c.t, cards: [c] }); c.row = rows.length - 1; } });
  side.forEach(c => { if (corridor) c.row = -1; });
  if (!rows.length) { svg.innerHTML = ""; return true; }
  const last = rows[rows.length - 1].cards[0].el.closest(".boundary") ? bound.b : s.height / k;   // where the space under the last row ends
  const gapOf = g => ({ top: g ? Math.max(...rows[g - 1].cards.map(c => c.b)) : 0, bottom: g < rows.length ? Math.min(...rows[g].cards.map(c => c.t)) : last - 6 });
  const rightMost = c => c.zone === "in" && !rows[c.row].cards.some(o => o !== c && o.l > c.r);
  const inside = x => !corridor || x < bound.r - 6;   // a column wires may run down: never the corridor's
  const clear = (x, y1, y2) => !cards.some(c => x > c.l - 8 && x < c.r + 8 && c.b > Math.min(y1, y2) && c.t < Math.max(y1, y2));
  const fit = (x, w) => Math.max(w / 2 + 4, Math.min(x, W - w / 2 - 4));

  // 1. Plan each wire: its shape, and the side of each card it uses.
  const plans = [];
  edges.forEach((e, i) => {
    const a = at[e.from], b = at[e.to]; if (!a || !b) return;
    const p = { i, e, a, b }, sa = a.row < 0, sb = b.row < 0;
    if (sa || sb) {
      p.shape = "side"; p.sideA = p.sideB = "l"; p.keyA = b.cy; p.keyB = a.cy;
      if (!(sa && sb)) {
        const inner = sa ? b : a, end = sa ? "B" : "A";
        p.inner = inner; p.direct = rightMost(inner);
        const up = !p.direct && inner.row === rows.length - 1 && inner.row > 0;   // the last row has no gap under it
        p["side" + end] = p.direct ? "r" : up ? "t" : "b"; p["key" + end] = p.direct ? (sa ? a : b).cy : Infinity;
        p.gap = up ? inner.row : inner.row + 1;
      }
    } else if (a.row === b.row) {
      const under = a.row === 0;   // nothing is above the first row to hop over
      p.shape = "hop"; p.sideA = p.sideB = under ? "b" : "t"; p.keyA = b.cx; p.keyB = a.cx; p.gap = under ? 1 : a.row;
    } else {
      p.shape = "run"; p.down = b.row > a.row; p.sideA = p.down ? "b" : "t"; p.sideB = p.down ? "t" : "b"; p.keyA = b.cx; p.keyB = a.cx;
    }
    p.label = labelOf(e, family, p.shape === "side" ? 24 : 34); p.span = Math.ceil((p.label.h + 4) / 30);
    plans.push(p);
  });

  // 2. Ports: the wires on one side of a card spread along it, ordered by where they are heading.
  const ports = {};
  for (const p of plans) for (const end of ["A", "B"]) (ports[(end === "A" ? p.a : p.b).id + "|" + p["side" + end]] ||= []).push({ p, end, key: p["key" + end] });
  for (const name in ports) {
    const list = ports[name].sort((x, y) => (x.key - y.key) || (x.p.i - y.p.i)), [id, on] = name.split("|"), c = at[id], m = list.length;
    const set = (q, x, y) => q.p["port" + q.end] = { x, y };
    if (on === "t" || on === "b") { const step = Math.min(16, (c.r - c.l - 40) / m); list.forEach((q, j) => set(q, c.cx + (j - (m - 1) / 2) * step, on === "t" ? c.t : c.b)); }
    else if (on === "r") { const step = Math.min(16, (c.b - c.t - 30) / m); list.forEach((q, j) => set(q, c.r, c.cy + (j - (m - 1) / 2) * step)); }
    else {   // the left edge of a side card: each label sits beside its port, so ports are as far apart as their labels are tall
      const hs = list.map(q => Math.max(20, q.p.label.h + 8)), total = hs.reduce((x, y) => x + y, 0), squeeze = Math.min(1, (c.b - c.t - 12) / total);
      let y = c.cy - total * squeeze / 2; list.forEach((q, j) => { set(q, c.l, y + hs[j] * squeeze / 2); y += hs[j] * squeeze; });
    }
  }

  // 3. Lanes and columns. A lane is taken for a stretch of x, so wires that do not overlap share one.
  const lanes = {}, used = {}, columns = [];
  const lane = (g, x1, x2, span = 1) => {
    const lo = Math.min(x1, x2) - 8, hi = Math.max(x1, x2) + 8, taken = (lanes[g] ||= []);
    let i = 0; while (Array.from({ length: span }, (_, j) => taken[i + j] || []).some(row => row.some(([p, q]) => lo < q && hi > p))) i++;
    for (let j = i; j < i + span; j++) (taken[j] ||= []).push([lo, hi]);
    used[g] = Math.max(used[g] || 0, i + span);
    return gapOf(g).top + 20 + i * 30;
  };
  // A column is a long vertical run past other rows. It must miss every card, and keeps clear of columns already taken.
  const open = (x, y1, y2) => x > 6 && x < W - 6 && inside(x) && clear(x, y1, y2);
  const taken = (x, y1, y2) => columns.some(c => Math.abs(c.x - x) < 10 && c.lo < Math.max(y1, y2) && Math.min(y1, y2) < c.hi);
  const take = (x, y1, y2) => { columns.push({ x, lo: Math.min(y1, y2), hi: Math.max(y1, y2) }); return x; };
  const freeX = (x, y1, y2) => {   // the open column nearest x: an untaken one if there is one, never one through a card
    const tries = [x]; for (let v = 10; v < W - 6; v += 6) tries.push(v);
    const fits = tries.filter(v => open(v, y1, y2)).sort((p, q) => Math.abs(p - x) - Math.abs(q - x));
    return take(fits.find(v => !taken(v, y1, y2)) ?? fits[0] ?? x, y1, y2);
  };
  const labelled = (p, g, x1, x2) => {   // a lane for the stretch x1..x2 and the label centred on it
    const lx = fit((x1 + x2) / 2, p.label.w), y = lane(g, Math.min(x1, x2, lx - p.label.w / 2), Math.max(x1, x2, lx + p.label.w / 2), p.span);
    p.tag = [lx, y + (p.span - 1) * 15]; return y;
  };
  for (const p of [...plans].sort((p, q) => Math.abs(p.portA.x - p.portB.x) - Math.abs(q.portA.x - q.portB.x))) {
    const A = p.portA, B = p.portB;
    if (p.shape === "hop") { const y = labelled(p, p.gap, A.x, B.x); p.pts = [[A.x, A.y], [A.x, y], [B.x, y], [B.x, B.y]]; }
    else if (p.shape === "run") {
      const ga = p.down ? p.a.row + 1 : p.a.row, gb = p.down ? p.b.row : p.b.row + 1;   // the gap beside each end
      if (Math.abs(A.x - B.x) < 8) B.x = A.x;
      const y1 = gapOf(Math.min(ga, gb)).top, y2 = gapOf(Math.max(ga, gb)).bottom;   // the rows in between
      const straight = x => ga !== gb && open(x, y1, y2) && !taken(x, y1, y2) && take(x, y1, y2);   // the long run can go at this end's own port
      if (ga === gb || straight(B.x)) { const y = labelled(p, ga, A.x, B.x); p.pts = [[A.x, A.y], [A.x, y], [B.x, y], [B.x, B.y]]; }
      else if (straight(A.x)) { const y = labelled(p, gb, A.x, B.x); p.pts = [[A.x, A.y], [A.x, y], [B.x, y], [B.x, B.y]]; }
      else { const fx = freeX(B.x, y1, y2), ya = labelled(p, ga, A.x, fx), yb = lane(gb, fx, B.x); p.pts = [[A.x, A.y], [A.x, ya], [fx, ya], [fx, yb], [B.x, yb], [B.x, B.y]]; }
    } else if (p.inner && !p.direct) p.laneY = lane(p.gap, (p.inner === p.a ? A : B).x, sideLeft);
  }

  // 4. The corridor: one track a wire, ordered so wires to nearby cards do not cross, and labels beside the side cards.
  const through = plans.filter(p => p.shape === "side");
  for (const p of through) {
    const I = p.inner ? (p.inner === p.a ? p.portA : p.portB) : p.portA, X = p.inner ? (p.inner === p.a ? p.portB : p.portA) : p.portB;
    p.from = I; p.to = X; p.s = p.inner && !p.direct ? p.laneY : I.y; p.t = X.y;
    p.tag = [sideLeft - 16 - p.label.w / 2, (p.inner ? X : p.portB).y];
  }
  const labelW = Math.max(0, ...through.map(p => p.label.w));
  const tracked = through.filter(p => !(p.direct && Math.abs(p.s - p.t) < 1));
  const order = [...tracked.filter(p => p.t < p.s).sort((p, q) => p.t - q.t), ...tracked.filter(p => p.t >= p.s).sort((p, q) => q.t - p.t)];
  order.forEach((p, j) => p.track = sideLeft - 28 - labelW - (order.length - 1 - j) * 12);
  for (const p of through) {
    const I = p.from, X = p.to, x = p.track;
    const pts = x === undefined ? [[I.x, I.y], [X.x, X.y]]
      : !p.inner ? [[I.x, I.y], [x, I.y], [x, X.y], [X.x, X.y]]
      : p.direct ? [[I.x, I.y], [x, I.y], [x, X.y], [X.x, X.y]]
      : [[I.x, I.y], [I.x, p.s], [x, p.s], [x, X.y], [X.x, X.y]];
    p.pts = !p.inner || p.inner === p.a ? pts : pts.reverse();
  }

  // 5. Room. A gap grows to hold its lanes and the corridor to hold its tracks and labels; the caller then draws again.
  const grow = (el, prop, by) => el.style[prop] = (parseFloat(getComputedStyle(el)[prop]) || 0) + by + "px";
  for (const g in used) {
    const gap = gapOf(+g), short = 30 + used[g] * 30 - (gap.bottom - gap.top); if (short <= 1 || +g === 0) continue;
    if (+g >= rows.length) grow(rows[rows.length - 1].cards[0].el.closest(".boundary") || stage, "paddingBottom", short);
    else {
      const cur = rows[+g].cards[0].el, prev = rows[g - 1].cards[0].el, pc = cur.closest(".layer, .people, .side"), pp = prev.closest(".layer, .people, .side");
      if (pc === pp) grow(pc, "rowGap", short); else if (pp.classList.contains("people")) grow(pp, "marginBottom", short); else if (pc.classList.contains("layer")) grow(pc, "marginTop", short); else grow(cur, "marginTop", short);
    }
    return false;
  }
  if (corridor && through.length) {
    const short = 14 + Math.max(0, order.length - 1) * 12 + 12 + labelW + 16 - (sideLeft - bound.r);
    if (short > 1) { grow(mid, "columnGap", short); return false; }
  }

  // 6. Draw: every wire, then every label, so a label is never under a line.
  const tip = p => tipAttr(flowTip(p.e));
  svg.innerHTML = `<defs>${["", "on"].map(x => `<marker id="arr${n}${x}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${x ? "#2f6fed" : "#7a8798"}"/></marker>`).join("")}</defs>`
    + plans.map(p => { const d = rounded(p.pts); return `<g class="w" data-w="${p.i}"${tip(p)}><path class="hit" d="${d}"/><path class="wire" d="${d}" marker-end="url(#arr${n})"/></g>`; }).join("")
    + plans.map(p => { const [x, y] = p.tag, L = p.label, top = y - L.h / 2;
        return `<g class="wl" data-w="${p.i}"${tip(p)}><rect class="wlabel-bg" x="${x - L.w / 2}" y="${top}" width="${L.w}" height="${L.h}"/><text class="wlabel" text-anchor="middle">${L.lines.map((l, j) => `<tspan x="${x}" y="${top + 13 + j * 12}"${l.tech ? ' class="tech"' : ""}>${esc(l.t)}</tspan>`).join("")}</text></g>`; }).join("");
  return true;
}

// Draw one view into host and keep its wires right as the host resizes or prints. Returns the view that was drawn.
let diagrams = 0;
function diagram(host, view) {
  const v = buildView(view), n = ++diagrams;
  host.innerHTML = `<div class="stage"></div><div class="legend">${legend(v)}</div>`;
  const stage = host.firstChild;
  const draw = () => { for (let i = 0; i < 80 && !wires(stage, v.edges, n); i++); };
  const paint = () => {
    const inner = `<div class="layers">${layers(v.inside, v.edges).map(l => `<div class="layer">${l.map(e => card(e, v, view)).join("")}</div>`).join("")}</div>`;
    stage.innerHTML = `<svg class="wires"></svg>
     <div class="row people">${v.people.map(e => card(e, v, view)).join("")}</div>
     <div class="mid${v.side.length ? "" : " no-side"}">
       ${v.boundary ? `<div class="boundary"><span class="blabel"><b>${esc(v.boundary.label)}</b> [${esc(v.boundary.type)}]</span>${inner}</div>` : `<div class="boundary" style="border:0;background:none;padding:0">${inner}</div>`}
       ${v.side.length ? `<aside class="side"><div class="slabel">[${v.level === "component" ? "Related" : "External systems"}]</div>${v.side.map(e => card(e, v, view)).join("")}</aside>` : ""}
     </div>`;
    stage.querySelectorAll(".people .card").forEach(c => { c.dataset.zone = "p"; c.dataset.rank = -1; });
    stage.querySelectorAll(".layer").forEach((l, i) => l.querySelectorAll(".card").forEach(c => { c.dataset.zone = "in"; c.dataset.rank = i; }));
    stage.querySelectorAll(".side .card").forEach((c, i) => { c.dataset.zone = "s"; c.dataset.rank = i; });
    stage.classList.remove("focus"); draw();
  };
  paint();
  // A new width is a new layout, so the stage is laid out afresh; anything else only needs its wires again.
  let width = stage.offsetWidth;
  new ResizeObserver(() => { if (stage.offsetWidth !== width) { width = stage.offsetWidth; paint(); } else draw(); }).observe(stage);
  addEventListener("load", draw);
  // Wires are measured from the layout on screen, so before printing the stage takes its paper layout and is drawn again.
  addEventListener("beforeprint", () => { stage.style.width = PRINT.layout + "px"; stage.style.zoom = PRINT.fit / PRINT.layout; paint(); });
  addEventListener("afterprint", () => { stage.style.width = stage.style.zoom = ""; paint(); });

  // Pointing at a wire lights it and its two ends; pointing at a card lights everything it talks to.
  const light = hot => {
    const on = new Set(hot), ends = new Set(hot.flatMap(i => [v.edges[i].from, v.edges[i].to]));
    stage.classList.toggle("focus", on.size > 0);
    stage.querySelectorAll("[data-w]").forEach(g => {
      const lit = on.has(+g.dataset.w), line = g.querySelector(".wire"); g.classList.toggle("on", lit);
      if (line) line.setAttribute("marker-end", `url(#arr${n}${lit ? "on" : ""})`);
    });
    stage.querySelectorAll(".card").forEach(c => c.classList.toggle("on", ends.has(c.dataset.id)));
  };
  stage.addEventListener("pointerover", e => {
    const wire = e.target.closest("[data-w]"), box = e.target.closest(".card");
    light(wire ? [+wire.dataset.w] : box ? v.edges.flatMap((x, i) => x.from === box.dataset.id || x.to === box.dataset.id ? [i] : []) : []);
  });
  stage.addEventListener("pointerleave", () => light([]));
  return v;
}
