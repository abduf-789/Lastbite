/* ============================================================
   LASTBITE — app.js
   Injects the shared header, footer, mobile nav, cart drawer,
   and toast system. Include this on every page after data.js.
   Set <body data-page="explore"> to highlight the active tab.
============================================================ */
(function () {
  const page = document.body.dataset.page || "";

  const NAV_LINKS = [
    { href:"explore.html", label:"Explore", key:"explore" },
    { href:"donate.html", label:"Donate", key:"donate" },
    { href:"impact.html", label:"Impact", key:"impact" },
    { href:"join.html", label:"Work & Volunteer", key:"join" },
    { href:"staff.html", label:"Sell on LastBite", key:"staff" },
  ];

  const BOTTOM_LINKS = [
    { href:"explore.html", label:"Home", icon:"🏠", key:"explore" },
    { href:"explore.html#rescue", label:"Rescue", icon:"🍽️", key:"rescue" },
    { href:"profile.html#orders", label:"Orders", icon:"🧾", key:"orders" },
    { href:"donate.html", label:"Donate", icon:"❤️", key:"donate" },
    { href:"profile.html", label:"Profile", icon:"👤", key:"profile" },
  ];

  function renderHeader(){
    const host = document.getElementById("site-header");
    if (!host) return;
    const user = LB.api.getUser();
    host.innerHTML = `
      <header class="site-header">
        <div class="wrap nav">
          <a href="index.html" class="brand"><span class="brand-mark">LB</span> LastBite</a>
          <nav class="nav-links">
            ${NAV_LINKS.map(l=>`<a href="${l.href}" class="${page===l.key?"active":""}">${l.label}</a>`).join("")}
          </nav>
          <div class="nav-actions">
            <div class="mode-toggle" id="mode-toggle" title="Switch how you use LastBite">
              <button data-mode="consumer">Consumer</button>
              <button data-mode="staff">Staff</button>
            </div>
            <a href="explore.html" id="cart-open" class="cart-pill">🛒 Cart <span class="cart-count" id="cart-count">0</span></a>
            <a href="profile.html" class="btn btn-ghost btn-sm">${user.name ? user.name.split(" ")[0] : "Profile"}</a>
          </div>
          <button class="hamburger" id="hamburger" aria-label="Menu">☰</button>
        </div>
      </header>
      <ul class="bottom-nav-inner" hidden></ul>
    `;
    updateModeToggle();
    updateCartCount();

    document.getElementById("mode-toggle").addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-mode]");
      if (!btn) return;
      LB.api.setMode(btn.dataset.mode);
      updateModeToggle();
      if (btn.dataset.mode === "staff" && page !== "staff") window.location.href = "staff.html";
      if (btn.dataset.mode === "consumer" && page === "staff") window.location.href = "explore.html";
    });
    document.getElementById("cart-open").addEventListener("click", (e)=>{
      if (page === "explore"){ e.preventDefault(); document.dispatchEvent(new CustomEvent("lb:open-cart")); }
    });
    document.getElementById("hamburger").addEventListener("click", ()=>{
      const links = NAV_LINKS.map(l=>`<a href="${l.href}" style="display:block;padding:12px 0;border-bottom:1px solid var(--line)">${l.label}</a>`).join("");
      openModal(`<div class="drawer-body">${links}</div>`, "Menu");
    });
  }

  function updateModeToggle(){
    const user = LB.api.getUser();
    document.querySelectorAll("#mode-toggle button").forEach(b=>{
      b.classList.toggle("on", b.dataset.mode === user.mode);
    });
  }
  function updateCartCount(){
    const el = document.getElementById("cart-count");
    if (el) el.textContent = LB.api.cartCount();
  }

  function renderBottomNav(){
    const host = document.getElementById("bottom-nav");
    if (!host) return;
    host.innerHTML = `
      <nav class="bottom-nav">
        <ul>
          ${BOTTOM_LINKS.map(l=>`<a class="${page===l.key?"active":""}" href="${l.href}"><span class="icon">${l.icon}</span>${l.label}</a>`).join("")}
        </ul>
      </nav>`;
  }

  function renderFooter(){
    const host = document.getElementById("site-footer");
    if (!host) return;
    host.innerHTML = `
      <footer class="site-footer">
        <div class="wrap footer-grid">
          <div>
            <div class="brand" style="color:#fff;margin-bottom:10px;"><span class="brand-mark">LB</span> LastBite</div>
            <p style="max-width:280px;font-size:14px;">Every Bite Matters. A marketplace for surplus food, run so restaurants recover value, families save money, and communities get fed.</p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="explore.html">Order food</a>
            <a href="explore.html#rescue">Rescue deals</a>
            <a href="donate.html">Donate food</a>
            <a href="impact.html">Our impact</a>
          </div>
          <div>
            <h4>Get involved</h4>
            <a href="join.html#work">Delivery jobs</a>
            <a href="join.html#volunteer">Volunteer</a>
            <a href="staff.html">Sell on LastBite</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#" data-legal="terms">Terms of Service</a>
            <a href="#" data-legal="privacy">Privacy Policy</a>
            <a href="#" data-legal="safety">Food Safety Disclaimer</a>
            <a href="#" data-legal="support">Help &amp; Support</a>
          </div>
        </div>
        <div class="wrap footer-bottom">
          <span>© ${new Date().getFullYear()} LastBite. Prototype build — demo data only.</span>
          <span>Made to save a meal, save resources.</span>
        </div>
      </footer>`;
    host.querySelectorAll("[data-legal]").forEach(a=>a.addEventListener("click", (e)=>{
      e.preventDefault();
      openModal(LEGAL_TEXT[a.dataset.legal] || "Coming soon.", a.textContent);
    }));
  }

  const LEGAL_TEXT = {
    terms: "This is a prototype. In production, this page would contain LastBite's full Terms of Service covering ordering, Preventing Sell listings, donations, delivery work, and account rules.",
    privacy: "This is a prototype. In production, this page would explain what data LastBite collects (account, location, order history) and how it is used and protected.",
    safety: "Food Safety Disclaimer: Preventing Sell listings are surplus food nearing the end of their safe consumption window, sold as declared by the seller. Listings past their safe window are automatically removed from sale. LastBite does not guarantee food safety and encourages consumers to use judgment.",
    support: "Help & Support (prototype): For order issues, food issues, payment issues, delivery issues, donation issues, or to report a listing, this screen would route you to the right support flow.",
  };

  /* ---------------- toast ---------------- */
  function toast(msg){
    let host = document.getElementById("toast-host");
    if (!host){ host = document.createElement("div"); host.id = "toast-host"; document.body.appendChild(host); }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(()=>el.remove(), 3200);
  }

  /* ---------------- generic modal ---------------- */
  function openModal(html, title){
    let modal = document.getElementById("lb-modal");
    if (!modal){
      modal = document.createElement("div");
      modal.id = "lb-modal";
      modal.className = "modal";
      modal.innerHTML = `<div class="modal-card"><div class="drawer-head"><strong id="lb-modal-title"></strong><button class="icon-btn" id="lb-modal-close">✕</button></div><div id="lb-modal-body"></div></div>`;
      document.body.appendChild(modal);
      modal.querySelector("#lb-modal-close").addEventListener("click", ()=>modal.classList.remove("open"));
      modal.addEventListener("click", (e)=>{ if (e.target===modal) modal.classList.remove("open"); });
    }
    modal.querySelector("#lb-modal-title").textContent = title || "";
    modal.querySelector("#lb-modal-body").innerHTML = typeof html === "string" ? `<div style="padding:20px;line-height:1.6;">${html}</div>` : "";
    modal.classList.add("open");
  }

  document.addEventListener("lb:cart-changed", updateCartCount);
  document.addEventListener("lb:user-changed", updateModeToggle);

  window.LBUI = { toast, openModal };

  renderHeader();
  renderBottomNav();
  renderFooter();
})();
