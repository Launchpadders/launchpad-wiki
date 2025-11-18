"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";

const CELL_SIZE = 56;
const SQUARE_SIZE = CELL_SIZE * 0.65;
const PULSE_INTERVAL = 2600;
const WAVE_SPEED = 0.25; // pixels per millisecond
const WAVE_WIDTH = CELL_SIZE * 1.4;
const FADE_TRAIL = 0.08;

type Pulse = {
  start: number;
  origin: p5.Vector;
};

export function DottedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      container.style.setProperty("opacity", "0.35");
      return;
    }

    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let instance: p5 | null = null;
    let disposed = false;

    const pulses: Pulse[] = [];
    let lastPulse = 0;

    const sketch = (p: p5) => {
      const ensureCanvasSize = () => {
        const { clientWidth, clientHeight } = container;
        const width = Math.max(clientWidth, 1);
        const height = Math.max(clientHeight, 1);

        if (p.width !== width || p.height !== height) {
          p.resizeCanvas(width, height);
        }
      };

      p.setup = () => {
        p.createCanvas(container.clientWidth || 1, container.clientHeight || 1, p.P2D);
        p.pixelDensity(window.devicePixelRatio || 1);
        p.colorMode(p.HSL, 360, 100, 100, 1);
        p.rectMode(p.CENTER);
        p.noStroke();
      };

      p.windowResized = ensureCanvasSize;

      p.draw = () => {
        ensureCanvasSize();
        p.fill(0, 0, 0, FADE_TRAIL);
        p.rectMode(p.CORNER);
        p.rect(0, 0, p.width, p.height);
        p.rectMode(p.CENTER);

        const now = p.millis();

        if (now - lastPulse > PULSE_INTERVAL) {
          const origin = p.createVector(
            p.random(p.width * 0.25, p.width * 0.75),
            p.random(p.height * 0.25, p.height * 0.75),
          );
          pulses.push({
            start: now,
            origin,
          });
          lastPulse = now;
        }

        for (let idx = pulses.length - 1; idx >= 0; idx -= 1) {
          const pulse = pulses[idx];
          if (pulse && now - pulse.start > 8000) {
            pulses.splice(idx, 1);
          }
        }

        for (let x = -CELL_SIZE; x <= p.width + CELL_SIZE; x += CELL_SIZE) {
          for (let y = -CELL_SIZE; y <= p.height + CELL_SIZE; y += CELL_SIZE) {
            let intensity = 0;

            for (const pulse of pulses) {
              const d = p.dist(x, y, pulse.origin.x, pulse.origin.y);
              const waveFront = (now - pulse.start) * WAVE_SPEED;
              const delta = d - waveFront;
              const contribution = Math.exp(-(delta * delta) / (2 * WAVE_WIDTH * WAVE_WIDTH));
              intensity += contribution;
            }

            const noise = p.noise(x * 0.01, y * 0.01, now * 0.0003) * 0.15;
            intensity = Math.min(intensity + noise, 1.4);

            const hue = p.map(intensity, 0, 1.4, 195, 215);
            const sat = p.map(intensity, 0, 1.4, 25, 85);
            const light = p.map(intensity, 0, 1.4, 10, 70);
            const alpha = p.map(intensity, 0, 1.4, 0.05, 0.9);

            p.fill(hue, sat, light, alpha);
            p.rect(x, y, SQUARE_SIZE, SQUARE_SIZE, 6);
          }
        }
      };
    };

    const startSketch = async () => {
      const P5 = (await import("p5")).default;
      if (disposed) {
        return;
      }

      instance = new P5(sketch, container);

      resizeObserver = new ResizeObserver(() => {
        animationFrame = requestAnimationFrame(() => {
          if (container && instance) {
            instance.resizeCanvas(container.clientWidth || 1, container.clientHeight || 1);
          }
        });
      });

      resizeObserver.observe(container);
    };

    startSketch();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      instance?.remove();
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-40 blur-sm"
      aria-hidden="true"
    >
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
