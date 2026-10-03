# Escopo ativo: São João de Meriti

Município IBGE 3305109. O usuário aprovou os 16 bairros do Censo 2022. Município, três distritos e 809 setores são escalas complementares, não uma hierarquia bairro-distrito estrita. A aplicação apresenta indicadores sem pontuação composta nem ranking. Data.Rio, AP e RA descrevem o projeto histórico abaixo e não o município ativo. Ver `docs/phases/meriti-execution.md`.

# Rio Nature-Based Solutions Explorer

This context defines the language for a web app that prioritizes territorial opportunities for nature-based solutions in Rio de Janeiro.

## Language

**Territorial Opportunity**:
A place where crossed urban, environmental, hydrological, and social evidence suggests a meaningful potential intervention.
_Avoid_: Point of interest, hotspot

**Map Workspace**:
The primary exploration surface where geographic evidence is overlaid, filtered, and selected.
_Avoid_: Dashboard, output screen

**Evidence Overlay**:
A visible geographic layer representing source data or derived prioritization evidence on the map.
_Avoid_: Toggle, checkbox layer

**Territorial Opportunity Card**:
The explanatory view opened from a selected territory, summarizing priority, evidence, and suggested solution classes.
_Avoid_: Report, popup, tooltip

**Nature-Based Solution**:
An intervention that uses ecological processes to reduce urban risk or improve environmental and social conditions.
_Avoid_: Green feature, sustainability action

**Solution Class**:
A type of nature-based solution recommended from territorial evidence without specifying an engineering design.
_Avoid_: Project, work, intervention plan

**Prioritization Evidence**:
A dataset-derived signal used to explain why a territorial opportunity matters.
_Avoid_: Layer, indicator, metric

**Evidence Family**:
A thematic group of prioritization evidence used to organize related datasets and explain their role in the analysis.
_Avoid_: Data bucket, topic

**Source Dataset**:
A discovered or acquired dataset kept with provenance before it is accepted as prioritization evidence.
_Avoid_: Evidence, layer, indicator

**Dataset Inventory**:
A broad collection of source datasets gathered for evaluation, consolidation, and possible transformation.
_Avoid_: Final database, approved evidence

**Data Catalog**:
A supporting transparency view that documents discovered, used, rejected, and pending source datasets.
_Avoid_: Main app, map layer list

**Collection Phase**:
The phase that discovers, acquires, stores, and inventories broad source datasets before analytical filtering.
_Avoid_: Scraping phase, download step

**Data Curation Phase**:
The phase that evaluates, cleans, harmonizes, transforms, and promotes source datasets into prioritization evidence.
_Avoid_: Saneamento, cleanup step

**Implementation Phase**:
The phase that builds the web app, map workspace, overlays, cards, timeline, and user-facing interactions from curated evidence.
_Avoid_: Frontend phase, visualization only

**Target Architecture**:
The intended end-state structure that guides collection, curation, and implementation decisions from the beginning.
_Avoid_: Future idea, later architecture

**Temporal Evidence**:
Prioritization evidence that can be compared across dates or periods to show change over time.
_Avoid_: Historical data, timeline data

**Interpretation Lens**:
The audience-oriented framing used to present the same prioritization evidence with different levels of technical detail.
_Avoid_: Easy mode, expert mode

**Technical Lens**:
An interpretation lens for readers who need methodological detail, uncertainty, and traceability.
_Avoid_: Academic mode, raw mode

**Science Communication Lens**:
An interpretation lens for readers who need clear public-facing explanations without losing scientific integrity.
_Avoid_: Simplified mode, layperson mode

**Planning Area**:
An official Rio de Janeiro territorial grouping used to filter and compare urban conditions across the city.
_Avoid_: Region, macrozone

**AP3 Study Scope**:
The Planning Area 3 territorial scope that anchors the user's master's research focus.
_Avoid_: North Zone, case area

**Census Sector**:
The fine-grained census geography used as the preferred analytical unit when source data supports it.
_Avoid_: Micro-area, block

**Territorial Drilldown**:
A navigation path from Planning Area to more granular territorial units for analysis and communication.
_Avoid_: Exploded granularity, zoom levels

**Active Territorial Unit**:
The currently visible geography that can be selected on the map and explained in the opportunity card.
_Avoid_: Click target, selected layer

**Urban Water Risk**:
The first prioritization axis, focused on places where flooding, drainage, sanitation, exposure, and vulnerability intersect.
_Avoid_: Climate risk, water issue

**Prioritization Score**:
A comparative value that ranks territorial opportunities by the strength and urgency of their prioritization evidence.
_Avoid_: Index, grade, ranking

## Relationships

