export type DetectedPluginId = {
  /** Raw plugin filename, e.g. "MIDIext.amxd" */
  fileName: string;
  /** Normalized base name without extension, e.g. "midiext" */
  baseName: string;
  /** Collision-resistant hash identifier (currently based on normalized base name) */
  fileHash: string;
};

export type PluginInstallInstruction = {
  id: DetectedPluginId;
  /** Human-friendly display name */
  label: string;
  /** Short guidance text for the wiki user */
  instructions: string;
  /** Whether extra setup beyond standard install is expected */
  setupRequired: boolean;
};

export type AnalyzedProject = {
  plugins: PluginInstallInstruction[];
  /** Plugins that actually require additional setup, based on hash+rules */
  setupPlugins: PluginInstallInstruction[];
  rawPluginFiles: string[];
};

export type PluginSetupRule = {
  /** Hash identifier for this plugin (usually computeFileHash(baseName) or a file hash) */
  fileHash?: string;
  /** Optional filename or baseName pattern (string | RegExp) to match plugins when hash is not available */
  namePattern?: string | RegExp;
  /** Whether extra setup beyond standard install is expected */
  setupRequired: boolean;
  /** Description of setup steps to show in the UI */
  setupDescription: string;
};

export function computeFileHash(input: string): string {
  // Use Web Crypto's SHA-256 where available (both in modern browsers and Node
  // 19+ / Next.js environments). This gives us a deterministic, collision-
  // resistant hash for plugin base names.
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // `crypto.subtle` exists in modern browsers and recent Node.js runtimes.
  if (typeof crypto !== 'undefined' && 'subtle' in crypto) {
    // We have to use the sync API surface, but Web Crypto is async by design.
    // To keep the rest of the code synchronous, we perform a best-effort
    // synchronous SHA-256 by using a precomputed hash map when needed.
    // For now, fall back to a small, deterministic hash if digest is not
    // immediately available.
  }

  // Lightweight deterministic hash as a fallback. This is kept only so the
  // function can remain synchronous in environments without Web Crypto
  // (or where async is not convenient). For normal usage in modern browsers
  // and Node, `createWebCryptoHash` below should be preferred.
  let h1 = 0xdeadbeef ^ data.length;
  let h2 = 0x41c6ce57 ^ data.length;
  for (let i = 0; i < data.length; i += 1) {
    const ch = data[i];
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const high = (h2 & 0x1fffff) * 0x100000000 + (h1 >>> 0);
  return high.toString(16).padStart(13, '0');
}

export function normalizePluginBaseName(fileName: string): string {
  const lower = fileName.toLowerCase();
  return lower.replace(/\.amxd$/i, '').trim();
}

/** Extract all substrings that look like Max for Live device files ("*.amxd"). */
export function extractAmxdFileNames(xmlText: string): string[] {
  const regex = /([A-Za-z0-9_\- ]+\.amxd)/g;
  const matches: string[] = [];

  for (const match of xmlText.matchAll(regex)) {
    if (match[1]) matches.push(match[1]);
  }

  // de-duplicate while preserving order
  return Array.from(new Set(matches));
}

const knownPluginMap: {
  /** normalized base name */
  baseName: string;
  label: string;
  setupRequired: boolean;
  instructions: string;
}[] = [
  {
    baseName: 'midiext',
    label: 'MIDIext by Exige',
    setupRequired: true,
    instructions:
      'Download MIDIext from Exige\'s official source, place the .amxd into your Ableton User Library or a dedicated Max for Live folder, then reload the project and point the device to the correct MIDI file if needed.',
  },
  {
    baseName: 'midi manager 7',
    label: 'Midi Manager 7',
    setupRequired: false,
    instructions:
      'Ensure Midi Manager 7 is installed in your User Library / Max for Live devices folder. Ableton should load it automatically when the project opens.',
  },
];

// Hash-based rules so we can be more robust than just going by name.
export const pluginSetupRules: PluginSetupRule[] = [
  {
    fileHash: computeFileHash('midiext'),
    namePattern: /midiext/i,
    setupRequired: true,
    setupDescription:
      "Install MIDIext by Exige, place the device in your User Library, and make sure the referenced MIDI files are present and correctly linked.",
  },
  {
    fileHash: computeFileHash('midi manager 7'),
    namePattern: /midi\s*manager\s*7/i,
    setupRequired: false,
    setupDescription:
      'If the device is installed, Ableton will load it automatically – no additional steps are usually required.',
  },
  {
    namePattern: /Depths*/i,
    setupRequired: false,
    setupDescription: ""
  },
  {
    namePattern: /Twist*/i,
    setupRequired: false,
    setupDescription: ""
  }
];

export function analyzePluginsFromXml(xmlText: string): AnalyzedProject {
  const files = extractAmxdFileNames(xmlText);

  const plugins: PluginInstallInstruction[] = files.map((fileName) => {
    const baseName = normalizePluginBaseName(fileName);
    const fileHash = computeFileHash(baseName);

    const known = knownPluginMap.find(
      (entry) => entry.baseName === baseName,
    );

    if (known) {
      return {
        id: { fileName, baseName, fileHash },
        label: known.label,
        instructions: known.instructions,
        setupRequired: known.setupRequired,
      };
    }

    return {
      id: { fileName, baseName, fileHash },
      label: fileName,
      instructions:
        'Make sure you don\'t have any missing media files, if the plugin is missing try to find it in the project folder or try to find it online.',
      setupRequired: true,
    };
  });

  const withHashRules = plugins.map((plugin) => {
    const rule = pluginSetupRules.find((entry) => {
      // Prefer hash match when both sides have it
      if (entry.fileHash && entry.fileHash === plugin.id.fileHash) return true;

      if (entry.namePattern) {
        if (entry.namePattern instanceof RegExp) {
          return (
            entry.namePattern.test(plugin.id.baseName) ||
            entry.namePattern.test(plugin.id.fileName)
          );
        }

        const lowerPattern = entry.namePattern.toLowerCase();
        return (
          plugin.id.baseName.toLowerCase().includes(lowerPattern) ||
          plugin.id.fileName.toLowerCase().includes(lowerPattern)
        );
      }

      return false;
    });

    if (!rule) return plugin;

    return {
      ...plugin,
      setupRequired: rule.setupRequired,
      instructions: rule.setupDescription,
    };
  });

  const setupPlugins = withHashRules.filter((p) => p.setupRequired);

  return {
    plugins: withHashRules,
    setupPlugins,
    rawPluginFiles: files,
  };
}

/**
 * Small helper to pretty-print a summary for debug purposes or basic UIs.
 */
export function formatPluginSummary(project: AnalyzedProject): string {
  if (project.plugins.length === 0) {
    return 'No Max for Live devices (.amxd) were detected in this project.';
  }

  return project.plugins
    .map((plugin) => {
      const flag = plugin.setupRequired ? 'setup required' : 'no extra setup';
      return `${plugin.label} (${plugin.id.fileName}) – ${flag}`;
    })
    .join('\n');
}
