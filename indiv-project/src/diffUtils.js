import { diffLines } from "diff";

export function buildSplitRows(oldStr, newStr) {
  const a = oldStr ?? "";
  const b = newStr ?? "";

  const parts = diffLines(a, b, { newlineIsToken: true });

  const left = [];
  const right = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];

    if (!p.added && !p.removed) {
      const lines = splitKeepNewlines(p.value);
      for (const line of lines) {
        left.push({ type: "same", text: line });
        right.push({ type: "same", text: line });
      }
      continue;
    }

    if (p.removed) {
      const removedLines = splitKeepNewlines(p.value);
      const next = parts[i + 1];
      const hasPairedAdd = next && next.added;

      if (hasPairedAdd) {
        const addedLines = splitKeepNewlines(next.value);
        const max = Math.max(removedLines.length, addedLines.length);
        for (let k = 0; k < max; k++) {
          const l = removedLines[k];
          const r = addedLines[k];
          left.push(l != null ? { type: "del", text: l } : { type: "empty", text: "" });
          right.push(r != null ? { type: "add", text: r } : { type: "empty", text: "" });
        }
        i += 1;
      } else {
        for (const line of removedLines) {
          left.push({ type: "del", text: line });
          right.push({ type: "empty", text: "" });
        }
      }
      continue;
    }

    if (p.added) {
      const addedLines = splitKeepNewlines(p.value);
      for (const line of addedLines) {
        left.push({ type: "empty", text: "" });
        right.push({ type: "add", text: line });
      }
    }
  }

  return { left, right };
}

export function parseLineRange(range) {
  const m = String(range ?? "").trim().match(/^L(\d+)\s*-\s*L(\d+)$/i);
  if (!m) return null;
  const start = Math.max(1, parseInt(m[1], 10));
  const end = Math.max(start, parseInt(m[2], 10));
  return { start, end };
}

export function sliceLines(text, start, end) {
  const lines = String(text ?? "").split("\n");
  const s = Math.max(1, start);
  const e = Math.max(s, end);
  return lines.slice(s - 1, e).join("\n");
}

export function parseReasonString(s) {
  const raw = String(s ?? "");
  const first = raw.indexOf(":");
  const second = first === -1 ? -1 : raw.indexOf(":", first + 1);

  const reason = (first === -1 ? raw : raw.slice(0, first)).trim();
  const originalRange = (first === -1 ? "" : raw.slice(first + 1, second === -1 ? raw.length : second)).trim();
  const refactoredRange = (second === -1 ? "" : raw.slice(second + 1)).trim();

  return { reason, originalRange, refactoredRange };
}

function splitKeepNewlines(s) {
  if (!s) return [];
  const lines = s.split("\n");
  if (lines.length === 1) return lines;

  const out = [];
  for (let i = 0; i < lines.length - 1; i++) out.push(lines[i] + "\n");
  if (lines[lines.length - 1] !== "") out.push(lines[lines.length - 1]);
  return out;
}