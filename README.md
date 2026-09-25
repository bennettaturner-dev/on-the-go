# On the Go

A mobile-first web app for ordering coffee ahead for pickup at coffee shops in Boca Raton, FL.
Browse a map of nearby stores, tap a pin to see hours, wait time and pickup options,
build a customized order, and track it from "received" to "ready".

## Run it

There is no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## What is in the box

| Screen  | What it does |
| ------- | ------------ |
| Home    | Greeting, reward stars, your pickup store, reorder, featured drinks |
| Stores  | Pannable, zoomable map of Boca Raton with numbered pins, search, filters, favorites |
| Order   | Full menu with sizes, milk, shots and extras, plus a per-store special |
| Bag     | Line items, pickup mode (in store or curbside), pickup time, totals |
| Orders  | Live status tracker with a pickup code, past orders and one-tap reorder |

## Structure

```
index.html      markup shell
css/styles.css  design tokens (light + dark), layout, components
js/mapdata.js   Boca Raton base map: coastline, Intracoastal, parks, roads, labels
js/data.js      stores, menu, sizes, milks, extras
js/app.js       state, rendering, map pan/zoom, bag and order flow
```

State (bag, orders, favorites, stars) persists in `localStorage`.
## About the data

The ten stores are real Boca Raton coffee shops, placed on the map from their street
addresses (positions are approximate). Hours, wait times, ratings, "busy" levels and pickup
options are illustrative sample values, not live data. The base map is hand-traced from real
geography (I-95, Federal Hwy, Dixie Hwy, Palmetto Park Rd, Glades Rd, Camino Real, Spanish
River Blvd, Yamato Rd, A1A, the Intracoastal, Lake Boca Raton, the beach parks, FAU, the
airport and Town Center) and drawn as SVG, so it works offline with no tile provider. To go
fully live, swap the SVG for a tile layer and feed `OTG_DATA.stores` from a places API.
