const initialState = () => ({
  view: "sample",
  coreCount: 18,
  minimumCores: 25,
  online: true,
  queued: 0,
  manualLocation: false,
  zone: "Zone 3",
  problem: null,
  tray: ["available", "available", "filled", "available", "absent", "available"],
  sensing: "idle",
  weight: 0,
  sampleSaved: false
});

let state = initialState();
let sensingTimer;
let toastTimer;

const screenContent = document.querySelector("#screen-content");
const sensingScreen = document.querySelector("#sensing-screen");
const sensingLed = document.querySelector("#sensing-led");
const locationDialog = document.querySelector("#location-dialog");
const problemDialog = document.querySelector("#problem-dialog");

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function openPanel(panel) {
  panel.hidden = false;
}

function closePanel(panel) {
  panel.hidden = true;
}

function statusCopy() {
  if (state.sampleSaved) return {
    tone: "complete",
    eyebrow: "SAMPLE SAVED",
    title: "Return the filled pod",
    instruction: "Place it in any empty tray position. The slot will turn red automatically."
  };
  if (state.coreCount >= state.minimumCores) return {
    tone: "ready",
    eyebrow: "CORE COUNT REACHED",
    title: "Prepare the sample pod",
    instruction: "Fill one green pod, then place it on the Sensing Position."
  };
  return {
    tone: "active",
    eyebrow: "SAMPLING ACTIVE",
    title: "Continue the W-shaped route",
    instruction: "Each physical trigger is recorded automatically. No screen tap is needed."
  };
}

function mapGraphic(showRoute = true) {
  const points = [[118,230],[154,205],[193,226],[231,190],[271,213],[310,177],[349,202],[389,166],[429,190],[470,153],[508,180],[545,145],[585,170],[622,207],[579,231],[536,251],[487,229],[444,258],[398,236],[350,266],[301,241],[253,274],[205,249],[159,280],[124,257]];
  const dots = showRoute ? points.slice(0, Math.min(state.coreCount, points.length)).map((point, index) => `<circle class="route-point${index === Math.min(state.coreCount, points.length) - 1 ? " route-point--latest" : ""}" cx="${point[0]}" cy="${point[1]}" r="7" />`).join("") : "";
  return `<svg viewBox="0 0 720 360" role="img" aria-label="Offline field map showing the active sampling zone">
    <rect width="720" height="360" fill="#dce6d7" />
    <path d="M0 78 C130 34 194 98 308 58 S530 70 720 30" fill="none" stroke="#f8faf6" stroke-width="22" />
    <path d="M68 0 C100 112 76 219 121 360" fill="none" stroke="#f7f9f5" stroke-width="14" />
    <path d="M98 70 L628 60 L674 316 L132 329 Z" fill="#b8d59d" stroke="#184b3c" stroke-width="6" />
    <path d="M98 70 L352 65 L336 322 L132 329 Z" fill="#cfe3bb" stroke="#75a35b" stroke-width="3" />
    <path d="M352 65 L628 60 L647 167 L345 177 Z" fill="#d9e8c7" stroke="#75a35b" stroke-width="3" />
    <path d="M345 177 L647 167 L674 316 L336 322 Z" fill="#f1d68f" stroke="#d09527" stroke-width="5" />
    <text x="154" y="112" fill="#275b45" font-size="24" font-weight="800">EAST MEADOW</text>
    <text x="505" y="286" fill="#7b5515" font-size="26" font-weight="900">${state.zone.toUpperCase()}</text>
    <path d="M112 300 C226 266 291 300 391 263 S548 219 657 260" fill="none" stroke="#ffffff" stroke-width="13" stroke-dasharray="18 10" />
    ${dots}
    <circle class="current-position-ring" cx="432" cy="190" r="31" />
    <circle class="current-position" cx="432" cy="190" r="12" />
  </svg>`;
}

function trayMarkup() {
  const labels = { available: "Empty pod", filled: "Filled", absent: "Free slot", attention: "Check" };
  return state.tray.map((slot, index) => `<div class="pod-slot pod-slot--${slot}"><small>POSITION</small><span>${index + 1}</span><strong><i></i>${labels[slot]}</strong></div>`).join("");
}

function trayPanel(compact = false) {
  return `<section class="tray-card${compact ? " tray-card--compact" : ""}">
    <header><div><small>SIX-POD TRAY</small><h2>${compact ? "Pod status" : "Six removable positions"}</h2></div>${compact ? "" : `<div class="tray-summary"><span><i class="legend-dot legend-dot--green"></i>${state.tray.filter(slot => slot === "available").length} empty</span><span><i class="legend-dot legend-dot--red"></i>${state.tray.filter(slot => slot === "filled").length} filled</span></div>`}</header>
    <div class="pod-grid">${trayMarkup()}</div>
  </section>`;
}

