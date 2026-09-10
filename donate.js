(function () {
  let chosenOrg = null;

  /* ---------------- tabs ---------------- */
  document.querySelectorAll(".tabbar button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tabbar button").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      ["new","mine","about"].forEach(t=>document.getElementById("tab-"+t).hidden = (t!==btn.dataset.tab));
      if (btn.dataset.tab === "mine") renderMine();
    });
  });

  /* ---------------- category select ---------------- */
  document.getElementById("donate-category").innerHTML = LB.api.categories.map(c=>`<option>${c}</option>`).join("");

  /* ---------------- step 1: find orgs ---------------- */
  document.getElementById("find-orgs").addEventListener("click", ()=>{
    const btn = document.getElementById("find-orgs");
    btn.textContent = "Locating…";
    btn.disabled = true;
    setTimeout(()=>{
      const host = document.getElementById("step-orgs");
      host.hidden = false;
      host.innerHTML = LB.api.organizations
        .slice().sort((a,b)=>a.distanceKm-b.distanceKm)
        .map(o=>`
        <div class="card">
          <div style="display:flex;justify-content:space-between;">
            <h4 style="margin:0;">${o.name}</h4>
            ${o.verified?'<span class="pill">Verified</span>':'<span class="pill gray">Unverified</span>'}
          </div>
          <p class="hint">${o.address} · ${o.distanceKm} km away</p>
          <p class="hint">Accepts: ${o.accepts.join(", ")}</p>
          <p style="font-weight:700;font-size:13px;color:${o.status.startsWith('Accepting')?'var(--forest-700)':'var(--tomato-ink)'};">${o.status}</p>
          <button class="btn btn-primary btn-sm" data-org="${o.id}" ${o.status.startsWith('Accepting')?"":"disabled"}>Select organization</button>
        </div>`).join("");
      host.querySelectorAll("[data-org]").forEach(b=>b.addEventListener("click", ()=>selectOrg(b.dataset.org)));
      document.getElementById("step-locate").querySelector("p").textContent = "Showing organizations near your saved address.";
      btn.remove();
    }, 500);
  });

  function selectOrg(id){
    chosenOrg = LB.api.organizations.find(o=>o.id===id);
    document.getElementById("chosen-org-line").textContent = `Donating to ${chosenOrg.name} · ${chosenOrg.address}`;
    document.getElementById("step-form").hidden = false;
    document.getElementById("step-form").scrollIntoView({behavior:"smooth", block:"start"});
  }

  /* ---------------- step 2: submit form ---------------- */
  document.getElementById("donation-form").addEventListener("submit", (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    payload.orgId = chosenOrg.id;
    payload.orgName = chosenOrg.name;
    const donation = LB.api.createDonation(payload);
    document.getElementById("step-orgs").hidden = true;
    document.getElementById("step-form").hidden = true;
    renderTracking(donation.id, "step-tracking");
    document.getElementById("step-tracking").hidden = false;
    LBUI.toast("Donation request created");
  });

  /* ---------------- tracking timeline ---------------- */
  function renderTracking(id, hostId){
    const d = LB.api.getDonations().find(x=>x.id===id);
    const host = document.getElementById(hostId);
    const doneText = d.stageIndex === d.stages.length-1;
    host.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="hint">${d.id}</span>
            <h3 style="margin:2px 0;">${d.foodName} → ${d.orgName}</h3>
          </div>
          ${doneText?'<span class="pill">Completed</span>':'<span class="pill amber">In progress</span>'}
        </div>
        ${doneText ? `<div class="card-flat" style="margin:14px 0;text-align:center;">
            <div style="font-size:30px;">❤️</div>
            <p style="margin:6px 0 0;font-weight:700;">Your food created another meal today.</p>
            <p class="hint">Estimated ${d.servings || "—"} servings delivered to ${d.orgName}.</p>
          </div>` : ""}
        <div class="timeline" style="margin-top:16px;">
          ${d.stages.map((s,i)=>`
            <div class="tl-step ${i<d.stageIndex?'done':i===d.stageIndex?'current':''}">
              <div class="tl-dot">${i<d.stageIndex?'✓':i+1}</div>
              <div><div class="tl-title">${s}</div>${i===d.stageIndex?'<div class="tl-time">Current status</div>':''}</div>
            </div>`).join("")}
        </div>
        ${!doneText ? `<button class="btn btn-ghost btn-sm" data-advance="${d.id}">Simulate next update</button>` : ""}
      </div>`;
    const advBtn = host.querySelector("[data-advance]");
    if (advBtn) advBtn.addEventListener("click", ()=>{ LB.api.advanceDonation(d.id); renderTracking(id, hostId); });
  }

  /* ---------------- my donations ---------------- */
  function renderMine(){
    const list = LB.api.getDonations();
    const host = document.getElementById("mine-list");
    if (!list.length){
      host.innerHTML = `<div class="empty"><div class="glyph">❤️</div><p>You haven't made a donation yet — great news is, someone nearby would love one.</p></div>`;
      return;
    }
    host.innerHTML = list.map(d=>`<div id="mine-${d.id}" style="margin-bottom:18px;"></div>`).join("");
    list.forEach(d=>renderTracking(d.id, `mine-${d.id}`));
  }
})();
