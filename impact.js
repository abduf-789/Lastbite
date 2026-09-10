(function () {
  /* ---------------- LastBite's own stats, from local demo data ---------------- */
  const orders = LB.api.getOrders();
  const donations = LB.api.getDonations();
  const mealsRescued = orders.reduce((n,o)=>n+o.items.reduce((m,it)=>m+it.qty,0), 0);
  const totalSaved = orders.reduce((n,o)=>n+o.saved, 0);
  document.getElementById("lastbite-stats").innerHTML = `
    <div class="stat"><b>${mealsRescued}</b><span>Meals rescued (this session)</span></div>
    <div class="stat"><b>₹${totalSaved}</b><span>Saved by consumers (this session)</span></div>
    <div class="stat"><b>${donations.length}</b><span>Donations made (this session)</span></div>
    <div class="stat"><b>${LB.api.getUser().impactScore||0}</b><span>Your impact score</span></div>
  `;

  /* ---------------- calculator ---------------- */
  const range = document.getElementById("calc-range");
  function updateCalc(){
    const n = Number(range.value);
    document.getElementById("calc-value").textContent = n.toLocaleString();
    document.getElementById("calc-food").textContent = (n*0.35).toFixed(0)+" kg";
    document.getElementById("calc-saved").textContent = "₹"+(n*65).toLocaleString();
    document.getElementById("calc-recovered").textContent = "₹"+(n*100).toLocaleString();
    document.getElementById("calc-donations").textContent = Math.round(n*0.15).toLocaleString()+" meals";
  }
  range.addEventListener("input", updateCalc);
  updateCalc();

  /* ---------------- charts ---------------- */
  const host = document.getElementById("chart-blocks");
  const sources = [];
  Object.entries(LB.api.impactDataset).forEach(([key, d], i)=>{
    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.style.marginBottom = "20px";
    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <h4 style="margin:0;">${d.label}</h4>
        <span class="pill gray">Reported figures</span>
      </div>
      <canvas id="chart-${key}" height="90"></canvas>
      <p class="hint">Unit: ${d.unit} · Source: ${d.source}</p>
      <p class="hint">Methodology: ${d.methodology}</p>
    `;
    host.appendChild(wrap);
    sources.push(d.source);
    new Chart(wrap.querySelector("canvas"), {
      type: key === "foodGrainProduction" ? "bar" : "line",
      data: {
        labels: d.points.map(p=>p.year),
        datasets: [{
          label: d.label,
          data: d.points.map(p=>p.value),
          borderColor: "#1B7A5C",
          backgroundColor: key === "foodGrainProduction" ? "#E4F3EC" : "rgba(27,122,92,.12)",
          fill: key !== "foodGrainProduction",
          tension: 0.3,
          pointRadius: 4,
        }]
      },
      options: {
        plugins: { legend: { display:false } },
        scales: { y: { beginAtZero:false } },
        responsive:true,
      }
    });
  });

  document.getElementById("source-list").innerHTML = [...new Set(sources)].map(s=>`<li>${s}</li>`).join("");
})();