function sampleView() {
  const copy = statusCopy();
  return `<div class="sampling-screen">
    <section class="field-map-card">
      <div class="field-map-card__graphic">${mapGraphic(true)}</div>
      <div class="map-title"><small>AUTOMATIC LOCATION</small><strong>Green Estate · East Meadow</strong><span>${state.zone}</span></div>
      <div class="map-accuracy"><i></i><strong>±1.4 m</strong><span>GNSS confirmed</span></div>
    </section>

    <section class="capture-card capture-card--${copy.tone}">
      <div class="capture-state"><i></i><span>${copy.eyebrow}</span></div>
      <div class="core-count"><strong>${state.coreCount}</strong><span>cores</span></div>
      <div class="minimum-label"><span>Minimum for this zone</span><strong>${state.minimumCores}</strong></div>
      <h1>${copy.title}</h1>
      <p>${copy.instruction}</p>
      <div class="save-state"><span>✓</span><strong>${state.online ? "Saved locally and synced" : `Saved locally · ${state.queued} waiting to sync`}</strong></div>
      <button class="problem-button" type="button" data-action="problem"><span>!</span>Report a problem</button>
    </section>

    ${trayPanel(true)}
  </div>`;
}

function mapView() {
  return `<div class="simple-view">
    <header class="simple-view__header"><div><small>MAP &amp; LOCATION</small><h1>${state.manualLocation ? "Location selected manually" : "Location confirmed automatically"}</h1><p>${state.manualLocation ? "This choice is stored with every new sampling event." : "GNSS accuracy is within the 2 m automatic-selection limit."}</p></div><button class="large-secondary" type="button" data-action="change-location">Change location</button></header>
    <section class="large-map"><div>${mapGraphic(true)}</div><div class="large-map__status"><span><i class="status-light status-light--green"></i>${state.manualLocation ? "MANUAL" : "AUTO GNSS"}</span><strong>Green Estate<br>East Meadow · ${state.zone}</strong><small>${state.manualLocation ? "Operator selected" : "Accuracy ±1.4 m · unambiguous match"}</small></div></section>
  </div>`;
}

function caseView() {
  return `<div class="simple-view">
    <header class="simple-view__header"><div><small>CASE &amp; PODS</small><h1>Case ready for field work</h1><p>The tray tracks presence and state. Pod identity is read only at the Sensing Position.</p></div><div class="case-online"><i class="status-light ${state.online ? "status-light--green" : "status-light--amber"}"></i><strong>${state.online ? "Online" : "Working offline"}</strong></div></header>
    ${trayPanel(false)}
    <section class="case-summary">
      <div><small>CASE</small><strong>CASE07</strong><span>Local records protected</span></div>
      <div><small>SENSING POSITION</small><strong>${state.sensing === "saved" ? "Sample saved" : state.sensing === "measuring" ? "Measuring" : "Ready"}</strong><span>RFID · QR · 200 g check</span></div>
      <div><small>SYNCHRONISATION</small><strong>${state.online ? "Up to date" : `${state.queued} queued`}</strong><span>${state.online ? "Last sync just now" : "Uploads automatically later"}</span></div>
    </section>
  </div>`;
}

function renderSensing() {
  const screens = {
    idle: `<div class="sensing-message"><small>READY</small><strong>PLACE FILLED POD</strong><span>Then press Measure / Sync</span></div>`,
    detected: `<div class="sensing-message sensing-message--working"><small>POD DETECTED</small><strong>READING ID</strong><span>RFID + QR</span></div>`,
    measuring: `<div class="sensing-message sensing-message--working"><small>KEEP VEHICLE STILL</small><strong>${state.weight || 198} g</strong><span>Stabilising · up to 3 seconds</span></div>`,
    saved: `<div class="sensing-message sensing-message--success"><small>SAMPLE SAVED</small><strong>${state.weight} g NET</strong><span>Return pod to any free tray position</span></div>`,
    light: `<div class="sensing-message sensing-message--error"><small>MORE SOIL NEEDED</small><strong>${state.weight} g NET</strong><span>Minimum accepted mass is 200 g</span></div>`
  };
  sensingScreen.innerHTML = screens[state.sensing];
  sensingLed.className = state.sensing === "saved" ? "is-green" : state.sensing === "light" ? "is-red" : state.sensing === "detected" || state.sensing === "measuring" ? "is-amber" : "";
  document.querySelector("#measure-button").disabled = state.sensing === "detected" || state.sensing === "measuring";
}

function updateHeader() {
  document.querySelector("#location-label").textContent = `Green Estate · East Meadow · ${state.zone}`;
  document.querySelector("#location-mode").textContent = state.manualLocation ? "MANUAL" : "AUTO";
  document.querySelector("#connection-label").textContent = state.online ? "ONLINE" : `OFFLINE · ${state.queued} SAVED`;
  document.querySelector("#connection-light").className = `status-light ${state.online ? "status-light--green" : "status-light--amber"}`;
  document.querySelectorAll(".field-nav__button").forEach(button => button.classList.toggle("is-active", button.dataset.view === state.view));
}

