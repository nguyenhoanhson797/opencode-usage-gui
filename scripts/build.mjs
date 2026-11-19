/**
 * Builds both parts of the plugin:
 * - the server part, plain ESM for Node/Bun, with `tsc`;
 * - the GUI part, one CommonJS bundle for OpenCode Desktop, with Vite and OpenCode's `gui()`
 *   preset.
 *
 * Both write to `.dist-staging` first and are then moved over `dist/` one file at a time. The
 * app watches this folder and fetches `gui-experimental.cjs` while it runs, so deleting `dist/`
 * first would leave it with a missing bundle for a few seconds; an in-place rename never does.
 *
 * There is no other output: no CLI, no TUI, no type declarations.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gui } from "@opencode/plugin/gui/vite";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.join(root, ".dist-staging");
const output = path.join(root, "dist");

rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json", "--outDir", staging], {
  cwd: root,
  stdio: "inherit",
});

await build({
  configFile: false,
  root,
  logLevel: "warn",
  plugins: [gui({ entry: "src/gui/index.tsx", outFile: ".dist-staging/gui-experimental.cjs" })],
});

/** Moves the staged files over `dist/`, replacing each one in place. */
const published = new Set();

function publish(from, to, prefix = "") {
  mkdirSync(to, { recursive: true });
  // A module that others import goes in before the ones that import it: `index.js` last.
  const rank = (entry) => (entry.name === "index.js" ? 2 : entry.isDirectory() ? 1 : 0);
  const entries = readdirSync(from, { withFileTypes: true }).sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      publish(source, target, relative);
      continue;
    }
    published.add(relative);
    try {
      renameSync(source, target);
    } catch {
      // A file the app holds open: copy over it, then drop the staged copy.
      copyFileSync(source, target);
      rmSync(source, { force: true });
    }
  }
}

/** Drops a file a previous build left behind, so `dist/` holds exactly this build. */
function prune(directory, prefix = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      prune(target, relative);
      continue;
    }
    if (!published.has(relative)) rmSync(target, { force: true });
  }
}

publish(staging, output);
prune(output);
rmSync(staging, { recursive: true, force: true });
