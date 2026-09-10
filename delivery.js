(function () {
  function feeFor(job){ return 40 + Math.round((LB.api.getSeller(job.sellerId)?.distanceKm || 3) * 8); }

  function allJobs(){
    const orders = LB.api.getOrders().map(o=>({ kind:"order", id:o.id, title:`${o.items.map(i=>i.name).join(", ")}`,
      from:o.sellerName, to:"Consumer address", stageIndex:o.stageIndex, stages:o.stages, status:o.status, ref:o }));
    const donations = LB.api.getDonations().map(d=>({ kind:"donation", id:d.id, title:d.foodName || "Donated food",
      from:d.pickupAddress || "Pickup location", to:d.orgName, stageIndex:d.stageIndex, stages:d.stages, status:d.status, ref:d }));
    return [...orders, ...donations];
  }

  function isAssignable(job){
    // becomes a delivery job once picked up/assigned stage is reached, until delivered/completed
    return job.stageIndex >= 3 && job.stageIndex < job.stages.length - 1;
  }
  function isDone(job){ return job.stageIndex === job.stages.length - 1; }

  function jobCard(job){
    return `<div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span class="hint">${job.kind==="order"?"Order":"Donation"} · ${job.id}</span>
          <h4 style="margin:2px 0;">${job.title}</h4>
        </div>
        <span class="pill amber">₹${feeFor(job.ref)}</span>
      </div>
      <p class="hint">Pickup: ${job.from} → Drop-off: ${job.to}</p>
      <p style="font-weight:700;font-size:13px;color:var(--forest-700);">${job.status}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" data-nav>Navigate (mock)</button>
        <button class="btn btn-primary btn-sm" data-advance="${job.kind}:${job.id}">Update status</button>
      </div>
    </div>`;
  }

  function render(){
    const jobs = allJobs();
    const active = jobs.filter(isAssignable);
    const done = jobs.filter(isDone);

    document.getElementById("stat-active").textContent = active.length;
    document.getElementById("stat-completed").textContent = done.length;
    const earnings = done.reduce((n,j)=>n+feeFor(j.ref),0);
    document.getElementById("stat-earnings").textContent = "₹"+earnings;
    document.getElementById("week-jobs").textContent = done.length;
    document.getElementById("week-earnings").textContent = "₹"+earnings;

    const jobsHost = document.getElementById("jobs-list");
    jobsHost.innerHTML = active.length
      ? active.map(jobCard).join("")
      : `<div class="empty"><div class="glyph">🛵</div><p>No deliveries assigned right now. Place a rescue order or donation from another tab to see this dashboard in action.</p></div>`;
    jobsHost.querySelectorAll("[data-advance]").forEach(b=>b.addEventListener("click", ()=>{
      const [kind, id] = b.dataset.advance.split(":");
      if (kind==="order") LB.api.advanceOrder(id); else LB.api.advanceDonation(id);
      render();
    }));
    jobsHost.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click", ()=>LBUI.toast("Opening navigation (mock)")));

    document.getElementById("history-list").innerHTML = done.length
      ? done.map(j=>`<div class="card" style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;"><span>${j.title}</span><span class="mono">₹${feeFor(j.ref)}</span></div><p class="hint">${j.from} → ${j.to} · Completed</p></div>`).join("")
      : `<div class="empty"><div class="glyph">🧾</div><p>Completed deliveries will show up here.</p></div>`;
  }

  document.querySelectorAll(".tabbar button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tabbar button").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      ["jobs","history","earnings"].forEach(t=>document.getElementById("tab-"+t).hidden=(t!==btn.dataset.tab));
    });
  });

  render();
})();
