# S2L Smart Case stakeholder prototype

Open `index.html` in a modern browser. No installation, build step, package manager or internet connection is required.

## Suggested stakeholder route

1. Start in **Sampling** and show the map, current zone and large automatic core counter.
2. Use **Record to 25 cores** to demonstrate physical sampling triggers appearing with no screen tap.
3. Show the six large tray positions: green is an available empty pod, red is filled, and grey is free.
4. Use **Place filled pod**, then watch the separate Sensing Position read identity, stabilise weight and accept a sample at or above 200 g net.
5. Open **Map & location** and show that automatic context is used only within the 2 m accuracy limit; manual selection remains available for ambiguity.
6. Open **Case & pods** to show only the information needed in the field: tray state, Sensing Position state and synchronisation.
7. Use **Lose signal**, record another event, and show that the interface stays usable while records wait locally.
8. Use **Reconnect & sync** to clear the local queue.

## Deliberate product boundary

The Smart Case is not job/order-aware. It stores operational geography and capture configuration locally, creates globally unique case records offline, and synchronises them later. The server matches the field and pod evidence, creates the human-facing S2L Sample ID, and performs any job/order reconciliation.

The current prototype reflects the Notion v0.9.1 baseline: six removable pod positions, a dedicated Sensing Position, a 200 g net acceptance gate, a 2 m automatic-GNSS threshold, a 10.1-inch high-brightness primary display and a separate minimal local Sensing Position interface.

Field interaction is deliberately minimal: normal capture is automatic, the main screen has only three large navigation choices, and exception reporting uses a few large reasons with text only under **Other**. Text and touch targets are sized for sunlight, gloves and wet or muddy field conditions.

All information is fictional and held only in browser memory for the current page session.
