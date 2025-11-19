'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LaunchpadGridProps {
  activeNotes?: number[]; // MIDI note numbers or indices that are currently active
  onPadClick?: (note: number) => void;
  className?: string;
}

// Standard Launchpad Pro is 8x8 for the main grid.
// We'll use a simple 0-63 index for now, or MIDI notes.
// Let's assume a chromatic mapping or just linear for simplicity in this visualizer.
// Bottom left is usually 11 (on some modes) or 36 (C1).
// Let's stick to a simple linear 0-63 for the visualizer unless we need specific MIDI mapping.
// Actually, for a Drum Rack, it's usually bottom-left to top-right, or bottom-left 4x4 blocks.
// Let's use a linear index 0-63 starting from bottom-left to top-right for easy math.
// Row 0 (bottom): 0-7
// Row 7 (top): 56-63

export function LaunchpadGrid({ activeNotes = [], onPadClick, className }: LaunchpadGridProps) {
  // Generate 8x8 grid. 
  // We want to render from top to bottom visually, so Row 7 down to Row 0.
  const rows = Array.from({ length: 8 }, (_, i) => 7 - i);
  const cols = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className={cn("p-4 bg-gray-900 rounded-xl shadow-2xl inline-block", className)}>
      <div className="grid grid-cols-8 gap-2">
        {rows.map((row) => (
          cols.map((col) => {
            // Calculate linear index (0-63)
            // If we want bottom-left to be 0:
            const noteIndex = row * 8 + col;
            const isActive = activeNotes.includes(noteIndex);

            return (
              <button
                key={`${row}-${col}`}
                onClick={() => onPadClick?.(noteIndex)}
                className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-sm transition-all duration-75",
                  "border border-gray-700",
                  isActive 
                    ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] border-green-300 scale-95" 
                    : "bg-gray-800 hover:bg-gray-700 active:scale-95"
                )}
                aria-label={`Pad ${noteIndex}`}
              />
            );
          })
        ))}
      </div>
    </div>
  );
}
