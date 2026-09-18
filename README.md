# S2L Smart Case stakeholder prototype

Open `index.html` in a modern browser, or serve this directory using a local static server. The app itself needs no build step or package manager. All sample, access, device and synchronisation data are fictional and held in browser memory; page reload or Reset demonstration clears them.

## PIN sign-in and configured vehicle UX

This update demonstrates the agreed separation between personal operator sign-in and controlled case-to-vehicle configuration. The personal PIN identifies an operator session. It does not change which vehicle the case is configured against.

**Public fictional fixtures, not credentials:**

- `0738`: Alex Taylor.
- `4826`: Sam Morgan.
- Case `CASE07`, configured vehicle `ATV-003`, configuration `CFG-DEMO-03`.

Production PINs must be generated/reserved uniquely by the authenticated web backend within the configured organisation and provisioned securely to permitted cases. That backend, its uniqueness registry, cryptographic verification, device enrolment and durable offline authority are NOT implemented here. No universal support PIN is introduced.

## Suggested stakeholder route

1. Start signed out. The main display shows a four-digit keypad; field data and recording controls are unavailable. The Sensing Position asks the operator to sign in.
2. Enter `0738`, including the leading zero. Confirm **Continue as Alex**. The map opens with the operator name and configured vehicle shown read-only. There is no routine vehicle picker or equipment confirmation checklist.
3. Use **Record to 25 cores** to simulate additional physical triggers. The initial 18 cores are preloaded demo evidence with an unknown contributor, not reassigned to the newly signed-in person.
4. Use **Switch user**, enter `4826`, and confirm the explicit handover of an open collection. Earlier contributors remain unchanged. Switching is unavailable during the simulated measurement transaction.
5. Use **Place filled pod** or **Measure / Sync**. The Sensing Position simulates identity and weight checks, records the measuring operator separately from earlier core contributors, and prevents duplicate recording of that completed demo measurement.
6. Open **Case & pods**. The six positions show empty, filled and free states. The vehicle association is read-only. **Report configuration problem** records a fictional issue; it cannot change the association.
7. Use **Lose signal**. Installed fictional access remains usable and new simulated work can queue locally. Disconnecting alone no longer fabricates a core. **Reconnect & sync** simulates clearing the queue; it is not a real server acknowledgement.
8. Sign out. Existing in-tab sample/queue state and the configured vehicle remain unchanged. A new page session starts signed out, but this memory-only prototype does not persist field evidence across reloads.

The stakeholder-only access selector demonstrates **Access installed**, **First use / no access package**, and **Access expired**. Missing/expired access prevents sign-in and explains that PIN issuance and case provisioning occur via the web workflow. A PIN newly issued online cannot work offline on a case that has never received it.

Three incorrect attempts trigger a **15-second demonstration delay**. These values are not approved production security thresholds. Demo Reset clears the delay; real failure counters, authority validity and recovery must resist restart/bypass and need their own security design and tests.

## Vehicle configuration boundary

A normal case user cannot attach, detach or select a vehicle. Physical case moves must be recorded in S2L by an authorised web user. The transfer checks `equipment.attach`, `equipment.detach` and the applicable case/source/destination scopes, preserves old/new associations and effective/recording times, and distinguishes cloud save from case acknowledgement.

A trusted organisation user may hold those permissions. Authorised S2L staff are the fallback when necessary, not the only people allowed to change configuration and not an automatic cross-tenant bypass. The web transfer screen and backend enforcement are specified in Notion, not implemented by this static case demo.

## Existing field-demo boundary

The underlying sampling demo and its styles are preserved. They retain the earlier three-screen interface, fictional map, six removable tray positions, separate Sensing Position, 200 g acceptance fixture and 2 m automatic-context fixture. Hardware capture, RFID/QR scanning, GNSS and cloud synchronisation are simulations, not verified capabilities.

The newer target specification supports offline Orders and Map / Orders / Case / Sync navigation. This PIN-focused change does not implement that separate work-pack/order-aware increment or reinstate the older job-unaware design as product authority. PIN sign-in does not create a sample; the normal production sample boundary remains actual filled-pod measurement commit.

`case-access.js` is a stakeholder-only adapter over the existing script. Browser-side controls and public fixture comparisons are not a production authorisation boundary. It records fictional session/capture evidence without PINs in the audit view; it does not create real globally unique sample identities, protect secrets, operate vehicles, or change live permissions.

## Verification

`tests/pin_ux_smoke.py` contains the browser interaction checks. Install Python Playwright and a Chromium browser separately, then run:

```sh
CHROMIUM_PATH=/usr/bin/chromium python tests/pin_ux_smoke.py
```

Omit `CHROMIUM_PATH` to use an installed Playwright Chromium build. The harness injects the repository HTML, scripts and styles into Chromium without network access. It checks UI behaviour and responsive layout, not HTTP deployment, cloud integration or hardware security.

Eleven grouped local checks passed during development: locked controls, wrong/leading-zero PINs, named confirmation, offline fixture access, contributor-preserving handover, measurement switching/duplicate protection, read-only association, sign-out retention, missing/expired package states, demonstration retry delay, page restart, responsive layouts and no JavaScript page errors. These are grouped UI assertions, not production authentication or persistence certification.

## Specification references

- [S2L Basic Cloud Schema v0.2](https://app.notion.com/p/3dd8bd2f4ea081458329c112aaedc85c)
- [S2L Web Platform UX & Action-Based User Flows v0.2](https://app.notion.com/p/3d48bd2f4ea081689d60d6ae818e3f20)
- [Smart Case Architecture & Offline Sample Identity v0.2](https://app.notion.com/p/3d48bd2f4ea081a793acc05cc5394e45)

Notion pages may require workspace access. This branch is a reviewable prototype update, not evidence of a production deployment.
