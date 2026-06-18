/* Royal Houses of Europe — interactive linked genealogy.
 *
 * Layout: every person is pinned vertically to their birth year (a true
 * historical timeline, oldest at the top). Horizontal position is settled by
 * a force simulation so that parents, children and spouses cluster together
 * without the y-axis ever moving. Solid lines are parent → child; dashed
 * lines are marriages. Click anyone to light up their entire bloodline. */

const W = () => document.getElementById("chart").clientWidth;
const H = () => document.getElementById("chart").clientHeight;

let people = [];
let byId = new Map();
let nodes = [];
let links = [];
let color;
let selectedId = null;
let activeHouse = null;
let activeRealm = null;
let currentMeta = {};

// The worlds you can explore. Each is a self-contained dataset with the same
// schema; switching simply reloads the graph from a different file.
const UNIVERSES = {
  real: { label: "👑 Real World — Europe", file: "royals.json" },
  lotr: { label: "💍 Middle-earth (LOTR)", file: "middle-earth.json" },
  asoiaf: { label: "🐉 Westeros (ASOIAF)", file: "westeros.json" },
};

// Historical realms map onto modern countries for the navigation menu, so the
// many granular polities in the data collapse into the country you'd look for.
const COUNTRY_TO_REALM = {
  England: "United Kingdom", Scotland: "United Kingdom", Wales: "United Kingdom",
  "Great Britain": "United Kingdom", "United Kingdom": "United Kingdom", Hanover: "United Kingdom",
  Francia: "France", "West Francia": "France", France: "France", Anjou: "France",
  Spain: "Spain", Castile: "Spain",
  Russia: "Russia",
  "Holy Roman Empire": "Germany", Germany: "Germany", Prussia: "Germany",
  Hesse: "Germany", Palatinate: "Germany", Bohemia: "Germany", Holstein: "Germany",
  Austria: "Austria",
  Denmark: "Denmark", Sweden: "Sweden", Norway: "Norway",
  Netherlands: "Netherlands", Orange: "Netherlands", "Dutch Republic": "Netherlands",
  Belgium: "Belgium", Flanders: "Belgium",
  Italy: "Italy", Portugal: "Portugal", Greece: "Greece",
};
const realmOf = (country) => COUNTRY_TO_REALM[country] || country;

const svg = d3.select("#chart").append("svg");
const gZoom = svg.append("g");
const gEras = gZoom.append("g");
const gLinks = gZoom.append("g");
const gNodes = gZoom.append("g");

const zoom = d3
  .zoom()
  .scaleExtent([0.15, 6])
  .on("zoom", (e) => gZoom.attr("transform", e.transform));
svg.call(zoom);

// Birth year → vertical pixel position. Built once the data is known.
let yScale;

bootstrap();

function bootstrap() {
  buildWorldMenu();
  wireUI();
  loadUniverse("real");
}

async function loadUniverse(key) {
  const u = UNIVERSES[key] || UNIVERSES.real;
  const data = await (await fetch(u.file)).json();
  people = data.people;
  byId = new Map(people.map((p) => [p.id, p]));
  currentMeta = data.meta;

  // Reset interaction state and clear the previous world's rendering.
  selectedId = null;
  activeHouse = null;
  activeRealm = null;
  gEras.selectAll("*").remove();
  gLinks.selectAll("*").remove();
  gNodes.selectAll("*").remove();
  document.getElementById("info").classList.add("hidden");
  document.getElementById("search").value = "";
  document.getElementById("country-menu").value = "";
  document.getElementById("subtitle").textContent = data.meta.subtitle || data.meta.description || "";

  buildGraph();
  buildColors();
  buildLegend();
  buildCountryMenu();
  buildEras(data.meta);
  draw();
  runSimulation();

  const suffix = data.meta.yearSuffix || "";
  document.getElementById("status-count").textContent =
    `${people.length} people · ${data.meta.earliest}–${data.meta.latest} ${suffix} · ${
      new Set(people.map((p) => p.house)).size
    } houses`;
}

function buildWorldMenu() {
  const menu = document.getElementById("world-menu");
  menu.innerHTML = Object.entries(UNIVERSES)
    .map(([k, u]) => `<option value="${k}">${u.label}</option>`)
    .join("");
  menu.addEventListener("change", () => loadUniverse(menu.value));
}

