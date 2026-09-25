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

1. The app has three tabs: **Promotions**, **Order** (the map, in the middle, where the app
   opens) and **Orders** (status and past orders). Order shows Boca Raton coffee shops with a
   search bar on top.
2. Tap a shop in the list or a pin on the map, or search by shop name, street or drink.
3. That shop's menu opens in place of the map. The top shows how long an order will take, how
   busy it usually is right now, today's hours, distance, address and directions.
4. Pick a drink, choose size, milk and extras, and add it. **Back to map** returns to the map.
   You can browse any shop without losing your order; adding from a different shop starts a new
   one, and the menu says so before you do.
5. **Your order** shows the ready-time estimate, walk-in or curbside, and when to pick up.
6. Place the order to see its status, ready time and order number.

**Drink of the day.** Each shop gets one day a week (`featureDay` in `js/data.js`). On that
day its best drink shows in a yellow tag above its pin on the map, at the top of its menu and
on its shop card. The Promotions tab lists today's drinks (tap one to order it) and the rest
of the week.

**Ready-time estimate.** Google doesn't offer its "Popular times" data through any API, so
`busyness()` in `js/app.js` estimates it. It starts from a typical café's traffic for the hour
and day, reshapes it for the kind of place the shop is on Google (breakfast spot, office park,
mall, restaurant, downtown), and scales it by the shop's Google review count. `eta()` adds the
line that busyness implies to the time it takes to make the items in the order.

**Each shop looks a little different.** Every shop has its own color and initials on its map
pin, list row, shop card, menu header and order status, plus a one-line description (`brand`
and `tag` in `js/data.js`). The colors are this app's picks, not the shops' official branding.

**Design rules.** Round shapes for things that float or identify a shop (logo, search bar,
pins, shop logos, map buttons), gently rounded buttons and cards, and solid full-width lines
between sections. Text is 16px or larger, tap targets are 48px or taller, and text contrast is
at least 4.5:1 in light and dark mode.

## Structure

```
index.html      markup shell
css/styles.css  design tokens (light + dark), layout, components
js/mapdata.js   Boca Raton base map: coastline, Intracoastal, parks, roads, labels
js/data.js      shops, each shop's menu and prices, sizes, milks, syrups
js/app.js       state, map pan/pinch/zoom, shop sheet, menu, order, status
```

The app uses the phone's system font and loads nothing from other sites. State persists in `localStorage`.

## Item photos

Photos come only from each shop's own online ordering page:

| Shop | Source | Photos |
|---|---|---|
| Carmela Coffee (BRiC) | Toast | 30 items |
| LPP Bakery Café | Square Online | 32 items |
| Third Place Coffee Lounge | Per Diem | 24 items |
| the seed. (Palmetto) | Clover | 16 items |
| Subculture Coffee (Mizner) | Toast | 10 items |
| Long Story Short, Saquella, Mane, The Pots, Cafe Louis | none on their own pages | none |

Delivery apps, Yelp and Instagram were skipped because those photos usually belong to the
platform or to customers. The app links to the images where they are hosted; if one fails to
load, the item shows without a picture. The Claude preview blocks outside images, so photos only
appear when the app is served from its own site (for example GitHub Pages). The photos belong
to the shops, so ask each shop's permission before a public release.

Menus for Mane Coffee and The Pots come from third-party listings, and Cafe Louis's website
was down, so those three menus and their prices are the least reliable.

## About the data

The ten shops are real Boca Raton coffee shops, placed at the coordinates on their Google
Maps listings. Each shop's menu is built from its published menu and
listings as of September 2026. Prices come from those listings where published and are
estimates otherwise. Wait times, ratings and "busy" levels are sample values, not live data.
Orders are not sent to the shops. The base map is hand-traced from real
geography (I-95, Federal Hwy, Dixie Hwy, Palmetto Park Rd, Glades Rd, Camino Real, Spanish
River Blvd, Yamato Rd, A1A, the Intracoastal, Lake Boca Raton, the beach parks, FAU, the
airport and Town Center) and drawn as SVG, so it works offline with no tile provider. To go
fully live, swap the SVG for a tile layer and feed `OTG_DATA.stores` from a places API.
