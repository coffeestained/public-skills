// Helpers over the C4 model. Needs `const MODEL` above it.
const ICON = {
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 12h8M13 9l3 3-3 3"/></svg>',
  app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/></svg>',
  mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  queue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="4" height="10"/><rect x="10" y="7" width="4" height="10"/><rect x="17" y="7" width="4" height="10"/></svg>',
  function: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  component: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="4" width="14" height="7" rx="1.5"/><rect x="7" y="13" width="14" height="7" rx="1.5"/><path d="M3 7.5h4M3 16.5h4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M11 8v6M8 11h6"/></svg>',
  // tag category icons
  tech: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  region: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  env: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6M15 19c0-3 2-4 4-4s3 1 3 4"/></svg>',
  risk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3l10 18H2L12 3zM12 10v5M12 18h.01"/></svg>',
  other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12l8-8h8v8l-8 8z"/></svg>'
};
const TYPE_LABEL = { person: "Person", system: "Software System", container: "Container", component: "Component" };
const KIND_LABEL = { person: "Person", system: "Software System", external: "External System", app: "Application",
  web: "Web App", mobile: "Mobile App", store: "Data Store", queue: "Queue / Topic", function: "Function", component: "Component" };

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const els = MODEL.elements || [];
const byId = Object.fromEntries(els.map(e => [e.id, e]));
const system = els.find(e => e.type === "system" && !e.external) || { id: "system", name: MODEL.project || "System" };
const kindOf = e => e.type === "person" ? "person" : e.type === "system" ? (e.external ? "external" : "system")
  : e.type === "component" ? "component" : (e.kind || "app");
const nameOf = id => (byId[id] || { name: id }).name;
// data-tip holds the tooltip's HTML. Build it from escaped text; tipAttr escapes it once more for the attribute.
const tipAttr = html => html ? ` data-tip="${esc(html)}"` : "";
const elementTip = id => { const e = byId[id]; return e ? `<b>${esc(e.name)}</b><div class="t">[${esc(TYPE_LABEL[e.type] + (e.technology ? ": " + e.technology : ""))}]</div>${e.description ? `<div>${esc(e.description)}</div>` : ""}` : ""; };

// Roll an endpoint up to the abstraction a view shows. A relationship recorded against a
// component is still a relationship of its container at the container level.
// `container` is the one a component view looks inside; its own components stay as they are.
function rollUp(id, level, container) {
  let e = byId[id]; if (!e) return id;
  if (level === "context") { while (e && (e.type === "component" || e.type === "container")) e = byId[e.parent]; return e ? e.id : system.id; }
  if (level === "container") { if (e.type === "component") return e.parent; }
  if (level === "component") { if (e.type === "component" && e.parent !== container) return e.parent; }
  return e.id;
}

// Collapse relationships to a level and merge duplicates between the same pair.
function mergeFlows(level, container) {
  const merged = new Map();
  for (const r of MODEL.relationships || []) {
    const from = rollUp(r.from, level, container), to = rollUp(r.to, level, container);
    if (from === to) continue;
    const k = from + "→" + to, m = merged.get(k) || { from, to, labels: [], techs: [] };
    if (r.label && !m.labels.includes(r.label)) m.labels.push(r.label);
    if (r.technology && !m.techs.includes(r.technology)) m.techs.push(r.technology);
    merged.set(k, m);
  }
  return [...merged.values()];
}

const chip = (cls, text, icon, tip) => `<span class="chip ${cls}"${tipAttr(tip)}>${icon ? ICON[icon] || "" : ""}${esc(text)}</span>`;
// A tag is "category:value"; an unknown category draws as "other" and says its category when pointed at.
const TAG_LABEL = { tech: "Technology", region: "Region", env: "Environment", team: "Team", risk: "Risk", other: "Tag" };
const tagChip = tag => {
  const [cat, ...rest] = String(tag).includes(":") ? String(tag).split(":") : ["other", tag], c = ICON[cat] ? cat : "other", value = rest.join(":").trim();
  return chip(c, value, c, `<b>${esc(TAG_LABEL[cat] || cat[0].toUpperCase() + cat.slice(1))}</b><div>${esc(value)}</div>`);
};
