const initialState = () => ({
  view: "capture",
  coreCount: 18,
  targetCores: 25,
  sampleId: "CASE07-000184",
  online: true,
  queued: 0,
  gnss: "good",
  manualContext: false,
  context: {
    farm: "Green Estate",
    area: "East Meadow",
    zone: "Zone 3"
  },
  tray: ["empty", "empty", "filled", "empty", "absent", "empty", "filled", "empty", "attention", "empty"],
  commissionStage: 0,
  commissionRunning: false,
  commissionedPod: null,
  issueCount: 0,
  recordSynced: false,
  records: [
    {
      id: "CASE07-000183",
      farm: "Green Estate",
      area: "South Field",
      zone: "Zone 2",
      cores: 25,
      pod: "POD-0179",
      mass: "438 g",
      status: "synced",
      serverLink: "Matched by server · JOB-142"
    }
  ]
});

let state = initialState();
let toastTimer;
let commissionTimer;

const viewHost = document.querySelector("#view-host");
const contextModal = document.querySelector("#context-modal");

const gnssConfig = {
  good: { label: "Good ±3 m", tone: "green", detail: "Automatic polygon match", accuracy: "±3 m" },
  degraded: { label: "Degraded ±8 m", tone: "amber", detail: "Holding confirmed context", accuracy: "±8 m" },
  ambiguous: { label: "Ambiguous", tone: "amber", detail: "Boundary overlap · manual choice", accuracy: "±5 m" },
  unavailable: { label: "Unavailable", tone: "red", detail: "Manual context required", accuracy: "No fix" }
};

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function updateChrome() {
  const contextText = `${state.context.farm} · ${state.context.area} · ${state.context.zone}`;
  document.querySelector("#context-label").textContent = contextText;
  document.querySelector("#context-mode").textContent = state.manualContext ? "Manual context" : "Auto GNSS";
  document.querySelector("#gnss-summary").textContent = gnssConfig[state.gnss].label;
  document.querySelector("#footer-location").textContent = `51.20184, -1.42176 · ${state.context.area}`;
  document.querySelector("#queue-count").textContent = state.queued;
  document.querySelector("#queue-label").textContent = state.queued ? "Waiting" : "Synced";
  document.querySelector("#connectivity-label").textContent = state.online ? "4G online" : "Offline";
  document.querySelector("#connectivity-dot").className = `status-dot ${state.online ? "status-dot--online" : "status-dot--offline"}`;
  document.querySelector("#footer-sync").textContent = state.online
    ? state.queued ? `${state.queued} records waiting` : "Last sync just now"
    : `${state.queued} records stored locally`;
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
}

function queueLocalRecord(amount = 1) {
  if (!state.online) state.queued += amount;
}

function mapSvg() {
  const points = [
    [236, 204], [252, 190], [275, 211], [298, 178], [324, 195], [346, 166], [370, 188], [392, 158],
    [416, 177], [438, 149], [462, 168], [482, 139], [505, 159], [530, 133], [548, 157], [570, 184],
    [535, 205], [500, 220], [460, 205], [423, 226], [386, 211], [350, 232], [312, 214], [276, 239], [244, 226]
  ];
  const activePoints = points.slice(0, state.coreCount).map((point, index) => {
    const latest = index === state.coreCount - 1 ? " latest" : "";
    return `<circle class="sample-point${latest}" cx="${point[0]}" cy="${point[1]}" r="4.2" />`;
  }).join("");

  return `
    <svg viewBox="0 0 720 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Offline map of Green Estate with field and zone boundaries">
      <rect width="720" height="360" fill="#dfe7d9" />
      <path d="M0 66 C95 40 134 89 222 61 S383 42 481 74 S632 61 720 31" fill="none" stroke="#f7f8f4" stroke-width="15" />
      <path d="M0 74 C95 48 134 97 222 69 S383 50 481 82 S632 69 720 39" fill="none" stroke="#c9d1ca" stroke-width="1" />
      <path d="M74 20 C99 108 72 194 119 360" fill="none" stroke="#f6f7f4" stroke-width="9" />
      <path d="M78 20 C103 108 76 194 123 360" fill="none" stroke="#c8d0c9" stroke-width="1" />
      <path d="M160 101 L603 87 L650 302 L185 324 Z" fill="#bad59f" stroke="#16483a" stroke-width="5" />
      <path d="M160 101 L359 94 L342 319 L185 324 Z" fill="#cfe2ba" stroke="#6d9851" stroke-width="2" />
      <path d="M359 94 L603 87 L622 175 L350 185 Z" fill="#dbe8c8" stroke="#6d9851" stroke-width="2" />
      <path d="M350 185 L622 175 L650 302 L342 319 Z" fill="#f1d997" stroke="#d29929" stroke-width="4" />
      <text x="204" y="139" fill="#315f42" font-size="13" font-weight="800">EAST MEADOW</text>
      <text x="390" y="125" fill="#4c6b51" font-size="11" font-weight="800">ZONE 2</text>
      <text x="533" y="278" fill="#845d19" font-size="12" font-weight="900">ZONE 3</text>
      <path d="M220 301 C310 280 348 302 435 275 S548 238 626 258" fill="none" stroke="#f7f7f2" stroke-width="8" stroke-dasharray="10 5" />
      <circle class="position-ring" cx="426" cy="192" r="23" />
      <circle class="position-dot" cx="426" cy="192" r="7" />
      ${activePoints}
    </svg>`;
}

