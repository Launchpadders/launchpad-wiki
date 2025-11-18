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

  const onDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    },
    [],
  );

  const onDragLeave = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
    },
    [],
  );

  const result = status.kind === 'done' ? status.result : null;
  const projectType = result?.projectType;
  const projectCriteria = projectType?.criteria.filter((criterion) => criterion.matched) ?? [];

  const summary = useMemo(() => {
    if (!result) return null;

    return {
      totalPlugins: result.plugins.length,
      devices: result.plugins,
    };
  }, [result]);

  const detectedDevices = summary?.devices ?? [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          role="button"
          tabIndex={-1}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl px-6 py-10 text-center transition-colors ${
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
      </div>

      {status.kind === 'parsing' && (
        <p className="text-sm text-fd-muted-foreground">Analyzing project…</p>
      )}

      {status.kind === 'error' && (
        <p className="text-sm text-red-500">{status.message}</p>
      )}

      {result && summary && (
        <div className="mt-8 space-y-6">
          {projectType && (
            <section className="rounded-2xl border border-fd-primary/40 bg-fd-primary/5 px-6 py-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs -mb-2 uppercase tracking-wide text-fd-muted-foreground">
                    Detected project type
                  </p>
                  <div>
                    <h3 className="text-xl font-semibold leading-tight">
                      {projectType.label}
                    </h3>
                    <p className="text-sm text-fd-muted-foreground">
                      {projectType.description}
                    </p>
                  </div>
                </div>
              </div>
              <a
                  href={projectType.setupLink}
                  className="inline-flex items-center gap-1 rounded-full border border-fd-primary/40 bg-fd-background px-4 py-2 text-sm font-medium text-fd-primary hover:bg-fd-primary/10 no-underline"
                  target="_blank"
                  rel="noreferrer"
                >
                View setup guide
                <span aria-hidden="true">→</span>
              </a>
              <div className="mt-6">
                <p className="text-sm font-medium">Matching checklist</p>
                {projectCriteria.length === 0 ? (
                  <p className="text-sm text-fd-muted-foreground">
                    No criteria matched for this project type.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {projectCriteria.map((criterion) => (
                      <li
                        key={criterion.label}
                        className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-emerald-600 dark:text-emerald-300"
                      >
                        <span className="inline-flex size-2 rounded-full bg-emerald-500" />
                        <span>{criterion.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-fd-border bg-fd-card/80 px-6 py-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-fd-muted-foreground">
                  Max for Live devices
                </p>
                <p className="text-xl font-semibold tracking-tight">
                  {summary.totalPlugins} {summary.totalPlugins === 1
                    ? 'Device detected'
                    : 'Devices detected'}
                </p>
                <p className='-mt-4 text-sm text-fd-muted-foreground'>
                  See the full list of detected devices below.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {detectedDevices.length === 0 ? (
                <p className="text-fd-muted-foreground">
                  No Max for Live devices were detected in this project file.
                </p>
              ) : (
                <div className="rounded-xl border border-dashed border-fd-border/60 bg-fd-background/40 p-4 transition-colors">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-medium text-fd-foreground">
                    <span>Detected devices</span>
                  </summary>
                  <ul className="mt-3 divide-y divide-fd-border/60 text-fd-foreground">
                    {detectedDevices.map((plugin) => (
                      <li key={plugin.id.fileHash} className="py-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{plugin.label}</span>
                          <span className="font-mono text-xs text-fd-muted-foreground">
                            {plugin.id.fileName}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
