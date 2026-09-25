/* On the Go — Boca Raton shops and their menus.
   Menus are built from each shop's published menu and listings (Sept 2026). Where a shop's
   price wasn't published, the price is an estimate. Wait times, ratings and busy levels are
   sample values. Positions are placed from street addresses and are approximate. */

window.OTG_DATA = {
  /* "you": Sanborn Square, downtown Boca Raton */
  me: { lat: 26.3520, lng: -80.0850, punches: 7 },
  rewardAt: 10,
  taxRate: 0.07,

  sizes: [
    { id: 'reg', name: 'Regular', oz: 12, delta: 0 },
    { id: 'lg',  name: 'Large',   oz: 16, delta: 0.75 }
  ],
  milks: [
    { id: 'whole',  name: 'Whole',  delta: 0 },
    { id: '2pct',   name: '2%',     delta: 0 },
    { id: 'oat',    name: 'Oat',    delta: 0.75 },
    { id: 'almond', name: 'Almond', delta: 0.75 },
    { id: 'coco',   name: 'Coconut', delta: 0.75 }
  ],
  syrups: [
    { id: 'vanilla', name: 'Vanilla' },
    { id: 'caramel', name: 'Caramel' },
    { id: 'hazel',   name: 'Hazelnut' }
  ],

  pickupModes: [
    { id: 'store',    name: 'At the counter', hint: 'Your name will be on the cup at the pickup shelf.' },
    { id: 'curbside', name: 'Curbside',       hint: 'Tap "I\'m here" on your ticket and they bring it out.' }
  ],

  categories: [
    { id: 'coffee', name: 'Coffee' },
    { id: 'iced',   name: 'Iced' },
    { id: 'more',   name: 'Tea & more' },
    { id: 'food',   name: 'Food' }
  ],

  /* Every drink and food item that appears on at least one shop's menu.
     kind: espresso | hot | black | iced | frozen | affogato | food   (drives the drawing)
     sized: offered in Regular / Large   milk: milk choice applies   coffee: extra shot applies */
  catalog: {
    espresso:     { name: 'Double Espresso',   cat: 'coffee', kind: 'espresso', color: '#3A2216', cal: 5,   coffee: true, desc: 'Two shots, pulled short.' },
    cortado:      { name: 'Cortado',           cat: 'coffee', kind: 'espresso', color: '#8A5E3E', cal: 60,  coffee: true, milk: true, desc: 'Equal parts espresso and warm milk.' },
    macchiato:    { name: 'Macchiato',         cat: 'coffee', kind: 'espresso', color: '#5A3A26', cal: 15,  coffee: true, milk: true, desc: 'Espresso marked with a spoon of foam.' },
    cappuccino:   { name: 'Cappuccino',        cat: 'coffee', kind: 'hot', color: '#B88E63', cal: 120, coffee: true, milk: true, sized: true, desc: 'Espresso under a thick cap of milk foam.' },
    latte:        { name: 'Latte',             cat: 'coffee', kind: 'hot', color: '#C9A47C', cal: 190, coffee: true, milk: true, sized: true, desc: 'Espresso and steamed milk with a thin layer of foam.' },
    flatwhite:    { name: 'Flat White',        cat: 'coffee', kind: 'hot', color: '#B38A66', cal: 170, coffee: true, milk: true, desc: 'Ristretto shots with silky steamed milk.' },
    americano:    { name: 'Americano',         cat: 'coffee', kind: 'black', color: '#4A2C1A', cal: 10, coffee: true, sized: true, desc: 'Espresso topped with hot water.' },
    drip:         { name: 'Drip Coffee',       cat: 'coffee', kind: 'black', color: '#3E2517', cal: 5,  sized: true, desc: 'Batch brew, poured fresh.' },
    frenchpress:  { name: 'French Press',      cat: 'coffee', kind: 'black', color: '#3A2216', cal: 5,  desc: 'Brewed to order in a press. Give it four minutes.' },
    mocha:        { name: 'Mocha',             cat: 'coffee', kind: 'hot', color: '#6B3E2A', cal: 330, coffee: true, milk: true, sized: true, desc: 'Espresso, chocolate and steamed milk.' },
    carmacch:     { name: 'Caramel Macchiato', cat: 'coffee', kind: 'hot', color: '#A97B4F', cal: 250, coffee: true, milk: true, sized: true, desc: 'Vanilla milk marked with espresso and a caramel finish.' },
    cinnamonlatte:{ name: 'Cinnamon Latte',    cat: 'coffee', kind: 'hot', color: '#B98A5E', cal: 210, coffee: true, milk: true, sized: true, desc: 'House latte with cinnamon, Costa Rica-inspired.' },
    pumpkinlatte: { name: 'Spiced Pumpkin Latte', cat: 'coffee', kind: 'hot', color: '#C2814A', cal: 260, coffee: true, milk: true, sized: true, desc: 'Seasonal. Pumpkin and warm spice with espresso.' },
    cinnabee:     { name: 'Cinnabee Latte',    cat: 'coffee', kind: 'hot', color: '#C99A6B', cal: 220, coffee: true, milk: true, sized: true, desc: 'Honey and cinnamon latte. Regulars get it with oat milk.' },
    strawcream:   { name: 'Strawberries & Cream Latte', cat: 'coffee', kind: 'hot', color: '#E0A8A2', cal: 240, coffee: true, milk: true, sized: true, desc: 'Strawberry and vanilla cream with espresso.' },
    mushroom:     { name: 'Mushroom Coffee',   cat: 'coffee', kind: 'black', color: '#4E3526', cal: 10, sized: true, desc: 'Coffee blended with functional mushrooms. Smooth and earthy.' },
    bschai:       { name: 'Brown Sugar Chai Latte', cat: 'coffee', kind: 'hot', color: '#B98559', cal: 260, milk: true, sized: true, desc: 'Spiced chai with brown sugar and steamed milk.' },
    cocoa:        { name: 'Toasted Marshmallow Hot Cocoa', cat: 'coffee', kind: 'hot', color: '#7A4A34', cal: 380, milk: true, sized: true, desc: 'Rich cocoa with torched marshmallow on top.' },

    icedlatte:    { name: 'Iced Latte',        cat: 'iced', kind: 'iced', color: '#C9A47C', cal: 130, coffee: true, milk: true, sized: true, desc: 'Espresso and cold milk over ice.' },
    icedcoffee:   { name: 'Iced Coffee',       cat: 'iced', kind: 'iced', color: '#4A2C1A', cal: 5,   sized: true, desc: 'Brewed strong and poured over ice.' },
    coldbrew:     { name: 'Cold Brew',         cat: 'iced', kind: 'iced', color: '#3B2417', cal: 5,   sized: true, desc: 'Steeped overnight. Low acid, chocolatey.' },
    icedamericano:{ name: 'Iced Americano',    cat: 'iced', kind: 'iced', color: '#4A2C1A', cal: 10,  coffee: true, sized: true, desc: 'Espresso and cold water over ice.' },
    icedmocha:    { name: 'Iced Mocha',        cat: 'iced', kind: 'iced', color: '#6B3E2A', cal: 290, coffee: true, milk: true, sized: true, desc: 'Espresso, chocolate and cold milk over ice.' },
    nitro:        { name: 'Nitro Cold Brew',   cat: 'iced', kind: 'iced', color: '#2E1C12', cal: 5,   desc: 'Cold brew on tap. Creamy with no milk.' },
    draftlatte:   { name: 'Draft Latte',       cat: 'iced', kind: 'iced', color: '#B4885F', cal: 120, coffee: true, desc: 'Cold latte poured on draft, frothed until it looks like a stout.' },
    maplecb:      { name: 'Maple Cold Brew',   cat: 'iced', kind: 'iced', color: '#5A3822', cal: 90,  sized: true, desc: 'Cold brew sweetened with real maple.' },
    ctclatte:     { name: 'Iced Cinnamon Toast Crunch Latte', cat: 'iced', kind: 'iced', color: '#C69A66', cal: 260, coffee: true, milk: true, sized: true, desc: 'Cereal-milk cinnamon latte over ice.' },
    pumpkincf:    { name: 'Pumpkin Cold Foam Latte', cat: 'iced', kind: 'iced', color: '#B8793F', cal: 240, coffee: true, milk: true, sized: true, desc: 'Seasonal. Iced latte under pumpkin cold foam.' },
    ube:          { name: 'Ube Cookie Monster', cat: 'iced', kind: 'iced', color: '#9B7BB8', cal: 320, coffee: true, milk: true, sized: true, desc: 'Ube latte with cookie crumble. Their most photographed drink.' },

    chai:         { name: 'Chai Latte',        cat: 'more', kind: 'hot',  color: '#C99A6B', cal: 240, milk: true, sized: true, desc: 'Spiced black tea with steamed milk. Ask for it iced.' },
    matcha:       { name: 'Matcha Latte',      cat: 'more', kind: 'iced', color: '#8FBF7F', cal: 200, milk: true, sized: true, desc: 'Stone-ground matcha and milk, hot or iced.' },
    icedtea:      { name: 'Iced Tea',          cat: 'more', kind: 'iced', color: '#9C5A2E', cal: 0,   sized: true, desc: 'Fresh-brewed black tea over ice.' },
    mate:         { name: 'Iced Yerba Mate',   cat: 'more', kind: 'iced', color: '#9AA256', cal: 0,   sized: true, desc: 'Grassy, bright and caffeinated.' },
    lemonade:     { name: 'Lemonade',          cat: 'more', kind: 'iced', color: '#F0D877', cal: 150, desc: 'Fresh-squeezed.' },
    mintlemonade: { name: 'Mint Lemonade',     cat: 'more', kind: 'iced', color: '#CFE08A', cal: 150, desc: 'Lemonade blended with fresh mint.' },
    cream:        { name: 'C.R.E.A.M. Smoothie', cat: 'more', kind: 'frozen', color: '#E8A3A6', cal: 310, desc: 'Strawberries, banana and almond milk.' },
    affogato:     { name: 'Affogato',          cat: 'more', kind: 'affogato', color: '#5A3622', cal: 220, desc: 'A shot of espresso poured over gelato.' },

    croissant:    { name: 'Butter Croissant',  cat: 'food', kind: 'food', shape: 'croissant', cal: 260, warm: true, desc: 'Flaky and all butter.' },
    choccroissant:{ name: 'Chocolate Croissant', cat: 'food', kind: 'food', shape: 'croissant', tint: '#4A2C1A', cal: 330, warm: true, desc: 'Two bars of dark chocolate inside.' },
    almondcroissant:{ name: 'Almond Croissant', cat: 'food', kind: 'food', shape: 'croissant', tint: '#EFE4D0', cal: 420, warm: true, desc: 'Twice baked with almond cream and sliced almonds.' },
    berrycroissant:{ name: 'Chocolate Almond Blackberry Croissant', cat: 'food', kind: 'food', shape: 'croissant', tint: '#4B2748', cal: 410, warm: true, desc: 'Baked in house every morning.' },
    plumalmond:   { name: 'Plum & Almond Pastry', cat: 'food', kind: 'food', shape: 'tart', tint: '#7A3350', cal: 340, desc: 'Light, flaky, with fresh plum.' },
    espcookie:    { name: 'Espresso Chocolate Chip Cookie', cat: 'food', kind: 'food', shape: 'cookie', tint: '#5A3622', cal: 380, warm: true, desc: 'The one the Sun Sentinel voted best.' },
    cannoli:      { name: 'Cannoli',           cat: 'food', kind: 'food', shape: 'cannoli', cal: 300, desc: 'Crisp shell, sweet ricotta.' },
    tiramisu:     { name: 'Tiramisu',          cat: 'food', kind: 'food', shape: 'cake', cal: 420, desc: 'Espresso-soaked ladyfingers and mascarpone.' },
    fruittart:    { name: 'Fruit Tart',        cat: 'food', kind: 'food', shape: 'tart', tint: '#C8475A', cal: 350, desc: 'Pastry cream and fresh fruit.' },
    avotoast:     { name: 'Avocado Toast',     cat: 'food', kind: 'food', shape: 'toast', cal: 410, desc: 'Smashed avocado on toasted sourdough.' },
    acai:         { name: 'Açaí Bowl',         cat: 'food', kind: 'food', shape: 'bowl', cal: 480, desc: 'Açaí topped with granola, banana and berries.' },
    bagelbomb:    { name: 'Bagel Bomb',        cat: 'food', kind: 'food', shape: 'bagel', cal: 390, warm: true, desc: 'Stuffed everything-bagel dough.' },
    gfmuffin:     { name: 'Gluten-Free Chocolate Chip Muffin', cat: 'food', kind: 'food', shape: 'muffin', tint: '#4A2C1A', cal: 360, warm: true, desc: 'Gluten-free and still soft.' },
    bananaloaf:   { name: 'Banana Coconut Loaf', cat: 'food', kind: 'food', shape: 'loaf', cal: 320, warm: true, desc: 'Vegan banana bread with toasted coconut.' },
    macaron:      { name: 'Macarons (3)',      cat: 'food', kind: 'food', shape: 'macaron', cal: 210, desc: 'Three French macarons, flavors of the day.' },
    crepe:        { name: 'Sweet Crêpe',       cat: 'food', kind: 'food', shape: 'crepe', cal: 450, desc: 'Folded crêpe, made to order.' },
    baguette:     { name: 'Baguette Sandwich', cat: 'food', kind: 'food', shape: 'sandwich', cal: 520, desc: 'Parisian-style sandwich on fresh baguette.' },
    empanada:     { name: 'Empanada',          cat: 'food', kind: 'food', shape: 'empanada', cal: 310, warm: true, desc: 'Baked, flaky, filling of the day.' },
    dubaicookie:  { name: 'Dubai Chocolate Cookie', cat: 'food', kind: 'food', shape: 'cookie', tint: '#6F8B3A', cal: 420, desc: 'Chocolate cookie filled with pistachio and kataifi.' },
    caprese:      { name: 'Caprese Sandwich',  cat: 'food', kind: 'food', shape: 'sandwich', cal: 540, desc: 'Fresh mozzarella, ripe tomato and basil.' }
  },

  /* menu: [catalog id, price]. Signature is what the shop is known for. */
  stores: [
    { id: 'subculture', name: 'Subculture Coffee', address: '437 Plaza Real, Mizner Park', lat: 26.3556, lng: -80.0845,
      hours: '7 AM – 8 PM', wait: 4, rating: 4.7, busy: 'Steady', pickup: ['store', 'curbside'], shot: 1.50, syrup: 0.75, signature: 'frenchpress',
      about: 'Palm Beach County roaster with a counter on the Mizner Park promenade.',
      menu: [['espresso', 2.50], ['cortado', 2.75], ['cappuccino', 3.50], ['latte', 4.00], ['flatwhite', 4.00], ['mocha', 4.50], ['drip', 2.75], ['frenchpress', 4.50],
             ['icedlatte', 4.00], ['icedmocha', 4.50], ['coldbrew', 3.00], ['icedamericano', 2.75], ['chai', 4.00], ['icedtea', 2.25], ['mate', 2.25],
             ['croissant', 3.50], ['choccroissant', 3.95]] },

    { id: 'seed', name: 'the seed. coffee + juice', address: '199 W Palmetto Park Rd', lat: 26.3512, lng: -80.0888,
      hours: '7 AM – 6 PM', wait: 3, rating: 4.8, busy: 'Quiet', pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'cinnabee',
      about: 'Coffee, cold-pressed juice and açaí, with plenty of vegan options.',
      menu: [['cinnabee', 6.00], ['strawcream', 6.25], ['mushroom', 5.50], ['latte', 5.00], ['cappuccino', 4.75], ['coldbrew', 4.75], ['icedlatte', 5.25],
             ['matcha', 5.75], ['cream', 9.50], ['acai', 12.95], ['bagelbomb', 4.95], ['gfmuffin', 4.50], ['bananaloaf', 4.25]] },

    { id: 'lss', name: 'Long Story Short Cafe', address: '132 NE 2nd St', lat: 26.3532, lng: -80.0858,
      hours: '7 AM – 3 PM', wait: 5, rating: 4.7, busy: 'Busy', pickup: ['store'], shot: 1.00, syrup: 0.75, signature: 'ube',
      about: 'Healthy, chic-casual café for coffee, smoothies and açaí bowls.',
      menu: [['drip', 3.50], ['espresso', 3.50], ['americano', 3.75], ['macchiato', 4.00], ['flatwhite', 4.75], ['cappuccino', 5.00], ['latte', 5.25],
             ['bschai', 6.00], ['cocoa', 5.50], ['ube', 6.75], ['pumpkincf', 6.50], ['icedlatte', 5.50], ['acai', 13.00], ['avotoast', 12.00]] },

    { id: 'saquella', name: 'Saquella Café', address: '410 Via De Palmas, Royal Palm Place', lat: 26.3478, lng: -80.0832,
      hours: '7 AM – 9 PM', wait: 6, rating: 4.5, busy: 'Steady', pickup: ['store'], shot: 1.25, syrup: 0.75, signature: 'cappuccino',
      about: 'Italian café pouring Saquella, roasted by the family in Pescara since 1856. Pastries baked daily.',
      menu: [['espresso', 3.00], ['macchiato', 3.50], ['cappuccino', 4.75], ['latte', 5.00], ['affogato', 6.50],
             ['espcookie', 3.50], ['berrycroissant', 4.75], ['plumalmond', 4.95], ['croissant', 3.75], ['cannoli', 4.50], ['fruittart', 6.50], ['tiramisu', 8.00]] },

    { id: 'third', name: 'Third Place Coffee Lounge', address: '325 NE Spanish River Blvd', lat: 26.3838, lng: -80.0842,
      hours: '6:30 AM – 7 PM', wait: 3, rating: 4.9, busy: 'Quiet', pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'maplecb',
      about: 'Lounge seating, long tables and seasonal drinks. Pastries from a local bakery.',
      menu: [['espresso', 3.25], ['cappuccino', 4.75], ['latte', 5.00], ['drip', 3.25], ['maplecb', 5.75], ['ctclatte', 6.25], ['coldbrew', 4.75],
             ['icedlatte', 5.25], ['matcha', 5.75], ['chai', 5.25], ['croissant', 4.00], ['choccroissant', 4.50]] },

    { id: 'mane', name: 'Mane Coffee', address: '500 NE Spanish River Blvd, Ste 7', lat: 26.3838, lng: -80.0815,
      hours: '8 AM – 5 PM', wait: 4, rating: 4.8, busy: 'Steady', pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'nitro',
      about: 'Named one of America\'s best coffee shops by Food & Wine. Fresh bread and brunch too.',
      menu: [['espresso', 3.50], ['macchiato', 4.00], ['cortado', 4.25], ['cappuccino', 4.50], ['latte', 5.00], ['drip', 3.50], ['nitro', 5.50],
             ['icedlatte', 5.25], ['chai', 4.50], ['matcha', 5.00], ['lemonade', 5.00], ['avotoast', 12.00], ['croissant', 4.25]] },

    { id: 'lacolombe', name: 'La Colombe', address: '3581 N Federal Hwy', lat: 26.3800, lng: -80.0808,
      hours: '6:30 AM – 7 PM', wait: 5, rating: 4.6, busy: 'Busy', pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'draftlatte',
      about: 'Philadelphia roaster. The Draft Latte started here, poured from a tap.',
      menu: [['espresso', 3.50], ['cappuccino', 5.00], ['latte', 5.25], ['americano', 4.00], ['drip', 3.50], ['draftlatte', 5.50], ['coldbrew', 5.00],
             ['icedlatte', 5.50], ['chai', 5.25], ['croissant', 4.25], ['choccroissant', 4.75]] },

    { id: 'carmela', name: 'Carmela Coffee at BRiC', address: '4800 T-Rex Ave, Ste 150', lat: 26.3880, lng: -80.1060,
      hours: '7 AM – 4 PM', wait: 2, rating: 4.6, busy: 'Quiet', pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'carmacch',
      about: 'Boca-born roaster growing its own beans in Costa Rica. Inside the Boca Raton Innovation Campus.',
      menu: [['drip', 3.25], ['latte', 5.00], ['cappuccino', 4.75], ['carmacch', 5.75], ['pumpkinlatte', 6.25], ['icedcoffee', 3.95], ['icedlatte', 5.25],
             ['matcha', 5.75], ['chai', 5.25], ['avotoast', 12.50], ['croissant', 4.00]] },

    { id: 'lpp', name: 'LPP Bakery Café', address: '1 Town Center Rd, Ste 102', lat: 26.3640, lng: -80.1330,
      hours: '7:30 AM – 4 PM', wait: 4, rating: 4.8, busy: 'Steady', pickup: ['store'], shot: 1.00, syrup: 0.75, signature: 'almondcroissant',
      about: 'Le Petit Poussin. A French bakery run by a French couple, croissants all morning.',
      menu: [['espresso', 3.00], ['cappuccino', 4.75], ['latte', 5.00], ['americano', 3.75], ['icedlatte', 5.25],
             ['croissant', 3.75], ['choccroissant', 4.25], ['almondcroissant', 4.75], ['macaron', 7.50], ['crepe', 11.00], ['baguette', 12.50]] },

    { id: 'pots', name: 'The Pots Cafe', address: '6000 Glades Rd, Town Center', lat: 26.3665, lng: -80.1345,
      hours: '10 AM – 5 PM', wait: 5, rating: 4.7, busy: 'Busy', pickup: ['store'], shot: 1.00, syrup: 0.75, signature: 'cinnamonlatte',
      about: 'A plant shop and café in one, inspired by Costa Rica.',
      menu: [['espresso', 3.50], ['cappuccino', 5.00], ['latte', 5.25], ['cinnamonlatte', 6.00], ['matcha', 6.00], ['mintlemonade', 5.50],
             ['empanada', 5.00], ['dubaicookie', 5.50], ['avotoast', 14.00], ['caprese', 13.50]] }
  ]
};