function mapPanel(large = false) {
  const gnss = gnssConfig[state.gnss];
  return `
    <div class="map-card ${large ? "map-card--large" : ""}">
      <div class="map-canvas">${mapSvg()}</div>
      <div class="map-overlay">
        <div class="map-overlay__card">
          <small>${state.manualContext ? "Manual context" : "Automatic location context"}</small>
          <strong>${state.context.farm} · ${state.context.area}<br>${state.context.zone}</strong>
          <div class="map-key"><span><i></i> Farm / field</span><span><i class="zone"></i> Active zone</span></div>
        </div>
      </div>
      <div class="accuracy-card"><small>GNSS state</small><strong>${gnss.label}</strong><small>${gnss.detail}</small></div>
      <div class="map-controls"><button type="button" data-action="recenter" aria-label="Recenter map">⌖</button><button type="button" data-action="zoom-in" aria-label="Zoom in">+</button><button type="button" data-action="zoom-out" aria-label="Zoom out">−</button></div>
      <span class="osm-attribution">© OpenStreetMap contributors · offline farm pack</span>
    </div>`;
}

function coreDots() {
  return Array.from({ length: state.targetCores }, (_, index) => {
    const complete = index < state.coreCount ? " is-complete" : "";
    const latest = index === state.coreCount - 1 ? " is-latest" : "";
    return `<span class="core-dot${complete}${latest}">${index + 1}</span>`;
  }).join("");
}

