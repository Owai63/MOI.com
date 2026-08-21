/* ============================================================================
   useBenchScroll — scroll choreography for the workbench
   ----------------------------------------------------------------------------
   The camera is driven by measured DOM positions rather than by a single
   normalised page progress, because the work chapters are not equal heights.
   A linear map from scroll progress to camera station drifts: by the fourth
   chapter the camera is framing the third one.

   Instead the page is treated as a piecewise track with flat segments:

     · while a chapter's article is under the middle of the viewport, the
       camera HOLDS at that chapter's station and its device is fully built
     · in the gap between two chapters the station moves from one to the next,
       and `build` dips through zero — which is where the outgoing device
       folds away and the incoming one assembles, hidden inside the same
       moment of movement

   `power` follows `build`, deliberately lagging it, so a device finishes
   assembling before anything on it lights up.
   ========================================================================== */

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sceneState } from '../three/sceneState';
import { LAST_STATION } from '../three/bench/cameraPath';
import { rangeAt } from '../three/bench/range/rangePath';

gsap.registerPlugin(ScrollTrigger);

interface Band {
  /** document-space bounds of one work chapter. */
  top: number;
  bottom: number;
}

/** Fraction trimmed off each end of a chapter to make room for the swap. */
const HOLD_INSET = 0.24;

const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

export function useBenchScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // a settled pose: the bench framed wide, nothing assembling
      sceneState.station = 0;
      sceneState.build = 0;
      sceneState.power = 0;
      sceneState.activeProject = -1;
      sceneState.frameBiasY = 0;
      return;
    }

    let bands: Band[] = [];
    let heroCenter = 0;
    let tailCenter = 0;

    /** Re-measure every chapter. Runs on ScrollTrigger refresh, which already
     *  fires on resize, font load and layout change. */
    const measure = () => {
      const articles = Array.from(
        document.querySelectorAll<HTMLElement>('#work [data-layer]'),
      );
      const pageY = window.scrollY;
      /* The hold band is the middle of each chapter, not the whole of it.
         Consecutive chapters are separated by only ~90px of margin, and using
         the literal gap as the transition window meant a device had to fold
         away and the next one assemble inside a fifth of a screen of
         scrolling — far too fast to read as anything but a pop. Insetting the
         hold gives the swap most of a viewport to happen in, while the camera
         still sits square on a chapter for the whole time its text is the
         thing being read. */
      bands = articles.map((el) => {
        const r = el.getBoundingClientRect();
        const inset = r.height * HOLD_INSET;
        return { top: r.top + pageY + inset, bottom: r.bottom + pageY - inset };
      });

      const hero = document.getElementById('top');
      heroCenter = hero
        ? hero.getBoundingClientRect().top + pageY + hero.offsetHeight / 2
        : window.innerHeight / 2;

      const tail = document.getElementById('interlude-close');
      tailCenter = tail
        ? tail.getBoundingClientRect().top + pageY + tail.offsetHeight / 2
        : (bands.at(-1)?.bottom ?? 0) + window.innerHeight;
    };

    const apply = () => {
      if (!bands.length) return;
      const centerY = window.scrollY + window.innerHeight / 2;

      /* Which chapter is the reader in, or nearest to, and how far outside it
         are they? Distance is normalised against the gap being crossed, so
         the transition takes the same share of the journey regardless of how
         much whitespace sits between two chapters. */
      let index = 0;
      let station = 1;
      let build = 0;

      const first = bands[0];
      const last = bands[bands.length - 1];

      if (centerY < first.top) {
        // approaching the work from the hero
        const span = Math.max(1, first.top - heroCenter);
        const t = smooth((centerY - heroCenter) / span);
        station = t;
        build = Math.max(0, (t - 0.55) / 0.45);
        index = 0;
      } else if (centerY > last.bottom) {
        // leaving the work towards the closing sections
        const span = Math.max(1, tailCenter - last.bottom);
        const t = smooth((centerY - last.bottom) / span);
        station = LAST_STATION - 1 + t;
        build = Math.max(0, 1 - t / 0.45);
        index = bands.length - 1;
      } else {
        // inside the work: find the containing band, or the gap between two
        let found = -1;
        for (let i = 0; i < bands.length; i++) {
          if (centerY >= bands[i].top && centerY <= bands[i].bottom) {
            found = i;
            break;
          }
        }
        if (found >= 0) {
          index = found;
          station = 1 + found;
          build = 1;
        } else {
          // in a gap — locate the pair it falls between
          let prev = 0;
          for (let i = 0; i < bands.length - 1; i++) {
            if (centerY > bands[i].bottom && centerY < bands[i + 1].top) {
              prev = i;
              break;
            }
          }
          const gapStart = bands[prev].bottom;
          const gapEnd = bands[prev + 1].top;
          const t = smooth((centerY - gapStart) / Math.max(1, gapEnd - gapStart));
          station = 1 + prev + t;
          // the swap happens at the midpoint, where nothing is built
          index = t < 0.5 ? prev : prev + 1;
          build = Math.abs(t - 0.5) * 2;
        }
      }

      sceneState.station = station;
      sceneState.activeProject = index;
      /* Work chapters alternate which column holds the visual (the `flip`
         class on odd chapters), so the camera alternates with them. Below the
         tablet breakpoint the grid collapses to one column and the visual sits
         under the text, so the frame stays centred. */
      const narrow = window.innerWidth < 900;
      sceneState.frameBias = narrow ? 0 : index % 2 === 0 ? 1 : -1;
      // stacked layout: the visual column sits under the copy, not beside it
      sceneState.frameBiasY = narrow ? 1 : 0;
      sceneState.build = build;
      // power lags the build: the device is assembled before it lights up
      sceneState.power = smooth((build - 0.62) / 0.38);
    };

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          sceneState.progress = self.progress;
          apply();
        },
        onRefresh: () => {
          measure();
          apply();
        },
      });
    });

    measure();
    apply();
    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, [enabled]);
}

