/* ============================================================================
   ENGINEERED REALITY — Content Source of Truth
   ----------------------------------------------------------------------------
   Every fact here is extracted from the existing portfolio (index.html /
   JS/main.js). Nothing is invented. Editorial framing (section titles, the
   "Engineered Reality" concept, capability grouping, philosophy voice) is
   presentation only and adds no new factual claims about employment, metrics,
   outcomes, technologies, or credentials.

   Fields flagged `conceptual: true` or documented in CONTENT_AUDIT.md indicate
   framing or artwork that is NOT a documentary record of the real work.
   ========================================================================== */

export interface Profile {
  fullName: string;
  displayName: string;
  displayLines: [string, string];
  title: string;
  location: string;
  availability: string;
  heroStatement: string[];
  supporting: string;
  email: string;
  phone: string;
  phoneHref: string;
  linkedin: { handle: string; url: string };
  github: { handle: string; url: string };
}

export const profile: Profile = {
  fullName: 'Muhammad Owais Iqbal Malik',
  displayName: 'Muhammad Owais Iqbal',
  displayLines: ['Muhammad Owais', 'Iqbal Malik'],
  title: 'Embedded Systems & IoT Engineer',
  location: 'Riyadh, Saudi Arabia',
  availability: 'Available for relevant opportunities',
  // Kept as three editorial lines — rendered as HTML, never baked into canvas.
  heroStatement: ['I build systems', 'that leave', 'the lab.'],
  supporting:
    'Firmware, wireless communication, device-to-cloud systems, and real-world deployment.',
  email: 'owais1.iqbal@gmail.com',
  phone: '+966 539 217 440',
  phoneHref: 'tel:+966539217440',
  linkedin: { handle: 'owais-malik63', url: 'https://linkedin.com/in/owais-malik63' },
  github: { handle: 'owai63', url: 'https://github.com/owai63' },
};

/* --------------------------------------------------------------------------
   HERO PROOF — a five-second read of the profile.
   Nothing new is claimed here: the discipline line restates `profile.title`
   and `capabilities`, the points restate the Palmlabs role bullets, the
   project technology stacks, and `profile.location`.
   -------------------------------------------------------------------------- */
export const heroProof = {
  line: 'Embedded firmware · IoT devices · Wireless communication · Device-to-cloud platforms',
  points: [
    'Production IoT systems deployed',
    'Firmware, BLE, LTE, GPS, LoRa and OTA',
    'Based in Riyadh, Saudi Arabia',
  ],
};

/* --------------------------------------------------------------------------
   ENGINEERING IMPACT STRIP — focus → evidence, shown directly after the hero.
   Each evidence line is a compression of the experience bullets and project
   records further down this file; it introduces no new factual claim.
   -------------------------------------------------------------------------- */
export interface ImpactRow {
  focus: string;
  evidence: string;
}
export const impact: ImpactRow[] = [
  { focus: 'Embedded', evidence: 'Production firmware and device bring-up' },
  { focus: 'Connectivity', evidence: 'LTE-M, NB-IoT, BLE, GPS, LoRa and XBee' },
  {
    focus: 'Device management',
    evidence: 'OTA/FOTA pipelines, BLE configuration and fleet records',
  },
  { focus: 'Deployment', evidence: 'Field testing and AWS/GCP cloud integration' },
];

/* --------------------------------------------------------------------------
   PROJECTS
   -------------------------------------------------------------------------- */

export type ProjectSlug =
  | 'mymo2'
  | 'shooting-range'
  | 'device-management'
  | 'lifecycle-database'
  | 'violence-detection'
  | 'wheelchair'
  | 'pet-tracker'
  | 'cedrus-website'
  | 'hospital-website'
  | 'gesture-car'
  | 'fsm-traffic'
  | 'bank-system'
  | 'food-order';

export interface CaseTable {
  headers: string[];
  rows: string[][];
}

export interface CaseSection {
  heading: string;
  body?: string;
  bullets?: string[];
  table?: CaseTable;
  note?: string;
  /** true = conceptual/illustrative or proposed, not a documented result */
  conceptual?: boolean;
}

export interface Project {
  slug: ProjectSlug;
  index: string; // editorial chapter number
  name: string; // display name
  kicker: string; // short category line
  org: string;
  role: string;
  status: string;
  /** Groups the project on the /work index page. */
  category: 'production' | 'academic';
  summary: string;
  challenge: string;
  ownership: string;
  tech: string[];
  accent: 'cyan' | 'amber' | 'dual';
  /** true when the whole project has NO source-of-truth content in the
   *  existing portfolio and requires the owner to supply real details. */
  needsSourceContent?: boolean;
  /** heroImage may be a generated conceptual asset; alt copy states so. */
  heroImage?: string;
  heroAlt?: string;
  heroConceptual?: boolean;
  sections: CaseSection[];
}