function captureView() {
  const progress = Math.round((state.coreCount / state.targetCores) * 100);
  const isReady = state.coreCount >= state.targetCores;
  const queueStatus = state.online ? "Saved locally + synced" : "Saved locally · sync later";
  return `
    <div class="view-header">
      <div><span class="eyebrow">Composite sample · offline capable</span><h1>${isReady ? "Sample ready to commission" : "Collect cores across Zone 3"}</h1><p>Each valid sampling-switch trigger is recorded immediately with time, position and confirmed geography.</p></div>
      <div class="view-actions"><button class="secondary-button" type="button" data-action="report-issue">Report issue</button><button class="primary-button" type="button" data-action="open-tray" ${isReady ? "" : "disabled"}>Use position 11</button></div>
    </div>
    <div class="capture-layout">
      <div class="panel sample-card">
        <div class="sample-progress">
          <div class="core-ring" style="--progress:${progress}"><div class="core-ring__value"><strong>${state.coreCount}</strong><small>of ${state.targetCores} cores</small></div></div>
          <strong>${isReady ? "Coverage target reached" : `${state.targetCores - state.coreCount} cores remaining`}</strong>
          <small>${queueStatus}</small>
          <div class="sample-actions"><button class="trigger-button" type="button" data-action="add-core" ${isReady ? "disabled" : ""}>＋ Simulate trigger</button><button class="ghost-light-button" type="button" data-action="fill-cores" ${isReady ? "disabled" : ""}>Complete to 25</button></div>
        </div>
        <div class="sample-detail">
          <div class="sample-id-row"><div><small>Local sample ID</small><strong>${state.sampleId}</strong></div><span class="status-pill ${state.online ? "green" : "amber"}">${state.online ? "Synchronised" : "Offline record"}</span></div>
          <div class="detail-grid">
            <div class="detail-tile"><small>Active zone</small><strong>${state.context.zone}</strong></div>
            <div class="detail-tile"><small>Context source</small><strong>${state.manualContext ? "Operator selected" : "GNSS assigned"}</strong></div>
            <div class="detail-tile"><small>Position quality</small><strong class="good">${gnssConfig[state.gnss].accuracy}</strong></div>
            <div class="detail-tile"><small>Required method</small><strong>W-pattern coverage</strong></div>
          </div>
          <div class="context-lock is-locked">▣ Context locked after first core · geometry GE-EM-Z3-r4 · explicit override remains available</div>
          <div class="capture-timeline"><div class="capture-timeline__head"><span>Sampling events</span><span>${state.coreCount} immutable local records</span></div><div class="core-dots">${coreDots()}</div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel__header"><div><h2>Latest local activity</h2><p>Stored on CASE07 before any cloud sync</p></div><span class="status-pill ${state.online ? "green" : "amber"}">${state.online ? "Current" : "Offline"}</span></div>
        <div class="panel__body mini-list">
          <div class="mini-row"><span class="mini-row__icon">${state.coreCount}</span><div><strong>Core ${state.coreCount} captured</strong><small>GNSS · ${state.context.zone} · ${gnssConfig[state.gnss].accuracy}</small></div><time>10:42:18</time></div>
          <div class="mini-row"><span class="mini-row__icon">⌖</span><div><strong>Context confirmed</strong><small>${state.manualContext ? "Operator-selected location" : "3 stable fixes · automatic match"}</small></div><time>10:42:15</time></div>
          <div class="mini-row"><span class="mini-row__icon">ID</span><div><strong>${state.sampleId}</strong><small>Reserved from persistent local sequence</small></div><time>10:31</time></div>
          ${state.issueCount ? `<div class="mini-row"><span class="mini-row__icon">!</span><div><strong>Field issue recorded</strong><small>Note and evidence saved locally</small></div><time>10:39</time></div>` : ""}
        </div>
      </div>
      <div class="panel" style="grid-column:1 / -1">${mapPanel(false)}</div>
    </div>`;
}

function mapView() {
  return `
    <div class="view-header">
      <div><span class="eyebrow">Locally cached map · north up</span><h1>Confirm sampling context</h1><p>Normal sampling follows GNSS automatically. Use manual context only when the position is degraded, unavailable or ambiguous.</p></div>
      <div class="view-actions"><button class="secondary-button" type="button" data-action="simulate-ambiguous">Simulate boundary ambiguity</button><button class="primary-button" type="button" data-action="change-context">Change context</button></div>
    </div>
    <div class="panel">${mapPanel(true)}</div>
    <div class="case-info">
      <div><small>Farm pack revision</small><strong>GE-2026.09.06-r4</strong></div>
      <div><small>Downloaded</small><strong>6 Sep · 18.2 MB</strong></div>
      <div><small>Map range</small><strong>Farm + 2 km margin</strong></div>
      <div><small>Context audit</small><strong>${state.manualContext ? "Manual override active" : "GNSS automatic"}</strong></div>
    </div>`;
}

function traySlots() {
  return state.tray.map((slot, index) => {
    const labels = { empty: "Available", filled: "Filled", absent: "No pod", attention: "Check" };
    return `<button class="tray-slot" type="button" data-slot="${index}" data-state="${slot}" aria-label="Tray position ${index + 1}, ${labels[slot]}"><span>${index + 1}</span><small>${labels[slot]}</small></button>`;
  }).join("");
}

