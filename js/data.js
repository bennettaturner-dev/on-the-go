/* On the Go — Boca Raton shops and their menus.
   Menus are built from each shop's published menu and listings (Sept 2026). Where a shop's
   price wasn't published, the price is an estimate.
   week: hours by day, Sunday first (null = closed); falls back to hours.
   pattern + traffic drive the pickup-time estimate in app.js (see busyness()); traffic is scaled
   from each shop's Google review count. Coordinates are from each shop's Google Maps listing.
   featureDay: the weekday (0 = Sunday) the shop's signature drink shows on the map.
   brand: colors and initials for the shop's pin and header. These are this app's picks, not
   the shops' official branding; each pair passes 4.5:1 contrast. tag: one line about the shop. */

window.OTG_DATA = {
  /* "you": Sanborn Square, downtown Boca Raton */
  me: { lat: 26.3520, lng: -80.0850 },
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

    honeylav:     { name: 'Honey Lavender Latte', cat: 'coffee', kind: 'hot', color: '#C7A98C', cal: 230, coffee: true, milk: true, sized: true, desc: 'Seasonal. Honey and lavender with espresso and steamed milk.' },
    rosecard:     { name: 'Rose Cardamom Latte', cat: 'coffee', kind: 'hot', color: '#D2A69A', cal: 220, coffee: true, milk: true, sized: true, desc: 'Seasonal. Rose and cardamom latte.' },
    aulait:       { name: 'Café au Lait', cat: 'coffee', kind: 'hot', color: '#A57B58', cal: 110, milk: true, sized: true, desc: 'Drip coffee with steamed milk.' },
    pourover:     { name: 'Kalita Pour Over', cat: 'coffee', kind: 'black', color: '#3E2517', cal: 5, desc: 'Single cup, brewed by hand to order.' },
    hotchoc:      { name: 'Hot Chocolate', cat: 'coffee', kind: 'hot', color: '#6E4330', cal: 320, milk: true, sized: true, desc: 'Steamed milk and chocolate.' },
    lavacup:      { name: 'Louis Lava Cup', cat: 'coffee', kind: 'hot', color: '#7A4A2E', cal: 300, coffee: true, desc: 'The house signature drink.' },
    cblemonade:   { name: 'Cold Brew Lemonade', cat: 'iced', kind: 'iced', color: '#B98A3E', cal: 110, sized: true, desc: 'Cold brew over fresh lemonade.' },
    yuzucb:       { name: 'Yuzu Honey Cold Brew Lemonade', cat: 'iced', kind: 'iced', color: '#C9A04A', cal: 140, sized: true, desc: 'Seasonal. Cold brew, yuzu, honey and lemonade.' },
    strawmatcha:  { name: 'Strawberry Matcha Cloud', cat: 'iced', kind: 'iced', color: '#9CC48A', cal: 250, milk: true, sized: true, desc: 'Seasonal. Iced matcha over strawberry, topped with cream.' },
    obchai:       { name: 'Orange Blossom Chai', cat: 'more', kind: 'hot', color: '#C9975E', cal: 230, milk: true, sized: true, desc: 'Seasonal. Chai with orange blossom.' },
    londonfog:    { name: 'London Fog', cat: 'more', kind: 'hot', color: '#D3BFA3', cal: 180, milk: true, sized: true, desc: 'Earl Grey, vanilla and steamed milk.' },
    hottea:       { name: 'Hot Tea', cat: 'more', kind: 'black', color: '#8B5A2B', cal: 0, sized: true, desc: 'Ask the barista for today\'s teas.' },
    cider:        { name: 'Spiced Apple Cider', cat: 'more', kind: 'black', color: '#B5651D', cal: 180, sized: true, desc: 'Warm, spiced apple cider.' },
    strawog:      { name: 'Strawberry OG Smoothie', cat: 'more', kind: 'frozen', color: '#E48A9A', cal: 290, desc: 'Strawberry, banana, almond milk and honey.' },
    chocbanana:   { name: 'Chocolate Banana ICE', cat: 'more', kind: 'frozen', color: '#6B4630', cal: 420, desc: 'Banana, cold brew, almond butter, mocha and almond milk.' },
    bgaffogato:   { name: 'Black & Gold Affogato', cat: 'more', kind: 'affogato', color: '#3A2216', cal: 240, desc: 'Espresso poured over gelato, finished the house way.' },
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
    quiche:       { name: 'Quiche', cat: 'food', kind: 'food', shape: 'tart', tint: '#E8C35A', cal: 380, warm: true, desc: 'French-style quiche, baked fresh.' },
    empanada:     { name: 'Empanada',          cat: 'food', kind: 'food', shape: 'empanada', cal: 310, warm: true, desc: 'Baked, flaky, filling of the day.' },
    dubaicookie:  { name: 'Dubai Chocolate Cookie', cat: 'food', kind: 'food', shape: 'cookie', tint: '#6F8B3A', cal: 420, desc: 'Chocolate cookie filled with pistachio and kataifi.' },
    caprese:      { name: 'Caprese Sandwich',  cat: 'food', kind: 'food', shape: 'sandwich', cal: 540, desc: 'Fresh mozzarella, ripe tomato and basil.' }
  },

  /* menu: [catalog id, price]. Signature is what the shop is known for. */
  stores: [
    { id: 'subculture', brand: { bg: '#1F3A5F', fg: '#FFFFFF', mono: 'SC' }, tag: 'Specialty roaster in Mizner Park',
      name: 'Subculture Coffee', address: '437 Plaza Real, Mizner Park', lat: 26.3555962, lng: -80.0857171,
      hours: '7 AM – 8 PM', pattern: 'downtown', traffic: 0.79, featureDay: 1, pickup: ['store', 'curbside'], shot: 1.50, syrup: 0.75, signature: 'frenchpress',
      about: 'Palm Beach County roaster with a counter on the Mizner Park promenade.',
      menu: [['espresso', 2.50], ['cortado', 2.75], ['cappuccino', 3.50], ['latte', 4.00], ['flatwhite', 4.00], ['mocha', 4.50], ['drip', 2.75], ['frenchpress', 4.50],
             ['icedlatte', 4.00], ['icedmocha', 4.50], ['coldbrew', 3.00], ['icedamericano', 2.75], ['chai', 4.00], ['icedtea', 2.25], ['mate', 2.25],
             ['croissant', 3.50], ['choccroissant', 3.95]] },

    { id: 'seed', brand: { bg: '#B0440F', fg: '#FFFFFF', mono: 's.' }, tag: 'Juice bar, açaí and vegan options',
      name: 'the seed. coffee + juice', address: '199 W Palmetto Park Rd', lat: 26.350844, lng: -80.0892075,
      hours: '7 AM – 6 PM', pattern: 'breakfast', traffic: 1.4, featureDay: 2, pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'cinnabee',
      about: 'Coffee, cold-pressed juice and açaí, with plenty of vegan options.',
      menu: [['cinnabee', 6.00], ['strawcream', 6.25], ['mushroom', 5.50], ['latte', 5.00], ['cappuccino', 4.75], ['coldbrew', 4.75], ['icedlatte', 5.25],
             ['matcha', 5.75], ['cream', 9.50], ['acai', 12.95], ['bagelbomb', 4.95], ['gfmuffin', 4.50], ['bananaloaf', 4.25]] },

    { id: 'lss', brand: { bg: '#8E2F4F', fg: '#FFFFFF', mono: 'LS' }, tag: 'Açaí bowls, toasts and fun lattes',
      name: 'Long Story Short Cafe', address: '132 NE 2nd St', lat: 26.3520155, lng: -80.084757,
      hours: '7 AM – 3 PM', pattern: 'breakfast', traffic: 0.74, featureDay: 3, pickup: ['store'], shot: 1.00, syrup: 0.75, signature: 'ube',
      about: 'Healthy, chic-casual café for coffee, smoothies and açaí bowls.',
      menu: [['drip', 3.50], ['espresso', 3.50], ['americano', 3.75], ['macchiato', 4.00], ['flatwhite', 4.75], ['cappuccino', 5.00], ['latte', 5.25],
             ['bschai', 6.00], ['cocoa', 5.50], ['ube', 6.75], ['pumpkincf', 6.50], ['icedlatte', 5.50], ['acai', 13.00], ['avotoast', 12.00]] },

    { id: 'saquella', brand: { bg: '#7D1A24', fg: '#FFFFFF', mono: 'SQ' }, tag: 'Italian café, family roaster since 1856',
      name: 'Saquella Café', address: '410 Via De Palmas, Royal Palm Place', lat: 26.346229, lng: -80.085299,
      hours: '7 AM – 9 PM', pattern: 'evening', traffic: 1.4, featureDay: 4, pickup: ['store'], shot: 1.25, syrup: 0.75, signature: 'cappuccino',
      about: 'Italian café pouring Saquella, roasted by the family in Pescara since 1856. Pastries baked daily.',
      menu: [['espresso', 3.00], ['macchiato', 3.50], ['cappuccino', 4.75], ['latte', 5.00], ['affogato', 6.50],
             ['espcookie', 3.50], ['berrycroissant', 4.75], ['plumalmond', 4.95], ['croissant', 3.75], ['cannoli', 4.50], ['fruittart', 6.50], ['tiramisu', 8.00]] },

    { id: 'third', brand: { bg: '#4B3F72', fg: '#FFFFFF', mono: '3P' }, tag: 'Lounge seats, good for working',
      name: 'Third Place Coffee Lounge', address: '325 NE Spanish River Blvd', lat: 26.3868415, lng: -80.0804472,
      hours: '6:30 AM – 7 PM', pattern: 'breakfast', traffic: 0.96, featureDay: 5, pickup: ['store', 'curbside'], shot: 1.50, syrup: 0.75, signature: 'honeylav',
      about: 'Lounge seating, long tables and seasonal drinks. Menu and prices from the shop\'s website.',
      menu: [['honeylav', 6.25], ['rosecard', 6.25], ['espresso', 3.75], ['macchiato', 4.00], ['cortado', 4.25], ['cappuccino', 4.50], ['flatwhite', 4.75],
             ['americano', 4.00], ['latte', 5.25], ['drip', 3.75], ['aulait', 4.00], ['pourover', 5.50], ['hotchoc', 4.00],
             ['coldbrew', 5.00], ['cblemonade', 5.50], ['nitro', 5.50], ['yuzucb', 6.50], ['strawmatcha', 6.75],
             ['chai', 4.75], ['matcha', 4.75], ['londonfog', 4.75], ['obchai', 5.75], ['hottea', 3.00], ['icedtea', 3.50], ['cider', 4.00],
             ['strawog', 11.00], ['chocbanana', 12.50], ['croissant', 4.00]] },

    { id: 'mane', brand: { bg: '#E0A526', fg: '#000000', mono: 'M' }, tag: 'Food & Wine best coffee shop pick',
      name: 'Mane Coffee', address: '500 NE Spanish River Blvd, Ste 7', lat: 26.3854727, lng: -80.077721,
      hours: '8 AM – 5 PM', week: ['9 AM – 2 PM', '8 AM – 5 PM', '8 AM – 5 PM', '8 AM – 5 PM', '8 AM – 5 PM', '8 AM – 5 PM', '8 AM – 5 PM'], pattern: 'breakfast', traffic: 0.98, featureDay: 6, pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'nitro',
      about: 'Named one of America\'s best coffee shops by Food & Wine. Fresh bread and brunch too.',
      menu: [['espresso', 3.50], ['macchiato', 4.00], ['cortado', 4.25], ['cappuccino', 4.50], ['latte', 5.00], ['drip', 3.50], ['nitro', 5.50],
             ['icedlatte', 5.25], ['chai', 4.50], ['matcha', 5.00], ['lemonade', 5.00], ['avotoast', 12.00], ['croissant', 4.25]] },

    { id: 'louis', brand: { bg: '#3B2A1A', fg: '#E9C46A', mono: 'CL' }, tag: 'Espresso lounge and designer consignment',
      name: 'Cafe Louis', address: '3581 N Federal Hwy', lat: 26.3825195, lng: -80.0769894,
      hours: '7 AM – 7 PM', pattern: 'commuter', traffic: 0.85, featureDay: 0, pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'lavacup',
      about: 'Espresso lounge and designer consignment shop on Federal Hwy.',
      menu: [['lavacup', 7.50], ['espresso', 3.50], ['macchiato', 4.00], ['cortado', 4.50], ['cappuccino', 5.00], ['latte', 5.50], ['americano', 4.00],
             ['icedlatte', 5.75], ['coldbrew', 5.00], ['bgaffogato', 8.50], ['quiche', 8.95], ['croissant', 4.25], ['choccroissant', 4.75]] },

    { id: 'carmela', brand: { bg: '#0E6464', fg: '#FFFFFF', mono: 'C' }, tag: 'Grows its own beans in Costa Rica',
      name: 'Carmela Coffee at BRiC', address: '4800 T-Rex Ave, Ste 150', lat: 26.3901452, lng: -80.1077121,
      hours: '7 AM – 4 PM', pattern: 'office', traffic: 0.81, featureDay: 1, pickup: ['store', 'curbside'], shot: 1.00, syrup: 0.75, signature: 'carmacch',
      about: 'Boca-born roaster growing its own beans in Costa Rica. Inside the Boca Raton Innovation Campus.',
      menu: [['drip', 3.25], ['latte', 5.00], ['cappuccino', 4.75], ['carmacch', 5.75], ['pumpkinlatte', 6.25], ['icedcoffee', 3.95], ['icedlatte', 5.25],
             ['matcha', 5.75], ['chai', 5.25], ['avotoast', 12.50], ['croissant', 4.00]] },

    { id: 'lpp', brand: { bg: '#1E3A8A', fg: '#FFFFFF', mono: 'LPP' }, tag: 'French bakery, croissants all morning',
      name: 'LPP Bakery Café', address: '1 Town Center Rd, Ste 102', lat: 26.3619477, lng: -80.127561,
      hours: '7:30 AM – 4 PM', week: [null, '7:30 AM – 4 PM', '7:30 AM – 4 PM', '7:30 AM – 4 PM', '7:30 AM – 4 PM', '7:30 AM – 4 PM', null], pattern: 'mall', traffic: 0.65, featureDay: 3, pickup: ['store'], shot: 1.00, syrup: 0.75, signature: 'almondcroissant',
      about: 'Le Petit Poussin. A French bakery run by a French couple, croissants all morning.',
      menu: [['espresso', 3.00], ['cappuccino', 4.75], ['latte', 5.00], ['americano', 3.75], ['icedlatte', 5.25],
             ['croissant', 3.75], ['choccroissant', 4.25], ['almondcroissant', 4.75], ['macaron', 7.50], ['crepe', 11.00], ['baguette', 12.50]] },

    { id: 'pots', brand: { bg: '#2E5E3A', fg: '#FFFFFF', mono: 'P' }, tag: 'Café inside a plant shop',
      name: 'The Pots Cafe', address: '6000 Glades Rd, Town Center', lat: 26.3660454, lng: -80.1348276,
      hours: '10 AM – 5 PM', week: ['11 AM – 7 PM', '10 AM – 5 PM', '10 AM – 5 PM', '10 AM – 5 PM', '10 AM – 5 PM', '10 AM – 8 PM', '10 AM – 8 PM'], pattern: 'mall', traffic: 0.78, featureDay: 6, pickup: ['store'], shot: 1.00, syrup: 0.75, signature: 'cinnamonlatte',
      about: 'A plant shop and café in one, inspired by Costa Rica.',
      menu: [['espresso', 3.50], ['cappuccino', 5.00], ['latte', 5.25], ['cinnamonlatte', 6.00], ['matcha', 6.00], ['mintlemonade', 5.50],
             ['empanada', 5.00], ['dubaicookie', 5.50], ['avotoast', 14.00], ['caprese', 13.50]] }
  ]
};
