// COPY RULE check: fail if any em dash (—) appears in UI source code.
//
// Em dashes in `//` and `/* */` and `{/* */}` comments are allowed
// (they're internal notes and never reach a user). Anywhere else in
// .ts/.tsx/.mjs source files under app/, server/, lib/ they are an
// error.
//
// Run:   node scripts/check-em-dash.mjs
// CI:    add as `npm run check:em-dash` (see package.json).
//
// Exit 0 if clean, exit 1 if any em dash found, with offending lines
// printed to stderr.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "server", "lib"];
const EXTENSIONS = [".ts", ".tsx", ".mjs"];
const EM_DASH = "—";

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (EXTENSIONS.some((e) => full.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

// Replace comment ranges with same-length whitespace so line numbers
// and column offsets are preserved. We only need to know IF a non-
// comment chunk on a given line contains an em dash; preserving line
// breaks is what matters.
function maskComments(src) {
  let out = "";
  let i = 0;
  let mode = "code"; // code | line-comment | block-comment | string-d | string-s | string-t
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (mode === "code") {
      if (c === "/" && next === "/") {
        mode = "line-comment";
        out += "  ";
        i += 2;
      } else if (c === "/" && next === "*") {
        mode = "block-comment";
        out += "  ";
        i += 2;
      } else if (c === '"') {
        mode = "string-d";
        out += c;
        i += 1;
      } else if (c === "'") {
        mode = "string-s";
        out += c;
        i += 1;
      } else if (c === "`") {
        mode = "string-t";
        out += c;
        i += 1;
      } else {
        out += c;
        i += 1;
      }
    } else if (mode === "line-comment") {
      if (c === "\n") {
        mode = "code";
        out += "\n";
        i += 1;
      } else {
        out += " ";
        i += 1;
      }
    } else if (mode === "block-comment") {
      if (c === "*" && next === "/") {
        mode = "code";
        out += "  ";
        i += 2;
      } else if (c === "\n") {
        out += "\n";
        i += 1;
      } else {
        out += " ";
        i += 1;
      }
    } else if (mode === "string-d") {
      if (c === "\\" && next !== undefined) {
        out += c + next;
        i += 2;
      } else if (c === '"') {
        mode = "code";
        out += c;
        i += 1;
      } else {
        out += c;
        i += 1;
      }
    } else if (mode === "string-s") {
      if (c === "\\" && next !== undefined) {
        out += c + next;
        i += 2;
      } else if (c === "'") {
        mode = "code";
        out += c;
        i += 1;
      } else {
        out += c;
        i += 1;
      }
    } else if (mode === "string-t") {
      if (c === "\\" && next !== undefined) {
        out += c + next;
        i += 2;
      } else if (c === "`") {
        mode = "code";
        out += c;
        i += 1;
      } else {
        out += c;
        i += 1;
      }
    }
  }
  return out;
}

let hits = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const src = readFileSync(file, "utf8");
    const masked = maskComments(src);
    if (!masked.includes(EM_DASH)) continue;
    const origLines = src.split("\n");
    const maskedLines = masked.split("\n");
    for (let i = 0; i < maskedLines.length; i++) {
      if (maskedLines[i].includes(EM_DASH)) {
        const rel = relative(ROOT, file).replace(/\\/g, "/");
        console.error(`${rel}:${i + 1}: ${origLines[i].trim()}`);
        hits++;
      }
    }
  }
}

if (hits > 0) {
  console.error(
    `\n✗ Found ${hits} em dash(es) in UI code. Replace with periods or line breaks. ` +
      `Em dashes in // and /* */ comments are allowed.`,
  );
  process.exit(1);
}
console.log("✓ No em dashes in UI code.");
