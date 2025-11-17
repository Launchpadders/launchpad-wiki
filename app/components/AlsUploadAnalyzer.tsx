"use client";

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { analyzePluginsFromXml, type AnalyzedProject } from '@/lib/als-analyzer';

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onabort = () => reject(new Error('File reading was aborted'));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Unexpected file reader result type'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// Tiny gunzip implementation via the browser's CompressionStream API when available.
async function gunzipArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  // Ableton .als files are gzipped XML text. Modern browsers support DecompressionStream.
  if ('DecompressionStream' in window) {
    const ds = new DecompressionStream('gzip');
    const input = new Response(buffer).body;
    if (!input) throw new Error('Could not create stream from file');

    const decompressedStream = input.pipeThrough(ds);
    const decompressedArrayBuffer = await new Response(
      decompressedStream,
    ).arrayBuffer();

    const decoder = new TextDecoder('utf-8');
    return decoder.decode(decompressedArrayBuffer);
  }

  throw new Error(
    'Your browser does not support gzip decompression in this demo. Please use a recent Chromium-based browser or Firefox.',
  );
}

async function parseAlsFile(file: File): Promise<AnalyzedProject> {
  const buffer = await readFileAsArrayBuffer(file);
  const xmlText = await gunzipArrayBuffer(buffer);
  return analyzePluginsFromXml(xmlText);
}

type Status =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; result: AnalyzedProject };

export function AlsUploadAnalyzer() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.als')) {
      setStatus({ kind: 'error', message: 'Please upload an Ableton .als file.' });
      return;
    }

    setStatus({ kind: 'parsing' });

    try {
      const result = await parseAlsFile(file);
      setStatus({ kind: 'done', result });
    } catch (error) {
      console.error(error);
      setStatus({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to read project file.',
      });
    }
  }, []);

  const onDrop = useCallback<React.DragEventHandler<HTMLButtonElement>>(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver = useCallback<React.DragEventHandler<HTMLButtonElement>>(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    },
    [],
  );

  const onDragLeave = useCallback<React.DragEventHandler<HTMLButtonElement>>(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
    },
    [],
  );

  const result = status.kind === 'done' ? status.result : null;

  const summary = useMemo(() => {
    if (!result) return null;

    const setupPlugins = result.setupPlugins ?? [];

    if (setupPlugins.length === 0) {
      return (
        <p className="text-sm text-fd-muted-foreground">
          No Max for Live devices that require extra setup were detected in this
          project.
        </p>
      );
    }

    return (
      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-medium">Detected plugins that need setup</h3>
        <ul className="mt-1 space-y-1 text-sm">
          {setupPlugins.map((plugin) => (
            <li
              key={`${plugin.id.baseName}-${plugin.id.fileHash}`}
              className="rounded-md border px-3 py-2 bg-fd-card/70"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{plugin.label}</span>
                <span className="text-xs rounded-full px-2 py-0.5 border border-amber-500 text-amber-500">
                  Setup required
                </span>
              </div>
              <p className="mt-1 text-xs text-fd-muted-foreground">
                <code className="text-[0.7rem]">{plugin.id.fileName}</code>{' '}
                <span className="opacity-70">·</span>{' '}
                <span className="opacity-70">hash:</span>{' '}
                <code className="text-[0.7rem]">{plugin.id.fileHash}</code>
              </p>
              <p className="mt-1 text-xs leading-snug">{plugin.instructions}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }, [result]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          className={`pointer-events-none flex flex-col items-center justify-center border-2 border-dashed rounded-xl px-6 py-10 text-center transition-colors ${
            isDragging
              ? 'border-fd-primary bg-fd-primary/5'
              : 'border-fd-border bg-fd-card'
          }`}
        >
        <p className="font-medium">Drag & drop your Ableton project (.als)</p>
        <p className="mt-1 text-sm text-fd-muted-foreground">
          The file is processed entirely in your browser. Only Max for Live device
          names are extracted.
        </p>
          <label className="mt-4 inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium bg-fd-background hover:bg-fd-muted cursor-pointer">
            <input
              type="file"
              accept=".als,application/octet-stream,application/gzip"
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
            Choose file
          </label>
        </div>
        <button
          type="button"
          aria-label="Upload Ableton .als project file"
          className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        />
      </div>

      {status.kind === 'parsing' && (
        <p className="text-sm text-fd-muted-foreground">Analyzing project…</p>
      )}

      {status.kind === 'error' && (
        <p className="text-sm text-red-500">{status.message}</p>
      )}

      {summary}
    </div>
  );
}
