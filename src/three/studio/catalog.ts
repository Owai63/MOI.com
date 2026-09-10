import type { ProjectSlug } from '../../data/content';

export interface StudioSpec {
  accent: string;
  title: string;
  description: string;
  control: string;
  steps: readonly string[];
  labels: readonly string[];
  exploded?: boolean;
}

/** Each demonstration follows the project record; values are illustrative. */
export const studios = {
  mymo2: {
    accent: '#57d9c5', title: 'From the vehicle to the cloud',
    description: 'Inspect the enclosure, cellular module, carrier board and antenna of the MYMO2 tracker.',
    control: 'Separate components', steps: ['Assembled', 'Internal components', 'Exploded view'],
    labels: ['EC200U cellular module', 'GNSS + BLE', 'Vehicle harness'], exploded: true,
  },
  'shooting-range': {
    accent: '#edb66d', title: 'A command becomes motion',
    description: 'Move the target carriage along its rail and inspect the radio-controlled mechanism.',
    control: 'Carriage position', steps: ['Start of rail', 'Midpoint', 'End of rail'],
    labels: ['RF command link', 'Motor-driven carriage', 'Rail travel'],
  },
  'device-management': {
    accent: '#57d9c5', title: 'One update. Connected devices.',
    description: 'Explore the firmware path from the configuration console through the server to the field device.',
    control: 'Separate system layers', steps: ['Connected system', 'Delivery path', 'System layers'],
    labels: ['BLE configuration', 'Firmware delivery', 'Field device'], exploded: true,
  },
  'lifecycle-database': {
    accent: '#a8a0fa', title: 'Every device has a history',
    description: 'Inspect the physical devices behind inventory, provisioning, deployment and service records.',
    control: 'Separate record stages', steps: ['Device inventory', 'Operational records', 'Lifecycle stages'],
    labels: ['SIM / IMEI', 'Customer assignment', 'Service history'], exploded: true,
  },
  'violence-detection': {
    accent: '#edb66d', title: 'From camera to classification',
    description: 'Explore a camera and inference rig representing the video input and processing pipeline.',
    control: 'Separate pipeline components', steps: ['Camera rig', 'Video input', 'Processing layers'],
    labels: ['16-frame clips', 'R(2+1)D-18', 'Temporal smoothing'], exploded: true,
  },
  wheelchair: {
    accent: '#57d9c5', title: 'Signals into movement',
    description: 'Inspect the wheelchair conversion, control electronics and motor-driven wheels.',
    control: 'Separate components', steps: ['Wheelchair', 'Control electronics', 'Drive components'],
    labels: ['EEG → Raspberry Pi', 'UART → Arduino', 'Motor drivers'], exploded: true,
  },
  'pet-tracker': {
    accent: '#57d9c5', title: 'Small device. Long journeys.',
    description: 'Open a compact collar tracker to reveal its battery, radio board and GPS antenna.',
    control: 'Open tracker', steps: ['Collar tracker', 'Inside the enclosure', 'Battery + radio'],
    labels: ['nRF9160', 'LTE-M / NB-IoT', 'Low-power GPS'], exploded: true,
  },
  'cedrus-website': {
    accent: '#c4b792', title: 'One website, every screen',
    description: 'Switch between the corporate pages on a desktop and mobile presentation of the responsive website.',
    control: 'Website page', steps: ['Home', 'About us', 'Services', 'Careers'],
    labels: ['Shared navigation', 'Responsive layouts', 'Vanilla JavaScript'],
  },
  'hospital-website': {
    accent: '#72b9ed', title: 'A clearer path to care',
    description: 'Explore the departments, appointment and contact views across desktop and mobile screens.',
    control: 'Website page', steps: ['Home', 'Departments', 'Appointment', 'Contact'],
    labels: ['Department cards', 'Appointment form', 'Responsive navigation'],
  },
  'gesture-car': {
    accent: '#edb66d', title: 'Tilt. Transmit. Drive.',
    description: 'Change the tilt of the wearable controller and watch the robot respond to the wireless command.',
    control: 'Controller tilt', steps: ['Steer left', 'Forward', 'Steer right'],
    labels: ['Accelerometer', 'RF telemetry', 'Arduino motor control'],
  },
  'fsm-traffic': {
    accent: '#edb66d', title: 'Order at every intersection',
    description: 'Step through an illustrative four-way signal cycle, including amber and all-red clearance states.',
    control: 'Signal phase', steps: ['N/S green', 'N/S amber', 'All red', 'E/W green', 'E/W amber', 'All red'],
    labels: ['Finite state machine', 'Clock-driven timing', 'Reset to all red'],
  },
  'bank-system': {
    accent: '#a8a0fa', title: 'Behind the account record',
    description: 'Explore the manager and client console views and the binary-file persistence behind them.',
    control: 'Console view', steps: ['Manager', 'Client', 'Binary file'],
    labels: ['C++ console', 'Role-based operations', 'File persistence'],
  },
  'food-order': {
    accent: '#edb66d', title: 'Browse. Choose. Order.',
    description: 'Follow an illustrative menu-to-order flow on a responsive storefront connected to its database.',
    control: 'Ordering step', steps: ['Menu', 'Search', 'Order'],
    labels: ['PHP frontend + backend', 'Menu search', 'MySQL records'],
  },
} satisfies Record<ProjectSlug, StudioSpec>;

export function stepAt(value: number, steps: readonly string[]) {
  return Math.min(steps.length - 1, Math.floor(value * steps.length));
}
