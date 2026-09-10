/* ============================================================
   LASTBITE — data.js
   Mock "database" + pricing engine + localStorage helpers.
   Swap LB.api.* functions for real fetch() calls to your
   backend later — every page only talks to LB.api, never to
   localStorage directly, so the swap is mechanical.
============================================================ */
window.LB = (function () {

  /* ---------------- admin-configurable pricing rules (spec #10, #11, #40) --- */
  const PRICING_CONFIG = {
    minDiscount: 0.60,
    maxDiscount: 0.70,
    unknownCategoryMin: 25,
    unknownCategoryMax: 50,
    nearbyRadiusKm: 3,
    minOrderNearby: 100,
    minOrderFar: 150,
    deliveryFeeNearby: 19,
    deliveryFeeFar: 39,
  };

  const CATEGORIES = [
    "Biryani","Chicken","Mutton","Seafood","Rice & Fried Rice","Noodles",
    "Pizza","Burgers","Sandwiches","Indian Meals","South Indian","North Indian",
    "Chinese","Desserts","Bakery","Snacks","Sweets","Beverages","Salads",
    "Event & Wedding Food","Other / Common"
  ];

  /* ---------------- seed data ---------------------------------------------- */
  const SELLERS = [
    { id:"s1", name:"Spice Route Kitchen", type:"Restaurant", rating:4.6, distanceKm:1.2, area:"Indiranagar" },
    { id:"s2", name:"Grand Palm Hotel", type:"Hotel", rating:4.4, distanceKm:4.8, area:"MG Road" },
    { id:"s3", name:"Namma Tiffin Room", type:"Restaurant", rating:4.7, distanceKm:0.9, area:"Indiranagar" },
    { id:"s4", name:"Baker's Alley", type:"Bakery", rating:4.5, distanceKm:2.1, area:"Domlur" },
    { id:"s5", name:"The Wedding Table Caterers", type:"Catering", rating:4.3, distanceKm:6.5, area:"Whitefield" },
    { id:"s6", name:"Wok & Roll", type:"Restaurant", rating:4.2, distanceKm:1.8, area:"Indiranagar" },
  ];

  function seedListings(){
    const raw = [
      { name:"Chicken Biryani", sellerId:"s1", category:"Biryani", veg:false, price:220, qty:8, hoursRemaining:3, img:img("biryani") , tags:["Bestseller"]},
      { name:"Paneer Butter Masala Combo", sellerId:"s1", category:"North Indian", veg:true, price:180, qty:5, hoursRemaining:1.5, img:img("paneer"), tags:[] },
      { name:"Banquet Surplus Mixed Meal", sellerId:"s2", category:"Event & Wedding Food", veg:false, price:350, qty:20, hoursRemaining:2, img:img("buffet"), tags:["Large batch"] },
      { name:"Filter Coffee & Idli Set", sellerId:"s3", category:"South Indian", veg:true, price:90, qty:12, hoursRemaining:4, img:img("idli"), tags:[] },
      { name:"Cheese Margherita Pizza", sellerId:"s6", category:"Pizza", veg:true, price:299, qty:4, hoursRemaining:2.5, img:img("pizza"), tags:[] },
      { name:"Assorted Cream Pastries (Box of 6)", sellerId:"s4", category:"Bakery", veg:true, price:360, qty:6, hoursRemaining:6, img:img("pastry"), tags:[] },
      { name:"Mutton Rogan Josh", sellerId:"s1", category:"Mutton", veg:false, price:340, qty:3, hoursRemaining:1, img:img("mutton"), tags:["Ending soon"] },
      { name:"Veg Hakka Noodles", sellerId:"s6", category:"Chinese", veg:true, price:150, qty:9, hoursRemaining:5, img:img("noodles"), tags:[] },
      { name:"Wedding Function Sweet Box", sellerId:"s5", category:"Sweets", veg:true, price:120, qty:30, hoursRemaining:8, img:img("sweets"), tags:["From an event"] },
      { name:"Grilled Fish Platter", sellerId:"s2", category:"Seafood", veg:false, price:410, qty:2, hoursRemaining:1.2, img:img("fish"), tags:["Ending soon"] },
      { name:"Classic Chicken Burger", sellerId:"s6", category:"Burgers", veg:false, price:160, qty:7, hoursRemaining:3.5, img:img("burger"), tags:[] },
      { name:"Curd Rice & Pickle Bowl", sellerId:"s3", category:"South Indian", veg:true, price:80, qty:14, hoursRemaining:5, img:img("curdrice"), tags:["Under ₹99"] },
    ];
    return raw.map((r,i)=>{
      const id = "L"+(i+1);
      const sellType = r.hoursRemaining <= 4 ? "preventing" : (i % 3 === 0 ? "preventing" : "normal");
      const listing = {
        id, ...r,
        sellType,
        createdAt: Date.now() - Math.floor(Math.random()*1000*60*60*20),
        safeUntil: Date.now() + r.hoursRemaining*3600*1000,
        aiVerification: { status:"verified", confidence:0.9+Math.random()*0.08 },
      };
      if (sellType === "preventing"){
        const p = calculateRescuePrice(listing);
        listing.rescuePrice = p.price;
        listing.discountPct = p.discountPct;
      }
      return listing;
    });
  }

  function img(seed){
    // Using Unsplash source-style placeholders keyed by food term.
    const map = {
      biryani:"https://images.unsplash.com/photo-1563379091339-03246963d96c?w=600&q=70&auto=format",
      paneer:"https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=70&auto=format",
      buffet:"https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=70&auto=format",
      idli:"https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&q=70&auto=format",
      pizza:"https://images.unsplash.com/photo-1548365328-9f547fb0953b?w=600&q=70&auto=format",
      pastry:"https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=600&q=70&auto=format",
      mutton:"https://images.unsplash.com/photo-1631452180539-96aca7d48617?w=600&q=70&auto=format",
      noodles:"https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=70&auto=format",
      sweets:"https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=70&auto=format",
      fish:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=70&auto=format",
      burger:"https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=70&auto=format",
      curdrice:"https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=70&auto=format",
    };
    return map[seed] || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70&auto=format";
  }

  const ORGANIZATIONS = [
    { id:"o1", name:"Sunrise Children's Home", distanceKm:2.1, address:"4th Cross, Indiranagar", accepts:["Vegetarian","Non-vegetarian"], status:"Accepting donations", verified:true },
    { id:"o2", name:"Asha Bal Ashram", distanceKm:3.4, address:"Domlur Layout", accepts:["Vegetarian"], status:"Accepting donations", verified:true },
    { id:"o3", name:"Snehalaya Care Centre", distanceKm:5.9, address:"Whitefield Main Road", accepts:["Vegetarian","Non-vegetarian"], status:"Currently full — check back later", verified:true },
    { id:"o4", name:"Prabha Community Kitchen", distanceKm:1.4, address:"CMH Road", accepts:["Vegetarian","Non-vegetarian"], status:"Accepting donations", verified:false },
  ];

  // Verified, sourced dataset — annual figures only; daily figures are
  // clearly labelled as calculated, never presented as official.
  const IMPACT_DATASET = {
    undernourishment: {
      label:"Prevalence of undernourishment in India (%)",
      unit:"% of population", source:"FAO / SOFI report (State of Food Security and Nutrition in the World)",
      methodology:"Reported annual estimate, published with a multi-year lag.",
      points:[
        {year:2001,value:20.5},{year:2005,value:21.5},{year:2010,value:18.4},
        {year:2015,value:15.7},{year:2018,value:14.8},{year:2020,value:15.3},
        {year:2022,value:16.6},{year:2024,value:13.7},
      ],
    },
    stunting: {
      label:"Stunting among children under 5 (%)",
      unit:"% of children under 5", source:"National Family Health Survey (NFHS), Govt. of India",
      methodology:"Survey rounds are conducted several years apart; intermediate years are not interpolated here.",
      points:[
        {year:2006,value:48.0},{year:2016,value:38.4},{year:2020,value:35.5},
      ],
    },
    foodGrainProduction: {
      label:"India food grain production (million tonnes)",
      unit:"million tonnes", source:"Ministry of Agriculture & Farmers Welfare, Govt. of India",
      methodology:"Official annual production estimate (4th Advance Estimates where cited).",
      points:[
        {year:2001,value:196},{year:2006,value:217},{year:2011,value:244},
        {year:2016,value:252},{year:2020,value:297},{year:2022,value:315},{year:2024,value:332},
      ],
    },
  };

  /* ---------------- pricing engine (spec #10, #11, RULE 3–5) ---------------- */
  function calculateRescuePrice(listing){
    let discount = PRICING_CONFIG.minDiscount;
    if (listing.hoursRemaining <= 2) discount = PRICING_CONFIG.maxDiscount;
    else if (listing.hoursRemaining <= 5) discount = (PRICING_CONFIG.minDiscount + PRICING_CONFIG.maxDiscount)/2;
    if (listing.qty && listing.qty > 15) discount = Math.min(PRICING_CONFIG.maxDiscount, discount + 0.02);

    let price = Math.round(listing.price * (1 - discount));

    if (listing.category === "Other / Common"){
      price = Math.min(PRICING_CONFIG.unknownCategoryMax, Math.max(PRICING_CONFIG.unknownCategoryMin, price));
    }
    price = Math.max(1, price);
    const discountPct = Math.round((1 - price/listing.price) * 100);
    return { price, discountPct, band:`${Math.round(PRICING_CONFIG.minDiscount*100)}–${Math.round(PRICING_CONFIG.maxDiscount*100)}%` };
  }

  function minOrderFor(distanceKm){
    return distanceKm <= PRICING_CONFIG.nearbyRadiusKm ? PRICING_CONFIG.minOrderNearby : PRICING_CONFIG.minOrderFar;
  }
  function deliveryFeeFor(distanceKm){
    return distanceKm <= PRICING_CONFIG.nearbyRadiusKm ? PRICING_CONFIG.deliveryFeeNearby : PRICING_CONFIG.deliveryFeeFar;
  }

  /* ---------------- storage layer (swap for a real API later) -------------- */
  const KEYS = { listings:"lb_listings", cart:"lb_cart", orders:"lb_orders", donations:"lb_donations",
                 user:"lb_user", notifications:"lb_notifications", applications:"lb_applications" };

  function read(key, fallback){
    try{ const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch(e){ return fallback; }
  }
  function write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

  function ensureSeeded(){
    if (!localStorage.getItem(KEYS.listings)) write(KEYS.listings, seedListings());
    if (!localStorage.getItem(KEYS.cart)) write(KEYS.cart, []);
    if (!localStorage.getItem(KEYS.orders)) write(KEYS.orders, []);
    if (!localStorage.getItem(KEYS.donations)) write(KEYS.donations, []);
    if (!localStorage.getItem(KEYS.applications)) write(KEYS.applications, []);
    if (!localStorage.getItem(KEYS.notifications)) write(KEYS.notifications, [
      {id:"n1", title:"Welcome to LastBite", body:"Explore rescue deals near Indiranagar and save on your first order.", category:"Account", read:false, time:Date.now()},
      {id:"n2", title:"Rescue opportunity nearby", body:"Mutton Rogan Josh at Spice Route Kitchen just dropped to a rescue price.", category:"Rescue Alerts", read:false, time:Date.now()-3600000},
    ]);
    if (!localStorage.getItem(KEYS.user)) write(KEYS.user, {
      name:"Aarav Mehta", email:"aarav@example.com", roles:["consumer"], mode:"consumer",
      impactScore:0, mealsRescued:0, donationsMade:0, address:"12, 3rd Main Road, Indiranagar, Bengaluru",
    });
  }

  const api = {
    config: PRICING_CONFIG,
    categories: CATEGORIES,
    sellers: SELLERS,
    organizations: ORGANIZATIONS,
    impactDataset: IMPACT_DATASET,
    calculateRescuePrice, minOrderFor, deliveryFeeFor,

    getListings(){ return read(KEYS.listings, []); },
    saveListings(list){ write(KEYS.listings, list); },
    addListing(listing){ const l = this.getListings(); l.unshift(listing); this.saveListings(l); return listing; },
    updateListing(id, patch){ const l = this.getListings().map(x=>x.id===id?{...x,...patch}:x); this.saveListings(l); },
    getSeller(id){ return SELLERS.find(s=>s.id===id); },

    getCart(){ return read(KEYS.cart, []); },
    saveCart(c){ write(KEYS.cart, c); document.dispatchEvent(new CustomEvent("lb:cart-changed")); },
    addToCart(listingId, qty=1){
      const cart = this.getCart();
      const existing = cart.find(c=>c.listingId===listingId);
      if (existing) existing.qty += qty; else cart.push({listingId, qty});
      this.saveCart(cart);
    },
    removeFromCart(listingId){ this.saveCart(this.getCart().filter(c=>c.listingId!==listingId)); },
    setCartQty(listingId, qty){
      let cart = this.getCart();
      if (qty <= 0) cart = cart.filter(c=>c.listingId!==listingId);
      else cart = cart.map(c=>c.listingId===listingId?{...c,qty}:c);
      this.saveCart(cart);
    },
    clearCart(){ this.saveCart([]); },
    cartCount(){ return this.getCart().reduce((n,c)=>n+c.qty,0); },

    cartDetailed(){
      const listings = this.getListings();
      return this.getCart().map(c=>{
        const listing = listings.find(l=>l.id===c.listingId);
        if (!listing) return null;
        const unitPrice = listing.sellType==="preventing" ? listing.rescuePrice : listing.price;
        return { ...c, listing, unitPrice, lineTotal: unitPrice*c.qty };
      }).filter(Boolean);
    },

    getOrders(){ return read(KEYS.orders, []); },
    createOrdersFromCart(){
      const items = this.cartDetailed();
      if (!items.length) return [];
      const bySeller = {};
      items.forEach(it=>{ (bySeller[it.listing.sellerId] = bySeller[it.listing.sellerId]||[]).push(it); });
      const stages = ["Pending","Accepted","Preparing","Ready","Delivery partner assigned","Picked up","Out for delivery","Delivered"];
      const orders = this.getOrders();
      const newOrders = Object.entries(bySeller).map(([sellerId, its], i)=>{
        const seller = this.getSeller(sellerId);
        const subtotal = its.reduce((n,x)=>n+x.lineTotal,0);
        const deliveryFee = deliveryFeeFor(seller.distanceKm);
        const saved = its.reduce((n,x)=> n + (x.listing.sellType==="preventing" ? (x.listing.price-x.listing.rescuePrice)*x.qty : 0), 0);
        return {
          id:"ORD"+(Date.now()+i).toString().slice(-8),
          sellerId, sellerName:seller.name,
          items: its.map(x=>({name:x.listing.name, qty:x.qty, unitPrice:x.unitPrice})),
          subtotal, deliveryFee, total: subtotal+deliveryFee, saved,
          status: stages[0], stageIndex:0, stages,
          placedAt: Date.now(),
        };
      });
      write(KEYS.orders, [...newOrders, ...orders]);
      this.clearCart();
      const user = this.getUser();
      const mealsRescued = newOrders.reduce((n,o)=> n + o.items.reduce((m,it)=>m+it.qty,0), 0);
      const totalSaved = newOrders.reduce((n,o)=>n+o.saved,0);
      this.saveUser({...user, mealsRescued:(user.mealsRescued||0)+mealsRescued, impactScore:(user.impactScore||0)+Math.round(totalSaved/10)+mealsRescued*2});
      return newOrders;
    },
    advanceOrder(orderId){
      const orders = this.getOrders().map(o=>{
        if (o.id!==orderId) return o;
        const next = Math.min(o.stageIndex+1, o.stages.length-1);
        return {...o, stageIndex:next, status:o.stages[next]};
      });
      write(KEYS.orders, orders);
    },

    getDonations(){ return read(KEYS.donations, []); },
    createDonation(payload){
      const stages = ["Donation requested","Searching for delivery partner","Delivery partner assigned","Pickup on the way","Food collected","On the way to organization","Delivered","Donation completed"];
      const donation = { id:"DON"+Date.now().toString().slice(-8), ...payload, stageIndex:0, stages, status:stages[0], createdAt:Date.now() };
      const list = [donation, ...this.getDonations()];
      write(KEYS.donations, list);
      const user = this.getUser();
      this.saveUser({...user, donationsMade:(user.donationsMade||0)+1, impactScore:(user.impactScore||0)+15});
      return donation;
    },
    advanceDonation(id){
      const list = this.getDonations().map(d=>{
        if (d.id!==id) return d;
        const next = Math.min(d.stageIndex+1, d.stages.length-1);
        return {...d, stageIndex:next, status:d.stages[next]};
      });
      write(KEYS.donations, list);
    },

    getApplications(){ return read(KEYS.applications, []); },
    addApplication(app){
      const list = this.getApplications();
      list.unshift({ id:"APP"+Date.now().toString().slice(-8), status:"Submitted", createdAt:Date.now(), ...app });
      write(KEYS.applications, list);
    },
    updateApplication(id, patch){
      write(KEYS.applications, this.getApplications().map(a=>a.id===id?{...a,...patch}:a));
    },

    getUser(){ return read(KEYS.user, {}); },
    saveUser(u){ write(KEYS.user, u); document.dispatchEvent(new CustomEvent("lb:user-changed")); },
    setMode(mode){ const u=this.getUser(); if(!u.roles.includes(mode)) u.roles.push(mode); u.mode=mode; this.saveUser(u); },

    getNotifications(){ return read(KEYS.notifications, []); },
    markAllRead(){ write(KEYS.notifications, this.getNotifications().map(n=>({...n,read:true}))); },
    pushNotification(n){ write(KEYS.notifications, [{id:"n"+Date.now(), time:Date.now(), read:false, ...n}, ...this.getNotifications()]); },
  };

  ensureSeeded();
  return { api };
})();
