# Royal Houses of Europe — Interactive Family Tree

An interactive Node.js website that visualises the royal houses of Europe as a
**single, linked genealogy** — one connected web of 229 people spanning **688 AD
to 2018**, from Charlemagne's father all the way to the youngest Windsors.

Rather than drawing each dynasty in isolation, the data deliberately threads the
great intermarriages that bound the houses together, so you can trace blood from
one realm into another:

- **Carolingians → Counts of Flanders → Normans** (via Matilda of Flanders)
- **House of Wessex → Scotland → Plantagenets** (via St Margaret & Matilda of Scotland)
- **Plantagenet → Lancaster / York → Tudor → Stuart → Hanover → Windsor**
- **Capet → Valois → Bourbon** (France & Spain)
- **Habsburg** (Austria & Spain) and **Holstein-Gottorp-Romanov** (Russia)
- Queen **Victoria** ("the grandmother of Europe") and **Christian IX** of Denmark
  ("the father-in-law of Europe") linking Britain, Germany, Russia, Greece,
  Norway and Spain.

## Features

- **Timeline layout** — every person is pinned vertically to their birth year
  (oldest at top); a force simulation settles horizontal position so families
  cluster. Faint century gridlines anchor the eye in time.
- **Linked lines** — solid lines are parent → child, dashed lines are marriages.
- **Click anyone** to light up their entire bloodline (ancestors + descendants)
  and open a detail panel with parents, spouses, children and a Wikipedia link.
- **Country menu** to jump to and isolate a realm (United Kingdom, France,
  Spain, Russia, Germany, Austria, Denmark, Sweden, Norway, Netherlands,
  Belgium, Italy, Portugal, Greece).
- **Search** by name or house, **filter** by house from the legend, zoom & pan.

## Run it

```bash
npm install
npm start        # then open http://localhost:3000
```

Use `npm run dev` for auto-reload while editing.

## Project layout

```
public/index.html    Page shell
public/style.css     Styling
public/app.js        D3 visualisation, interaction, search & info panel
public/royals.json   The genealogical dataset — edit to add people
server.js            Optional local dev server (not used on Render)
```

## Deploying on Render (Static Site)

This is a fully static site. On Render create a **Static Site** pointed at this
repo with:

- **Build Command:** *(leave empty)*
- **Publish Directory:** `public`

## Extending the data

Add an object to `public/royals.json` → `people`. Each person:

```json
{
  "id": "unique-slug",
  "name": "Display Name",
  "born": 1819, "died": 1901,        // died: null if living
  "house": "Hanover",
  "country": "United Kingdom",
  "title": "Queen of the United Kingdom",
  "father": "edward-kent",            // optional id reference
  "mother": "victoria-saxe-coburg",   // optional id reference
  "spouses": ["albert-saxe-coburg"]   // optional id references
}
```

A browser refresh shows your changes (redeploy on Render to publish them).

> Dates and parentage cover the principal, well-documented lines. Royal
> genealogy is vast; this is a curated, accurate backbone you can keep growing.
