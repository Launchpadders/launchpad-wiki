'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LaunchpadGrid } from './LaunchpadGrid';
import { PianoRoll, type Note } from './PianoRoll';
import { Play, Square, RotateCcw, Trash2 } from 'lucide-react';

export function LaunchpadSimulator() {
  // Default pattern: A simple smiley face or shape
  // Eyes: 42, 45
  // Mouth: 18, 19, 20, 21, 10, 13
  const [notes, setNotes] = useState<Note[]>([
    // Step 0: Smiley
    { time: 0, pitch: 42 }, { time: 0, pitch: 45 },
    { time: 0, pitch: 18 }, { time: 0, pitch: 19 }, { time: 0, pitch: 20 }, { time: 0, pitch: 21 },
    { time: 0, pitch: 10 }, { time: 0, pitch: 13 },
    
    // Step 4: X shape
    { time: 4, pitch: 0 }, { time: 4, pitch: 7 },
    { time: 4, pitch: 9 }, { time: 4, pitch: 14 },
    { time: 4, pitch: 18 }, { time: 4, pitch: 21 },
    { time: 4, pitch: 27 }, { time: 4, pitch: 28 },
    { time: 4, pitch: 36 }, { time: 4, pitch: 35 }, // Approximate center
    
    // Step 8: All corners
    { time: 8, pitch: 0 }, { time: 8, pitch: 7 }, { time: 8, pitch: 56 }, { time: 8, pitch: 63 },
    
    // Step 12: Random scatter
    { time: 12, pitch: 30 }, { time: 12, pitch: 33 }, { time: 12, pitch: 50 }, { time: 12, pitch: 5 }
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [steps, setSteps] = useState(16);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      const stepTime = (60000 / bpm) / 4; // 16th notes
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % steps);
      }, stepTime);
    }

    return () => clearInterval(interval);
  }, [isPlaying, bpm, steps]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStep((prev) => (prev - 1 + steps) % steps);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentStep((prev) => (prev + 1) % steps);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleClear = () => {
    setNotes([]);
  };

  const handlePadClick = (padIndex: number) => {
    // Toggle note at current step
    const existingIndex = notes.findIndex(n => n.time === currentStep && n.pitch === padIndex);
    if (existingIndex >= 0) {
      const newNotes = [...notes];
      newNotes.splice(existingIndex, 1);
      setNotes(newNotes);
    } else {
      setNotes([...notes, { time: currentStep, pitch: padIndex }]);
    }
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
    // Optionally stop playback if user manually selects a step?
    // setIsPlaying(false); 
  };

  // Calculate active pads based on current step and notes
  // Direct 1:1 mapping: Note Pitch = Pad Index
  const activePads = notes
    .filter(n => n.time === currentStep)
    .map(n => n.pitch);

  return (
    <div className="flex flex-col gap-8 p-6 bg-gray-950 rounded-xl border border-gray-800">
      {/* Top Section: Launchpad */}
      <div className="flex flex-col items-center gap-4 w-full border-b border-gray-800 pb-8">
        <h3 className="text-lg font-semibold text-gray-200">Launchpad Pro MK3</h3>
        <LaunchpadGrid 
          activeNotes={activePads} 
          onPadClick={handlePadClick}
        />
      </div>
      
      {/* Bottom Section: Piano Roll */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-gray-200">Piano Roll</h3>
            <div className="flex items-center gap-2">
                <button 
                  onClick={handlePlayPause}
                  className="p-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button 
                  onClick={handleStop}
                  className="p-2 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                  title="Stop"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  onClick={handleClear}
                  className="p-2 rounded-md bg-gray-800 hover:bg-red-900/50 text-gray-300 hover:text-red-400 transition-colors"
                  title="Clear All Notes"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Speed (BPM)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="60" 
                    max="240" 
                    value={bpm} 
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-xs font-mono text-gray-300 w-8 text-right">{bpm}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Length (Steps)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="8" 
                    max="64" 
                    step="8"
                    value={steps} 
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-xs font-mono text-gray-300 w-8 text-right">{steps}</span>
                </div>
              </div>
            </div>
          </div>

          <PianoRoll 
            notes={notes} 
            onNotesChange={setNotes} 
            currentStep={currentStep}
            onStepClick={handleStepClick}
            steps={steps}
          />
          <p className="text-xs text-gray-500">
            Click on the grid to add notes. The playback will trigger lights on the Launchpad.
            <br />
            <strong>Tip:</strong> Click on the Launchpad pads to record notes at the current step!
          </p>
        </div>
    </div>
  );
}
