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

init();

async function init() {
  const res = await fetch("royals.json");
  const data = await res.json();
  people = data.people;
  byId = new Map(people.map((p) => [p.id, p]));

  buildGraph();
  buildColors();
  buildLegend();
  buildEras(data.meta);
  draw();
  runSimulation();
  wireUI();

  document.getElementById("status-count").textContent =
    `${people.length} people · ${data.meta.earliest}–${data.meta.latest} · ${
      new Set(people.map((p) => p.house)).size
    } houses`;
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
  // Faint century gridlines to anchor the eye in time.
  const start = Math.ceil(meta.earliest / 100) * 100;
  const ticks = d3.range(start, meta.latest + 1, 100);
  const x0 = -4000;
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
    .text((d) => `${d} AD`);
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

function fitToView() {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
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

  const lifespan = `${p.born}${p.died === null ? " – present" : ` – ${p.died}`}`;
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
    document.querySelectorAll("#legend-list li").forEach((li) => li.classList.remove("active"));
    document.getElementById("search").value = "";
    fitToView();
  });

  document.getElementById("info-close").addEventListener("click", clearSelection);
}

window.addEventListener("resize", () => {
  svg.attr("width", W()).attr("height", H());
});
