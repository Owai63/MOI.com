/* ============================================================================
   power — when a device on the bench comes alive
   ----------------------------------------------------------------------------
   Every device runs the same two-stage sequence: it assembles, and then it
   starts working. The stages are deliberately separate — hardware does not
   blink while it is still in pieces — but they are cheap to get wrong,
   because each stage is an exponential filter and filters in series are much
   slower than any one of them looks.

   The chain on the range controller is the worst case: assembly, then the
   power gate, then the lid hinge. Tuned individually at a comfortable-looking
   rate each, the three together took over two seconds to get from "the
   chapter arrived" to "the lid is open" — longer than a reader may spend on
   the chapter at all. Opening the gate earlier and running the middle stage
   faster brings the whole sequence to about 1.4s while keeping the staging
   legible.
   ========================================================================== */

/** How far assembled a device must be before anything on it lights up. */
export const POWER_GATE = 0.75;

/** Damping rate for the power ramp itself. */
export const POWER_RATE = 3.4;
