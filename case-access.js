/*
 * Stakeholder-only PIN UX layered over the existing in-memory field demo.
 * Public fixture PINs are NOT credentials. No backend, uniqueness registry,
 * secure storage, durable lockout, real provisioning or hardware is implemented.
 * Remove this adapter when connecting the production local runtime.
 */
(() => {
  "use strict";
  const fixture = Object.freeze({
    caseId: "CASE07", vehicle: "ATV-003", revision: "CFG-DEMO-03",
    users: Object.freeze([
      Object.freeze({ pin: "0738", id: "demo-member-alex", name: "Alex Taylor" }),
      Object.freeze({ pin: "4826", id: "demo-member-sam", name: "Sam Morgan" })
    ])
  });
  // Demonstration values only; real limits require an agreed offline policy.
  const DEMO_FAILURE_LIMIT = 3;
  const DEMO_DELAY_MS = 15000;
  let pin = "", candidate = null, session = null, packageState = "ready";
  let failures = 0, blockedUntil = 0, message = "", help = false;
  let serial = 0, pendingMeasurement = null, handover = null;
  const initialContributions = () => [{sessionId:null, membershipId:null, count:18, source:"preloaded_demo_fixture"}];
  let audit = [], capturedContributions = initialContributions();
  const root = document.querySelector(".display-screen");
  const content = document.querySelector("#screen-content");
  const navigation = document.querySelector(".field-nav");
  const locationButton = document.querySelector("#location-button");
  const gate = document.createElement("section");
  gate.className = "pin-gate";
  gate.setAttribute("aria-label", "Smart Case sign-in");
  const bar = document.createElement("section");
  bar.className = "operator-bar";
  bar.setAttribute("aria-label", "Current operator and configured vehicle");
  root.insertBefore(bar, content);
  root.insertBefore(gate, content);
  const demo = document.createElement("section");
  demo.className = "access-demo";
  demo.innerHTML = `<h2>PIN sign-in demo</h2>
    <p><strong>Fictional codes only</strong><br>0738: Alex Taylor<br>4826: Sam Morgan</p>
    <label for="demo-access-state">Simulate installed access</label>
    <select id="demo-access-state"><option value="ready">Access installed</option><option value="missing">First use / no access package</option><option value="expired">Access expired</option></select>
    <p>Three wrong attempts trigger a 15-second <em>demo</em> delay. Reset clears this browser-only demonstration; real device lockouts must survive restart.</p>
    <p class="access-demo-log" aria-live="polite"></p>`;
  document.querySelector(".demo-rail").prepend(demo);
  document.querySelector(".prototype-banner span").textContent = "PIN UX preview - fictional data, no production authentication";

  const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const id = prefix => `${prefix}-${++serial}`;
  const busy = () => state.sensing === "detected" || state.sensing === "measuring";
  const active = () => Boolean(session) && packageState === "ready";
  const delay = () => Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
  function log(type, detail = {}, actor = session) {
    audit.push({ id: id("event"), type, at: new Date().toISOString(), caseId: fixture.caseId,
      sessionId: actor?.id ?? null, membershipId: actor?.membershipId ?? null,
      configurationRevision: fixture.revision, vehicle: fixture.vehicle, ...detail });
    demo.querySelector(".access-demo-log").textContent = `${audit.length} fictional session/capture events in this tab. No PIN values recorded.`;
  }
  function deny() {
    showToast("Sign in on the main display before recording field work.");
    return false;
  }
  function closeFieldPanels() {
    document.querySelectorAll(".screen-modal").forEach(panel => { panel.hidden = true; });
  }
  function renderGate() {
    const wait = delay();
    const disabled = wait > 0 || packageState !== "ready";
    const heading = packageState === "missing" ? "Set up your access" : packageState === "expired" ? "Refresh your access" : "Enter your PIN";
    const info = packageState === "missing" ? "This case has no installed operator access. Generate your personal PIN in the web app, then synchronise the case." : packageState === "expired" ? "The installed operator access has expired. Refresh access through the web app and synchronise this case." : state.online ? "Use the personal PIN issued in the web app." : "Working offline with installed demo access.";
    gate.innerHTML = `<div class="pin-layout"><div class="pin-intro"><small>PERSONAL OPERATOR SIGN-IN</small><h1>${candidate ? "Is this you?" : heading}</h1>
      <p>${escape(info)}</p><dl><div><dt>Smart Case</dt><dd>${fixture.caseId}</dd></div><div><dt>Configured vehicle</dt><dd>${fixture.vehicle} <small>READ ONLY</small></dd></div></dl>
      <p class="pin-config-note">Vehicle association is maintained in the web app by someone with equipment permissions. Authorised S2L support can help when needed.</p>
      <button type="button" class="pin-help" data-pin-action="help">First time or forgot your PIN?</button>
      ${help ? `<p class="pin-help-copy">Sign into the web app with your normal account to generate or reset your PIN. A newly issued PIN works here only after its access package is installed. No PINs or vehicle associations can be created on this screen.</p>` : ""}
      <p class="pin-demo-notice">Stakeholder preview only. PIN validation and access states are simulated.</p></div>
      <div class="pin-panel">${candidate ? `<div class="pin-person"><span aria-hidden="true">${escape(candidate.name.charAt(0))}</span><h2>${escape(candidate.name)}</h2><p>${handover ? `A collection with ${handover.cores} recorded cores is paused. Existing contributors stay unchanged.` : "Your new session will identify subsequent field actions."}</p>
        <button type="button" class="pin-primary" data-pin-action="continue">${handover ? "Continue collection (handover)" : `Continue as ${escape(candidate.name.split(" ")[0])}`}</button>
        <button type="button" class="pin-secondary" data-pin-action="cancel">Not me - enter another PIN</button></div>` : `
      <div class="pin-dots" aria-label="${pin.length} of 4 digits entered">${Array.from({length:4}, (_, i) => `<span class="${i < pin.length ? "filled" : ""}" aria-hidden="true">${i < pin.length ? "&#8226;" : ""}</span>`).join("")}</div>
      <div class="pin-status" role="status" aria-live="polite">${wait ? `Too many attempts. Try again in ${wait} seconds.` : escape(message)}</div>
      <div class="pin-keypad" aria-label="Numeric keypad">${[1,2,3,4,5,6,7,8,9,"clear",0,"back"].map(key => `<button type="button" data-pin-key="${key}" ${disabled ? "disabled" : ""} aria-label="${key === "back" ? "Delete last digit" : key === "clear" ? "Clear PIN" : key}">${key === "back" ? "&#9003;" : key === "clear" ? "Clear" : key}</button>`).join("")}</div>
      <button type="button" class="pin-primary" data-pin-action="submit" ${disabled || pin.length !== 4 ? "disabled" : ""}>Sign in</button>`}</div></div>`;
  }
  function refresh() {
    const unlocked = active();
    root.classList.toggle("case-locked", !unlocked);
    gate.hidden = unlocked;
    content.hidden = !unlocked;
    content.inert = !unlocked;
    navigation.hidden = !unlocked;
    navigation.inert = !unlocked;
    locationButton.hidden = !unlocked;
    document.querySelectorAll(".header-status .header-status__item").forEach((item, index) => { if (index > 0) item.hidden = !unlocked; });
    bar.innerHTML = `<div><small>${unlocked ? "SIGNED IN" : "NOT SIGNED IN"}</small><strong>${unlocked ? escape(session.name) : fixture.caseId}</strong></div>
      <div class="operator-vehicle"><small>CONFIGURED VEHICLE</small><strong>${fixture.vehicle}</strong><span>Read only</span></div>
      ${unlocked ? `<div class="operator-actions"><button type="button" data-pin-action="switch" ${busy() ? "disabled" : ""}>Switch user</button><button type="button" data-pin-action="signout" ${busy() ? "disabled" : ""}>Sign out</button></div>` : ""}`;
    demo.querySelector("select").disabled = busy();
    if (!unlocked) { closeFieldPanels(); renderGate(); }
    document.querySelector("#measure-button").disabled = !unlocked || busy();
    document.querySelector("#zero-button").disabled = !unlocked || busy();
    document.querySelectorAll('[data-demo="capture"], [data-demo="pod"]').forEach(button => { button.disabled = !unlocked || busy(); });
    if (!unlocked) {
      document.querySelector("#sensing-screen").innerHTML = '<div class="sensing-message"><small>OPERATOR REQUIRED</small><strong>SIGN IN</strong><span>Use your PIN on the main display</span></div>';
      document.querySelector("#sensing-led").className = "";
    }
    if (unlocked && state.view === "case" && !document.querySelector(".case-association")) {
      const note = document.createElement("section");
      note.className = "case-association";
      note.innerHTML = `<strong>${fixture.caseId} / ${fixture.vehicle}</strong><p>Configured association ${fixture.revision} - read only on this case.</p><p>Changes require equipment.attach / equipment.detach in the web app. A permitted organisation user or authorised S2L support can record a transfer.</p><button type="button" data-pin-action="mismatch">Report configuration problem</button>`;
      content.appendChild(note);
    }
  }
  function enter(key) {
    if (active() || candidate || delay() || packageState !== "ready") return;
    if (key === "clear") pin = "";
    else if (key === "back") pin = pin.slice(0, -1);
    else if (/^[0-9]$/.test(String(key)) && pin.length < 4) pin += key;
    message = "";
    renderGate();
    gate.querySelector(`[data-pin-key="${key}"]`)?.focus({preventScroll:true});
  }
  function submit() {
    if (active() || candidate || pin.length !== 4 || delay() || packageState !== "ready") return;
    const matched = fixture.users.find(user => user.pin === pin);
    pin = ""; // Never retained in events or session metadata.
    if (!matched) {
      failures += 1;
      log("sign_in_failed");
      if (failures >= DEMO_FAILURE_LIMIT) { blockedUntil = Date.now() + DEMO_DELAY_MS; failures = 0; }
      message = "PIN not recognised on this case. Check your PIN or refresh access.";
    } else {
      candidate = { id: matched.id, name: matched.name };
      failures = 0;
      message = "";
    }
    refresh();
    gate.querySelector(candidate ? '[data-pin-action="continue"]' : '[data-pin-key="1"]')?.focus({preventScroll:true});
  }
  function begin() {
    if (!candidate || active() || packageState !== "ready" || delay()) return;
    session = { id:id("session"), membershipId:candidate.id, name:candidate.name, startedAt:new Date().toISOString() };
    candidate = null;
    log("session_started");
    if (handover) { log("collection_handover", {...handover}); handover = null; }
    state.view = "map";
    render();
    showToast(`Signed in as ${session.name}. Vehicle association unchanged.`);
    content.focus();
  }
  function end(reason) {
    if (busy()) { showToast("Finish the current measurement before switching user."); return false; }
    if (session) {
      if (state.coreCount > 0 && !state.sampleSaved) handover = { cores:state.coreCount, previousSessionId:session.id, previousMembershipId:session.membershipId };
      log("session_ended", {reason});
    }
    session = null; candidate = null; pin = ""; message = "";
    closeFieldPanels(); render();
    gate.querySelector('[data-pin-key="1"]')?.focus({preventScroll:true});
    return true;
  }

  // Keep the existing demo intact. Wrappers guard direct calls as well as UI use;
  // they are NOT a production authorisation boundary.
  const originalRender = render;
  render = function () { originalRender(); refresh(); };
  const originalSensingRender = renderSensing;
  renderSensing = function () {
    originalSensingRender();
    if (pendingMeasurement && state.sensing === "saved") {
      log("sample_measurement_demo", { measurementId:pendingMeasurement.id, netWeight:state.weight,
        contributions:capturedContributions.map(item => ({...item})) }, pendingMeasurement.actor);
      pendingMeasurement = null;
    }
    refresh();
  };
  const originalCores = recordCores;
  recordCores = function (...args) {
    if (!active()) return deny();
    if (busy()) return;
    const before = state.coreCount;
    originalCores(...args);
    const count = state.coreCount - before;
    if (count > 0) {
      const contribution = {sessionId:session.id, membershipId:session.membershipId, count};
      capturedContributions.push(contribution);
      log("core_capture_demo", contribution);
    }
  };
  const originalSensing = runSensing;
  function prepareMeasurement() {
    if (!active()) return deny();
    if (busy()) return false;
    if (state.sampleSaved) { showToast("This demo sample is already recorded. Reset to demonstrate another."); return false; }
    pendingMeasurement = { id:id("measurement"), actor:{...session} };
    return true;
  }
  runSensing = function () { if (prepareMeasurement()) originalSensing(); };

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const key = target.closest("[data-pin-key]");
    const action = target.closest("[data-pin-action]");
    if (key || action) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (key) { enter(key.dataset.pinKey); return; }
      switch (action.dataset.pinAction) {
        case "submit": submit(); break;
        case "continue": begin(); break;
        case "cancel": candidate = null; pin = ""; refresh(); break;
        case "help": help = !help; renderGate(); break;
        case "switch": end("switch_user"); break;
        case "signout": end("sign_out"); break;
        case "mismatch":
          if (active()) { log("configuration_problem_reported"); if (!state.online) state.queued += 1; render(); showToast("Demo problem recorded. A permitted web user must correct the association."); }
          break;
      }
      return;
    }
    // Device connectivity is independent of operator sign-in. The inherited
    // 'Lose signal' fixture also creates a core; do not create one while locked.
    if (target.closest('[data-demo="offline"]')) {
      event.preventDefault(); event.stopImmediatePropagation();
      state.online = false; render(); showToast("Offline. Installed demo access is still available."); return;
    }
    if (target.closest("#reset-button")) {
      candidate = null; session = null; pin = ""; packageState = "ready";
      failures = 0; blockedUntil = 0; message = ""; help = false;
      pendingMeasurement = null; handover = null; audit = []; capturedContributions = initialContributions(); serial = 0;
      demo.querySelector("select").value = "ready";
      demo.querySelector(".access-demo-log").textContent = "Demonstration reset. No real credentials or records.";
      return; // Existing handler resets the original in-memory fixture.
    }
    const protectedControl = target.closest('[data-view], [data-action], [data-problem], [data-zone], #measure-button, #zero-button, #location-button, #auto-location-button, #save-other-button, [data-demo="capture"], [data-demo="pod"]');
    if (protectedControl && !active()) {
      event.preventDefault(); event.stopImmediatePropagation(); deny(); return;
    }
    // Existing measure listener holds the original function reference.
    if (target.closest("#measure-button")) {
      event.preventDefault(); event.stopImmediatePropagation(); runSensing();
    }
  }, true);
  document.addEventListener("submit", event => {
    if (!active() && event.target.closest(".display-screen")) { event.preventDefault(); event.stopImmediatePropagation(); deny(); }
  }, true);
  document.addEventListener("keydown", event => {
    if (active() || event.ctrlKey || event.altKey || event.metaKey || event.target.closest(".access-demo")) return;
    if (/^[0-9]$/.test(event.key)) { event.preventDefault(); enter(event.key); }
    else if (event.key === "Backspace") { event.preventDefault(); enter("back"); }
    else if (event.key === "Enter" && !event.target.closest("button")) { event.preventDefault(); candidate ? begin() : submit(); }
  });
  demo.querySelector("select").addEventListener("change", event => {
    if (busy()) { event.target.value = packageState; return; }
    end("access_state_changed");
    packageState = event.target.value; candidate = null; pin = ""; refresh();
  });
  setInterval(() => {
    if (blockedUntil && !active()) {
      if (Date.now() >= blockedUntil) { blockedUntil = 0; message = "You can try your PIN again."; }
      renderGate();
    }
  }, 500);
  // Read-only testing/inspection view. This intentionally exposes no fixture PINs.
  window.S2LDemoSession = Object.freeze({snapshot: () => JSON.parse(JSON.stringify({
    session, packageState, configuration:{caseId:fixture.caseId, vehicle:fixture.vehicle, revision:fixture.revision}, audit, handover
  }))});
  refresh();
})();
