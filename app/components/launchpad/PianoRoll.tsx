'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface Note {
  time: number; // Step index (0-31 for 2 bars of 16ths, etc.)
  pitch: number; // 0-63 matching the Launchpad grid
}

interface PianoRollProps {
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
  currentStep?: number; // For playback visualization
  onStepClick?: (step: number) => void; // New prop for selecting step
  steps?: number;
  className?: string;
}

export function PianoRoll({ 
  notes, 
  onNotesChange, 
  currentStep = -1, 
  onStepClick,
  steps = 16, 
  className 
}: PianoRollProps) {
  // 64 rows for full Launchpad grid (8x8)
  // Row 63 (top) to Row 0 (bottom)
  const rows = Array.from({ length: 64 }, (_, i) => 63 - i);
  const cols = Array.from({ length: steps }, (_, i) => i);

  const toggleNote = (time: number, pitch: number) => {
    const existingIndex = notes.findIndex(n => n.time === time && n.pitch === pitch);
    if (existingIndex >= 0) {
      const newNotes = [...notes];
      newNotes.splice(existingIndex, 1);
      onNotesChange(newNotes);
    } else {
      onNotesChange([...notes, { time, pitch }]);
    }
  };

  return (
    <div className={cn("bg-gray-950 border border-gray-800 rounded-lg flex flex-col relative", className)}>
      {/* 
        We need a container that scrolls horizontally for BOTH header and body.
        But the body also needs to scroll vertically independently.
        
        Solution:
        Outer container: overflow-x-auto (handles horizontal scroll for everything)
        Inner container: min-width-fit (ensures content expands)
        Header: sticky top-0
        Body: overflow-y-auto (handles vertical scroll)
      */}
      <div className="overflow-x-auto w-full">
        <div className="min-w-max">
          {/* Header (Step numbers) */}
          <div className="grid border-b border-gray-800 bg-gray-900 sticky top-0 z-20" style={{ gridTemplateColumns: `40px repeat(${steps}, 32px)` }}>
            <div className="h-6 border-r border-gray-800 sticky left-0 bg-gray-900 z-30"></div>
            {cols.map(step => (
              <button 
                key={`head-${step}`} 
                onClick={() => onStepClick?.(step)}
                className={cn(
                  "h-6 text-[10px] text-gray-500 flex items-center justify-center border-r border-gray-800 hover:bg-gray-800 hover:text-gray-300 transition-colors w-8", 
                  currentStep === step && "bg-gray-800 text-white font-bold"
                )}
                style={{ width: '32px' }} // Force fixed width
              >
                {step + 1}
              </button>
            ))}
          </div>

          {/* Scrollable Grid Area (Vertical) */}
          <div className="overflow-y-auto h-96 relative bg-gray-900/50">
            <div className="grid" style={{ gridTemplateColumns: `40px repeat(${steps}, 32px)` }}>
              {rows.map((row) => (
                <React.Fragment key={`row-${row}`}>
                  {/* Row Label - Sticky Left */}
                  <div className="bg-gray-900 border-b border-gray-800 text-[8px] text-gray-500 flex items-center justify-center border-r border-gray-800 select-none h-4 sticky left-0 z-10">
                    {row}
                  </div>
                  {/* Cells */}
                  {cols.map((col) => {
                    const pitch = row;
                    const isActive = notes.some(n => n.time === col && n.pitch === pitch);
                    const isPlaying = currentStep === col;

                    return (
                      <div
                        key={`cell-${row}-${col}`}
                        onMouseDown={() => toggleNote(col, pitch)}
                        className={cn(
                          "h-4 border-b border-r border-gray-800/30 cursor-pointer transition-colors hover:bg-gray-800/50",
                          isActive ? "bg-indigo-500/80 border-indigo-400" : "",
                          isPlaying && !isActive && "bg-white/5",
                          isPlaying && isActive && "brightness-125"
                        )}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