function buildGraph() {
  // Vertical scale spans the full historical range with generous spacing so
  // a millennium of monarchs is legible when zoomed in.
  const years = people.map((p) => p.born);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  const height = (maxY - minY) * 3.2 + 200; // ~3.2px per year (compact vertically)
  yScale = d3.scaleLinear().domain([minY, maxY]).range([80, height - 80]);

  nodes = people.map((p) => ({
    ...p,
    x: W() / 2 + (Math.sin(p.born * 1.7) * 900), // deterministic wide spread (no RNG)
    y: yScale(p.born),
    fy: yScale(p.born), // pin vertically to birth year
  }));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  links = [];
  const seenMarriage = new Set();
  for (const n of nodes) {
    for (const parentKey of ["father", "mother"]) {
      if (n[parentKey] && nodeById.has(n[parentKey])) {
        links.push({ source: nodeById.get(n[parentKey]), target: n, type: "parent" });
      }
    }
    for (const sid of n.spouses || []) {
      if (!nodeById.has(sid)) continue;
      const key = [n.id, sid].sort().join("|");
      if (seenMarriage.has(key)) continue;
      seenMarriage.add(key);
      links.push({ source: n, target: nodeById.get(sid), type: "spouse" });
    }
  }
}

function buildColors() {
  const houses = Array.from(new Set(people.map((p) => p.house))).sort();
  const palette = d3.quantize((t) => d3.interpolateRainbow(t * 0.92), houses.length);
  color = d3.scaleOrdinal().domain(houses).range(palette);
}

function buildEras(meta) {
  // Faint gridlines to anchor the eye in time; spacing & label vary by world.
  const tick = meta.tick || 100;
  const suffix = meta.yearSuffix || "AD";
  const start = Math.ceil(meta.earliest / tick) * tick;
  const ticks = d3.range(start, meta.latest + 1, tick);
  const x0 = -8000;
  const x1 = 8000;
  const era = gEras
    .selectAll("g")
    .data(ticks)
    .join("g")
    .attr("transform", (d) => `translate(0,${yScale(d)})`);
  era.append("line").attr("class", "era-line").attr("x1", x0).attr("x2", x1);
  era
    .append("text")
    .attr("class", "era-label")
    .attr("x", x0 + 20)
    .attr("dy", -4)
    .text((d) => `${d} ${suffix}`);
}

function draw() {
  gLinks
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", (d) => `link ${d.type}`);

  const node = gNodes
    .selectAll("g.node")
    .data(nodes, (d) => d.id)
    .join("g")
    .attr("class", (d) => `node ${d.died === null ? "living" : ""}`)
    .on("click", (e, d) => {
      e.stopPropagation();
      select(d.id);
    });

  node
    .append("circle")
    .attr("r", (d) => radius(d))
    .attr("fill", (d) => color(d.house));

  node
    .append("text")
    .attr("dy", (d) => radius(d) + 9)
    .text((d) => d.name);

  svg.on("click", () => clearSelection());
}

function radius(d) {
  // Reigning monarchs / emperors a touch larger; living people highlighted.
  const t = (d.title || "").toLowerCase();
  if (/emperor|empress|king|queen/.test(t)) return 6.5;
  return 4.5;
}

function runSimulation() {
  const sim = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance((l) => (l.type === "spouse" ? 34 : 70))
        .strength((l) => (l.type === "spouse" ? 0.7 : 0.15))
    )
    .force("charge", d3.forceManyBody().strength(-340).distanceMax(900))
    .force("x", d3.forceX(W() / 2).strength(0.006))
    .force("collide", d3.forceCollide().radius(34))
    .alpha(1)
    .alphaDecay(0.018);

  sim.on("tick", ticked);

  // Frame the whole graph once, after the initial layout settles. Never
  // auto-refit again — re-fitting on every simulation restart (e.g. after a
  // click registers as a micro-drag) caused an unwanted zoom-out.
  let ticks = 0;
  sim.on("tick.fit", () => {
    if (++ticks === 60) fitToView();
  });

  const drag = d3
    .drag()
    .on("start", (e, d) => {
      if (!e.active) sim.alphaTarget(0.2).restart();
      d.fx = d.x;
    })
    .on("drag", (e, d) => {
      d.fx = e.x;
    })
    .on("end", (e, d) => {
      if (!e.active) sim.alphaTarget(0);
      d.fx = null;
    });
  gNodes.selectAll("g.node").call(drag);
}

