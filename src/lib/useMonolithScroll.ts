import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sceneState } from '../three/sceneState';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-linked monolith choreography.
 *  - Opens (separates) as the visitor leaves the hero into the work.
 *  - Reassembles into a single form as they arrive at contact.
 *  - Tracks which project layer is emphasised while moving through the work.
 * Reduced-motion users get a fixed, gently-open pose with no scrubbing.
 */
export function useMonolithScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      sceneState.separation = 0.18;
      return;
    }

    /* Two independent scrubs drive the separation: one opens the stack after
       the hero, one closes it before contact. They must NOT share a proxy and
       must NOT each assign sceneState.separation directly — whichever fired
       last would win, and the closing tween sits parked at its `from` value
       (0.9) whenever the reader is above it. Scrolling back up to the hero
       therefore left the monolith stuck wide open.

       Combining them with min() is order-independent and gives the right value
       in all three zones:
         above the opening band   → min(0, 0.9) = 0    (closed)
         between the two bands    → min(0.9, 0.9) = 0.9 (open)
         below the closing band   → min(0.9, 0) = 0    (closed) */
    const open = { sep: 0 };
    const close = { sep: 0.9 };
    const applySeparation = () => {
      sceneState.separation = Math.min(open.sep, close.sep);
    };

    const ctx = gsap.context(() => {
      // 0 — whole-page progress drives the cinematic camera arc
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => (sceneState.progress = self.progress),
      });

      // 1 — open on exit from hero (interlude before the work)
      const openTrigger = document.getElementById('interlude-open');
      if (openTrigger) {
        gsap.to(open, {
          sep: 0.9,
          ease: 'none',
          // Must be the *tween's* onUpdate, not the ScrollTrigger's. A scrubbed
          // tween keeps easing toward its target on the GSAP ticker after the
          // scroll itself has stopped; the trigger's onUpdate does not fire for
          // that tail, so reading the proxy there leaves `separation` frozen
          // part-way through the transition.
          onUpdate: applySeparation,
          scrollTrigger: {
            trigger: openTrigger,
            start: 'top bottom',
            // fully open while the transparent band still fills the viewport
            end: 'center center',
            scrub: 0.8,
            onUpdate: applySeparation,
          },
        });
      }

      // 2 — reassemble before contact (interlude before contact)
      const closeTrigger = document.getElementById('interlude-close');
      if (closeTrigger) {
        gsap.fromTo(
          close,
          { sep: 0.9 },
          {
            sep: 0,
            ease: 'none',
            onUpdate: applySeparation,
            scrollTrigger: {
              trigger: closeTrigger,
              start: 'top bottom',
              end: 'center center',
              scrub: 0.8,
              onUpdate: applySeparation,
            },
          },
        );
      }

      // 3 — emphasise a project layer while moving through the work
      const work = document.getElementById('work');
      if (work) {
        ScrollTrigger.create({
          trigger: work,
          start: 'top center',
          end: 'bottom center',
          onUpdate: (self) => {
            sceneState.activeLayer = Math.min(3, Math.floor(self.progress * 4));
          },
          onLeave: () => (sceneState.activeLayer = -1),
          onLeaveBack: () => (sceneState.activeLayer = -1),
        });
      }
    });

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [enabled]);
}