function commissionSteps() {
  const steps = ["Detect", "RFID", "QR", "Weight"];
  return steps.map((label, index) => {
    const className = state.commissionStage > index + 1 ? "is-complete" : state.commissionStage === index + 1 ? "is-active" : "";
    const symbol = state.commissionStage > index + 1 ? "✓" : index + 1;
    return `<div class="commission-step ${className}"><span>${symbol}</span>${label}</div>`;
  }).join("");
}

function positionEleven() {
  const hasPod = state.commissionStage > 0;
  const complete = state.commissionStage >= 5;
  const returned = state.commissionStage >= 6;
  let title = "Position 11 ready";
  let description = "Place the filled pod here. Identification and weighing start automatically.";
  let action = `<button class="primary-button" type="button" data-action="start-commission">Place filled pod</button>`;

  if (state.commissionRunning) {
    title = state.commissionStage < 4 ? "Reading pod automatically" : "Waiting for stable weight";
    description = state.commissionStage < 4 ? "Keep the pod seated on position 11." : "No result is committed until the stability criterion is met.";
    action = `<button class="primary-button" type="button" disabled>Processing…</button>`;
  } else if (complete && !returned) {
    title = "Sample commissioned locally";
    description = "POD-0182 is bound to the composite sample, 25 events and confirmed geography.";
    action = `<button class="primary-button" type="button" data-action="return-pod">Return pod to tray</button>`;
  } else if (returned) {
    title = "Pod returned to position 5";
    description = "The slot is red because it contains a filled sample. The tray stores temporary state, not permanent pod identity.";
    action = `<button class="secondary-button" type="button" data-action="new-sample">Start next sample</button>`;
  }

  return `
    <div class="panel position-eleven">
      <div class="panel__header"><div><h2>Position 11</h2><p>RFID · QR · stationary weighing</p></div><span class="status-pill ${complete ? "green" : state.commissionRunning ? "amber" : "grey"}">${complete ? "Committed" : state.commissionRunning ? "Processing" : "Ready"}</span></div>
      <div class="commission-stage">
        <div class="scale-platform"><div class="pod ${hasPod ? "" : "is-empty"}">POD<br>0182</div></div>
        <h3>${title}</h3><p>${description}</p>
        <div class="commission-steps">${commissionSteps()}</div>
        ${state.commissionStage >= 4 ? `<div class="weight-readout"><div><small>${complete ? "Stable net soil mass" : "Live weight · stability check"}</small><strong>${complete ? "421 g" : "418…423 g"}</strong></div><span class="status-pill ${complete ? "green" : "amber"}">${complete ? "Stable" : "Waiting"}</span></div>` : ""}
        ${action}
      </div>
    </div>`;
}

function trayView() {
  return `
    <div class="view-header">
      <div><span class="eyebrow">Physical custody · simple operator indication</span><h1>Pod tray and commissioning</h1><p>Ten storage positions show availability by presence state. Permanent pod identity is read only at position 11.</p></div>
      <span class="status-pill ${state.coreCount >= state.targetCores ? "green" : "amber"}">${state.coreCount >= state.targetCores ? "Composite ready" : `${state.targetCores - state.coreCount} cores remaining`}</span>
    </div>
    <div class="tray-layout">
      <div class="panel tray-panel">
        <div class="tray-visual">${traySlots()}</div>
        <div class="tray-legend"><span><i style="--legend:#71bd3f"></i> Green · empty pod available</span><span><i style="--legend:#dc5149"></i> Red · filled sample</span><span><i style="--legend:#3a423f"></i> Off · no pod</span><span><i style="--legend:#eba13a"></i> Amber · operator attention</span></div>
        <p class="tray-rule"><strong>Why no identity in each slot?</strong> A low-cost presence sensor only tracks pod present/absent. RFID and QR establish the actual pod identity during the position-11 commissioning transaction.</p>
      </div>
      ${positionEleven()}
    </div>`;
}

