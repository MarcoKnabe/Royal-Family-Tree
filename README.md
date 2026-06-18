# Royal Houses — Interactive Family Trees

An interactive Node.js website that visualises royal and noble houses as
**linked genealogies**. Switch between three worlds from the **world menu**:
the real royal houses of Europe (one connected web of 364 people spanning
**688 AD to 2018**, from Charlemagne's father to the youngest Windsors), the
houses of **Middle-earth**, and the great houses of **Westeros**.

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
- **World menu** to switch between three self-contained universes:
  - 👑 **Real World — Europe** — 364 historical royals, one connected web.
  - 💍 **Middle-earth (LOTR)** — the houses of Tolkien's legendarium (Elves,
    the Dúnedain → Aragorn, Stewards, Rohan, Dwarves of Durin's Folk, Hobbits).
  - 🐉 **Westeros (ASOIAF)** — the great houses of *A Song of Ice and Fire*
    (Targaryen, Stark, Lannister, Baratheon, Tully, Arryn, Martell, Tyrell,
    Greyjoy), dated in years After the Conquest.
- **Country/region menu** to jump to and isolate a realm. Its timeline adapts
  to each world (AD, Years of the Sun, After the Conquest).
- **Search** by name or house, **filter** by house from the legend, zoom & pan.

## Run it

```bash
npm install
npm start        # then open http://localhost:3000
```

Use `npm run dev` for auto-reload while editing.

## Project layout

```
public/index.html         Page shell
public/style.css          Styling
public/app.js             D3 visualisation, interaction, world/region menus
public/royals.json        Real-world European royals dataset
public/middle-earth.json  Middle-earth (LOTR) dataset
public/westeros.json      Westeros (ASOIAF) dataset
server.js                 Optional local dev server (not used on Render)
```

Worlds are registered in the `UNIVERSES` map near the top of `app.js`; add an
entry there pointing at a new JSON file to add another world.

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
  "spouses": ["albert-saxe-coburg"],  // optional id references
  "date": "T.A. 2931 – F.O. 120"      // optional display string (overrides born/died)
}
```

`born` is always a number — it positions the node on the timeline. The optional
`date` string is what the info panel shows (handy for fictional eras like
`T.A. 2931` or `284 AC`). Each world file also has a `meta` block with
`earliest`, `latest`, `yearSuffix` and `tick` (gridline spacing).

A browser refresh shows your changes (redeploy on Render to publish them).

> Dates and parentage cover the principal, well-documented lines. Royal
> genealogy is vast; this is a curated, accurate backbone you can keep growing.
