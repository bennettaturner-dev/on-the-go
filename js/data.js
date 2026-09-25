/* On the Go — sample data.
   Stores are real Boca Raton coffee shops placed from their street addresses (positions
   approximate). Hours, wait times, ratings and pickup options are illustrative sample values. */

window.OTG_DATA = {
  /* where "you" are: Sanborn Square, downtown Boca Raton */
  me: { lat: 26.3520, lng: -80.0850, beans: 32 },

  stores: [
    { id: 'subculture', name: 'Subculture Coffee',            address: '437 Plaza Real, Mizner Park',     lat: 26.3556, lng: -80.0845, open: '7:00 AM', close: '8:00 PM',  wait: 4, rating: 4.7, busy: 'Steady', pickup: ['store', 'curbside'], special: 'shakerato',  tagline: 'Specialty roaster on the Mizner Park promenade. Big windows, good people-watching.' },
    { id: 'seed',       name: 'The Seed Coffee & Juice Bar', address: '199 W Palmetto Park Rd',          lat: 26.3512, lng: -80.0888, open: '7:00 AM', close: '6:00 PM',  wait: 3, rating: 4.8, busy: 'Quiet',  pickup: ['store', 'curbside'], special: 'hibiscus',   tagline: 'Clean, bright room just west of downtown. Cold-pressed juice next to the espresso.' },
    { id: 'lss',        name: 'Long Story Short Cafe',       address: '132 NE 2nd St',                   lat: 26.3532, lng: -80.0858, open: '7:30 AM', close: '4:00 PM',  wait: 5, rating: 4.7, busy: 'Busy',   pickup: ['store'],             special: 'honey',      tagline: 'Neighborhood café a block off Federal. Brunch crowd on weekends, quiet on weekdays.' },
    { id: 'saquella',   name: 'Saquella Café',               address: '410 Via De Palmas, Royal Palm Pl', lat: 26.3478, lng: -80.0832, open: '7:00 AM', close: '9:00 PM',  wait: 6, rating: 4.5, busy: 'Steady', pickup: ['store'],             special: 'cortado',    tagline: 'Italian café in Royal Palm Place. Proper cappuccino, pastries from the case.' },
    { id: 'third',      name: 'Third Place Coffee Lounge',   address: '325 NE Spanish River Blvd',       lat: 26.3838, lng: -80.0842, open: '6:30 AM', close: '7:00 PM',  wait: 3, rating: 4.9, busy: 'Quiet',  pickup: ['store', 'curbside'], special: 'coldbrew',   tagline: 'Lounge seating and long tables. Made for lingering with a laptop.' },
    { id: 'mane',       name: 'Mane Coffee',                 address: '500 NE Spanish River Blvd, Ste 7', lat: 26.3838, lng: -80.0815, open: '7:00 AM', close: '5:00 PM',  wait: 4, rating: 4.8, busy: 'Steady', pickup: ['store', 'curbside'], special: 'flatwhite',  tagline: 'Small-batch espresso bar near Spanish River and Federal.' },
    { id: 'lacolombe',  name: 'La Colombe',                  address: '3581 N Federal Hwy',              lat: 26.3800, lng: -80.0808, open: '6:30 AM', close: '7:00 PM',  wait: 5, rating: 4.6, busy: 'Busy',   pickup: ['store', 'curbside'], special: 'draftlatte', tagline: 'Draft lattes on nitro and a fast bar. Easy parking off Federal.' },
    { id: 'carmela',    name: 'Carmela Coffee at BRiC',      address: '4800 T-Rex Ave, Ste 150',         lat: 26.3880, lng: -80.1060, open: '7:00 AM', close: '4:00 PM',  wait: 2, rating: 4.6, busy: 'Quiet',  pickup: ['store', 'curbside'], special: 'pastelito',  tagline: 'Inside the Boca Raton Innovation Campus. Roasted locally on Rogers Circle.' },
    { id: 'lpp',        name: 'LPP Bakery Café',             address: '1 Town Center Rd, Ste 102',       lat: 26.3640, lng: -80.1330, open: '7:00 AM', close: '6:00 PM',  wait: 4, rating: 4.8, busy: 'Steady', pickup: ['store', 'curbside'], special: 'croissant',  tagline: 'French bakery by Town Center. Croissants come out all morning.' },
    { id: 'pots',       name: 'The Pots Cafe',               address: '6000 Glades Rd',                  lat: 26.3665, lng: -80.1345, open: '8:00 AM', close: '9:00 PM',  wait: 5, rating: 4.7, busy: 'Busy',   pickup: ['store'],             special: 'mocha',      tagline: 'Coffee and pastry counter at the mall. Handy before a Town Center run.' }
  ],

  pickupModes: [
    { id: 'store',    name: 'In store', hint: 'Grab it from the pickup shelf' },
    { id: 'curbside', name: 'Curbside', hint: 'We bring it out to your car' }
  ],

  categories: [
    { id: 'hot',    name: 'Hot' },
    { id: 'cold',   name: 'Iced' },
    { id: 'frozen', name: 'Frozen' },
    { id: 'tea',    name: 'Tea & Matcha' },
    { id: 'bakery', name: 'Bakery' }
  ],

  /* price is the Small price; kind drives the cup illustration and which options apply */
  menu: [
    { id: 'latte',      cat: 'hot',    kind: 'hot',    name: 'Latte',                     price: 4.50, cal: 190, color: '#C9A47C', desc: 'Double espresso with steamed milk and a thin layer of microfoam.' },
    { id: 'cappuccino', cat: 'hot',    kind: 'hot',    name: 'Cappuccino',                price: 4.25, cal: 140, color: '#B88E63', desc: 'Espresso under a thick, velvety cap of foam. Dusted with cocoa if you like.' },
    { id: 'cortado',    cat: 'hot',    kind: 'hot',    name: 'Cortado',                   price: 4.00, cal: 90,  color: '#A97B4F', desc: 'Equal parts espresso and steamed milk. Small, strong, smooth.' },
    { id: 'flatwhite',  cat: 'hot',    kind: 'hot',    name: 'Flat White',                price: 4.75, cal: 220, color: '#D3B08A', desc: 'Ristretto shots with silky steamed whole milk and almost no foam.' },
    { id: 'batch',      cat: 'hot',    kind: 'hot',    name: 'House Batch Brew',          price: 3.00, cal: 5,   color: '#4A2C1A', desc: 'Medium roast brewed fresh every 30 minutes. Notes of cocoa and toasted almond.' },
    { id: 'mocha',      cat: 'hot',    kind: 'hot',    name: 'Mocha',                     price: 5.00, cal: 370, color: '#6B3E2A', desc: 'Espresso, dark chocolate sauce and steamed milk, finished with whipped cream.' },
    { id: 'honey',      cat: 'hot',    kind: 'hot',    name: 'Honey Cinnamon Latte',      price: 5.25, cal: 260, color: '#C99A6B', desc: 'Local wildflower honey and cinnamon stirred into a classic latte.' },

    { id: 'icedlatte',  cat: 'cold',   kind: 'cold',   name: 'Iced Latte',                price: 4.75, cal: 130, color: '#C9A47C', desc: 'Double espresso and cold milk over ice.' },
    { id: 'coldbrew',   cat: 'cold',   kind: 'cold',   name: 'Cold Brew',                 price: 4.25, cal: 5,   color: '#3B2417', desc: 'Steeped 18 hours, served black over ice. Low acid, chocolatey.' },
    { id: 'shakerato',  cat: 'cold',   kind: 'cold',   name: 'Oat Brown Sugar Shakerato', price: 5.50, cal: 120, color: '#B07D52', desc: 'Espresso shaken hard with brown sugar and ice, poured over oat milk.' },
    { id: 'draftlatte', cat: 'cold',   kind: 'cold',   name: 'Nitro Draft Latte',         price: 5.25, cal: 120, color: '#B4885F', desc: 'Cold latte on nitrogen. Frothy, creamy, no ice needed.' },
    { id: 'tonic',      cat: 'cold',   kind: 'cold',   name: 'Espresso Tonic',            price: 5.25, cal: 60,  color: '#D9B27C', desc: 'Two shots over tonic and ice with a twist of orange. Bright and bubbly.' },

    { id: 'frmocha',    cat: 'frozen', kind: 'frozen', name: 'Frozen Mocha',              price: 6.00, cal: 480, color: '#5E3A2A', desc: 'Coffee, milk, chocolate and ice blended thick, with whipped cream.' },
    { id: 'saltcaramel', cat: 'frozen', kind: 'frozen', name: 'Salted Caramel Freeze',    price: 6.00, cal: 470, color: '#C69A66', desc: 'Blended espresso and caramel with a flaky salt finish.' },
    { id: 'strawberry', cat: 'frozen', kind: 'frozen', name: 'Strawberry Cream Freeze',   price: 5.50, cal: 370, color: '#E58AA3', desc: 'Florida strawberries blended with milk and ice. No coffee.' },

    { id: 'chai',       cat: 'tea',    kind: 'hot',    name: 'Chai Latte',                price: 4.75, cal: 240, color: '#C99A6B', desc: 'House-spiced black tea with steamed milk. Cardamom forward.' },
    { id: 'matcha',     cat: 'tea',    kind: 'cold',   name: 'Iced Matcha Latte',         price: 5.00, cal: 200, color: '#8FBF7F', desc: 'Ceremonial-grade matcha whisked into cold milk over ice.' },
    { id: 'londonfog',  cat: 'tea',    kind: 'hot',    name: 'London Fog',                price: 4.50, cal: 180, color: '#D9C4A8', desc: 'Earl Grey with vanilla and steamed milk.' },
    { id: 'hibiscus',   cat: 'tea',    kind: 'cold',   name: 'Iced Hibiscus Tea',         price: 3.75, cal: 40,  color: '#B23A5A', desc: 'Tart hibiscus with a little lime. Very Florida.' },

    { id: 'pastelito',  cat: 'bakery', kind: 'food',   name: 'Guava Pastelito',           price: 3.25, cal: 300, emoji: '🥮', desc: 'Flaky puff pastry with guava and cream cheese. Best warm.' },
    { id: 'croissant',  cat: 'bakery', kind: 'food',   name: 'Butter Croissant',          price: 3.25, cal: 260, emoji: '🥐', desc: 'Laminated with real butter. Warmed on request.' },
    { id: 'muffin',     cat: 'bakery', kind: 'food',   name: 'Blueberry Muffin',          price: 3.00, cal: 360, emoji: '🧁', desc: 'Soft muffin with a sugar-crusted top.' },
    { id: 'cookie',     cat: 'bakery', kind: 'food',   name: 'Chocolate Chip Cookie',     price: 2.75, cal: 380, emoji: '🍪', desc: 'Crisp edges, chewy middle, a lot of chocolate.' },
    { id: 'bagel',      cat: 'bakery', kind: 'food',   name: 'Everything Bagel',          price: 2.50, cal: 290, emoji: '🥯', desc: 'Toasted, cream cheese on the side.' }
  ],

  sizes: [
    { id: 'small',  name: 'Small',  oz: 12, delta: 0 },
    { id: 'medium', name: 'Medium', oz: 16, delta: 0.55 },
    { id: 'large',  name: 'Large',  oz: 20, delta: 1.05 }
  ],

  milks: [
    { id: 'whole',  name: 'Whole',  delta: 0 },
    { id: '2pct',   name: '2%',     delta: 0 },
    { id: 'skim',   name: 'Skim',   delta: 0 },
    { id: 'oat',    name: 'Oat',    delta: 0.70 },
    { id: 'almond', name: 'Almond', delta: 0.70 },
    { id: 'soy',    name: 'Soy',    delta: 0.70 }
  ],

  extras: [
    { id: 'vanilla', name: 'Vanilla syrup',   delta: 0.80 },
    { id: 'caramel', name: 'Caramel drizzle', delta: 0.60 },
    { id: 'whip',    name: 'Whipped cream',   delta: 0 }
  ],

  shotPrice: 1.00,
  beansPerDollar: 1,
  rewardAt: 50,
  taxRate: 0.07
};