function recordCards() {
  const active = {
    id: state.sampleId,
    farm: state.context.farm,
    area: state.context.area,
    zone: state.context.zone,
    cores: state.coreCount,
    pod: state.commissionedPod ? state.commissionedPod.id : "Not assigned",
    mass: state.commissionedPod ? "421 g" : "Pending",
    status: state.commissionedPod ? state.recordSynced ? "synced" : "queued" : "active",
    serverLink: state.recordSynced ? "Matched by server · JOB-143" : "Server work link unresolved"
  };
  const all = [active, ...state.records];
  return all.map((record) => {
    const tone = record.status === "synced" ? "green" : record.status === "queued" ? "amber" : "blue";
    const label = record.status === "synced" ? "Synchronised" : record.status === "queued" ? "Waiting to sync" : "Active capture";
    return `<article class="record-card"><div class="record-card__top"><div><small>Local sample identity</small><strong>${record.id}</strong></div><span class="status-pill ${tone}">${label}</span></div><div class="record-meta"><div><span>Context</span><b>${record.area} · ${record.zone}</b></div><div><span>Geometry revision</span><b>GE-EM-Z3-r4</b></div><div><span>Sampling events</span><b>${record.cores} cores</b></div><div><span>Physical pod</span><b>${record.pod}</b></div><div><span>Net mass</span><b>${record.mass}</b></div><div><span>Context source</span><b>${state.manualContext ? "Operator selected" : "GNSS assigned"}</b></div></div><p class="tray-rule">${record.serverLink}</p></article>`;
  }).join("");
}

function recordsView() {
  return `
    <div class="view-header"><div><span class="eyebrow">Local non-volatile storage</span><h1>Sample records</h1><p>Case-generated IDs remain globally unique offline. Each record retains the Area geometry revision used during capture.</p></div><div class="view-actions">${state.online && state.queued ? `<button class="primary-button" type="button" data-action="sync-now">Sync ${state.queued} records</button>` : ""}<button class="secondary-button" type="button" data-action="toggle-connectivity">${state.online ? "Go offline" : "Reconnect 4G"}</button></div></div>
    <div class="record-grid">${recordCards()}</div>
    <div class="audit-note" style="margin:12px 0 0"><span>i</span><p>The Smart Case does not download, display or execute jobs and orders. A captured sample remains valid even if its server-side work linkage is unresolved.</p></div>`;
}

function statusView() {
  const connection = state.online ? "4G online" : "Offline · local capture available";
  return `
    <div class="view-header"><div><span class="eyebrow">CASE07 · device health</span><h1>Smart Case status</h1><p>Clear, actionable health checks for the operator. Detailed diagnostics remain available to support teams.</p></div><div class="view-actions">${state.online && state.queued ? `<button class="primary-button" type="button" data-action="sync-now">Sync now</button>` : ""}<button class="secondary-button" type="button" data-action="toggle-connectivity">${state.online ? "Simulate signal loss" : "Restore connection"}</button></div></div>
    <div class="health-grid">
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">⚡</span><span class="health-value good">Healthy</span></div><h3>Vehicle power</h3><p>13.8 V input · protected 5.1 V and 12 V rails stable.</p></article>
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">⌖</span><span class="health-value ${state.gnss === "good" ? "good" : "warn"}">${gnssConfig[state.gnss].label}</span></div><h3>GNSS</h3><p>${gnssConfig[state.gnss].detail}. Context remains available locally.</p></article>
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">⌁</span><span class="health-value ${state.online ? "good" : "warn"}">${connection}</span></div><h3>Industrial connectivity</h3><p>RUT241-class 4G LTE and Wi-Fi router. Cloud connection is never required for capture.</p></article>
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">RF</span><span class="health-value good">Ready</span></div><h3>Position-11 RFID</h3><p>HF reader ready. Storage slots use presence sensing only.</p></article>
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">▦</span><span class="health-value good">Ready</span></div><h3>QR / 2D reader</h3><p>Automatic visible-identity fallback aligned to the pod position.</p></article>
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">kg</span><span class="health-value good">Zeroed</span></div><h3>Weighing station</h3><p>Stationary use only. Results commit after stability is confirmed.</p></article>
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">▰</span><span class="health-value good">61%</span></div><h3>Local storage</h3><p>38.7 GB free · 18 farm packs · persistent event sequence healthy.</p></article>
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">☀</span><span class="health-value good">Normal</span></div><h3>Outdoor display</h3><p>10-inch sunlight-readable display · resistive-touch field baseline · IP65 target.</p></article>
      <article class="health-card"><div class="health-card__top"><span class="health-card__icon">↻</span><span class="health-value ${state.queued ? "warn" : "good"}">${state.queued ? `${state.queued} waiting` : "Current"}</span></div><h3>Synchronisation</h3><p>${state.online ? "Reference data checked just now." : "Queued data will retry when signal returns."}</p></article>
    </div>
    <div class="case-info"><div><small>Permanent Case ID</small><strong>CASE07</strong></div><div><small>Software</small><strong>Operator Capture v0.2</strong></div><div><small>Offline maps</small><strong>18 farms · 312 MB</strong></div><div><small>Last health check</small><strong>Today · 10:42</strong></div></div>`;
}