- A **Territorial Opportunity** is supported by one or more **Prioritization Evidence** signals.
- A **Dataset Inventory** contains many **Source Datasets**.
- A **Source Dataset** may become **Prioritization Evidence** after evaluation and transformation.
- A **Data Catalog** documents the **Dataset Inventory** without being the primary user experience.
- The **Collection Phase** builds the **Dataset Inventory**.
- The **Data Curation Phase** transforms selected **Source Datasets** into **Prioritization Evidence**.
- The **Implementation Phase** exposes curated **Prioritization Evidence** through the **Map Workspace** and related views.
- The **Target Architecture** guides all three phases from the start.
- **Prioritization Evidence** belongs to one **Evidence Family**.
- **Temporal Evidence** is a type of **Prioritization Evidence**.
- A **Map Workspace** displays one or more **Evidence Overlays**.
- Selecting an **Active Territorial Unit** in the **Map Workspace** opens a **Territorial Opportunity Card**.
- A **Territorial Opportunity Card** explains one **Territorial Opportunity**.
- A **Territorial Opportunity** may suggest one or more **Solution Classes**.
- A **Solution Class** is justified by the crossed **Prioritization Evidence** for a place.
- A **Solution Class** is a category of **Nature-Based Solution**, not a project design.
- **Urban Water Risk** is the first axis used to produce a **Prioritization Score**.
- An **Interpretation Lens** changes how **Prioritization Evidence** is explained, not which evidence exists.
- The **AP3 Study Scope** is one **Planning Area** within Rio de Janeiro.
- A **Territorial Drilldown** starts from a **Planning Area** and may reach **Census Sector** detail.
- A **Territorial Drilldown** changes the **Active Territorial Unit**.
- A **Census Sector** is the preferred unit for calculating **Prioritization Evidence** when data resolution allows it.

## Example dialogue

> **Dev:** "Should the map show every dataset as a separate layer?"
> **Domain expert:** "Only as supporting context. The main object is the **Territorial Opportunity**, because the user needs to know where to intervene and why."
>
> **Dev:** "Does the communication toggle hide uncertainty?"
> **Domain expert:** "No. The **Science Communication Lens** explains uncertainty clearly, while the **Technical Lens** exposes methodological detail."
>
> **Dev:** "Should AP3 be a separate version of the app?"
> **Domain expert:** "No. AP3 is the **AP3 Study Scope**, available through the same **Territorial Drilldown** used for other Planning Areas."
>
> **Dev:** "What should the first prioritization model focus on?"
> **Domain expert:** "Start with **Urban Water Risk**, because it connects flooding, sanitation, health, infrastructure, vegetation, and social vulnerability."
>
> **Dev:** "Should the app recommend exact engineering projects?"
> **Domain expert:** "No. It should recommend **Solution Classes** because public territorial data supports strategic direction, not final design."
>
> **Dev:** "Is the card the main output?"
> **Domain expert:** "No. The **Map Workspace** is the main exploration surface; the **Territorial Opportunity Card** explains a selected place."
>
> **Dev:** "What happens when the user clicks the map?"
> **Domain expert:** "The click selects the **Active Territorial Unit**, whether that is a Planning Area, neighborhood, administrative region, or Census Sector."
>
> **Dev:** "Should the app include historical data?"
> **Domain expert:** "Yes, when the source supports defensible comparison over time; that becomes **Temporal Evidence**."
>
> **Dev:** "Should collection be strict from the beginning?"
> **Domain expert:** "No. Build a broad **Dataset Inventory** first, then promote only defensible **Source Datasets** into **Prioritization Evidence**."
>
> **Dev:** "Should every discovered dataset appear on the main map?"
> **Domain expert:** "No. The **Data Catalog** supports transparency, while the **Map Workspace** stays focused on usable evidence."
>
> **Dev:** "Can collection start before implementation is designed?"
> **Domain expert:** "Collection can start first, but it must follow the **Target Architecture** so acquired data can flow into curation and implementation."

## Flagged ambiguities

- "Dados" can mean raw datasets, processed indicators, or explanatory evidence. Resolved: use **Prioritization Evidence** when the data is used to justify an opportunity.
- "Toggle" can imply dumbing content down. Resolved: use **Interpretation Lens** because both lenses preserve scientific integrity.
- "Explodir granularidade" was used to mean navigating from broad official territories into finer analytical units. Resolved: use **Territorial Drilldown**.
- "Classes de soluções de problemas" was used to mean categories of recommended nature-based interventions. Resolved: use **Solution Class**.
- "Saida" can mean the main exploration interface or the explanatory result for a selected territory. Resolved: use **Map Workspace** for the interface and **Territorial Opportunity Card** for the explanatory view.
- "Clicar na AP" was broadened to selecting whichever geography is currently active. Resolved: use **Active Territorial Unit**.
- "Maior numero de dados" can mean broad evidence coverage or indiscriminate dataset accumulation. Resolved: use **Evidence Family** coverage and prioritize datasets that improve defensible territorial interpretation.
- "Todos os dados possíveis" means broad discovery and acquisition, not automatic analytical acceptance. Resolved: use **Dataset Inventory** for the broad collection stage and **Prioritization Evidence** for accepted analytical signals.
- "Catalogo de dados" is supporting methodological transparency, not the main product surface. Resolved: use **Data Catalog**.
- "Saneamento" means methodological data curation, not only cleaning files. Resolved: use **Data Curation Phase**.
- "Implementacao" means the user-facing app and analytical presentation layer, not only frontend screens. Resolved: use **Implementation Phase**.