function render() {
  screenContent.innerHTML = state.view === "map" ? mapView() : state.view === "case" ? caseView() : sampleView();
  updateHeader();
  renderSensing();
}

function recordCores(total = state.minimumCores) {
  if (state.coreCount >= total) {
    showToast(`${state.coreCount} cores already recorded.`);
    return;
  }
  const remaining = total - state.coreCount;
  state.coreCount = total;
  if (!state.online) state.queued += remaining;
  state.view = "sample";
  render();
  showToast(`${remaining} physical sampling triggers recorded automatically.`);
}

function runSensing() {
  if (state.sensing === "detected" || state.sensing === "measuring") return;
  clearTimeout(sensingTimer);
  state.sensing = "detected";
  state.weight = 0;
  renderSensing();
  sensingTimer = setTimeout(() => {
    state.sensing = "measuring";
    state.weight = 204;
    renderSensing();
    sensingTimer = setTimeout(() => {
      state.sensing = state.weight >= 200 ? "saved" : "light";
      state.sampleSaved = state.sensing === "saved";
      state.tray[4] = "filled";
      if (!state.online) state.queued += 1;
      render();
      showToast(state.sampleSaved ? "Sample saved locally. Return the pod to any free position." : "More soil is needed before the sample can be saved.");
    }, 1100);
  }, 700);
}

document.addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-view]");
  if (navButton) {
    state.view = navButton.dataset.view;
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton?.dataset.action === "problem") openPanel(problemDialog);
  if (actionButton?.dataset.action === "change-location") openPanel(locationDialog);

  const closeButton = event.target.closest("[data-close-panel]");
  if (closeButton) closePanel(document.querySelector(`#${closeButton.dataset.closePanel}`));

  const demoButton = event.target.closest("[data-demo]");
  if (demoButton?.dataset.demo === "capture") recordCores();
  if (demoButton?.dataset.demo === "pod") runSensing();
  if (demoButton?.dataset.demo === "offline") {
    state.online = false;
    state.coreCount += 1;
    state.queued += 1;
    render();
    showToast("Signal lost. The new sampling event is safe on CASE07.");
  }
  if (demoButton?.dataset.demo === "sync") {
    const uploaded = state.queued;
    state.online = true;
    state.queued = 0;
    render();
    showToast(uploaded ? `${uploaded} local record${uploaded === 1 ? "" : "s"} synchronised.` : "Case is online and up to date.");
  }

  const problemButton = event.target.closest("[data-problem]");
  if (problemButton) {
    const problem = problemButton.dataset.problem;
    if (problem === "Other") {
      document.querySelector("#other-field").hidden = false;
      document.querySelector("#other-actions").hidden = false;
      document.querySelector("#other-text").focus();
    } else {
      state.problem = problem;
      if (!state.online) state.queued += 1;
      closePanel(problemDialog);
      render();
      showToast(`${problem} saved locally and shared when connected.`);
    }
  }

  const zoneButton = event.target.closest("[data-zone]");
  if (zoneButton) {
    document.querySelectorAll("[data-zone]").forEach(button => button.classList.remove("is-selected"));
    zoneButton.classList.add("is-selected");
  }
});

document.querySelector("#location-button").addEventListener("click", () => openPanel(locationDialog));
document.querySelector("#location-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = document.querySelector("[data-zone].is-selected");
  state.zone = selected?.dataset.zone || state.zone;
  state.manualLocation = true;
  closePanel(locationDialog);
  render();
  showToast(`${state.zone} confirmed and stored with new events.`);
});
document.querySelector("#auto-location-button").addEventListener("click", () => {
  state.manualLocation = false;
  state.zone = "Zone 3";
  closePanel(locationDialog);
  render();
  showToast("Automatic GNSS restored. Accuracy is ±1.4 m.");
});
document.querySelector("#save-other-button").addEventListener("click", () => {
  const detail = document.querySelector("#other-text").value.trim();
  if (!detail) {
    showToast("Add a short description first.");
    return;
  }
  state.problem = `Other: ${detail}`;
  if (!state.online) state.queued += 1;
  closePanel(problemDialog);
  render();
  showToast("Problem saved locally and shared when connected.");
});
document.querySelector("#measure-button").addEventListener("click", runSensing);
document.querySelector("#zero-button").addEventListener("click", () => showToast("Scale zero confirmed. Ready for a filled pod."));
document.querySelector("#reset-button").addEventListener("click", () => {
  clearTimeout(sensingTimer);
  state = initialState();
  document.querySelector("#other-field").hidden = true;
  document.querySelector("#other-actions").hidden = true;
  document.querySelector("#other-text").value = "";
  closePanel(locationDialog);
  closePanel(problemDialog);
  render();
  showToast("Demonstration reset.");
});

render();