function render() {
  const views = {
    capture: captureView,
    map: mapView,
    tray: trayView,
    records: recordsView,
    status: statusView
  };
  viewHost.innerHTML = views[state.view]();
  updateChrome();
}

function setView(view) {
  state.view = view;
  render();
  viewHost.focus({ preventScroll: true });
}

function addCore() {
  if (state.coreCount >= state.targetCores) return;
  state.coreCount += 1;
  queueLocalRecord();
  render();
  const ring = document.querySelector(".core-ring");
  if (ring) {
    ring.classList.add("pulse");
    window.setTimeout(() => ring.classList.remove("pulse"), 700);
  }
  showToast(`Core ${state.coreCount} captured locally · ${gnssConfig[state.gnss].accuracy}`);
}

function completeCores() {
  const remaining = state.targetCores - state.coreCount;
  if (remaining <= 0) return;
  state.coreCount = state.targetCores;
  queueLocalRecord(remaining);
  render();
  showToast("25-core target reached · composite ready for position 11");
}

function startCommissioning() {
  if (state.commissionRunning || state.commissionStage >= 5) return;
  if (state.coreCount < state.targetCores) completeCores();
  state.view = "tray";
  state.commissionRunning = true;
  state.commissionStage = 1;
  render();
  showToast("Filled pod detected on position 11");
  window.clearInterval(commissionTimer);
  commissionTimer = window.setInterval(() => {
    state.commissionStage += 1;
    if (state.commissionStage >= 5) {
      window.clearInterval(commissionTimer);
      state.commissionRunning = false;
      state.commissionedPod = { id: "POD-0182", mass: 421 };
      state.recordSynced = state.online;
      queueLocalRecord(4);
      showToast(state.online ? "Sample commissioned and synchronised" : "Sample commissioned safely offline");
    }
    render();
  }, 850);
}

function returnPod() {
  const destination = state.tray.findIndex((slot) => slot === "absent");
  const slot = destination >= 0 ? destination : state.tray.findIndex((slot) => slot === "empty");
  if (slot >= 0) state.tray[slot] = "filled";
  state.commissionStage = 6;
  render();
  showToast(`Filled sample returned · position ${slot + 1} is now red`);
}

function newSample() {
  state.coreCount = 0;
  state.sampleId = "CASE07-000185";
  state.commissionStage = 0;
  state.commissionedPod = null;
  state.recordSynced = false;
  setView("capture");
  showToast("New local sample identity reserved · CASE07-000185");
}

function toggleConnectivity(force) {
  state.online = typeof force === "boolean" ? force : !state.online;
  render();
  showToast(state.online ? "4G restored · local records ready to synchronise" : "Signal lost · capture continues using local data");
}

function syncNow() {
  if (!state.online) {
    showToast("No connection · records remain safely queued");
    return;
  }
  const synced = state.queued;
  state.queued = 0;
  if (state.commissionedPod) state.recordSynced = true;
  render();
  showToast(`${synced || "All"} local records synchronised · server reconciliation complete`);
}

function openContextModal(gnss = state.gnss) {
  state.gnss = gnss;
  document.querySelectorAll(".gnss-choice").forEach((button) => button.classList.toggle("is-selected", button.dataset.gnss === gnss));
  document.querySelector("#farm-select").value = state.context.farm;
  document.querySelector("#area-select").value = state.context.area;
  document.querySelector("#zone-select").value = state.context.zone;
  contextModal.showModal();
}

