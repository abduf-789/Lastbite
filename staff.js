(function () {
  const SELLER_ID = "s1"; // demo: logged-in staff user manages Spice Route Kitchen
  let sellType = "normal";

  document.getElementById("cat-select").innerHTML = LB.api.categories.map(c=>`<option>${c}</option>`).join("");

  /* ---------------- tabs ---------------- */
  document.querySelectorAll(".tabbar button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tabbar button").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      ["add","listings","orders"].forEach(t=>document.getElementById("tab-"+t).hidden=(t!==btn.dataset.tab));
      if (btn.dataset.tab === "listings") renderListings();
      if (btn.dataset.tab === "orders") renderOrders();
    });
  });

  /* ---------------- sell type toggle + live pricing preview ---------------- */
  const form = document.getElementById("listing-form");
  document.getElementById("selltype-seg").addEventListener("click", (e)=>{
    const b = e.target.closest("button"); if (!b) return;
    sellType = b.dataset.type;
    document.querySelectorAll("#selltype-seg button").forEach(x=>x.classList.toggle("on", x===b));
    document.getElementById("price-preview-normal").hidden = sellType !== "normal";
    document.getElementById("price-preview-rescue").hidden = sellType !== "preventing";
    updatePreview();
  });
  ["price","hoursRemaining","qty","category"].forEach(name=>{
    form.elements[name].addEventListener("input", updatePreview);
    form.elements[name].addEventListener("change", updatePreview);
  });

  function updatePreview(){
    if (sellType !== "preventing") return;
    const draft = {
      price: Number(form.elements.price.value)||0,
      hoursRemaining: Number(form.elements.hoursRemaining.value)||0,
      qty: Number(form.elements.qty.value)||0,
      category: form.elements.category.value,
    };
    const { price, discountPct } = LB.api.calculateRescuePrice(draft);
    document.getElementById("prev-original").textContent = "₹"+draft.price;
    document.getElementById("prev-discount").textContent = discountPct+"%";
    document.getElementById("prev-price").textContent = "₹"+price;
    document.getElementById("prev-saved").textContent = "₹"+(draft.price-price);
  }

  /* ---------------- publish listing ---------------- */
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const draft = {
      name: fd.get("name"), category: fd.get("category"), description: fd.get("description"),
      img: fd.get("img") || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70&auto=format",
      veg: fd.get("veg") === "true", qty: Number(fd.get("qty")), price: Number(fd.get("price")),
      hoursRemaining: Number(fd.get("hoursRemaining")), sellerId: SELLER_ID, sellType,
      createdAt: Date.now(), safeUntil: Date.now()+Number(fd.get("hoursRemaining"))*3600*1000,
      aiVerification: { status:"pending review", confidence: 0.7+Math.random()*0.25 },
      tags: [],
    };
    if (sellType === "preventing"){
      const p = LB.api.calculateRescuePrice(draft);
      draft.rescuePrice = p.price; draft.discountPct = p.discountPct;
    }
    const id = "L"+Date.now();
    LB.api.addListing({ id, ...draft });
    LBUI.toast("Listing published" + (draft.aiVerification.confidence < 0.8 ? " — image verification pending" : ""));
    form.reset();
    sellType = "normal";
    document.querySelectorAll("#selltype-seg button").forEach(x=>x.classList.toggle("on", x.dataset.type==="normal"));
    document.getElementById("price-preview-normal").hidden = false;
    document.getElementById("price-preview-rescue").hidden = true;
    renderStats();
  });

  /* ---------------- listings table ---------------- */
  function renderListings(){
    const rows = LB.api.getListings().filter(l=>l.sellerId===SELLER_ID);
    const tbody = document.querySelector("#listings-table tbody");
    tbody.innerHTML = rows.map(l=>{
      const active = l.qty>0 && l.safeUntil>Date.now();
      const verLabel = l.aiVerification.confidence < 0.8 ? "Possible mismatch — please verify" : "Verified";
      return `<tr>
        <td>${l.name}</td>
        <td>${l.sellType==="preventing"?'<span class="pill amber">Preventing</span>':'<span class="pill gray">Normal</span>'}</td>
        <td class="mono">₹${l.sellType==="preventing"?l.rescuePrice:l.price}</td>
        <td>${l.qty}</td>
        <td><span class="pill ${l.aiVerification.confidence<0.8?'tomato':'gray'}">${verLabel}</span></td>
        <td>${active?'<span class="pill">Live</span>':'<span class="pill gray">Unavailable</span>'}</td>
        <td>${active?`<button class="btn btn-ghost btn-sm" data-pause="${l.id}">Pause</button>`:""}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="7" class="hint">No listings yet — add one from the "Add a listing" tab.</td></tr>`;
    tbody.querySelectorAll("[data-pause]").forEach(b=>b.addEventListener("click", ()=>{
      LB.api.updateListing(b.dataset.pause, { qty:0 });
      renderListings(); renderStats();
    }));
  }

  /* ---------------- orders table ---------------- */
  function renderOrders(){
    const orders = LB.api.getOrders().filter(o=>o.sellerId===SELLER_ID);
    const tbody = document.querySelector("#orders-table tbody");
    document.getElementById("orders-empty").hidden = orders.length>0;
    tbody.innerHTML = orders.map(o=>`
      <tr>
        <td>${o.id}</td>
        <td>${o.items.map(it=>`${it.qty}× ${it.name}`).join(", ")}</td>
        <td class="mono">₹${o.total}</td>
        <td><span class="pill ${o.status==='Delivered'?'':'amber'}">${o.status}</span></td>
        <td>${o.status!=='Delivered'?`<button class="btn btn-ghost btn-sm" data-advance="${o.id}">Advance status</button>`:""}</td>
      </tr>`).join("");
    tbody.querySelectorAll("[data-advance]").forEach(b=>b.addEventListener("click", ()=>{
      LB.api.advanceOrder(b.dataset.advance); renderOrders(); renderStats();
    }));
  }

  /* ---------------- header stats ---------------- */
  function renderStats(){
    const listings = LB.api.getListings().filter(l=>l.sellerId===SELLER_ID);
    const orders = LB.api.getOrders().filter(o=>o.sellerId===SELLER_ID);
    document.getElementById("stat-orders").textContent = orders.length;
    document.getElementById("stat-revenue").textContent = "₹"+orders.reduce((n,o)=>n+o.total,0);
    document.getElementById("stat-rescued").textContent = orders.reduce((n,o)=>n+o.items.reduce((m,it)=>m+it.qty,0),0);
    document.getElementById("stat-listings").textContent = listings.filter(l=>l.qty>0 && l.safeUntil>Date.now()).length;
  }

  renderStats();
})();
