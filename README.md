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

## How it works

1. The app opens on a map of Boca Raton coffee shops.
2. Tap a pin, or search by shop name, street or drink ("cold brew", "Mizner", "croissant").
3. The shop card shows hours, distance and pickup time. Tap **Order**.
4. That shop's own menu opens. Pick a drink, choose size, milk and extras, and add it to your bag.
5. Your Order lets you pick in store or curbside and a pickup time.
6. Place the order to see its status and order number.

An order belongs to one shop at a time.

## Structure

```
index.html      markup shell
css/styles.css  design tokens (light + dark), layout, components
js/mapdata.js   Boca Raton base map: coastline, Intracoastal, parks, roads, labels
js/data.js      shops, each shop's menu and prices, sizes, milks, syrups
js/app.js       state, map pan/pinch/zoom, shop sheet, menu, order, status
```

The app uses the phone's system font and loads nothing from other sites. State persists in `localStorage`.

## About the data

The ten shops are real Boca Raton coffee shops, placed on the map from their street
addresses (positions are approximate). Each shop's menu is built from its published menu and
listings as of September 2026. Prices come from those listings where published and are
estimates otherwise. Wait times, ratings and "busy" levels are sample values, not live data.
Orders are not sent to the shops. The base map is hand-traced from real
geography (I-95, Federal Hwy, Dixie Hwy, Palmetto Park Rd, Glades Rd, Camino Real, Spanish
River Blvd, Yamato Rd, A1A, the Intracoastal, Lake Boca Raton, the beach parks, FAU, the
airport and Town Center) and drawn as SVG, so it works offline with no tile provider. To go
fully live, swap the SVG for a tile layer and feed `OTG_DATA.stores` from a places API.
