# CONTENT AUDIT — Engineered Reality Portfolio

Audit of the rebuild against the previous site (`_backup_original_v5/index.html`, `_backup_original_v5/JS/main.js`) plus the owner's subsequently supplied violence-detection technical report and measured evaluation results. No unsupported claim was invented. Everything below needs the owner's eyes before publishing.

Legend: 🔴 must resolve · 🟠 verify · 🟢 handled/decision recorded

---

## 1. Naming & projects requiring owner input

| # | Item | Finding | Status |
|---|------|---------|--------|
| 1.1 | **"MYMO2" product name** | The brief names the vehicle tracker **MYMO2**. The old site never uses this name — it calls the project *"Car Tracker — LTE/BLE/GPS IoT Device"* (EC200U · QuecOpen, Palmlabs). "MYMO2" is owner-supplied, not from the source portfolio. Used as given; **confirm this is the real product name** and cleared for public use. | 🟠 |
| 1.2 | **Robust Real-Time Violence Detection** | The owner supplied a complete technical report and genuine RTX 4050 test results: SCFD + SCVD, R(2+1)D-18, validation-tuned threshold, held-out metrics, subgroup findings, latency, limitations, and ethics. The project is now marked **Freelance Project · Developing actively**. Generated CCTV art remains clearly conceptual. | 🟢 owner-supplied case study integrated |
| 1.3 | **Device Management & OTA Platform** | Not a standalone project in the old site. Assembled honestly from **real** content that does exist: the FOTA-over-HTTP + BLE-configurator work (Car Tracker/MYMO2), the custom OTA-over-XBee/LoRa work (Shooting Range), and the Palmlabs Embedded role bullet *"Architect device-to-cloud systems including FOTA/OTA update pipelines, cross-platform BLE configurators."* No new capabilities were claimed. | 🟢 composite (disclosed) |
| 1.4 | **Unified Device Lifecycle Database** | Maps to the real *"Production Database & Tracker Device Management"* project. The **manufacturing → testing → provisioning → activation → deployment → support → retirement** staging is an **editorial/conceptual** structure layered over the real records (inventory, SIM/IMEI, assignment, installation status, service history). Labelled conceptual on the case-study page. | 🟢 (framing disclosed) |

## 2. Contact & privacy

| # | Item | Finding | Status |
|---|------|---------|--------|
| 2.1 | **Email** | Old site `mailto:` used `owais1.iqbal@mail.com`; account email is `owais1.iqbal@gmail.com`. **Owner chose gmail.com.** The `@mail.com` value was likely a typo. | 🟢 gmail |
| 2.2 | **Phone (+966 539 217 440)** | Publicly listed. Brief required an explicit check. **Owner chose to keep it public.** | 🟢 kept |
| 2.3 | **LinkedIn / GitHub** | `linkedin.com/in/owais-malik63`, `github.com/owai63` — carried over verbatim. Confirm both resolve. | 🟠 |

## 3. Contradictions & inconsistencies in the source

| # | Item | Finding | Status |
|---|------|---------|--------|
| 3.1 | **"AWS Certified AI Practitioner" cert** | In the old site this card is internally contradictory: title says *AWS Certified AI Practitioner*, but issuer is *Coursera · DeepLearning.AI*, the listed skills are ML regression/Python/SVM, and its "verify" link is **identical** to the *Supervised Machine Learning* card (`…/verify/UGHQ4HZC8VQC`); its onclick pointed at an unrelated Credly badge. It looks like a **mislabelled duplicate** of the Supervised ML certificate. **Not shown** in the rebuild's Credentials to avoid presenting an unverifiable claim. Do not guess a correction — confirm what this credential actually is (or drop it). | 🔴 |
| 3.2 | **Northern Mountains end date** | Old `index.html` shows **"Aug 2024 – Nov 2024"**; the old `README.md` table shows **"Aug 2024 – Nov 2025"**. Used the HTML value (Aug 2024 – Nov 2024). Confirm the correct end date. | 🟠 |
| 3.3 | **EDUCBA cert years (2025, 2026)** | *Embedded Systems using C* = 2025, *Embedded C Programming Essentials* = 2026. Carried over as-is; unusual dating — confirm issue dates. | 🟠 |

## 4. Unverified metrics — conservatively softened

To avoid presenting unverifiable numbers as fact, two specific claims from the
old Systems Administrator entry were **softened** (not deleted, not invented):

- "ensuring **99%+ uptime**" → "targeting **high uptime**".
- "thousands of connected field devices" → "connected field devices".

If these figures are real and defensible, restore them in
`src/data/content.ts` (they are the only numeric claims that were relaxed). All
other bullet content is reproduced from the source verbatim or lightly
condensed without changing meaning.

## 5. Content deliberately moved to secondary / removed

| Change | Rationale (from brief) |
|--------|------------------------|
| E-commerce / drop-shipping → **Additional experience** (one line) | Keep the embedded-engineering identity primary. |
| Cedrus web internship → **Additional experience** | Secondary to embedded work. |
| Pet Tracker, Hand-Gesture Car, FSM Traffic, Bank System, Food Ordering → **Additional builds** list | Keep Selected Systems focused on the six featured. |
| **Radar chart + skill % pills** → removed | Replaced with five capability groups, no proficiency percentages. |
| Open-To list of 10 roles → **3 focused positions** + a secondary line | Per brief. |
| Boot terminal, custom cursor, mouse-trail, click bursts, circuit canvas, Konami code, morse footer, typewriter, scramble headings | Removed — off-brief for the calm, cinematic direction. |

## 6. Claims presented as-is (owner-reported, not independently verifiable)

All experience bullets, project bullets, the Gold/Silver medals ("Final Year
Project Distinction" / "Academic Excellence", Hitec University), CGPA 3.59/4.00,
and the BS Computer Engineering (Hitec University, 2020–2024) are reproduced
from the source portfolio. They are **self-reported**; nothing here verifies
them. Certification "Verify credential" links point to the original Coursera
accomplishment URLs and should be confirmed live.

## 7. Conceptual imagery labelling

Every project visual in the rebuild is **code-rendered (SVG/Canvas/WebGL)** and
is labelled "Conceptual visualization" in the UI. None is presented as a
documentary photo, screenshot, or captured telemetry. If real photos/renders
from Higgsfield are added later, keep the "Conceptual visualization of…" label
unless the asset is a genuine documentary capture.
