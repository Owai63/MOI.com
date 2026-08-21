/* ============================================================================
   copy — editorial / section interface strings (bilingual)
   ----------------------------------------------------------------------------
   Section eyebrows, titles, inline labels and connective words that are
   authored in the components (not in the content data model). Kept here so the
   whole site flips language from one place. ENGLISH ONLY — the Arabic for
   every string here is produced once by `npm run translate`. Portfolio *facts*
   still live in the content dictionary; this is presentation chrome only.
   ========================================================================== */

export interface Copy {
  hero: { viewWork: string; contact: string; scroll: string };
  impact: { eyebrow: string; focus: string; evidence: string };
  interlude: { open: string; close: string };
  work: {
    eyebrow: string;
    title: string;
    role: string;
    context: string;
    status: string;
    ownership: string;
    stack: string;
    catProduction: string;
    catAcademic: string;
    read: string;
    tagActive: string;
    tagConcept: string;
    tagNeeds: string;
    tagLive: string;
    viewAll: string;
  };
  allProjects: {
    eyebrow: string;
    title: string;
    intro: string;
    back: string;
    filterAll: string;
    filterProduction: string;
    filterAcademic: string;
    read: string;
  };
  featured: {
    eyebrow: string; // "Featured System — " prefix
    headline: string;
    inside: string; // "Inside {name}"
    figcaption: string;
    facts: { platform: string; updates: string; cloud: string; config: string };
    factValues: { platform: string; updates: string; cloud: string; config: string };
  };
  capabilities: { eyebrow: string; title: string };
  experience: { eyebrow: string; title: string; additional: string };
  recognition: {
    eyebrow: string;
    title: string;
    education: string;
    degreeConnector: string; // "in" / "في"
    cgpa: string; // "CGPA /"
    awardsLabel: string;
    certsLabel: string;
  };
  credentials: { eyebrow: string; title: string; verify: string };
  philosophy: { eyebrow: string };
  opportunities: { eyebrow: string; title: string; also: string };
  contact: {
    eyebrow: string;
    copy: string;
    copied: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    openTo: string;
  };
  footer: { backToTop: string };
  caseStudy: {
    allWork: string;
    role: string;
    context: string;
    status: string;
    challenge: string;
    ownership: string;
    conceptual: string;
    conceptualViz: string;
    explodeHint: string;
    illustrative: string;
    techStack: string;
    disclaimerNeeds: string;
    disclaimerNormal: string;
    discuss: string;
  };
  /** The scrolled sequence on the shooting-range case study. One caption per
   *  beat of the choreography in three/bench/range/rangePath.ts. */
  rangeSequence: {
    hint: string;
    beats: { title: string; body: string }[];
  };
}

