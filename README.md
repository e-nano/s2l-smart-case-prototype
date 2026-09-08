# S2L Smart Case stakeholder prototype

Open `index.html` in a modern browser. No installation, build step, package manager or internet connection is required.

## Suggested stakeholder route

1. Start in **Capture** and show physical sampling-trigger events appearing automatically with no screen tap.
2. Explain that **25 cores is a standard reference, not a completion rule**; soil volume and test type may require fewer or more cores.
3. Use the external stakeholder control to mark sufficient soil, then show the passive **Position 11** indication.
4. Open **Tray** and demonstrate the separate case-mounted display automatically showing detect, RFID, QR and stable weight; its only normal action is **Remeasure / Reweigh**.
5. Toggle **Offline**, capture more evidence, and show queued records remaining valid locally.
6. Open **Map**, simulate an ambiguous GNSS boundary and confirm the audited manual-context path.
7. Reconnect and open **Records** to show synchronisation, automatic S2L Sample ID creation and server-side work reconciliation.
8. Open **Case** to review power, GNSS, connectivity, readers, weighing, storage and both display states.

## Deliberate product boundary

The Smart Case is not job/order-aware. It stores operational geography and capture configuration locally, creates globally unique case records offline, and synchronises them later. The server matches the field and pod evidence, creates the human-facing S2L Sample ID, and performs any job/order reconciliation.

The current prototype also reflects the 8 September requirements review: a 5 m automatic-GNSS threshold, Area/geometry revision evidence on captured records, RUT241-class industrial 4G/Wi-Fi connectivity, a 10.1-inch high-brightness primary display, and a separate minimal Position-11 display. Projected-capacitive glove/wet performance is shown as a prototype trial with resistive touch retained as the fallback if field testing is not equal or better.

Field interaction is deliberately minimal: normal capture is automatic, Position 11 is an indication rather than a button, and exception reporting uses a few large choices with text only under **Other**.

All information is fictional and held only in browser memory for the current page session.
