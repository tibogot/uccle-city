# Uccle 3D: can it make money? (market research)

## Refresh, 12 November 2026: what the city can do now, and what that changes

No new web research in this refresh (the 4 November findings below still stand); this section maps what was built since
to the routes, and sets priorities. Everything listed exists at least as a lab; most is not merged or public yet.

**New capabilities since 4 November** (branch in brackets):
- Hero landmarks matched to photos, window by window: town hall (merged), Saint-Job, Chapelle de Stalle with a walkable
  interior, Saint-Pierre, the Royal Observatory, Villa van Buuren, Château de Wolvendael with its pond, three railway
  bridges (`claude/stalle`, `claude/saint-pierre`, `claude/observatory`, `claude/vanbuuren`, `claude/wolvendael`,
  `claude/trains`, `claude/verrewinkel`).
- Measured roads with real crossings and markings from the Brussels survey (`claude/roads2`), moving traffic with signals
  (`claude/traffic`), tram 92 and SNCB trains on the real timetables (`claude/tram2`, `claude/trains`).
- Weather and seasons: rain, wet streets, fog, snow with real depth, icicles, salted roads, autumn / winter / spring,
  the real sun for any date, and **live weather from Open-Meteo** (`claude/weather`).
- Gardens and parks: grass, hedges, plants, ivy (`claude/foliage`); pedestrians with children, prams, dogs, benches
  (`claude/pedestrians`); city sound generated in code (`claude/sound`); far forests to 1.5 km at ~1 ms
  (`claude/impostors`); a minimap with search and teleport (`claude/minimap`); flags (`claude/flags`).
- All at real-time frame rates in a browser, measured on this machine.

**What changes per route:**

| Route | Before | Now | Why |
|---|---|---|---|
| A. Sun / shadow study + project in context (architects) | best route 1 | **still first**, stronger | The real sun for any date already works; weather and seasons make the before/after more convincing (a winter-solstice view with bare trees is exactly the "you take my sun" argument). Still missing: importing a project volume and the one-page report. |
| B. Participation pages for communes | best route 2 | **stronger** | Heroes like the town hall and Wolvendael, real crossings and traffic, pedestrians and sound make "see the project in your street" feel real. A square redesign or a tram stop is now showable with life in it. |
| C. Showcase for freelance WebGL work | do anyway | **now very strong** | Winter Uccle, a rainy night street, the château reflected in its pond: each is a 30-second clip that sells your skills. Fastest money. |
| D. Tourism / brands / events | rare | **better** | Seasonal versions (Christmas in winter Uccle, a spring garden day) and live weather fit city marketing and events. Still sales-heavy. |
| E. Sun hours for real estate | weak | unchanged | Same problem: needs volume and a channel. |
| **F. NEW: a game set in real Uccle** | — | **worth testing small** | A police game around the Rue Rouge station, a falcon game at Saint-Job, a tram-driver or delivery game on real streets. Free web game first (showcase + audience), paid extras later. Risky as income; strong as marketing. |

**Priorities (suggested):**
1. **Showcase first (Route C, this month):** merge the best labs into the city, then record 4-5 short clips: winter
   Uccle with snow and icicles, a rainy night street, Wolvendael at sunset, the town hall with its flags, tram 92 at
   Saint-Job. Put them on a public page and LinkedIn / Instagram / ArtStation. Costs nothing, brings freelance work.
2. **Route A demo (next):** project-volume import + the sun-study report for one real Uccle permit, as already planned
   below (step 1). Show it to 5-10 architects.
3. **Route B pitch:** a "your square, redesigned, with life in it" page for Uccle (Place de Saint-Job or the town hall
   square), sent to Uccle's urbanism department.
4. **Game (Route F):** only a small prototype after the city is merged and clean.

**Before anything public:** licences (OSM credit visible; the SNCB GTFS re-use agreement; STIB licence read; Megascans
not used on the live site; Mixamo clips not shipped; Open-Meteo attribution), and the Vercel push only on the owner's
word.

