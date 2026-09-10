(function () {
  const CAMPAIGNS = [
    { name:"Weekend Food Collection Drive", location:"Indiranagar Community Hall", date:"Sat, 6 Sep", volunteers:12 },
    { name:"Donation Distribution Day", location:"Sunrise Children's Home", date:"Sun, 14 Sep", volunteers:8 },
    { name:"Rescue Awareness Walk", location:"Cubbon Park", date:"Sat, 20 Sep", volunteers:20 },
  ];
  document.getElementById("campaign-list").innerHTML = CAMPAIGNS.map(c=>`
    <li style="padding:10px 0;border-bottom:1px solid var(--line);">
      <strong>${c.name}</strong><br>
      <span class="hint">${c.location} · ${c.date} · ${c.volunteers} volunteers needed</span>
    </li>`).join("");

  function switchTab(name){
    document.querySelectorAll(".tabbar button").forEach(b=>b.classList.toggle("on", b.dataset.tab===name));
    ["work","volunteer","recruiter"].forEach(t=>document.getElementById("tab-"+t).hidden = t!==name);
    if (name === "recruiter") renderRecruiter();
  }
  document.querySelectorAll(".tabbar button").forEach(btn=>btn.addEventListener("click", ()=>switchTab(btn.dataset.tab)));
  if (location.hash === "#volunteer") switchTab("volunteer");
  if (location.hash === "#work") switchTab("work");

  function statusTimeline(status){
    const stages = ["Submitted","Under Review","Verification Required","Interview/Assessment","Approved"];
    const idx = status === "Rejected" || status === "On Hold" ? -1 : stages.indexOf(status);
    if (idx === -1) return `<span class="pill tomato">${status}</span>`;
    return `<div class="timeline">${stages.map((s,i)=>`<div class="tl-step ${i<idx?'done':i===idx?'current':''}"><div class="tl-dot">${i<idx?'✓':i+1}</div><div class="tl-title">${s}</div></div>`).join("")}</div>`;
  }

  document.getElementById("work-form").addEventListener("submit", (e)=>{
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    delete fd.idDoc;
    LB.api.addApplication({ kind:"delivery", ...fd });
    e.target.reset();
    LBUI.toast("Application submitted");
    document.getElementById("work-status").innerHTML = `<div class="card"><h4>Application status</h4>${statusTimeline("Submitted")}</div>`;
  });

  document.getElementById("volunteer-form").addEventListener("submit", (e)=>{
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    LB.api.addApplication({ kind:"volunteer", ...fd, status:"Registered" });
    e.target.reset();
    LBUI.toast("You're registered as a volunteer");
    document.getElementById("volunteer-status").innerHTML = `<div class="card"><span class="pill">Registered</span><p style="margin-top:8px;">Thanks, ${fd.name.split(" ")[0]} — we'll reach out when a ${fd.campaignType.toLowerCase()} campaign near ${fd.location} needs help.</p></div>`;
  });

  function renderRecruiter(){
    const apps = LB.api.getApplications();
    const tbody = document.querySelector("#recruiter-table tbody");
    document.getElementById("recruiter-empty").hidden = apps.length>0;
    tbody.innerHTML = apps.map(a=>`
      <tr>
        <td>${a.name}</td>
        <td>${a.kind === "delivery" ? "Delivery partner" : "Volunteer"}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
        <td><span class="pill ${a.status==='Approved'?'':a.status==='Rejected'?'tomato':'amber'}">${a.status}</span></td>
        <td>
          ${a.status!=="Approved" && a.status!=="Rejected" ? `
          <button class="btn btn-ghost btn-sm" data-approve="${a.id}">Approve</button>
          <button class="btn btn-ghost btn-sm" data-reject="${a.id}">Reject</button>` : ""}
        </td>
      </tr>`).join("");
    tbody.querySelectorAll("[data-approve]").forEach(b=>b.addEventListener("click", ()=>{ LB.api.updateApplication(b.dataset.approve, {status:"Approved"}); renderRecruiter(); }));
    tbody.querySelectorAll("[data-reject]").forEach(b=>b.addEventListener("click", ()=>{ LB.api.updateApplication(b.dataset.reject, {status:"Rejected"}); renderRecruiter(); }));
  }
})();