/* ============================================================================
   useInspectScroll — the case study's exploded view
   ==========================================================================*/

/**
 * Drives `sceneState.explode` from a scrubbed band on the case study page.
 * The device separates as the reader moves through the opening of the study
 * and holds apart for the rest of it, so the diagram is still there to refer
 * back to while they read the detail.
 */
export function useInspectScroll(enabled: boolean, bandId: string) {
  useEffect(() => {
    if (!enabled) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      sceneState.explode = 0.55;
      return;
    }

    const proxy = { value: 0 };
    const ctx = gsap.context(() => {
      const band = document.getElementById(bandId);
      if (!band) return;

      gsap.to(proxy, {
        value: 1,
        ease: 'none',
        /* The tween's onUpdate, not the trigger's: a scrubbed tween keeps
           easing on the GSAP ticker after the scroll has stopped, and the
           trigger's callback does not fire for that tail — reading the proxy
           there leaves the explosion frozen part-way. */
        onUpdate: () => (sceneState.explode = proxy.value),
        scrollTrigger: {
          trigger: band,
          start: 'top 85%',
          end: 'bottom 45%',
          scrub: 0.9,
          onUpdate: () => (sceneState.explode = proxy.value),
        },
      });
    });

    return () => ctx.revert();
  }, [enabled, bandId]);
}

/* ============================================================================
   useRangeScroll — the shooting-range case study's choreography
   ============================================================================
   One tall band, one scrubbed 0..1, and everything the lane does derived from
   it by bench/range/rangePath.ts: which shot the camera is on, where the
   target runner is, and whether the controller is open.

   Deriving all three from the same number is the point. The reader is not
   watching a sequence that happens to be triggered by scroll — they are
   driving the machine. Scroll up and the target reverses, the wheels turn the
   other way, and the case closes.
   ========================================================================== */

/**
 * Drives `rangeShot`, `runner` and `explode` from a scrubbed band.
 *
 * `onBeat` is called only when the caption should change, so the React tree
 * above the canvas re-renders six times over the whole sequence rather than
 * on every scroll event.
 */
export function useRangeScroll(
  enabled: boolean,
  bandId: string,
  onBeat: (index: number) => void,
) {
  useEffect(() => {
    if (!enabled) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // a settled pose: the lane framed wide, the target part-way out
      sceneState.rangeShot = 0;
      sceneState.runner = 0.34;
      sceneState.runnerAt = 0.34;
      sceneState.explode = 0;
      onBeat(0);
      return;
    }

    const proxy = { value: 0 };
    let lastBeat = -1;

    const write = () => {
      const f = rangeAt(proxy.value);
      sceneState.rangeShot = f.shot;
      sceneState.runner = f.runner;
      sceneState.explode = f.explode;
      if (f.beat !== lastBeat) {
        lastBeat = f.beat;
        onBeat(f.beat);
      }
    };

    const ctx = gsap.context(() => {
      const band = document.getElementById(bandId);
      if (!band) return;

      gsap.to(proxy, {
        value: 1,
        ease: 'none',
        /* The tween's onUpdate, not the trigger's — see useInspectScroll: a
           scrubbed tween keeps easing on the GSAP ticker after the scroll has
           stopped, and the trigger's callback does not fire for that tail. */
        onUpdate: write,
        scrollTrigger: {
          trigger: band,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.7,
          onUpdate: write,
        },
      });
    });

    write();
    return () => ctx.revert();
  }, [enabled, bandId, onBeat]);
}