export const copyEn: Copy = {
  hero: { viewWork: 'View Selected Work', contact: 'Contact', scroll: 'Scroll' },
  impact: { eyebrow: 'Engineering impact', focus: 'Focus', evidence: 'Evidence' },
  interlude: { open: 'Selected Systems', close: 'Outside the demo' },
  work: {
    eyebrow: 'Selected Systems',
    title: 'Systems built to leave the lab.',
    role: 'Role',
    context: 'Context',
    status: 'Status',
    ownership: 'Ownership',
    stack: 'Stack',
    catProduction: 'Production system',
    catAcademic: 'Academic project',
    read: 'View case study',
    tagActive: 'Freelance · developing actively',
    tagConcept: 'Conceptual visualization',
    tagNeeds: 'Conceptual · content required',
    // Shown under the live 3D window: the model is built to the real hardware,
    // but it is a reconstruction, not a photograph.
    tagLive: 'Live 3D model · reconstruction',
    viewAll: 'View all projects',
  },
  allProjects: {
    eyebrow: 'Full Index',
    title: 'Every system, every build.',
    intro:
      'The complete catalogue — production systems, freelance builds, and academic projects — each with its own case study.',
    back: '← Back to home',
    filterAll: 'All',
    filterProduction: 'Production',
    filterAcademic: 'Academic',
    read: 'Read case study →',
  },
  featured: {
    eyebrow: 'Featured System — ',
    headline: 'A tracker that has to stay found — after it leaves the building.',
    inside: 'Inside',
    figcaption: 'Conceptual visualization of device-to-cloud connectivity',
    facts: { platform: 'Platform', updates: 'Updates', cloud: 'Cloud', config: 'Config' },
    factValues: {
      platform: 'EC200U · QuecOpen SDK',
      updates: 'HTTP FOTA · rollback-safe',
      cloud: 'AWS EC2 / S3 dashboard',
      config: 'Cross-platform BLE',
    },
  },
  capabilities: {
    eyebrow: 'Engineering Capabilities',
    title: 'From the register on the chip to the row in the database.',
  },
  experience: {
    eyebrow: 'Experience',
    title: 'Where the systems were built.',
    additional: 'Additional experience',
  },
  recognition: {
    eyebrow: 'Education, Recognition & Credentials',
    title: 'The record behind the work.',
    education: 'Education',
    degreeConnector: 'in',
    cgpa: 'CGPA /',
    awardsLabel: 'Recognition',
    certsLabel: 'Selected credentials',
  },
  credentials: {
    eyebrow: 'Selected Credentials',
    title: 'Verified, and linked.',
    verify: 'Verify credential',
  },
  philosophy: { eyebrow: 'Engineering Philosophy' },
  opportunities: {
    eyebrow: 'Focused Opportunities',
    title: "Where I'd hit the ground running.",
    also: 'Also',
  },
  contact: {
    eyebrow: 'Contact',
    copy: 'Copy',
    copied: 'Copied ✓',
    email: 'Email',
    phone: 'Phone',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    openTo: 'Open to',
  },
  footer: { backToTop: 'Back to top ↑' },
  caseStudy: {
    allWork: '← All work',
    role: 'Role',
    context: 'Context',
    status: 'Status',
    challenge: 'The challenge',
    ownership: 'Engineering ownership',
    conceptual: 'Conceptual',
    conceptualViz: 'Conceptual visualization',
    explodeHint: 'Scroll to separate',
    illustrative: 'Illustrative diagram',
    techStack: 'Technology stack',
    disclaimerNeeds:
      'This case study is a placeholder. It makes no performance claim and contains no invented results — real role, architecture, dataset, model, and outcomes need to be supplied before publishing.',
    disclaimerNormal:
      'Conceptual visualizations on this page are clearly labelled and are not documentary screenshots or captured production data. Everything else reflects the work as recorded in the source portfolio.',
    discuss: 'Discuss this project →',
  },
  rangeSequence: {
    hint: 'Scroll to run the lane',
    beats: [
      {
        title: 'The lane',
        body: 'An indoor bay, one rail down the centre of it, and a target that has to arrive exactly where the operator asked — every time, without anyone walking downrange.',
      },
      {
        title: 'The command',
        body: 'The operator picks a target and a distance. The console frames the request, addresses that unit, and puts it on the air as an XBee API packet.',
      },
      {
        title: 'Away',
        body: 'Nothing moves until the acknowledgement comes back. Then the driver comes up, the pinion takes the rack, and the carriage ramps off the near stop.',
      },
      {
        title: 'Downrange',
        body: 'Encoder counts, limit-switch handling and a speed ramp the firmware owns. The carriage knows where it is for the whole of the run, not just at the ends.',
      },
      {
        title: 'Inside the case',
        body: 'The sealed controller that rides with it: the ATSAME70 board, the motor driver, the battery and fuse block, and the radio the whole thing is commanded over.',
      },
      {
        title: 'Home',
        body: 'Return, park on the stop, report position — and take the next command, or a new firmware image, over the same link.',
      },
    ],
  },
};
