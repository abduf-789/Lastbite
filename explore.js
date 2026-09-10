(function () {
  const state = { category: "all", filter: "all", sort: "distance", query: "" };

  function withMeta(listing){
    const seller = LB.api.getSeller(listing.sellerId);
    return { ...listing, seller };
  }

  function getListings(){
    return LB.api.getListings().map(withMeta).filter(l=>l.qty > 0 && l.safeUntil > Date.now());
  }

  function renderChips(){
    const host = document.getElementById("category-chips");
    const cats = ["All", ...LB.api.categories];
    host.innerHTML = cats.map(c=>`<button data-cat="${c}" class="${(c==="All"&&state.category==="all")?"on":""}">${c}</button>`).join("");
    host.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-cat]");
      if (!btn) return;
      state.category = btn.dataset.cat === "All" ? "all" : btn.dataset.cat;
      [...host.children].forEach(b=>b.classList.toggle("on", b===btn));
      render();
    });
  }

  function applyFilters(list){
    let out = list;
    if (state.query){
      const q = state.query.toLowerCase();
      out = out.filter(l => l.name.toLowerCase().includes(q) || l.seller.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q));
    }
    if (state.category !== "all") out = out.filter(l=>l.category===state.category);
    if (state.filter === "preventing") out = out.filter(l=>l.sellType==="preventing");
    if (state.filter === "normal") out = out.filter(l=>l.sellType==="normal");
    if (state.filter === "veg") out = out.filter(l=>l.veg);
    if (state.filter === "under99") out = out.filter(l => (l.sellType==="preventing"?l.rescuePrice:l.price) < 99);
    if (state.filter === "ending") out = out.filter(l=>l.hoursRemaining <= 2);

    const sorters = {
      distance: (a,b)=>a.seller.distanceKm-b.seller.distanceKm,
      discount: (a,b)=>(b.discountPct||0)-(a.discountPct||0),
      price: (a,b)=>(a.sellType==="preventing"?a.rescuePrice:a.price)-(b.sellType==="preventing"?b.rescuePrice:b.price),
      rating: (a,b)=>b.seller.rating-a.seller.rating,
    };
    out = out.slice().sort(sorters[state.sort] || sorters.distance);
    return out;
  }

  function ticketCard(l){
    const isRescue = l.sellType === "preventing";
    const price = isRescue ? l.rescuePrice : l.price;
    const hrs = l.hoursRemaining;
    const timeLabel = hrs < 1 ? `${Math.round(hrs*60)}m left` : `${hrs.toFixed(1)}h left`;
    return `
    <div class="ticket" data-id="${l.id}">
      <div class="ticket-media">
        <img src="${l.img}" alt="${l.name}" loading="lazy">
        <span class="ticket-badge ${isRescue?'rescue':'normal'}">${isRescue?'Rescue Deal':'Normal Sell'}</span>
        <span class="ticket-veg ${l.veg?'':'non'}"></span>
      </div>
      <div class="ticket-body">
        <span class="ticket-seller">${l.seller.name} · ${l.seller.distanceKm} km</span>
        <span class="ticket-name">${l.name}</span>
        <div class="ticket-meta">
          <span>⭐ ${l.seller.rating}</span>
          <span>${l.category}</span>
          ${isRescue?`<span>⏳ ${timeLabel}</span>`:""}
        </div>
        <div class="perforation"></div>
        <div class="ticket-price-row">
          <div>
            ${isRescue?`<span class="price-was mono">₹${l.price}</span> `:""}
            <span class="price-now mono">₹${price}</span>
          </div>
          ${isRescue?`<span class="save-tag">${l.discountPct}% OFF</span>`:""}
        </div>
        <button class="btn btn-primary btn-sm ticket-cta" data-open="${l.id}">View &amp; add</button>
      </div>
    </div>`;
  }

  function render(){
    const all = getListings();
    const filtered = applyFilters(all);
    document.getElementById("results-title").textContent =
      state.filter === "preventing" ? "Rescue & Save" : state.filter === "normal" ? "Normal Sell" : "Popular near you";
    document.getElementById("results-count").textContent = `${filtered.length} of ${all.length} listings`;
    const grid = document.getElementById("listing-grid");
    grid.innerHTML = filtered.map(ticketCard).join("");
    document.getElementById("empty-state").hidden = filtered.length > 0;
    grid.querySelectorAll("[data-open]").forEach(btn=>{
      btn.addEventListener("click", ()=>openItem(btn.dataset.open));
    });
  }

  /* ---------------- item modal ---------------- */
  function openItem(id){
    const l = withMeta(LB.api.getListings().find(x=>x.id===id));
    const isRescue = l.sellType === "preventing";
    const price = isRescue ? l.rescuePrice : l.price;
    const body = document.getElementById("item-modal-body");
    body.innerHTML = `
      <div class="ticket-media" style="aspect-ratio:16/9;border-radius:20px 20px 0 0;"><img src="${l.img}" alt="${l.name}"></div>
      <div style="padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <span class="ticket-seller">${l.seller.name} · ${l.seller.area} · ${l.seller.distanceKm} km</span>
            <h3 style="margin:4px 0;">${l.name}</h3>
          </div>
          <button class="icon-btn" id="item-close">✕</button>
        </div>
        <div style="display:flex;gap:8px;margin:8px 0 14px;flex-wrap:wrap;">
          <span class="pill ${isRescue?'amber':'gray'}">${isRescue?'Rescue Deal · '+l.discountPct+'% off':'Normal Sell'}</span>
          <span class="pill gray">${l.veg?'Vegetarian':'Non-vegetarian'}</span>
          <span class="pill gray">${l.category}</span>
        </div>
        ${isRescue ? `<div class="calc-box" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px;">
            <div class="item"><b>₹${l.price}</b><span>Normal price</span></div>
            <div class="item"><b>₹${price}</b><span>LastBite price</span></div>
            <div class="item"><b>₹${l.price-price}</b><span>You save</span></div>
          </div>
          <p class="hint">⏳ Safe to enjoy for about ${l.hoursRemaining.toFixed(1)} more hour(s). Listings past their window are removed automatically.</p>` : `<p class="lede">Priced by the seller. Ready in ~20–30 min.</p>`}
        <div style="display:flex;align-items:center;gap:14px;margin:16px 0;">
          <label style="margin:0;">Quantity</label>
          <div class="seg" id="qty-seg">
            <button data-q="dec">−</button>
            <span id="qty-val" style="padding:8px 14px;font-weight:700;">1</span>
            <button data-q="inc">+</button>
          </div>
          <span style="margin-left:auto;font-family:var(--font-mono);font-weight:700;font-size:18px;" id="qty-total">₹${price}</span>
        </div>
        <button class="btn btn-primary btn-block" id="add-to-cart">Add to cart</button>
      </div>`;
    let qty = 1;
    body.querySelector("#item-close").addEventListener("click", closeItem);
    body.querySelector("#qty-seg").addEventListener("click", (e)=>{
      const b = e.target.closest("button"); if (!b) return;
      qty = b.dataset.q === "inc" ? Math.min(qty+1, l.qty) : Math.max(1, qty-1);
      body.querySelector("#qty-val").textContent = qty;
      body.querySelector("#qty-total").textContent = "₹"+(price*qty);
    });
    body.querySelector("#add-to-cart").addEventListener("click", ()=>{
      LB.api.addToCart(l.id, qty);
      LBUI.toast(`Added ${qty} × ${l.name} to cart`);
      closeItem();
    });
    document.getElementById("item-overlay").classList.add("open");
    document.getElementById("item-modal").classList.add("open");
  }
  function closeItem(){
    document.getElementById("item-overlay").classList.remove("open");
    document.getElementById("item-modal").classList.remove("open");
  }
  document.getElementById("item-overlay").addEventListener("click", closeItem);

  /* ---------------- cart drawer ---------------- */
  function renderCart(){
    const items = LB.api.cartDetailed();
    const body = document.getElementById("cart-body");
    const foot = document.getElementById("cart-foot");
    if (!items.length){
      body.innerHTML = `<div class="empty"><div class="glyph">🛒</div><p>Your cart is empty. Add a rescue deal to save on your next meal.</p></div>`;
      foot.innerHTML = `<a href="explore.html" class="btn btn-ghost btn-block">Browse deals</a>`;
      return;
    }
    const bySeller = {};
    items.forEach(it=>{ (bySeller[it.listing.sellerId] = bySeller[it.listing.sellerId]||[]).push(it); });

    let grandTotal = 0, blockers = [];
    let html = "";
    Object.entries(bySeller).forEach(([sellerId, its])=>{
      const seller = LB.api.getSeller(sellerId);
      const subtotal = its.reduce((n,x)=>n+x.lineTotal,0);
      const minOrder = LB.api.minOrderFor(seller.distanceKm);
      const deliveryFee = LB.api.deliveryFeeFor(seller.distanceKm);
      const short = Math.max(0, minOrder - subtotal);
      if (short > 0) blockers.push(`Add ₹${short} more from ${seller.name} to complete your order.`);
      grandTotal += subtotal + (short>0?0:deliveryFee);
      html += `<div style="margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:8px;">
          <span>${seller.name}</span><span class="hint">${seller.distanceKm} km</span>
        </div>
        ${its.map(it=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">
            <div>
              <div style="font-size:14px;">${it.listing.name}</div>
              <div class="hint">₹${it.unitPrice} × ${it.qty}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="seg"><button data-dec="${it.listingId}">−</button><span style="padding:6px 10px;">${it.qty}</span><button data-inc="${it.listingId}">+</button></div>
              <button class="icon-btn" data-remove="${it.listingId}">✕</button>
            </div>
          </div>`).join("")}
        <div class="hint" style="display:flex;justify-content:space-between;margin-top:6px;">
          <span>Subtotal</span><span class="mono">₹${subtotal}</span>
        </div>
        ${short>0
          ? `<div class="pill tomato" style="margin-top:8px;">Add ₹${short} more to unlock checkout</div>`
          : `<div class="hint" style="display:flex;justify-content:space-between;"><span>Delivery fee</span><span class="mono">₹${deliveryFee}</span></div>`}
      </div><hr class="divider">`;
    });
    body.innerHTML = html;
    body.querySelectorAll("[data-inc]").forEach(b=>b.addEventListener("click", ()=>{
      const it = items.find(x=>x.listingId===b.dataset.inc);
      LB.api.setCartQty(b.dataset.inc, it.qty+1); renderCart();
    }));
    body.querySelectorAll("[data-dec]").forEach(b=>b.addEventListener("click", ()=>{
      const it = items.find(x=>x.listingId===b.dataset.dec);
      LB.api.setCartQty(b.dataset.dec, it.qty-1); renderCart();
    }));
    body.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click", ()=>{
      LB.api.removeFromCart(b.dataset.remove); renderCart();
    }));

    const canCheckout = blockers.length === 0;
    foot.innerHTML = `
      ${blockers.length ? `<p class="hint" style="color:var(--tomato-ink);margin-bottom:10px;">${blockers[0]}</p>` : ""}
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:12px;">
        <span>Total</span><span class="mono">₹${grandTotal}</span>
      </div>
      <button class="btn btn-primary btn-block" id="checkout-btn" ${canCheckout?"":"disabled"}>Checkout</button>`;
    const cbtn = document.getElementById("checkout-btn");
    if (cbtn) cbtn.addEventListener("click", checkout);
  }

  function checkout(){
    const orders = LB.api.createOrdersFromCart();
    if (!orders.length) return;
    closeCart();
    const savedTotal = orders.reduce((n,o)=>n+o.saved,0);
    LBUI.openModal(`
      <div style="text-align:center;">
        <div style="font-size:40px;">✅</div>
        <h3>Order placed!</h3>
        <p>${orders.length} seller${orders.length>1?'s are':' is'} preparing your food${savedTotal>0?` — you saved ₹${savedTotal} on this order.`:"."}</p>
        <a href="profile.html#orders" class="btn btn-primary btn-block" style="margin-top:10px;">Track my orders</a>
      </div>`, "You're all set");
  }

  function openCart(){ renderCart(); document.getElementById("cart-overlay").classList.add("open"); document.getElementById("cart-drawer").classList.add("open"); }
  function closeCart(){ document.getElementById("cart-overlay").classList.remove("open"); document.getElementById("cart-drawer").classList.remove("open"); }
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-overlay").addEventListener("click", closeCart);
  document.addEventListener("lb:open-cart", openCart);

  /* ---------------- filter/search/sort wiring ---------------- */
  document.querySelectorAll(".filter-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      state.filter = btn.dataset.filter;
      render();
    });
  });
  document.getElementById("sort-select").addEventListener("change", (e)=>{ state.sort = e.target.value; render(); });
  document.getElementById("search-input").addEventListener("input", (e)=>{ state.query = e.target.value; render(); });

  renderChips();
  render();

  if (location.hash === "#rescue"){
    document.querySelector('[data-filter="preventing"]').click();
  }
})();
