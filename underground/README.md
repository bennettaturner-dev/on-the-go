# Underground

A mobile-first web app for finding underground raves, warehouse parties and club nights across
South Florida (Palm Beach, Broward, Miami-Dade).

## Run it

No build step. Serve the folder and open it on your phone or in a browser:

```bash
python3 -m http.server 8080 --directory underground
# then open http://localhost:8080
```

## How it works

- **Radar**: upcoming events grouped by night, filtered by date (Tonight, Weekend, 7 days, All),
  sound (Techno, House, Bass, DnB/Jungle, Breaks, Trance, Dark/EBM, Disco, Leftfield) and search.
  Past events drop off automatically.
- **Location**: pick a home base (defaults to Boca Raton) or use your phone's location, then set a
  radius. Every event shows its distance from you.
- **Underground meter**: each event gets 0–3 bars from its sound, venue (known underground rooms,
  warehouses, secret/TBA locations vs. mega-clubs), door price and closing time. The
  **Underground** filter, on by default, shows 2+ bars. The event sheet explains the score.
- **Event sheet**: tickets link, save, add to calendar (.ics), directions and share. Secret
  locations are flagged, since their address drops close to the date.
- **Weekly**: standing nights with their next date, which you can add as a repeating calendar event.
- **Saved**: your lineup.
- **Scene**: how people find the unlisted ones (based on the r/aves and Quora advice: go to regular
  ones, make friends, word of mouth, follow crews), 100+ local crews, listing sources and safety tips.

## Keeping it current

Events come from the [19hz.info Miami / South Florida calendar](https://19hz.info/eventlisting_Miami.php),
a hand-curated underground listing that updates most Thursdays and Fridays. Refresh the data with:

```bash
python3 underground/tools/update.py
```

This rewrites `js/events.js` (events, weekly nights, venues and crews). The app warns when its
listings are more than a week old. The current snapshot was taken September 25, 2026.

## Structure

```
index.html        markup shell
css/styles.css    dark theme, layout, components
js/events.js      generated listing data (tools/update.py)
js/app.js         filters, location and distance, underground scoring, sheets, calendar export
tools/update.py   19hz scraper → js/events.js
```

Loads nothing from other sites. Saved events and settings persist in `localStorage`.
Distances use city centres, so they are approximate.
