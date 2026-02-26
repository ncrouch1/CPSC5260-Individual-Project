import React from "react";
import { Diff, Hunk, parseDiff } from "react-diff-view";
import "react-diff-view/style/index.css";

function makeUnifiedDiff(oldStr, newStr, file = "code.txt") {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");

  const header = [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
  ].join("\n");

  const body = [...oldLines.map((l) => `-${l}`), ...newLines.map((l) => `+${l}`)].join("\n");

  return `${header}\n${body}\n`;
}

export default function DiffView({ oldValue, newValue }) {
  if (!newValue) return null;

  const diffText = makeUnifiedDiff(oldValue || "", newValue || "");
  const files = parseDiff(diffText);

  return (
    <div className="diffWrap">
      {files.map(({ hunks }, i) => (
        <Diff key={i} viewType="split" diffType="modify" hunks={hunks}>
          {(hunks) => hunks.map((h) => <Hunk key={h.content} hunk={h} />)}
        </Diff>
      ))}
    </div>
  );
}