function ticked() {
  gLinks
    .selectAll("line")
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);

  gNodes.selectAll("g.node").attr("transform", (d) => `translate(${d.x},${d.y})`);
}

function fitToView(subset) {
  const set = subset && subset.length ? subset : nodes;
  const xs = set.map((n) => n.x);
  const ys = set.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const bw = maxX - minX + 120;
  const bh = maxY - minY + 120;
  const scale = Math.min(W() / bw, H() / bh, 1.2);
  const tx = W() / 2 - scale * (minX + maxX) / 2;
  const ty = H() / 2 - scale * (minY + maxY) / 2;
  svg
    .transition()
    .duration(600)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

/* ---------- Selection / bloodline highlighting ---------- */

function lineageOf(id) {
  const set = new Set([id]);
  // ancestors
  const up = [id];
  while (up.length) {
    const p = byId.get(up.pop());
    for (const k of ["father", "mother"]) {
      if (p[k] && !set.has(p[k])) { set.add(p[k]); up.push(p[k]); }
    }
  }
  // descendants
  const childrenOf = (pid) =>
    people.filter((q) => q.father === pid || q.mother === pid).map((q) => q.id);
  const down = [id];
  while (down.length) {
    for (const c of childrenOf(down.pop())) {
      if (!set.has(c)) { set.add(c); down.push(c); }
    }
  }
  return set;
}

function select(id, recenter = false) {
  selectedId = id;
  activeHouse = null;
  document.querySelectorAll("#legend-list li").forEach((li) => li.classList.remove("active"));
  const blood = lineageOf(id);

  gNodes
    .selectAll("g.node")
    .classed("faded", (d) => !blood.has(d.id))
    .classed("selected", (d) => d.id === id);

  gLinks
    .selectAll("line")
    .classed("faded", (d) => !(blood.has(d.source.id) && blood.has(d.target.id)))
    .classed("hot", (d) => blood.has(d.source.id) && blood.has(d.target.id));

  showInfo(byId.get(id));
  if (recenter) centerOn(id);
}

function clearSelection() {
  selectedId = null;
  gNodes.selectAll("g.node").classed("faded", false).classed("selected", false);
  gLinks.selectAll("line").classed("faded", false).classed("hot", false);
  document.getElementById("info").classList.add("hidden");
}

function centerOn(id) {
  const n = nodes.find((d) => d.id === id);
  if (!n) return;
  const t = d3.zoomTransform(svg.node());
  const scale = Math.max(t.k, 0.9);
  const tx = W() / 2 - scale * n.x;
  const ty = H() / 2 - scale * n.y;
  svg.transition().duration(550).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

/* ---------- Info panel ---------- */

function showInfo(p) {
  const panel = document.getElementById("info");
  panel.classList.remove("hidden");
  document.getElementById("info-name").textContent = p.name;
  document.getElementById("info-title").textContent = p.title || "";

  const suffix = currentMeta.yearSuffix && currentMeta.yearSuffix !== "AD" ? ` ${currentMeta.yearSuffix}` : "";
  const lifespan =
    p.date || `${p.born}${p.died === null ? " – present" : ` – ${p.died}`}${suffix}`;
  document.getElementById("info-details").innerHTML = `
    <dt>Lived</dt><dd>${lifespan}</dd>
    <dt>House</dt><dd>${p.house}</dd>
    <dt>Realm</dt><dd>${p.country || "—"}</dd>`;

  const childrenOf = people.filter((q) => q.father === p.id || q.mother === p.id);
  const parents = [p.father, p.mother].filter(Boolean).map((id) => byId.get(id));
  const spouses = (p.spouses || []).map((id) => byId.get(id)).filter(Boolean);

  const group = (label, arr) =>
    arr.length
      ? `<div class="rel-group"><h3>${label}</h3>${arr
          .map((x) => `<span class="rel-chip" data-id="${x.id}">${x.name}</span>`)
          .join("")}</div>`
      : "";

  document.getElementById("info-relations").innerHTML =
    group("Parents", parents) + group("Married", spouses) + group("Children", childrenOf);

  document
    .querySelectorAll("#info-relations .rel-chip")
    .forEach((c) => c.addEventListener("click", () => select(c.dataset.id, true)));

  document.getElementById("info-wiki").href =
    "https://en.wikipedia.org/wiki/Special:Search?search=" + encodeURIComponent(p.name);
}

/* ---------- Legend ---------- */

function buildLegend() {
  const counts = d3.rollup(people, (v) => v.length, (d) => d.house);
  const houses = Array.from(counts.keys()).sort((a, b) => counts.get(b) - counts.get(a));
  const list = document.getElementById("legend-list");
  list.innerHTML = houses
    .map(
      (h) => `<li data-house="${h}">
        <span class="swatch" style="background:${color(h)}"></span>
        <span>${h}</span><span class="legend-count">${counts.get(h)}</span>
      </li>`
    )
    .join("");
  list.querySelectorAll("li").forEach((li) =>
    li.addEventListener("click", () => toggleHouse(li.dataset.house, li))
  );
}

function toggleHouse(house, li) {
  clearSelection();
  activeRealm = null;
  document.getElementById("country-menu").value = "";
  if (activeHouse === house) {
    activeHouse = null;
    li.classList.remove("active");
    gNodes.selectAll("g.node").classed("faded", false);
    gLinks.selectAll("line").classed("faded", false);
    return;
  }
  activeHouse = house;
  document.querySelectorAll("#legend-list li").forEach((x) => x.classList.remove("active"));
  li.classList.add("active");
  gNodes.selectAll("g.node").classed("faded", (d) => d.house !== house);
  gLinks
    .selectAll("line")
    .classed("faded", (d) => d.source.house !== house || d.target.house !== house);
}

/* ---------- Country menu ---------- */

function buildCountryMenu() {
  const counts = d3.rollup(people, (v) => v.length, (d) => realmOf(d.country));
  const realms = Array.from(counts.keys()).sort();
  const menu = document.getElementById("country-menu");
  // Rebuild for the current world, keeping the leading "All realms" option.
  menu.innerHTML = '<option value="">All realms</option>';
  for (const r of realms) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = `${r} (${counts.get(r)})`;
    menu.appendChild(opt);
  }
}

function focusRealm(realm) {
  clearSelection();
  activeHouse = null;
  document.querySelectorAll("#legend-list li").forEach((li) => li.classList.remove("active"));
  activeRealm = realm || null;

  if (!realm) {
    gNodes.selectAll("g.node").classed("faded", false);
    gLinks.selectAll("line").classed("faded", false);
    fitToView();
    return;
  }

  const inRealm = (d) => realmOf(d.country) === realm;
  gNodes.selectAll("g.node").classed("faded", (d) => !inRealm(d));
  gLinks
    .selectAll("line")
    .classed("faded", (d) => !(inRealm(d.source) && inRealm(d.target)))
    .classed("hot", (d) => inRealm(d.source) && inRealm(d.target));
  fitToView(nodes.filter(inRealm));
}

/* ---------- Search & buttons ---------- */

function wireUI() {
  const input = document.getElementById("search");
  const box = document.getElementById("search-results");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { box.classList.remove("show"); return; }
    const hits = people
      .filter((p) => p.name.toLowerCase().includes(q) || (p.house || "").toLowerCase().includes(q))
      .slice(0, 12);
    box.innerHTML = hits
      .map(
        (p) => `<div class="sr-item" data-id="${p.id}">${p.name}
          <small>${p.house} · ${p.born}${p.died === null ? "–" : `–${p.died}`}</small></div>`
      )
      .join("") || `<div class="sr-item">No match</div>`;
    box.classList.add("show");
    box.querySelectorAll(".sr-item[data-id]").forEach((el) =>
      el.addEventListener("click", () => {
        select(el.dataset.id, true);
        box.classList.remove("show");
        input.value = byId.get(el.dataset.id).name;
      })
    );
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".controls")) box.classList.remove("show");
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    clearSelection();
    activeHouse = null;
    activeRealm = null;
    document.querySelectorAll("#legend-list li").forEach((li) => li.classList.remove("active"));
    document.getElementById("country-menu").value = "";
    document.getElementById("search").value = "";
    fitToView();
  });

  document.getElementById("country-menu").addEventListener("change", (e) =>
    focusRealm(e.target.value)
  );

  document.getElementById("info-close").addEventListener("click", clearSelection);
}

window.addEventListener("resize", () => {
  svg.attr("width", W()).attr("height", H());
});