export const projects: Project[] = [
  /* 1 — MYMO2 (existing DOSSIER: "Car Tracker — LTE/BLE/GPS IoT Device") ----- */
  {
    slug: 'mymo2',
    index: '01',
    name: 'MYMO2 Vehicle Tracking Platform',
    kicker: 'Vehicle tracking · device-to-cloud',
    org: 'Palmlabs',
    role: 'Embedded Systems Engineer',
    status: 'Deployed',
    category: 'production',
    summary:
      'A production-grade vehicle tracking system built on the Quectel EC200U module with the QuecOpen SDK — owned end to end, from hardware bring-up to field deployment.',
    challenge:
      'Ship a tracker that stays connected and accurate in the real world: reliable GPS acquisition, stable cellular links, and safe over-the-air updates to units already in the field.',
    ownership:
      'Full firmware lifecycle on EC200U/QuecOpen, an HTTP FOTA pipeline with integrity checking and rollback protection, a cross-platform BLE configurator, and an AWS-backed fleet dashboard.',
    tech: ['C/C++', 'QuecOpen SDK', 'EC200U', 'BLE GATT', 'GPS', 'HTTP / FOTA', 'Python', 'AWS EC2/S3', 'GCP'],
    accent: 'cyan',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Architected and delivered a production-grade vehicle tracking system on the EC200U module using the QuecOpen SDK, handling the full development lifecycle from hardware bring-up to field deployment.',
      },
      {
        heading: 'Engineering ownership',
        bullets: [
          'Engineered a robust FOTA pipeline over HTTP with integrity checking, rollback protection, and version management — enabling seamless over-the-air firmware updates to deployed units.',
          'Designed a cross-platform BLE Configurator (PC and mobile) leveraging custom GATT services and characteristics for real-time device provisioning, parameter tuning, and status monitoring.',
          'Built and deployed an AWS-backed cloud dashboard (EC2 + S3) for live fleet monitoring, telemetry ingestion, and historical data analytics; integrated GCP for secondary data pipelines.',
        ],
      },
      {
        heading: 'Testing & field validation',
        bullets: [
          'Optimised memory layout and power states across firmware states.',
          'Conducted systematic field testing of GPS fix acquisition, LTE connectivity stability, and BLE range under real-world conditions.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The route, connectivity and geofence artwork on this page is a conceptual visualization of a vehicle-tracking system — not a screenshot of the MYMO2 product or a documentary map of a real trip.',
      },
    ],
  },

  /* 2 — Shooting Range (existing DOSSIER) ---------------------------------- */
  {
    slug: 'shooting-range',
    index: '02',
    name: 'Shooting Range Embedded Control System',
    kicker: 'Motion control · RF communication',
    org: 'Palmlabs',
    role: 'Embedded Systems Engineer',
    status: 'XBee version working · LoRa in development',
    category: 'production',
    summary:
      'A smart shooting-range target-control platform on the ATSAME70 MCU with two communication variants — an XBee version already deployed and a LoRa version under active development.',
    challenge:
      'Move a physical target carrier precisely and safely over RF, with deterministic state handling, ACK/retry reliability, and the ability to update firmware on devices in the field.',
    ownership:
      'Firmware, RF packet protocol, motor-control workflows, BLE configuration, and a custom OTA path over XBee and LoRa to ATSAME70 and ESP32.',
    tech: ['C', 'ATSAME70', 'ESP32', 'XBee API', 'LoRa', 'BLE Config', 'Motor Control', 'OTA'],
    accent: 'amber',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Developing a smart shooting-range target-control platform on the ATSAME70 MCU with two communication variants: an XBee-based version already deployed and a LoRa-based version under active development.',
      },
      {
        heading: 'RF communication',
        bullets: [
          'Implemented the working XBee version with API-mode packet handling, command queues, ACK/retry logic, target ID setup, host addressing, network configuration, and remote command responses.',
          'Building the LoRa version to extend long-range target communication and support additional target/device types.',
        ],
      },
      {
        heading: 'Motion control & configuration',
        bullets: [
          'Integrated motor-control workflows for different target/device types, including limit-switch handling, manual movement logic, encoder logic, and speed control.',
          'Added BLE configuration support for reading/writing device parameters.',
        ],
      },
      {
        heading: 'Over-the-air updates',
        bullets: [
          'Developed a custom protocol to send an OTA update to ATSAME70 and ESP32 over XBee and LoRa, with integrity checking and rollback protection.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'Range and motion artwork on this page is a conceptual visualization of the automated target-control equipment. It focuses on the engineering system — carriers, rails, state and RF signalling — not on weapons or any depiction of harm.',
      },
    ],
  },

  /* 3 — Device Management & OTA (composite of real FOTA/OTA + BLE work) ----- */
  {
    slug: 'device-management',
    index: '03',
    name: 'Device Management & OTA Platform',
    kicker: 'Fleet management · firmware delivery',
    org: 'Palmlabs',
    role: 'Embedded Systems Engineer',
    status: 'Operational',
    category: 'production',
    summary:
      'The device-to-cloud layer that keeps field units updatable and configurable — FOTA/OTA update pipelines and cross-platform BLE configurators across the tracker and target-control products.',
    challenge:
      'Deliver firmware and configuration to devices in the field safely: know what version each device runs, push updates without bricking units, and provision devices reliably over BLE.',
    ownership:
      'FOTA/OTA pipelines with integrity checking and rollback protection, custom OTA transport over HTTP and over XBee/LoRa, and PC/mobile BLE configurators using custom GATT services.',
    tech: ['C/C++', 'FOTA / OTA', 'HTTP', 'XBee / LoRa', 'BLE GATT', 'Python', 'AWS EC2/S3', 'GCP'],
    accent: 'cyan',
    sections: [
      {
        heading: 'What it is',
        body: 'A device-management and update capability spanning multiple production IoT platforms. It is built from the FOTA/OTA and BLE-configurator work delivered across the MYMO2 tracker and the shooting-range control system, and reflects the Palmlabs mandate to architect device-to-cloud systems.',
      },
      {
        heading: 'Firmware & configuration delivery',
        bullets: [
          'Architected device-to-cloud systems including FOTA/OTA update pipelines and cross-platform BLE configurators (from the Palmlabs Embedded Systems Engineer role).',
          'FOTA pipeline over HTTP with integrity checking, rollback protection, and version management for deployed tracker units.',
          'Custom OTA protocol to update ATSAME70 and ESP32 over XBee and LoRa, with integrity checking and rollback protection.',
          'Cross-platform BLE Configurator (PC and mobile) using custom GATT services for real-time provisioning, parameter tuning, and status monitoring.',
        ],
      },
      {
        heading: 'Interface note',
        conceptual: true,
        body: 'The device-network diagram on this page — nodes, version flow, command/response states — is rendered live in code from the capabilities above. Any readable values are illustrative interface, not captured production telemetry.',
      },
    ],
  },

  /* 4 — Unified Device Lifecycle Database (existing DOSSIER: prod-db) ------- */
  {
    slug: 'lifecycle-database',
    index: '04',
    name: 'Unified Device Lifecycle Database',
    kicker: 'Production data · operations',
    org: 'Palmlabs',
    role: 'Embedded Systems Engineer',
    status: 'Operational',
    category: 'production',
    summary:
      'A production-side database that tracks company devices through their operational life — records, SIM/IMEI, customer assignment, installation status, configuration state, and service history.',
    challenge:
      'Give firmware, backend and operations one accurate picture of every device: which units are active, deployed, pending configuration, or in support — matched to real device behaviour.',
    ownership:
      'Database structure and operational records for GPS trackers and other field devices, plus reporting-friendly views for production planning and management visibility.',
    tech: ['MySQL', 'Production Database', 'Tracker Management', 'Device Records', 'SIM / IMEI Tracking', 'Reporting'],
    accent: 'dual',
    sections: [
      {
        heading: 'Overview',
        body: 'Developed and maintained a production-side database system to manage company tracker operations, connected device records, SIM details, customer/device assignment, installation status, and service history.',
      },
      {
        heading: 'What it holds',
        bullets: [
          'Structured operational records for GPS trackers and other field devices — active units, deployed devices, pending configurations, and support cases.',
          'Device data across the production workflow: device IDs, IMEI/SIM references, firmware/configuration status, customer allocation, and follow-up actions.',
          'Reporting-friendly database views to support production planning, device monitoring, troubleshooting, inventory visibility, and management decision-making.',
        ],
      },
      {
        heading: 'Alignment with real operations',
        bullets: [
          'Worked closely with firmware, backend, and operations requirements so the database matched real device behaviour, field deployment needs, and internal production processes.',
        ],
      },
      {
        heading: 'On the "lifecycle" framing',
        conceptual: true,
        body: 'The manufacturing → testing → provisioning → activation → deployment → support → retirement structure used on this page is an editorial way to present the record-keeping above. The underlying records (inventory, SIM/IMEI, assignment, installation, service history) are real; the staged lifecycle diagram is a conceptual organisation of them.',
      },
    ],
  },

  /* 5 — Robust Real-Time Violence Detection (user-supplied measured results) */
  {
    slug: 'violence-detection',
    index: '05',
    name: 'Robust Real-Time Violence Detection',
    kicker: 'Video intelligence · real-time deep learning',
    org: 'Freelance Project',
    role: 'Machine Learning & Computer Vision Developer',
    status: 'Developing actively',
    category: 'production',
    summary:
      'An end-to-end deep-learning system that classifies short surveillance clips as Violence or Non-Violence, evaluates under realistic CCTV conditions, and runs in real time on an RTX 4050 laptop GPU.',
    challenge:
      'Detect violent activity across varied camera angles, distances, lighting, resolutions, crowd densities, motion blur, occlusion, and compression artifacts—while controlling both missed events and false alarms.',
    ownership:
      'Designed the leakage-free data pipeline, CCTV-focused augmentation, staged transfer-learning workflow, threshold tuning, held-out evaluation, real-time rolling-buffer inference, temporal smoothing, hysteresis alerting, export, explainability, and reproducibility tooling.',
    tech: [
      'Python',
      'PyTorch',
      'Torchvision',
      'R(2+1)D-18',
      'OpenCV',
      'CUDA / AMP',
      'SCFD',
      'SCVD',
      'ONNX',
      'Grad-CAM',
    ],
    accent: 'dual',
    heroConceptual: true,
    sections: [
      {
        heading: 'Project overview',
        body: 'The system performs binary video classification on 16-frame clips sampled at 112×112 with stride 2. Its default backbone is a Kinetics-400-pretrained R(2+1)D-18, selected to capture spatial appearance and temporal motion while fitting comfortably within a 6 GB laptop GPU.',
        table: {
          headers: ['Area', 'Implementation'],
          rows: [
            ['Task', 'Violence vs Non-Violence video classification'],
            ['Datasets', 'SCFD + SCVD'],
            ['Backbone', 'R(2+1)D-18, Kinetics-400 pretrained'],
            ['Input', '16 frames · 112×112 · stride 2'],
            ['Target hardware', 'NVIDIA RTX 4050 Laptop GPU · 6 GB'],
            ['Real-time logic', 'Rolling buffer · temporal smoothing · hysteresis alerting'],
          ],
        },
      },
      {
        heading: 'Measured held-out test results',
        body: 'The model trained for up to 20 epochs with early stopping. The best validation macro-F1 was 0.861 and the validation-tuned decision threshold was 0.285. The frozen checkpoint and threshold were then evaluated once on a held-out test set of 119 clips.',
        table: {
          headers: ['Metric', 'Measured value'],
          rows: [
            ['Accuracy', '0.798'],
            ['Balanced accuracy', '0.799'],
            ['Macro F1', '0.798'],
            ['Violence precision / recall / F1', '0.778 / 0.831 / 0.803'],
            ['ROC-AUC / PR-AUC', '0.905 / 0.906'],
            ['False-positive / false-negative rate', '0.233 / 0.170'],
            ['Mean clip latency', '12.7 ms'],
            ['Measured clip-equivalent throughput', '~1260 clips-eq FPS'],
          ],
        },
        note: 'These figures are genuine results from an actual RTX 4050 run, not estimates or smoke-test metrics.',
      },
      {
        heading: 'Confusion matrix and operating trade-off',
        body: 'Rows represent the true label and columns the predicted label. False negatives are missed violent clips; false positives are false alarms. The decision threshold and alert hysteresis provide an explicit way to tune this trade-off for deployment.',
        table: {
          headers: ['True class', 'Predicted Non-Violence', 'Predicted Violence'],
          rows: [
            ['Non-Violence', '46 true negatives', '14 false positives'],
            ['Violence', '10 false negatives', '49 true positives'],
          ],
        },
      },
      {
        heading: 'Robustness findings',
        body: 'Performance varied materially by dataset quality and resolution, which is documented rather than hidden. SCVD contains cleaner 720p smart-city CCTV footage, while SCFD contains more diverse and often low-resolution fight clips.',
        bullets: [
          'SCVD accuracy: 0.89.',
          'SCFD accuracy: 0.65.',
          'Accuracy on video at or above 720p: 0.88.',
          'Accuracy on 240–480p video: 0.56.',
          'The gap shows that low-resolution domain shift remains the principal robustness limitation and a priority for continued development.',
        ],
      },
      {
        heading: 'System architecture',
        bullets: [
          'Inspect both datasets and create metadata describing source, class, resolution, duration, and scene grouping.',
          'Create stratified, grouped, leakage-free train/validation/test splits with automatic assertions against scene overlap.',
          'Decode short clips through a custom ViolenceClipDataset and apply heavy CCTV-style augmentation only during training.',
          'Fine-tune a Kinetics-400-pretrained R(2+1)D-18 using a staged transfer-learning strategy.',
          'Select the best checkpoint by validation macro-F1 and tune the decision threshold only on validation data.',
          'Evaluate once on the held-out test set, then expose the same checkpoint to webcam, saved-video, export, and Grad-CAM workflows.',
        ],
      },
      {
        heading: 'Dataset strategy and leakage prevention',
        body: 'SCFD maps fight to Violence and noFight to Non-Violence. SCVD maps Violence and Weaponized to Violence, and Normal to Non-Violence. The one-second re-segmentation of SCVD is deliberately excluded because it contains the same source scenes and would contaminate evaluation if mixed across splits.',
        bullets: [
          'Approximately 780 source videos are used across the two datasets.',
          'Splits are grouped by source scene and stratified by class.',
          'Deterministic validation and test transforms keep evaluation repeatable.',
          'A fixed seed of 42 and the complete run configuration are saved with checkpoints.',
        ],
      },
      {
        heading: 'Training methodology',
        bullets: [
          'Stage 1 freezes the Kinetics backbone and trains the new classification head.',
          'Stage 2 unfreezes the final backbone stages and fine-tunes them at a lower learning rate.',
          'AdamW, cosine learning-rate scheduling with linear warmup, mixed precision, gradient accumulation, and gradient clipping are used for stable training on 6 GB VRAM.',
          'Weighted cross-entropy uses inverse-frequency class weights computed from the actual training split; focal loss and weighted sampling remain configurable alternatives.',
          'The best model is selected by validation macro-F1; a separate best-loss checkpoint is retained.',
          'The violence threshold is swept on validation data to maximise macro-F1 and is frozen before test evaluation.',
        ],
      },
      {
        heading: 'Real-time inference design',
        body: 'The webcam pipeline continuously samples frames into a rolling buffer, classifies clips at a configurable interval, smooths probabilities across time, and requires consecutive evidence before entering or clearing an alert state. This prevents a single unstable prediction from immediately triggering or cancelling an alert.',
        bullets: [
          'Configurable clip length, frame stride, inference interval, smoothing window, alert threshold, and consecutive alert/safe counts.',
          'Live reset support for the temporal buffer and alert state.',
          'The same streaming logic can replay saved videos for reproducible demonstrations.',
          'CPU fallback is supported, although real-time performance is designed around CUDA-capable hardware.',
        ],
      },
      {
        heading: 'GPU-efficient engineering',
        body: 'The default configuration uses a batch size of 6 with two gradient-accumulation steps for an effective batch of 12, 16×112×112 clips, automatic mixed precision, and a modest Windows DataLoader worker count. This configuration is designed specifically for the RTX 4050 Laptop GPU with 6 GB VRAM.',
        bullets: [
          'If memory is constrained, batch size can be reduced while increasing gradient accumulation.',
          'Clip length can be reduced as a secondary memory control.',
          'The first CUDA inference is treated as warmup and excluded from latency benchmarking.',
        ],
      },
      {
        heading: 'Scaling to heavier GPUs',
        body: 'The model factory and training pipeline support stronger Kinetics-pretrained video architectures without changing the surrounding data, evaluation, reporting, or export workflow.',
        table: {
          headers: ['Architecture', 'Reference K400 acc@1', 'Input'],
          rows: [
            ['MViTv2-S', '80.8%', '16×224'],
            ['Swin3D-S', '79.5%', '32×224'],
            ['Swin3D-B', '79.4%', '32×224'],
            ['MViT-v1-B', '78.5%', '16×224'],
            ['Swin3D-T', '77.7%', '32×224'],
          ],
        },
        note: 'Each architecture writes to an isolated output folder so experiments never overwrite one another.',
      },
      {
        heading: 'Evaluation, reporting, and explainability',
        bullets: [
          'Evaluation produces accuracy, balanced accuracy, macro and weighted precision/recall/F1, specificity, FPR, FNR, ROC-AUC, PR-AUC, latency, and throughput.',
          'Outputs include confusion matrices, ROC and precision-recall curves, training curves, subgroup analysis, speed charts, per-sample predictions, and false-positive/false-negative contact sheets.',
          'TorchScript and optional ONNX exports are validated numerically against the PyTorch checkpoint on the same input.',
          'Grad-CAM visualisations support qualitative inspection of which spatial regions influenced selected predictions.',
          'Smoke tests validate the complete pipeline quickly but are explicitly labelled and never presented as final performance.',
        ],
      },
      {
        heading: 'Known limitations',
        bullets: [
          'The training corpus is still modest, so unseen viewpoints, extreme distances, dense crowds, and under-represented violence types may reduce accuracy.',
          'Fast non-violent motion such as sports, running, or energetic hugging can create false positives.',
          'Very brief violent actions can be missed, especially when sampling sparse frames.',
          'Short source clips limit sustained-context reasoning.',
          'The documented resolution gap shows that low-quality video remains significantly harder than clean 720p CCTV.',
          'CPU inference is substantially slower than the CUDA path.',
        ],
      },
      {
        heading: 'Ethical deployment',
        body: 'The system estimates whether an observed clip is likely violent or non-violent. It does not identify people, infer intent, determine criminality, or provide sufficient evidence for automated punitive action. It is designed as a decision-support aid for authorised safety monitoring with human review, privacy safeguards, lawful deployment, and explicit attention to dataset bias.',
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The surveillance artwork used on this portfolio page is a conceptual visualization of video analytics in a neutral public space. It is not a frame from the training datasets and does not depict a violent event.',
      },
    ],
  },

  /* 6 — Brain-Controlled Wheelchair (Final Year Project · Gold Medal) ------- */
  {
    slug: 'wheelchair',
    index: '06',
    name: 'Brain-Controlled Wheelchair',
    kicker: 'EEG brain-computer interface · machine learning',
    org: 'HITEC University',
    role: 'Final Year Project · ML & Systems',
    status: 'Completed · Gold Medal',
    category: 'academic',
    summary:
      'A brain-computer-interface wheelchair that lets a mobility-impaired user drive purely from EEG brain signals — a NeuroSky headset feeding a Raspberry Pi that runs live SVM inference and drives the motors through an Arduino. Recognised with the university Gold Medal.',
    challenge:
      'Give a person with severe motor impairment a safe, intuitive way to move on their own: turn noisy single-channel EEG into reliable real-time intent, and translate that intent into controlled, safe wheelchair movement on affordable hardware.',
    ownership:
      'A three-member final-year project. Work spanned EEG acquisition and labelling, the SVM/LDA classification pipeline, the Raspberry Pi → Arduino real-time serial control loop, and the conversion of a manual wheelchair to electric drive.',
    tech: [
      'Python',
      'scikit-learn',
      'SVM',
      'LDA',
      'pandas',
      'NumPy',
      'pyserial',
      'EEG Signal Processing',
      'NeuroSky MindWave Mobile 2',
      'Raspberry Pi 4',
      'Arduino Uno',
      'IBT-2 / BTS7960',
    ],
    accent: 'cyan',
    heroConceptual: true,
    sections: [
      {
        heading: 'Project overview',
        body: 'Assistive brain-computer interface (BCI) that lets a user command a wheelchair from their mental state alone, aimed at people with severe personal-mobility impairment. A NeuroSky MindWave Mobile 2 headset streams EEG features over Bluetooth to a Raspberry Pi 4 Model B, which runs a trained machine-learning classifier and forwards motion commands to an Arduino Uno that drives the wheelchair motors. Delivered as a three-member final-year project in the Department of Computer Engineering, HITEC University, and awarded the university Gold Medal.',
        table: {
          headers: ['Area', 'Implementation'],
          rows: [
            ['Interface', 'Non-invasive single-channel EEG (brain-computer interface)'],
            ['Sensor', 'NeuroSky MindWave Mobile 2 headset · FP1 forehead · Bluetooth'],
            ['Compute', 'Raspberry Pi 4 Model B (signal processing + inference)'],
            ['Classifier', 'Linear-kernel SVM (selected) vs LDA (baseline)'],
            ['Actuation', 'Arduino Uno → IBT-2 (BTS7960) H-bridge → DC motors'],
            ['Link', 'Bluetooth (headset→Pi) · serial UART / pyserial (Pi→Arduino)'],
          ],
        },
      },
      {
        heading: 'System architecture',
        body: 'The system is a clean sensing → decision → actuation pipeline, splitting the heavy computation and the real-time motor control across two processors so each does what it is best at.',
        bullets: [
          'Sensing — the NeuroSky headset acquires brainwave activity and derives per-second EEG features, sent to the Raspberry Pi over Bluetooth.',
          'Decision — the Raspberry Pi 4 filters and pre-processes the incoming features, then classifies the user’s mental state with a trained SVM model.',
          'Command — the classified intent is mapped to a wheelchair action and streamed over a serial UART link to the Arduino Uno.',
          'Actuation — the Arduino drives the IBT-2 motor driver and DC motors with the required direction and PWM speed; status can be fed back to the Pi.',
        ],
      },
      {
        heading: 'EEG acquisition & signal features',
        body: 'Brain activity was captured with the NeuroSky MindWave Mobile 2 placed at the FP1 forehead position. Training data was recorded through the NeuroExperimenter application in one-minute sessions (samples arrive roughly once per second) while the subject imagined the wheelchair moving, and logged to CSV for offline analysis.',
        table: {
          headers: ['EEG feature', 'What it reflects'],
          rows: [
            ['Delta (1–4 Hz)', 'Deep sleep / very low activity'],
            ['Theta (4–8 Hz)', 'Emotional tension, drowsiness'],
            ['Alpha (8–13 Hz)', 'Relaxed, inactive state'],
            ['Beta (13–30 Hz)', 'Active thinking, focus, problem-solving'],
            ['Gamma (30–50 Hz)', 'Conscious perception'],
            ['Attention · Meditation · Blink', 'Derived focus, calmness and blink events'],
          ],
        },
      },
      {
        heading: 'Data preprocessing & labelling',
        body: 'The recorded sessions were turned into a clean, reproducible training set in Python with pandas — the same discipline used to keep evaluation honest.',
        bullets: [
          'Loaded multiple session CSVs into DataFrames and concatenated them with a reset index for a single consistent dataset.',
          'Stripped stray whitespace from column names to avoid silent reference errors.',
          'Derived a binary intent label from the Attention feature (Attention > 50 → high-attention class, otherwise low), framing control as a binary classification task.',
          'Split the data 70 / 30 into training and test sets with a fixed random seed (42) so results are reproducible across runs.',
        ],
      },
      {
        heading: 'Model selection & training',
        body: 'Two classical classifiers were trained in scikit-learn and compared head-to-head on the held-out test set. A linear-kernel Support Vector Machine clearly outperformed Linear Discriminant Analysis and was chosen for deployment; SVM’s margin-based decision boundary and robustness on a small, high-signal feature set fit the problem well.',
        table: {
          headers: ['Model', 'Kernel / method', 'Test accuracy'],
          rows: [
            ['Support Vector Machine (selected)', 'Linear kernel (SVC)', '97%'],
            ['Linear Discriminant Analysis', 'Linear discriminant', '65%'],
          ],
        },
        note: 'Accuracy figures are the results reported in the project’s final-year thesis on its own recorded EEG test split.',
      },
      {
        heading: 'Evaluation',
        bullets: [
          'Scored the trained SVM on the reserved test set using scikit-learn’s accuracy_score for an overall correctness measure.',
          'Generated a full classification_report — precision, recall, F1-score and support per class — for a class-aware view beyond raw accuracy.',
          'Reasoned about errors through a confusion matrix (true/false positives and negatives) to understand where the classifier was most likely to be wrong.',
        ],
      },
      {
        heading: 'Real-time inference & serial control',
        body: 'For live operation the trained model runs on the Raspberry Pi against the streaming headset data, and its predictions drive the wheelchair through the Arduino in real time.',
        bullets: [
          'The headset auto-connects to the Pi over Bluetooth; connection stability was treated as a first-class requirement, not an afterthought.',
          'Incoming EEG is filtered and feature-extracted on the Pi, then classified by the SVM to produce a movement decision.',
          'Decisions are sent over a serial UART link (Pi TX/RX ↔ Arduino RX/TX, common ground) using pyserial; the Arduino parses each command with its Serial interface.',
          'Splitting duties keeps control responsive — the Pi handles the heavier EEG/ML work while the Arduino handles deterministic real-time motor driving.',
        ],
      },
      {
        heading: 'Wheelchair conversion & motor control',
        body: 'A standard manual wheelchair was converted into an electrically driven platform so it could be commanded by the controller.',
        bullets: [
          'Arduino Uno as the motor controller, reading joystick and push-button inputs on its analog/digital pins for manual override and testing.',
          'IBT-2 (BTS7960) dual H-bridge driver — a high-current module with thermal-shutdown and over-current protection — driven by the Arduino for direction and PWM speed control.',
          'DC motors provide the drive; direction is set by the driver’s enable/PWM lines, giving controlled forward, reverse and turning behaviour.',
          'The joystick and push-button path stays available as a safe manual fallback alongside the brain-controlled mode.',
        ],
      },
      {
        heading: 'Recognition & applications',
        body: 'The project was recognised with the university Gold Medal as a standout final-year engineering project, and was framed for realistic assistive use — medical rehabilitation, assisted-living and home mobility, and as a research platform for brain-machine interfaces — always with human oversight and safety in mind.',
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The neural / signal artwork on this page is a conceptual visualization of an EEG brain-computer interface. It is not a recording of a real EEG session, a clinical trace, or a screenshot of the wheelchair control software.',
      },
    ],
  },

  /* 7 — Pet Tracker (existing DOSSIER: pet-tracker) ------------------------- */
  {
    slug: 'pet-tracker',
    index: '07',
    name: 'Pet Tracker — NB-IoT/LTE-M Asset Tracker',
    kicker: 'Asset tracking · low-power connectivity',
    org: 'Palmlabs',
    role: 'Embedded Systems Engineer',
    status: 'Deployed',
    category: 'production',
    summary:
      'A low-power GPS pet tracker on the Nordic nRF9160 SiP, architected from connectivity-stack selection through to cloud telemetry design on the nRF Connect SDK (Zephyr RTOS).',
    challenge:
      'Keep a small battery-powered tracker connected and locatable over cellular IoT bearers, while managing power budget across modem sessions and GPS fixes.',
    ownership:
      'System architecture, modem initialisation, LTE-M/NB-IoT bearer management, GPS data acquisition routines, and the technical design documentation behind the tracking duty cycle.',
    tech: ['nRF9160', 'nRF Connect SDK', 'Zephyr RTOS', 'LTE-M/NB-IoT', 'GPS', 'UART'],
    accent: 'cyan',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Led system architecture for a low-power GPS pet tracker on the Nordic nRF9160 SiP, from connectivity stack selection through to cloud telemetry design.',
      },
      {
        heading: 'Firmware & connectivity',
        bullets: [
          'Developed modem initialisation, LTE-M/NB-IoT bearer management, and GPS data acquisition routines within the nRF Connect SDK (Zephyr RTOS) framework.',
          'Produced detailed technical design documentation covering LTE session management, GPS cold/warm-start workflows, and power-optimised tracking duty cycles.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The collar, dog silhouette, and route artwork on this page is a conceptual visualization of a low-power asset tracker — not a photo of the pet tracker product or captured telemetry.',
      },
    ],
  },

  /* 8 — Cedrus Group Website (existing DOSSIER: cedrus-website) ------------- */
  {
    slug: 'cedrus-website',
    index: '08',
    name: 'Cedrus Group — Corporate Website',
    kicker: 'Corporate website · frontend engineering',
    org: 'Cedrus Group (Pvt.) Ltd.',
    role: 'Web Developer Intern',
    status: 'Delivered',
    category: 'production',
    summary:
      'A responsive, multi-page corporate website for Cedrus Group (Pvt.) Ltd. — Home, About Us, Services, and Careers — built during a web developer internship with vanilla HTML, CSS, and JavaScript.',
    challenge:
      'Ship a consistent, responsive multi-page site with shared navigation and no framework overhead, while keeping components DRY across every page.',
    ownership:
      'Full frontend build: shared nav/footer, a dropdown "Solutions" menu, an auto-advancing hero slider, and a responsive Flexbox/Grid layout driven by CSS variables.',
    tech: ['HTML5', 'CSS3', 'Flexbox / Grid', 'CSS Variables', 'Vanilla JS', 'Responsive Design', 'Hero Slider'],
    accent: 'dual',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Designed and built the corporate website for Cedrus Group (Pvt.) Ltd. during my internship — a responsive, multi-page site covering Home, About Us, Services, and Careers.',
      },
      {
        heading: 'Shared components & navigation',
        bullets: [
          'Implemented a shared navigation bar and footer with a mobile hamburger menu and an expandable "Solutions" dropdown for consistent, DRY components across every page.',
          'Developed an auto-advancing hero slider with manual previous/next controls and pause-on-hover using vanilla JavaScript — no frameworks or libraries.',
        ],
      },
      {
        heading: 'Responsive layout & theming',
        bullets: [
          'Built a fully responsive layout with Flexbox and CSS Grid, centralising brand theming through CSS variables and tuning breakpoints for desktop, tablet, and mobile.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The multi-device mockup on this page is a conceptual visualization standing in for the delivered site — not a real screenshot of the live Cedrus Group website.',
      },
    ],
  },

  /* 9 — Hospital Website (existing DOSSIER: hospital-website) --------------- */
  {
    slug: 'hospital-website',
    index: '09',
    name: 'Hospital Website',
    kicker: 'Healthcare website · frontend engineering',
    org: 'Freelance Project',
    role: 'Frontend Developer',
    status: 'Delivered',
    category: 'production',
    summary:
      'A static, multi-page hospital website delivered as a freelance project — Home, About Us, Departments, Appointment, and Contact pages in a clean blue-and-white medical theme.',
    challenge:
      'Deliver a simple, readable, multi-page healthcare site with working appointment/contact forms and validation, on a freelance timeline.',
    ownership:
      'End-to-end frontend delivery: the departments page, appointment/contact forms with JavaScript validation, and consistent responsive navigation across all pages.',
    tech: ['HTML5', 'CSS3', 'JavaScript', 'Form Validation', 'Multi-Page UI', 'Responsive Nav'],
    accent: 'cyan',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Delivered a complete static, multi-page hospital website as a freelance project — Home, About Us, Departments, Appointment, and Contact pages with a clean blue-and-white medical theme.',
      },
      {
        heading: 'Departments & content',
        bullets: [
          'Built a card-based Departments page showcasing services such as Cardiology, Dermatology, ICU, and Internal Medicine, with structured content, images, and lists.',
        ],
      },
      {
        heading: 'Forms & navigation',
        bullets: [
          'Implemented appointment and contact forms with JavaScript validation for required fields and email format before submission.',
          'Maintained consistent header, footer, and responsive navigation with active-page styling, keeping the layout simple, readable, and user-friendly across all pages.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The multi-device mockup on this page is a conceptual visualization standing in for the delivered site — not a real screenshot of the live hospital website. It is the same generic illustration used on the Cedrus Group case study, since neither project has a captured product screenshot.',
      },
    ],
  },

  /* 10 — Hand Gesture Controlled Car (existing DOSSIER: gesture-car) -------- */
  {
    slug: 'gesture-car',
    index: '10',
    name: 'Hand Gesture Controlled Car',
    kicker: 'Robotics · gesture control',
    org: 'Academic Project',
    role: 'Embedded Systems Developer',
    status: 'Completed',
    category: 'academic',
    summary:
      'A motion-responsive robotic car steered by accelerometer-based hand gestures, with a wireless RF telemetry link between the glove controller and the vehicle.',
    challenge:
      'Turn noisy accelerometer tilt data into responsive, untethered motor commands over a wireless RF link.',
    ownership:
      'Gesture signal processing and motor control firmware on Arduino, and the RF telemetry link between the glove controller and the car.',
    tech: ['Arduino', 'C/C++', 'Accelerometer', 'Wireless RF', 'Motor Control', 'Embedded C'],
    accent: 'amber',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Designed a motion-responsive robotic car steered by accelerometer-based hand gestures.',
      },
      {
        heading: 'Control & communication',
        bullets: [
          'Implemented gesture signal processing and motor control on Arduino, mapping tilt orientation to drive direction and speed.',
          'Built a wireless RF telemetry link between the glove controller and the vehicle for untethered control.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The RC-vehicle and gesture artwork on this page is a conceptual visualization of gesture-to-motion control — not a photo of the actual physical build.',
      },
    ],
  },

  /* 11 — FSM 4-Lane Traffic Light Controller (existing DOSSIER: fsm-traffic) */
  {
    slug: 'fsm-traffic',
    index: '11',
    name: 'FSM 4-Lane Traffic Light Controller',
    kicker: 'Digital logic · FSM design',
    org: 'Academic Project',
    role: 'Digital Design Engineer',
    status: 'Completed',
    category: 'academic',
    summary:
      'A four-lane traffic-light controller implemented in Verilog HDL using a Finite State Machine architecture, with clock-driven state timing and an asynchronous reset.',
    challenge:
      'Produce deterministic, predictable lane-timing behaviour purely in synchronous digital logic, validated against every state transition.',
    ownership:
      'FSM architecture and Verilog implementation, clock-driven timing design, asynchronous reset handling, and the simulation testbench.',
    tech: ['Verilog HDL', 'FSM Design', 'Sequential Logic', 'Async Reset', 'Testbench', 'Simulation'],
    accent: 'amber',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Implemented a four-lane traffic-light controller in Verilog HDL using a Finite State Machine architecture.',
      },
      {
        heading: 'Design & verification',
        bullets: [
          'Designed clock-driven state timing with an asynchronous reset for predictable, deterministic behaviour.',
          'Validated the design with a comprehensive simulation testbench covering all state transitions and edge cases.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The intersection and signal-state artwork on this page is a conceptual visualization of the FSM design — not a captured waveform or simulation screenshot.',
      },
    ],
  },

  /* 12 — Bank Management System (existing DOSSIER: bank-system) ------------- */
  {
    slug: 'bank-system',
    index: '12',
    name: 'Bank Management System',
    kicker: 'Console application · OOP',
    org: 'Academic Project',
    role: 'C++ Developer',
    status: 'Completed',
    category: 'academic',
    summary:
      'A console C++ banking application with separate manager and client roles, full account CRUD, binary-file persistence, and Caesar Cipher encryption for stored data.',
    challenge:
      'Keep account records durable and reasonably protected across sessions using only file I/O, with safe role-based access and error handling.',
    ownership:
      'Object-oriented application design, permission-aware manager/client roles, binary-file persistence, Caesar Cipher encryption, and exception handling.',
    tech: ['C++', 'OOP', 'File Handling', 'Caesar Cipher', 'Pointers', 'Exception Handling', 'Type Casting'],
    accent: 'dual',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Built a console C++ application with separate manager and client roles and permission-aware access.',
      },
      {
        heading: 'Data & security',
        bullets: [
          'Implemented full account CRUD with deposits, withdrawals, and binary-file persistence for durable records.',
          'Added Caesar Cipher encryption for stored data, with structured exception handling and safe type casting throughout.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The dashboard and security artwork on this page is a conceptual visualization of account data and protection — not a screenshot of the actual console application, which has no graphical interface.',
      },
    ],
  },

  /* 13 — Online Food Ordering System (existing DOSSIER: food-order) --------- */
  {
    slug: 'food-order',
    index: '13',
    name: 'Online Food Ordering System',
    kicker: 'Full-stack web · food ordering',
    org: 'Academic Project',
    role: 'Full-Stack Web Developer',
    status: 'Completed',
    category: 'academic',
    summary:
      'A database-driven food-ordering web application with a categorised menu, keyword search, and full order management on a normalised MySQL relational database.',
    challenge:
      'Deliver both ends of a working ordering flow — browsing, search, and order management — on a relational schema, without a framework.',
    ownership:
      'Frontend and backend delivery end to end: menu browsing and search, image display, and order/data management on the MySQL schema.',
    tech: ['PHP', 'MySQL', 'HTML/CSS', 'Backend Dev', 'Frontend Dev', 'DB Management'],
    accent: 'cyan',
    heroConceptual: true,
    sections: [
      {
        heading: 'Overview',
        body: 'Developed a database-driven food-ordering web application with a categorised menu and keyword search.',
      },
      {
        heading: 'Backend & data',
        bullets: [
          'Built image display and full order management on top of a normalised MySQL relational database.',
          'Delivered both frontend and backend, handling listings, orders, and data management end to end.',
        ],
      },
      {
        heading: 'Conceptual visualization',
        conceptual: true,
        body: 'The multi-device menu/ordering mockup on this page is a conceptual visualization — not a real screenshot of the delivered ordering application.',
      },
    ],
  },
];

