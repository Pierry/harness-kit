import React from 'react';
import { render, Box, Text } from 'ink';
import { resolve } from 'node:path';
import { Engine } from './engine.js';
import { App } from './App.js';

// Args: [target?] plus an optional idea after `--`. `hk cockpit [target] [-- <idea>]`.
const argv = process.argv.slice(2);
const dashIdx = argv.indexOf('--');
const idea = dashIdx >= 0 ? argv.slice(dashIdx + 1).join(' ').trim() || null : null;
const positional = (dashIdx >= 0 ? argv.slice(0, dashIdx) : argv).filter((a) => !a.startsWith('-'));
const target = resolve(positional[0] || process.cwd());

const engine = new Engine(target);

if (!engine.isInstalled()) {
  render(
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red" bold>
        harness-kit not found at {target}
      </Text>
      <Text dimColor>run `hk install` here first, or pass a target repo: `hk cockpit &lt;path&gt;`</Text>
    </Box>,
  );
  process.exit(1);
}

// Interactive in a TTY; a one-shot snapshot when piped (testing, CI).
if (process.stdin.isTTY) {
  render(<App engine={engine} idea={idea} />, { exitOnCtrlC: false });
} else {
  const { unmount } = render(<App engine={engine} idea={idea} />, { exitOnCtrlC: false });
  setTimeout(() => {
    unmount();
    process.exit(0);
  }, 200);
}