function createIssueModal() {
  if (document.querySelector("#issue-modal")) return document.querySelector("#issue-modal");
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="modal modal--compact" id="issue-modal">
      <form method="dialog" class="modal__surface" id="issue-form">
        <header class="modal__header"><div><span class="eyebrow">Offline field evidence</span><h2>Report an issue</h2><p>The note and photo can be saved without signal.</p></div><button class="icon-button" value="cancel" aria-label="Close">×</button></header>
        <div class="reason-grid"><button class="reason-button is-selected" type="button">Access</button><button class="reason-button" type="button">Weather</button><button class="reason-button" type="button">Equipment</button><button class="reason-button" type="button">Safety</button></div>
        <label class="field-label">What happened?<textarea rows="4">Standing water at the lower gate. Sampling can continue from the north entrance.</textarea></label>
        <label class="photo-button"><input type="file" accept="image/*"><span>▧</span>Add photo evidence</label>
        <footer class="modal__actions"><button class="secondary-button" value="cancel">Cancel</button><button class="primary-button" value="confirm" type="submit">Save locally</button></footer>
      </form>
    </dialog>`);
  const modal = document.querySelector("#issue-modal");
  modal.querySelectorAll(".reason-button").forEach((button) => button.addEventListener("click", () => {
    modal.querySelectorAll(".reason-button").forEach((item) => item.classList.remove("is-selected"));
    button.classList.add("is-selected");
  }));
  modal.querySelector("#issue-form").addEventListener("submit", (event) => {
    if (event.submitter?.value !== "confirm") return;
    state.issueCount += 1;
    queueLocalRecord(2);
    render();
    showToast(state.online ? "Issue recorded and synchronised" : "Issue and evidence stored locally");
  });
  return modal;
}

document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelector("#context-button").addEventListener("click", () => openContextModal());
document.querySelector("#connectivity-button").addEventListener("click", () => toggleConnectivity());
document.querySelector("#reset-demo").addEventListener("click", () => {
  window.clearInterval(commissionTimer);
  state = initialState();
  render();
  showToast("Smart Case demo reset");
});

document.querySelectorAll(".gnss-choice").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".gnss-choice").forEach((item) => item.classList.remove("is-selected"));
  button.classList.add("is-selected");
  state.gnss = button.dataset.gnss;
}));

document.querySelector("#context-form").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  state.context = {
    farm: document.querySelector("#farm-select").value,
    area: document.querySelector("#area-select").value,
    zone: document.querySelector("#zone-select").value
  };
  state.manualContext = state.gnss !== "good";
  queueLocalRecord();
  render();
  showToast(state.manualContext ? "Manual context confirmed and audit event saved" : "Automatic GNSS context resumed");
});

viewHost.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  const actions = {
    "add-core": addCore,
    "fill-cores": completeCores,
    "open-tray": () => setView("tray"),
    "report-issue": () => createIssueModal().showModal(),
    "change-context": () => openContextModal(),
    "simulate-ambiguous": () => openContextModal("ambiguous"),
    "recenter": () => showToast("Map recentered · north-up follow mode"),
    "zoom-in": () => showToast("Zoomed in · offline map remains available"),
    "zoom-out": () => showToast("Zoomed out · farm pack includes a 2 km margin"),
    "start-commission": startCommissioning,
    "return-pod": returnPod,
    "new-sample": newSample,
    "sync-now": syncNow,
    "toggle-connectivity": () => toggleConnectivity()
  };
  actions[action]?.();
});

document.querySelectorAll("[data-demo-step]").forEach((button) => button.addEventListener("click", () => {
  const step = button.dataset.demoStep;
  if (step === "capture") {
    state.view = "capture";
    completeCores();
  }
  if (step === "commission") startCommissioning();
  if (step === "offline") {
    state.view = "capture";
    toggleConnectivity(false);
  }
  if (step === "sync") {
    state.view = "records";
    state.online = true;
    syncNow();
  }
}));

render();
