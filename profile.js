(function () {
  const user = LB.api.getUser();
  document.getElementById("avatar").textContent = (user.name||"U").split(" ").map(w=>w[0]).slice(0,2).join("");
  document.getElementById("profile-name").textContent = user.name || "Your account";
  document.getElementById("profile-email").textContent = user.email || "";
  document.getElementById("impact-score-pill").textContent = `Impact score: ${user.impactScore||0}`;

  function switchTab(name){
    document.querySelectorAll(".tabbar button").forEach(b=>b.classList.toggle("on", b.dataset.tab===name));
    ["orders","donations","notifications","account"].forEach(t=>document.getElementById("tab-"+t).hidden = t!==name);
  }
  document.querySelectorAll(".tabbar button").forEach(btn=>btn.addEventListener("click", ()=>switchTab(btn.dataset.tab)));
  if (location.hash === "#orders") switchTab("orders");

  function timeline(stages, stageIndex){
    return `<div class="timeline">${stages.map((s,i)=>`
      <div class="tl-step ${i<stageIndex?'done':i===stageIndex?'current':''}">
        <div class="tl-dot">${i<stageIndex?'✓':i+1}</div><div class="tl-title">${s}</div>
      </div>`).join("")}</div>`;
  }

  function renderOrders(){
    const orders = LB.api.getOrders();
    const host = document.getElementById("orders-list");
    if (!orders.length){
      host.innerHTML = `<div class="empty"><div class="glyph">🧾</div><p>No orders yet — your next delicious discovery is waiting.</p><a href="explore.html" class="btn btn-primary" style="margin-top:10px;">Browse food</a></div>`;
      return;
    }
    host.innerHTML = orders.map(o=>`
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
          <div><span class="hint">${o.id}</span><h4 style="margin:2px 0;">${o.sellerName}</h4></div>
          <span class="pill ${o.status==='Delivered'?'':'amber'}">${o.status}</span>
        </div>
        <ul class="hint" style="padding-left:16px;">${o.items.map(it=>`<li>${it.qty}× ${it.name} — ₹${it.unitPrice} each</li>`).join("")}</ul>
        <div style="display:flex;justify-content:space-between;font-weight:700;"><span>Total</span><span class="mono">₹${o.total}</span></div>
        ${o.saved>0?`<p class="hint" style="color:var(--forest-700);">You saved ₹${o.saved} on this order.</p>`:""}
        ${timeline(o.stages, o.stageIndex)}
        ${o.status!=="Delivered" ? `<button class="btn btn-ghost btn-sm" data-advance-order="${o.id}">Simulate next update</button>` : ""}
      </div>`).join("");
    host.querySelectorAll("[data-advance-order]").forEach(b=>b.addEventListener("click", ()=>{ LB.api.advanceOrder(b.dataset.advanceOrder); renderOrders(); }));
  }

  function renderDonations(){
    const list = LB.api.getDonations();
    const host = document.getElementById("donations-list");
    if (!list.length){
      host.innerHTML = `<div class="empty"><div class="glyph">❤️</div><p>No donations yet.</p><a href="donate.html" class="btn btn-primary" style="margin-top:10px;">Donate food</a></div>`;
      return;
    }
    host.innerHTML = list.map(d=>`
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
          <div><span class="hint">${d.id}</span><h4 style="margin:2px 0;">${d.foodName} → ${d.orgName}</h4></div>
          <span class="pill ${d.status==='Donation completed'?'':'amber'}">${d.status}</span>
        </div>
        ${timeline(d.stages, d.stageIndex)}
        ${d.status!=="Donation completed" ? `<button class="btn btn-ghost btn-sm" data-advance-donation="${d.id}">Simulate next update</button>` : ""}
      </div>`).join("");
    host.querySelectorAll("[data-advance-donation]").forEach(b=>b.addEventListener("click", ()=>{ LB.api.advanceDonation(b.dataset.advanceDonation); renderDonations(); }));
  }

  function renderNotifications(){
    const list = LB.api.getNotifications();
    const host = document.getElementById("notifications-list");
    host.innerHTML = list.length ? list.map(n=>`
      <div class="card" style="margin-bottom:10px;${n.read?'opacity:.6;':''}">
        <div style="display:flex;justify-content:space-between;"><strong>${n.title}</strong><span class="pill gray">${n.category}</span></div>
        <p class="hint">${n.body}</p>
      </div>`).join("") : `<div class="empty"><div class="glyph">🔔</div><p>You're all caught up.</p></div>`;
  }
  document.getElementById("mark-read").addEventListener("click", ()=>{ LB.api.markAllRead(); renderNotifications(); });

  document.getElementById("acc-name").value = user.name || "";
  document.getElementById("acc-email").value = user.email || "";
  document.getElementById("acc-address").value = user.address || "";
  document.getElementById("acc-roles").textContent = (user.roles||[]).join(", ") || "Consumer";
  document.getElementById("acc-save").addEventListener("click", ()=>{
    const u = LB.api.getUser();
    LB.api.saveUser({ ...u, name:document.getElementById("acc-name").value, email:document.getElementById("acc-email").value, address:document.getElementById("acc-address").value });
    LBUI.toast("Profile updated");
    document.getElementById("profile-name").textContent = document.getElementById("acc-name").value;
  });

  renderOrders();
  renderDonations();
  renderNotifications();
})();
