---
status: provisional
added: 2026-11-22
check: `villa` (tools/audit/villaCheck.mjs: every placed vehicle's wheels within 5 cm of the paving)
---
**Rule.** A parked vehicle a scripted place adds stands on its four wheels: the body is set from the drawn surface sampled
under the four wheel contact points (their mean, pitched and rolled to their slopes: viewer/villa/villaPlace.js), never
from one height at its centre, and every wheel is within 5 cm of the paving; under a roof where the sun's shadow map
never reaches, it gets a soft contact shadow.

**Why.** The round-2 saloon in the villa's garage was set from one height at its centre and had no shadow under the
garage's ceiling: it read as floating (the coordinator's review of after_day_garage.jpg, 2026-11-22).