---

Research date: 4 November 2026. Web research only. When I could not verify something, it says **unverified** or **estimate**. Prices are what I found, not quotes.

---

## Summary

- **Honest verdict:** the 3D city on its own will not sell. Nobody in Brussels pays for "a nice 3D map", because the Region already gives the 3D buildings away for free (UrbIS, CC0) and Google, Apple and Shadowmap show 3D cities for free or almost free. Money comes from **a job done with the city**: a sun study, a project shown in its real street, a participation page for a commune. You sell the result, not the engine.
- **Your real advantage:** it is fast, good-looking, runs on phones, has the real sun, and covers Brussels at UrbIS quality. Shadowmap, the closest competitor, has *no* high-quality buildings for Belgium (its HQ list is Germany, NL, Switzerland, Vienna and Tokyo). Nobody official offers a public, good-looking 3D viewer of Brussels with sun and shadow.
- **Best route 1 — "project in its context + sun/shadow study" for architects and developers in Brussels.** Who pays: architects and developers, per project. Rough price: a few hundred to a few thousand euros (**estimate**). It is quick to start and builds on what you have.
- **Best route 2 — interactive 3D pages for communes and the Region (participation, PADs, heat islands).** Who pays: communes and regional bodies, through small public contracts or perspective.brussels' participation purchasing centre. Rough price: €5k–30k per project (**estimate**, based on what participation platforms cost). Sales are slow, but projects are big and repeat.
- **Route 3 (do this anyway) — use it as your showcase** to win freelance WebGL/3D web jobs (real estate launch sites, brands, events). This is probably the fastest money because it is your current job.
- Avoid: a consumer subscription app (Shadowmap is already there at €2.50–10/month), and anything built on Google 3D Tiles (pay-per-use, strict rules).

---

## What exists in Brussels (official)

| What | Who runs it | What it does | Is it a competitor? |
|---|---|---|---|
| **UrbIS 3D Constructions** (LoD2 buildings) | **Paradigm** (the regional IT body, formerly CIRB/CIBG) | Free download of every building in 3D (LoD2), updated monthly; formats SHP, DWG, SketchUp, GeoPackage. Licence CC0. | No. It is your raw data. It is a **download**, not a public viewer. |
| **UrbIS Landscape** (formerly "ADM 3D V2 Beta") | Paradigm | 3D buildings + terrain model as one product. | No, data. |
| **Datastore.brussels viewer** | Paradigm | New version in mid-2025; it is a **2D** map viewer of all open geodata. | No dedicated 3D viewer found. |
| **BruGIS** (gis.urban.brussels) | **urban.brussels** | 2D mapping portal (heritage, permits, PRAS, perspective.brussels layers). | No 3D found. |
| **perspective.brussels** | Regional planning office | Makes PADs (master plans) with 3D *images* made by design offices; runs the **Participation Service** and the participation.brussels platform (launched April 2024). | Not a 3D tool, but a **potential customer**. |
| **Carte solaire** | Bruxelles Environnement | Roof solar potential per parcel (kWh/m²/year), PV payback. | Partly overlaps (sun), but it is about roofs and PV, not shadows on streets or flats. |
| **Twin4Resilience** (Interreg NWE, 2024–2027, €8.38M total, 14 partners) | City of Brussels (Data Unit) is the Brussels partner | Local digital twin pilot on **urban heat islands**. Mostly about capacity building and a handbook. | A **potential partner/customer**; technical details of the Brussels pilot not found. |
| **FARI** (AI institute, VUB-ULB) | FARI | Digital twin work: traffic model of the Tulipe area (Ixelles), building modelling; event "What if Brussels had a digital twin?" on 20 March 2025 said projects run in **Ixelles** and **City of Brussels**. | Research. Possible partner. |
| **Brupartners** | Economic and social council of the Region | Advisory body. I found **no 3D or digital-twin tool** from Brupartners. | No. |
| **Climate OS** (private, July 2026) | A Brussels resident (name not given) | Web map of the Brussels microclimate: sunniest terraces, shady streets, cool places. 3D not mentioned. | **Yes, a small direct competitor** for the consumer "sun" use case. Check it. |