/** Projects shown as full "Selected Systems" chapters on the homepage. */
export const featuredSlugs: ProjectSlug[] = [
  'mymo2',
  'shooting-range',
  'device-management',
  'lifecycle-database',
  'violence-detection',
  'wheelchair',
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

/* --------------------------------------------------------------------------
   CAPABILITIES — five focused groups (no proficiency percentages)
   -------------------------------------------------------------------------- */
export interface Capability {
  id: string;
  title: string;
  line: string;
  items: string[];
}
export const capabilities: Capability[] = [
  {
    id: 'firmware',
    title: 'Embedded Firmware',
    line: 'Bare-metal and RTOS firmware on ARM Cortex-M, from bring-up to production.',
    items: ['C / C++', 'STM32 · nRF9160 · ATSAME70 · ESP32 · EC200U', 'Zephyr RTOS (nRF Connect SDK)', 'Peripheral drivers · bootloaders', 'Motor control · encoders · limit switches', 'UART / SPI / I²C', 'Verilog HDL'],
  },
  {
    id: 'wireless',
    title: 'Wireless & Connectivity',
    line: 'Getting devices to talk — short-range, long-range, and cellular.',
    items: ['BLE (GATT)', 'LTE-M · NB-IoT', 'GPS / GNSS', 'XBee API · LoRa', 'Modem AT-command layer', 'RF field validation & range testing', 'LTE / 4G RAN fundamentals'],
  },
  {
    id: 'cloud',
    title: 'Device-to-Cloud Systems',
    line: 'The path from the chip to a dashboard someone can act on.',
    items: ['FOTA / OTA pipelines (HTTP, XBee/LoRa)', 'Cross-platform BLE configurators', 'AWS EC2 / S3 / IAM', 'GCP telemetry pipelines', 'REST APIs · HTTP / MQTT', 'Fleet & telemetry dashboards'],
  },
  {
    id: 'infra',
    title: 'Production Infrastructure',
    line: 'The database and servers that keep an operation running.',
    items: ['MySQL production databases', 'Device / tracker records · SIM / IMEI', 'Linux / Ubuntu hardening', 'Nginx reverse proxies', 'WireGuard VPN · TLS', 'Monitoring & alerting'],
  },
  {
    id: 'testing',
    title: 'Testing & Deployment',
    line: 'Making sure it works outside the demo.',
    items: ['Structured hardware bring-up', 'GPS acquisition · connectivity · RF range testing', 'Integrity-checked OTA with rollback', 'Field deployment & follow-up', 'Embedded debugging', 'Jira workflow'],
  },
];

/* --------------------------------------------------------------------------
   EXPERIENCE — primary embedded identity first
   -------------------------------------------------------------------------- */
export interface Role {
  company: string;
  role: string;
  location: string;
  period: string;
  bullets: string[];
  tags: string[];
}

export const experience: Role[] = [
  {
    company: 'Palmlabs',
    role: 'Embedded Systems Engineer',
    location: 'Riyadh, Saudi Arabia',
    period: 'Nov 2024 – Present',
    bullets: [
      'Own end-to-end firmware development across multiple production IoT platforms — vehicle/asset trackers and RF target-control systems — from hardware bring-up through to field deployment.',
      'Architect device-to-cloud systems including FOTA/OTA update pipelines, cross-platform BLE configurators, and AWS/GCP telemetry backends and dashboards.',
      'Build and maintain the production-side database for tracker/device operations, inventory, SIM/IMEI records, and service history.',
      'Drive memory and power optimisation and run structured field testing for connectivity, GPS acquisition, and RF range under real-world conditions.',
    ],
    tags: ['C/C++', 'QuecOpen SDK', 'nRF Connect SDK', 'BLE GATT', 'LTE-M / NB-IoT', 'GPS', 'FOTA / OTA', 'AWS / GCP', 'MySQL'],
  },
  {
    company: 'Palmlabs',
    role: 'Systems Administrator',
    location: 'Riyadh, Saudi Arabia',
    period: 'Nov 2024 – Present',
    bullets: [
      'Own and operate the full AWS stack (EC2, S3, IAM) underpinning production IoT device backends, targeting high uptime and enforcing least-privilege security policies.',
      'Manage GCP infrastructure for high-throughput device telemetry ingestion, time-series storage, and analytics across connected field devices.',
      'Configure and harden Ubuntu servers — Nginx reverse proxies, firewalls, WireGuard VPNs, and TLS certificate management for secure device-to-cloud channels.',
      'Maintain automated deployment pipelines and monitoring dashboards; respond to alerts and run root-cause analysis to minimise mean time to recovery.',
    ],
    tags: ['AWS EC2/S3/IAM', 'GCP', 'Linux / Ubuntu', 'Nginx', 'WireGuard VPN', 'Shell Scripting', 'Monitoring'],
  },
  {
    company: 'Freelance',
    role: 'Embedded Systems Developer & Web Designer',
    location: 'Remote',
    period: 'Feb 2022 – Mar 2024',
    bullets: [
      'Delivered custom embedded firmware and prototype hardware for clients across IoT, automation, and sensing — from requirements through to final delivery and documentation.',
      'Developed microcontroller projects on STM32, ESP32, and Arduino: sensor integration, motor control, wireless communication (BLE, Wi-Fi), and real-time data logging.',
      'Built and shipped end-to-end IoT prototypes — device firmware, backend APIs, and simple dashboards — from proof-of-concept to market-ready builds.',
    ],
    tags: ['STM32', 'ESP32', 'Arduino', 'C/C++', 'BLE', 'Wi-Fi', 'IoT Prototyping'],
  },
  {
    company: 'Huawei Technologies',
    role: 'Network Engineer Intern — RSC Department',
    location: 'Pakistan',
    period: 'Jul 2021 – Oct 2021',
    bullets: [
      "Supported network planning, configuration management, and site commissioning within Huawei's Radio Site Configuration (RSC) department for cellular infrastructure deployments.",
      'Assisted in configuring and testing radio access network (RAN) equipment; used network management tools to monitor site KPIs and troubleshoot performance.',
      'Built foundational knowledge of telecom network architecture (LTE/4G), RF planning principles, and enterprise-grade network operations.',
    ],
    tags: ['LTE / 4G', 'RAN Configuration', 'RF Planning', 'Network Management', 'Site Commissioning'],
  },
  {
    company: 'Northern Mountains Contracting Co.',
    role: 'IT Engineer',
    location: 'Riyadh, Saudi Arabia',
    period: 'Aug 2024 – Nov 2024',
    bullets: [
      'Conducted an IT systems assessment and readiness audit ahead of a company-wide ERP migration, identifying gaps in infrastructure, data quality, and process readiness.',
      'Managed on-premises server infrastructure, storage, and network capacity planning; maintained the corporate website and internal web services.',
      'Administered key Saudi government and enterprise digital platforms — PetroApp, Tawasal, and Etimad — ensuring continuity for procurement, communication, and tendering workflows.',
    ],
    tags: ['ERP Systems', 'Server Infrastructure', 'Network Admin', 'Saudi Gov Platforms'],
  },
];

/** Secondary — kept intentionally compact so it does not dilute the
 *  embedded-engineering identity. */
export const additionalExperience: Role[] = [
  {
    company: 'Cedrus Group',
    role: 'Web Developer Intern',
    location: 'Abbottabad, Pakistan',
    period: 'Jun 2023 – Sep 2023',
    bullets: [
      'Developed UI components and full web pages in HTML/CSS/JavaScript; built reusable libraries and applied accessibility and performance best practices under Agile.',
    ],
    tags: ['HTML', 'CSS', 'JavaScript', 'Accessibility', 'Agile'],
  },
  {
    company: 'Self-Employed · Online Marketplaces',
    role: 'Drop Shipping & E-Commerce Operations',
    location: 'Remote · UK / US Marketplaces',
    period: 'Nov 2022 – Feb 2024',
    bullets: [
      'Sourced products and managed listings, pricing, orders, vendor coordination, and customer support across Facebook Marketplace UK, Amazon, Walmart, and other channels.',
    ],
    tags: ['E-Commerce', 'Marketplace Listings', 'Vendor Coordination', 'Order Management'],
  },
];

/* --------------------------------------------------------------------------
   EDUCATION & RECOGNITION
   -------------------------------------------------------------------------- */
export const education = {
  degree: 'Bachelor of Science',
  field: 'Computer Engineering',
  university: 'Hitec University',
  years: '2020 – 2024',
  cgpa: '3.59',
  cgpaScale: '4.00',
};

export const awards = [
  { rank: 'Gold Medalist', detail: 'Final Year Project Distinction', issuer: 'Hitec University' },
  { rank: 'Silver Medalist', detail: 'Academic Excellence', issuer: 'Hitec University' },
];

/* --------------------------------------------------------------------------
   CERTIFICATIONS — verified-consistent records only shown prominently.
   The "AWS Certified AI Practitioner" entry from the old site is contradictory
   (title vs issuer/skills/verify link) and is documented in CONTENT_AUDIT.md
   rather than displayed as fact.
   -------------------------------------------------------------------------- */
export interface Cert {
  title: string;
  issuer: string;
  year: string;
  url: string;
  skills: string[];
}
export const certifications: Cert[] = [
  {
    title: 'Supervised Machine Learning: Regression and Classification',
    issuer: 'Coursera · DeepLearning.AI',
    year: '2023',
    url: 'https://www.coursera.org/account/accomplishments/verify/UGHQ4HZC8VQC',
    skills: ['Machine Learning', 'Python', 'Linear Regression', 'Logistic Regression'],
  },
  {
    title: 'Google AI Essentials',
    issuer: 'Coursera · Google',
    year: '2023',
    url: 'https://www.coursera.org/account/accomplishments/specialization/QDWG5G65CET8',
    skills: ['Artificial Intelligence', 'Data Analysis', 'Content Creation'],
  },
  {
    title: 'Introduction to Git and GitHub',
    issuer: 'Coursera · Google',
    year: '2023',
    url: 'https://www.coursera.org/account/accomplishments/verify/ZGCL9TID5CTZ',
    skills: ['Version Control', 'Git', 'GitHub', 'CI'],
  },
  {
    title: 'Embedded Systems using C',
    issuer: 'Coursera · EDUCBA',
    year: '2025',
    url: 'https://www.coursera.org/account/accomplishments/verify/UA9GLMOQ276V',
    skills: ['Embedded Software', 'Debugging', 'Computer Architecture', 'System Programming'],
  },
  {
    title: 'Embedded C Programming Essentials',
    issuer: 'Coursera · EDUCBA',
    year: '2026',
    url: 'https://www.coursera.org/account/accomplishments/verify/FORNQ1FO8S71',
    skills: ['Electronics', 'Electronic Hardware', 'Dev Environment Setup'],
  },
];

/* --------------------------------------------------------------------------
   OPEN TO — reduced to three focused positions + secondary strengths
   -------------------------------------------------------------------------- */
export const openTo = {
  primary: [
    {
      title: 'Embedded Systems & Firmware Engineering',
      line: 'Bare-metal and RTOS firmware in C/C++ on ARM Cortex-M — bring-up, drivers, bootloaders, and production firmware for field-deployed devices.',
    },
    {
      title: 'IoT & Device-to-Cloud Engineering',
      line: 'The full vertical: MCU firmware and wireless stack through to cloud ingestion, dashboards, and the operational database behind the fleet.',
    },
    {
      title: 'Embedded Systems Architecture & Technical Solutions',
      line: 'Platform selection, firmware architecture, radio-stack design, and translating engineering decisions into clear requirements and delivery.',
    },
  ],
  secondary:
    'Secondary strengths in RF / wireless systems (BLE, LTE-M, NB-IoT, LoRa, GPS) and embedded-cloud backend / DevOps for IoT fleets.',
};

/* --------------------------------------------------------------------------
   ENGINEERING PHILOSOPHY — voice/approach, no new factual claims
   -------------------------------------------------------------------------- */
export const philosophy = {
  lead: 'A demo proves an idea. A system has to survive the field.',
  principles: [
    {
      k: '01',
      t: 'The field is the spec',
      d: 'GPS fixes, cellular links, and RF range behave differently outside the lab. I test against real conditions, not ideal ones.',
    },
    {
      k: '02',
      t: 'Updates must be reversible',
      d: 'Firmware on deployed devices is only as safe as its rollback. Every OTA path I build carries integrity checking and a way back.',
    },
    {
      k: '03',
      t: 'Own the whole vertical',
      d: 'From the register on the chip to the row in the database — a device-to-cloud system works when one person understands the whole path.',
    },
    {
      k: '04',
      t: 'The record must match reality',
      d: 'Operations trust the database only when it mirrors real device behaviour. Structure follows how devices actually live and get supported.',
    },
  ],
};

/* --------------------------------------------------------------------------
   NAVIGATION
   -------------------------------------------------------------------------- */
/* Four links only — the header stays uncrowded at tablet widths. Capabilities
   is reachable by scrolling from Work; availability moved into the hero. */
export const nav = [
  { label: 'Work', href: '#work' },
  { label: 'Experience', href: '#experience' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export const contactLine = "Let's build something that has to work outside the demo.";
