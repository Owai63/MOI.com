/* ============================================================================
   projectVisuals — the conceptual hero image for each project
   ----------------------------------------------------------------------------
   Kept in `data/` rather than inside the component so the alt copy is part of
   the translatable English surface (see src/i18n/surface.ts). These images are
   illustrative interface — never documentary screenshots or real telemetry.
   ========================================================================== */

import type { ProjectSlug } from './content';

export interface ProjectImage {
  src: string;
  alt: string;
  position?: string;
}

export const IMAGE_VISUALS: Partial<Record<ProjectSlug, ProjectImage>> = {
  mymo2: {
    src: '/assets/generated/projects/mymo2/mymo2-route.webp',
    alt: 'Conceptual visualization of a connected-vehicle route, vehicle marker, event points, and geofence.',
  },
  'shooting-range': {
    src: '/assets/generated/projects/shooting-range/range-hero.webp',
    alt: 'Conceptual visualization of an automated shooting-range target carrier moving along a rail.',
  },
  'device-management': {
    src: '/assets/generated/projects/device-management/device-network-bg.webp',
    alt: 'Conceptual visualization of a central device-management node connected to a distributed device fleet.',
  },
  'lifecycle-database': {
    src: '/assets/generated/projects/lifecycle-database/lifecycle-bg.webp',
    alt: 'Conceptual visualization of layered product-lifecycle data with connected milestones.',
  },
  'violence-detection': {
    src: '/assets/generated/projects/violence-detection/cctv-concept.webp',
    alt: 'Conceptual CCTV-style visualization of a neutral public indoor space with illustrative person-tracking regions.',
  },
  wheelchair: {
    src: '/assets/generated/projects/brain-controlled-wheelchair/wheelchair-hero.webp',
    alt: 'Conceptual visualization of EEG brain signals controlling a powered wheelchair.',
  },
  'pet-tracker': {
    src: '/assets/generated/projects/pet-tracker/pet-tracker-hero.png',
    alt: 'Conceptual visualization of a low-power pet tracker collar with a GPS route and dog silhouette.',
  },
  'cedrus-website': {
    src: '/assets/generated/projects/cedrus-website/web-project-hero.png',
    alt: 'Conceptual multi-device mockup representing a responsive corporate website build.',
  },
  'hospital-website': {
    // Shared with cedrus-website — both are represented by the same generic
    // multi-device website mockup, since neither has a real product screenshot.
    src: '/assets/generated/projects/cedrus-website/web-project-hero.png',
    alt: 'Conceptual multi-device mockup representing a responsive multi-page website build.',
  },
  'gesture-car': {
    src: '/assets/generated/projects/gesture-car/gesture-car-hero.png',
    alt: 'Conceptual visualization of a hand gesture commanding a robotic car over a wireless link.',
  },
  'fsm-traffic': {
    src: '/assets/generated/projects/fsm-traffic/fsm-traffic-hero.png',
    alt: 'Conceptual visualization of a four-lane traffic intersection with finite-state-machine signal states.',
  },
  'bank-system': {
    src: '/assets/generated/projects/bank-system/bank-management-hero.png',
    alt: 'Conceptual visualization of a bank management dashboard with secured account records.',
  },
  'food-order': {
    src: '/assets/generated/projects/food-order/food-ordering-hero.png',
    alt: 'Conceptual multi-device mockup of an online food-ordering menu and cart interface.',
  },
};