**Public tenders for 3D / digital twin in Brussels:** I searched TED and the web and found **no tender** from the Brussels Region or a commune for a 3D city model, digital twin or 3D participation tool. The only related tender I found is the **European Commission's** "Local Digital Twins Toolbox" (TED 526647-2023), which is EU-level and not for a solo freelancer. **This is not proof there are none**: Belgian small contracts are often not published on TED. You should search e-Procurement yourself (see Next steps).

**Shadow studies in permits:** I found **no general rule** in Brussels that a permit file must contain a sun/shadow study ("étude d'ensoleillement").
- For big projects, shadow studies appear inside **impact studies / impact reports** (étude/rapport d'incidences), in the "microclimate" chapter: e.g. the Biestebroeck PPAS in Anderlecht (2016) and the RTBF headquarters study (2019) with shadow maps at several dates and hours.
- For small projects (extensions, dormers), neighbours sometimes ask for one. The Council of State (judgment 260.453, 23 July 2024, Woluwe-Saint-Lambert) rejected a neighbour's complaint that no shadow study was required: it said a study was not necessary *in that case*. So it is a **case-by-case** demand, often raised by neighbours or the consultation committee. That still means there is a need: architects want to answer "you will take my sun" objections quickly.
- The new RRU ("Good Living") has kept slipping (a 1 September 2025 start was announced); I could **not confirm** whether it is in force today or whether it adds sunlight rules. **Unverified.**

---

## Competitors

| Player | What it offers | Price | Brussels quality | Notes |
|---|---|---|---|---|
| **Shadowmap** (Austria) | Sun and shadow in 3D anywhere, any date; edit buildings; upload your own 3D model (Studio); solar analytics; embed. | Free; Explorer €2.50/month (yearly); Home €10/month; **Studio €60/month** (+ extra projects from €30/month); Enterprise/API on request. | High-quality buildings only in DE, NL, CH, Vienna, Tokyo. **Belgium is not on that list**, so Brussels uses generic worldwide buildings (likely OSM-based; **unverified** how good they look). | The closest competitor. Proves people pay for sun/shadow. Your edge: real UrbIS LoD2 roofs, LiDAR trees, nicer image. |
| **Google Photorealistic 3D Tiles** | Photogrammetry 3D of many cities. | 1,000 free events/month, then $6 per 1,000 (falls to $2.40 at high volume). | Brussels appears in Google Earth 3D; current tile quality **unverified**. | Rules: no caching/offline, no extraction, **you may not trace or derive 3D models from it**, Google logo and attribution must be shown, visualisation only. Games are not mentioned at all. Bad base for a product you want to own. |
| **Cesium / Cesium ion** (bought by Bentley Systems, Sept 2024) | 3D tiles hosting and streaming. | Community free but **non-commercial only**; Commercial $149/month (individual), Premium $499/month; using it in products for outside clients needs a talk with sales. | Depends on data you upload. | A tool, not a direct competitor. You do not need it. |
| **Esri ArcGIS Urban / CityEngine** | Planning software for city administrations (zoning, scenarios, 3D). | Urban: yearly per-user subscription, price not public (third party says now bundled in "Professional Plus", **unverified**). CityEngine about $2,000/year (TrustRadius). | Uses customer data. | What big administrations buy. You don't compete head-on; you are the light, public-facing, mobile version. |
| **Twinmotion / Unreal** | Architects make renders and videos of their projects. | Twinmotion: from memory free under $1M revenue, paid seat above — **unverified, check epicgames.com**. | Context must be modelled or imported (UrbIS SketchUp works). | Architects can already do sun images themselves. Your value: **context ready + web link anyone can open on a phone**. |
| **Nomoko** (Zurich/Luxembourg) | Digital twins for real estate and municipalities. | Not public. | Switzerland, expanding to DE/FR/LU; **no Belgium found**. | Shows the business model exists in Benelux. |
| **Belgian archviz studios** (e.g. Be Present, Rendoo, 3d-Lab, Modernise, Polygon) | Renders and animations for developers. | Not public. | They model context case by case. | They are possible **clients/partners** (you supply the Brussels context), not only competitors. |
| **Real-estate portals** (Immoweb, Zimmo, Immovlan) | Immoweb shows garden/terrace **orientation** as a data field; Zimmo has a plot orientation field; virtual tours filter. | — | — | I found **no sun or 3D feature** on any of them. A gap, but selling to a big portal is hard for a solo developer. |
| **Go Vocal (ex-CitizenLab, a Brussels company)** | Online participation platform (surveys, votes, budgets). The Brussels Region used it for its mobility plan; Ghent, Leuven, Kortrijk use it. | UK public catalogue: **£12,500–£36,500 per year**. | 2D, no 3D city. | Shows what communes pay for participation software. Possible partner: they have the clients, you have the 3D. |

---

## Where the gaps are

1. **No good public 3D view of Brussels with real sun.** Paradigm publishes the data but no viewer; Shadowmap has no good Belgian buildings; Google's 3D cannot be reused freely.
2. **Shadow questions in permit files are case by case and argued with weak evidence.** The Council of State case above was about "the plans were imprecise". A fast, credible "before/after" shadow viewer for a specific address is a real, small need for architects and neighbours.
3. **Participation is funded and organised** (participation.brussels, a purchasing centre at perspective.brussels, Go Vocal contracts), but the tools are 2D. A 3D "see the project in your street, at your hour" page is missing.
4. **Heat and shade** is a current political topic (Bruxelles Environnement heat maps, City of Brussels pilots, Twin4Resilience). Shade from trees and buildings at real dates is exactly what your engine does.
5. **Real-estate portals** show orientation as a word, not as sun hours. Nobody sells "sun hours of this flat/terrace" in Belgium (found nothing).

---

## Routes to money

### Route A — Sun/shadow study and "project in its context" for architects and developers
- **What you sell:** for one address: the new project volume (from the architect's SketchUp/IFC/simple box) placed in your Brussels city, shadows at standard dates (solstices, equinoxes, hourly), before vs after, as a PDF + a **web link** anyone can open on a phone.
- **Who pays:** architects (for permit files, neighbour objections, consultation committee), developers (for sales and permits), sometimes neighbours' lawyers.
- **Price:** no Belgian price found anywhere. **Estimate:** €400–900 for a simple study (small extension), €1,500–4,000 for a larger building with web viewer. Comparison: Western-European archviz studios charge about **$1,000–5,000 per high-quality image** (CGarchitect); Belgian architect fees for small missions start around €1,500 (Trustup, commercial site).
- **Effort:** medium. You need: import of a project volume, a standard report layout, an exact sun model (you have it), and documented method (software, dates, parameters). An ULiège case study criticised a sun study for not stating its software, parameters and affected houses, so writing the method down is part of the product.
- **Risks:** demand is case by case (no legal obligation found); architects can do rough shadows in SketchUp/Revit themselves; you must be precise (heights, roofs) because it may be argued in a legal dispute; liability (add a clear disclaimer, consider professional insurance).

### Route B — 3D participation and planning pages for communes and the Region
- **What you sell:** a public web page for one project or area (a PAD, a square redesign, a tram line, a heat-island plan): current city vs project, the real sun, phone-friendly, maybe a simple vote or comment link.
- **Who pays:** the 19 communes (urbanism or participation departments), perspective.brussels, urban.brussels, Bruxelles Environnement, City of Brussels (Twin4Resilience heat pilot), Bruxelles Mobilité/STIB for big projects (the Neder-over-Heembeek tram already had a participation part in its study).
- **Price:** **estimate** €5,000–30,000 per project, maybe yearly hosting/maintenance on top. Reference: Go Vocal participation platform £12.5k–36.5k per year (UK). Small public contracts below the "marché de faible montant" threshold (I believe €30,000 excl. VAT in Belgium — **verify**) can be bought with just a quote, no big tender.
- **How to get in:** perspective.brussels' **Participation Service runs a purchasing centre** with 6 lots of participation services that communes can use (contact participation@perspective.brussels, Rue de Namur 59). I could not read the lot list; you may have to team up with a firm that holds a lot (design/facilitation agencies) as their 3D subcontractor.
- **Effort:** high in sales (slow, months), medium in tech (project import, bilingual FR/NL, accessibility, hosting with good uptime).
- **Risks:** long decision times, elections and budgets, procurement paperwork, the need for FR+NL, public bodies may prefer big vendors (Esri, Bentley) or EU projects. A one-person supplier is a risk for them: offer to give the code/data to them at the end.

### Route C — Showcase for your freelance work (WebGL / 3D web)
- **What you sell:** your usual web development, but higher-value: real-estate launch websites with the building in the real neighbourhood, interactive maps for events, brand experiences.
- **Who pays:** developers' marketing teams, agencies, archviz studios that need web viewers, brands.
- **Price:** your normal day rate (**I found no reliable Belgian rate list**; the online sources are old or foreign).
- **Effort:** low; you are already doing it. Make a clean public demo page and a 60-second video.
- **Risks:** few. It does not scale, but it pays now.

### Route D — Tourism, brands and "branded city" games/events
- **Example:** Virtual Helsinki (built by Zoan with the city) hosted a virtual concert with about 1.4 million viewers (2020) and a Eurovision tie-in in Fortnite (2023). No revenue figures published.
- **Who pays:** visit.brussels, brands, event organisers, media.
- **Price:** unknown, project-based (**estimate**: €10k+ for a branded event, but rare).
- **Effort:** high, and sales are one-off.
- **Risks:** hit-or-miss; Helsinki had a whole company and city marketing behind it.

### Route E — "Sun hours of this flat" for real estate (B2B2C)
- **What you sell:** a small embed for agencies/listings: "this terrace gets 6 h of sun on 21 June".
- **Who pays:** real-estate agencies or a portal.
- **Price:** **estimate** €20–100 per listing or a monthly fee per agency.
- **Effort:** medium (you need floor height and facade per listing).
- **Risks:** needs volume and a sales channel; Shadowmap "Home" already serves house hunters at €10/month; Climate OS covers terraces for free.

### Not recommended
- **Consumer subscription app** — Shadowmap already exists worldwide at low prices.
- **Selling the data/3D model** — the data is free (CC0); nobody will pay for it.
- **Building on Google 3D Tiles** — pay-per-use, no caching, no derived models.

---

## Licences

| Data | Licence | Commercial use | What you must do | Confidence |
|---|---|---|---|---|
| **UrbIS 3D Constructions** (buildings) | **CC0 1.0** (public domain), stated in the Geobru metadata record, revised 2026-03-07, monthly updates. | Yes, no conditions. | Nothing required. A credit "UrbIS © Paradigm" is polite and good for trust. | **Confirmed** on the dataset record. The be.brussels UrbIS page only says "Open Data license, free and unrestricted use" without naming CC0, and datastore.brussels uses CC0, CC-BY or paid licences depending on the dataset — so **check each UrbIS dataset you use** (buildings, roads, addresses, terrain). |
| **Orthophoto 2024** (Paradigm; flights 20–21 Sept 2024; 40 cm and 5 cm) | Record says "Creative Commons (CC-0) – no conditions for reuse, the data is in the public domain". | Yes. | Nothing required. | Mostly confirmed. The same record has inconsistent "other restrictions" fields; keep a screenshot of the CC0 statement. |
| **OpenStreetMap** (roads) | **ODbL 1.0**. | Yes. | Show "© OpenStreetMap contributors" (link to openstreetmap.org/copyright) **visibly on the map, without the user having to click**. Your rendered city is a "Produced Work": you can keep your own code and visuals closed. If you publish a **derived database** (e.g. your processed road data in a form someone can extract), that data must be under ODbL, and on request you must offer the derived data or the means to recreate it. Easiest: be ready to share your processed OSM road data under ODbL. | Confirmed (OSMF attribution guideline 2021 and licence FAQ). Not legal advice. |
| **LiDAR trees** | Depends on which LiDAR you used (Paradigm/Brussels LiDAR?). | **Check** the record of the exact dataset. | — | **Not checked** (source not specified to me). |
| **STIB GTFS** | Licence page is on STIB's Opendatasoft portal; an account/API key is needed. | **Unverified.** The GTFS is described as "free to use" by a third-party aggregator, but I could not open the licence text (pages returned 404/redirect). Belgian rail (SNCB) uses a special licence that forbids redistributing the raw data, so do not assume. | Read the licence on opendata.stib-mivb.be and get a written OK before using it in a paid product. | **Unverified.** |
| **Google Photorealistic 3D Tiles** | Google Maps Platform terms. | Yes, paid, visualisation only. | No caching/offline, no extraction, no tracing/deriving models, Google logo + attribution line visible, say which parts are Google. | Confirmed from Google policy page. |

---

## Next steps (concrete)

1. **Build one demo for Route A (1–2 weeks):** pick a real recent permit in Uccle (public inquiry notices are posted and listed by the commune), put a simple box of the project in your city, and make a page: slider for date and hour, before/after toggle, "sun hours lost" for the neighbouring gardens, and a one-page PDF with the method (data sources, dates, software, heights). This is your sales tool.
2. **Show it to 5–10 Uccle/Ixelles architects** (small offices doing extensions and small buildings) and ask two questions: "Would this have helped in your last neighbour objection?" and "Would you pay €500 for it?". Their answers set your price better than any web search.
3. **Write to Uccle's urbanism department** (your home commune, the city is already built) with the demo: offer a pilot for one public inquiry or one public space project. Ask how they buy small digital services.
4. **Write to perspective.brussels' Participation Service** (participation@perspective.brussels): ask which firms hold the lots of their purchasing centre and whether 3D visualisation fits. Then contact one or two of those firms to offer yourself as their 3D subcontractor.
5. **Contact the City of Brussels Data Unit (Twin4Resilience heat-island pilot) and FARI**: show the sun/shade view of a heat-vulnerable area (Pentagone, Nord, Laeken). Ask what they use and whether a public-facing viewer is missing.
6. **Search Belgian e-Procurement yourself** (publicprocurement.be / e-Notification) for: "3D", "maquette 3D", "modélisation 3D", "jumeau numérique", "digitale tweeling", "visualisation", "participation". Set an alert (e.g. a tender-alert service). I found none online, but small notices are easy to miss from outside.
7. **Check Shadowmap and Climate OS in Brussels yourself** (Uccle, a few streets): screenshots side by side with your engine. This comparison is your best marketing image.
8. **Licences housekeeping:** add a visible credits line now ("Buildings: UrbIS © Paradigm (CC0) · Roads: © OpenStreetMap contributors · Orthophoto: Paradigm"), check the LiDAR dataset licence, and read the STIB licence before adding transit.
9. **Before charging for sun studies:** add a disclaimer ("indicative, based on public data") and ask an insurer about professional liability.

---

## Sources

All accessed 4 November 2026.

**Brussels official data and tools**
- UrbIS 3D Constructions, Geobru record (CC0, LoD2, revised 2026-03-07): https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/e9ec2aa4-cffd-11ee-bccc-00090ffe0001
- UrbIS 3D on datastore.brussels: https://datastore.brussels/web/data/dataset/e9ec2aa4-cffd-11ee-bccc-00090ffe0001
- UrbIS 3D technical specification (FR, 2024-04-09): https://urbisdownload.datastore.brussels/UrbIS/TechSpec/3D_TechSpec_FR20240409.pdf
- UrbIS Landscape record: https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/713171e6-65e3-11ef-b378-010101010000
- UrbIS data page (be.brussels): https://be.brussels/en/about-region/urbis-data
- datastore.brussels licence types (EU data portal use case): https://data.europa.eu/sites/default/files/use-cases/belgium_-_datastore.brussels.pdf
- Orthophoto 2024 East-West record (CC0): https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/0cddaccd-30e4-40a3-92ca-78bf3d8c88b3
- Orthophoto 2024 North-South record: https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/791c9293-e20e-4189-8bdc-e73f8b2fa54c
- Brussels government release on new Datastore viewer (July 2025): https://admin.be.brussels/en/bhg/document/download/5566
- BruGIS mention (Erfgoed Brussel no. 36): https://erfgoed.brussels/links/digitale-publicaties/pdf-versies/artikels-van-het-tijdschrift-erfgoed-brussel/nummer-36/artikel-36-14
- Carte solaire, Bruxelles Environnement: https://environnement.brussels/citoyen/outils-et-donnees/sites-web-et-outils/la-carte-solaire-de-la-region-de-bruxelles-capitale
- Twin4Resilience (City of Brussels): https://smartcity.brussels.be/projects/twin4resilience-t4r-project and https://t4r.nweurope.eu/ and https://data.europa.eu/en/news-events/events/smart-cities-and-digital-twin-technology-case-brussels
- FARI building modelling / traffic: https://fari.brussels/research-and-innovation/project/building-modelization , https://www.fari.brussels/research-and-innovation/project/modelling-traffic
- FARI "What if Brussels had a digital twin?" (20 March 2025): https://www.fari.brussels/calendar/what-if-brussels-had-a-digital-twin
- participation.brussels launch (BX1, 24 April 2024): https://bx1.be/categories/news/lancement-de-la-plateforme-participation-brussels-dediee-a-la-participation-citoyenne/
- perspective.brussels participation inventory (June 2025): https://perspective.brussels/sites/default/files/documents/dynamiques-publiques-de-participation-citoyenne-en-region-bruxelloise_fr_juin-2025.pdf
- perspective.brussels participation purchasing centre flyer: https://perspective.brussels/sites/default/files/documents/participation_depl_web.pdf
- PAD 3D images (Bruxelles Patrimoines no. 36): https://patrimoine.brussels/liens/publications-numeriques/versions-pdf/articles-de-la-revue-bruxelles-patrimoines/numero-36/article-36-15
- Climate OS (BX1, 10 July 2026): https://bx1.be/categories/news/lieux-de-fraicheurs-rues-ombragees-terrasses-au-soleil-climate-os-cartographie-le-microclimat-bruxellois/
- City of Brussels heat-island pilots (council decision 9 Sept 2024): https://www.brussels.be/sites/default/files/bxl/workflow/09-09-2024/09%2009%202024%20OJ%20point_punt%20(065)/065_Arr%C3%AAt%C3%A9%20Conseil.pdf
- Neder-over-Heembeek tram participation (BX1): https://bx1.be/bruxelles-ville/les-dossiers-de-la-redaction-demarrer-la-participation-avant-la-pose-des-rails-du-tram-de-neder-over-heembeek/

**Procurement**
- EC Local Digital Twins Toolbox (TED 526647-2023): https://ted.europa.eu/en/notice/526647-2023/pdf and https://digital-strategy.ec.europa.eu/en/funding/pre-notification-development-local-digital-twins-ldt-toolbox

**Permits and shadow studies**
- Council of State 260.453 (23 July 2024): https://kohenavocats.com/jurisprudences/eclibervsce2024arr-260-453/
- Biestebroeck PPAS microclimate study (2016): https://anderlecht.be/sites/default/files/medias/Files/developpement-urbain/Biestebroeck%20II/24-11RIE%2005%20BIE%2020160601%20MICROCLIMAT-CT.pdf
- Impact studies (Bruxelles Environnement): https://environnement.brussels/citoyen/services-et-demandes/trouver-un-professionnel-agree-ou-enregistre/trouvez-un-professionnel-specialise-en-etude-dincidences
- Flawed sun study case (ULiège, Malmedy): https://orbi.uliege.be/bitstream/2268/321819/1/Etude%20d%27ensoleillement%20erron%c3%a9e%2c%20un%20cas%20d%27%c3%a9cole%20%c3%a0%20%20Malmedy.pdf
- Good Living / RRU timeline (BX1): https://bx1.be/categories/news/le-gouvernement-bruxellois-saccorde-sur-une-version-remaniee-du-projet-good-living/
- urban.brussels permits: https://be.brussels/fr/developpement-urbain/urbanisme

**Competitors and prices**
- Shadowmap pricing: https://shadowmap.org/pricing
- Shadowmap App Store: https://apps.apple.com/app/shadowmap-find-sun-shadow/id1566789060
- Google Map Tiles API policies: https://developers.google.com/maps/documentation/tile/policies
- Google Maps Platform pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Google 3D Tiles Q&A: https://cloud.google.com/blog/products/maps-platform/commonly-asked-questions-about-our-recently-launched-photorealistic-3d-tiles
- Cesium ion pricing: https://cesium.com/platform/cesium-ion/pricing/
- Bentley acquires Cesium (6 Sept 2024): https://www.geoweeknews.com/articles/bentley-systems-cesium-acquisition-geospatial-3d-itwin/
- ArcGIS Urban licensing (Esri community): https://community.esri.com/t5/arcgis-urban-questions/what-sort-of-licensing-credentials-needed-for/m-p/1486630
- ArcGIS Urban review (third party): https://flypix.ai/?p=184213
- CityEngine price (TrustRadius): https://www.trustradius.com/products/arcgis-cityengine/pricing
- Nomoko: https://medium.com/nomoko/the-10-biggest-swiss-cities-now-in-high-res-3d-3dbe63454920
- Belgian visualisation studios: https://www.maverickframe.com/blog/top-3-visualization-studios-in-belgium/ and https://www.sortlist.co.uk/agency/be-present
- Immoweb fields (scraper description): https://apify.com/parseforge/immoweb-scraper.md ; Zimmo: https://apify.com/studio-amba/zimmo-scraper.md
- Go Vocal UK G-Cloud price: https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/services/502005855228830
- Go Vocal / Brussels mobility plan: https://www.casestudies.com/company/go-vocal/case-study/brussels-region-used-citizenlab-to-design-its-new-mobility-plan
- Wigan contract (Go Vocal, £20,580): https://www.wigan.gov.uk/Docs/PDF/Council/Disclosure-Logs/2025/18107.pdf
- Archviz pricing in Europe (CGarchitect): https://cgarchitect.com/features/articles/72a4b185-pricing-architectural-visualization-across-europe-challenges-and-strategies-for-freelancers-and-small-studios
- Belgian architect fees (Trustup, commercial): https://blog.trustup.be/fr/prix-architecte/
- Virtual Helsinki / Zoan: https://govlaunch.com/projects/helsinki-fi-partnered-with-zoan-to-launch-a-vr-tourism-platform-using-a-digital-twin-of-the-city and https://lbbonline.com/news/finnish-eurovision-entry-gears-up-for-competition-in-fortnite
- Leuven / Ghent digital twins (DUET, URBREATH): https://www.vlaio.be/nl/vlaio-netwerk/de-vitrine/artikels/burgerparticipatie-voor-slimme-steden-de-praktijk

**Licences**
- OSM attribution guideline: https://osmfoundation.org/wiki/Attribution
- OSM licence FAQ: https://osmfoundation.org/wiki/Licence_and_Legal_FAQ
- STIB GTFS feed listing (licence link): https://mobilitydatabase.org/feeds/gtfs/mdb-1088
- SNCB developer licence (comparison): https://www.belgiantrain.be/fr/support/faq/faq-developers/faq-developers-procedure
