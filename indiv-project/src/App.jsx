import React, { useMemo, useRef, useState } from "react";
import "./RefactorStudio.css";
import { buildSplitRows, parseLineRange, parseReasonString, sliceLines } from "./diffUtils";

function StatusPill({ status }) {
  return <div className={`statusPill status-${status.type}`}>{status.message || "Ready."}</div>;
}

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`tab ${active ? "tabActive" : "tabInactive"}`}>
      {children}
    </button>
  );
}

function SplitDiff({ oldValue, newValue, compact }) {
  const { left, right } = useMemo(() => buildSplitRows(oldValue ?? "", newValue ?? ""), [oldValue, newValue]);

  const max = Math.max(left.length, right.length);
  const rows = [];
  for (let i = 0; i < max; i++) {
    rows.push({
      l: left[i] ?? { type: "empty", text: "" },
      r: right[i] ?? { type: "empty", text: "" },
    });
  }

  let lnL = 0;
  let lnR = 0;

  return (
    <div className={`splitDiff ${compact ? "splitDiffCompact" : ""}`}>
      <div className="diffCol">
        <div className="diffColHeader">Original</div>
        <div className="diffBody">
          {rows.map((row, idx) => {
            const showLine = row.l.type !== "empty";
            if (showLine) lnL += 1;
            return (
              <div key={idx} className={`diffRow ${row.l.type}`}>
                <div className="diffGutter">{showLine ? lnL : ""}</div>
                <pre className="diffCode">{row.l.text}</pre>
              </div>
            );
          })}
        </div>
      </div>

      <div className="diffCol">
        <div className="diffColHeader">Refactored</div>
        <div className="diffBody">
          {rows.map((row, idx) => {
            const showLine = row.r.type !== "empty";
            if (showLine) lnR += 1;
            return (
              <div key={idx} className={`diffRow ${row.r.type}`}>
                <div className="diffGutter">{showLine ? lnR : ""}</div>
                <pre className="diffCode">{row.r.text}</pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReasonsPanel({ originalCode, refactoredCode, reasons }) {
  const items = Array.isArray(reasons) ? reasons : [];

  if (!items.length) return <div className="emptyState">Reasons will appear here after refactoring.</div>;

  return (
    <div className="reasonsList">
      {items.map((raw, i) => {
        const { reason, originalRange, refactoredRange } = parseReasonString(raw);

        const lrOld = parseLineRange(originalRange);
        const lrNew = parseLineRange(refactoredRange);

        const oldSnippet = lrOld ? sliceLines(originalCode, lrOld.start, lrOld.end) : "";
        const newSnippet = lrNew ? sliceLines(refactoredCode, lrNew.start, lrNew.end) : "";

        return (
          <div key={i} className="reasonCard">
            <div className="reasonHeader">
              <div className="reasonTitle">{reason || "Change"}</div>
              <div className="reasonMeta">
                {originalRange && refactoredRange
                  ? `${originalRange} → ${refactoredRange}`
                  : originalRange || refactoredRange || "No line ranges"}
              </div>
            </div>
            <div className="reasonMiniDiff">
              <SplitDiff oldValue={oldSnippet} newValue={newSnippet} compact />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RefactorStudio() {
  const [inputMode, setInputMode] = useState("paste");
  const [originalCode, setOriginalCode] = useState("");
  const [refactoredCode, setRefactoredCode] = useState("");
  const [reasons, setReasons] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const fileInputRef = useRef(null);
  const canRefactor = originalCode.trim().length > 0 && !isLoading;

  const stats = useMemo(() => {
    const chars = originalCode.length;
    const lines = originalCode.length ? originalCode.split("\n").length : 0;
    return { chars, lines };
  }, [originalCode]);

  async function handleRefactor() {
    if (!canRefactor) return;

    setIsLoading(true);
    setStatus({ type: "idle", message: "Sending code to AI service…" });

    try {
      const res = await fetch("http://localhost:8000/refactor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: originalCode }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Refactor request failed");
      }

      const data = await res.json();
      const AgentOutput = JSON.parse(data.message).AgentOutput
      setRefactoredCode(AgentOutput.RefactoredCode ?? "");
      setReasons(Array.isArray(AgentOutput.RefactorReasons) ? AgentOutput.RefactorReasons : []);
      setStatus({ type: "success", message: "Refactor complete." });
    } catch (err) {
      setStatus({ type: "error", message: err?.message || "Something went wrong." });
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setOriginalCode("");
    setRefactoredCode("");
    setReasons([]);
    setStatus({ type: "idle", message: "" });
  }

  function handleLoadSample() {
    const sample = `print("hello world")`;
    setOriginalCode(sample);
    setInputMode("paste");
    setStatus({ type: "idle", message: "Loaded sample code." });
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setOriginalCode(text);
    setInputMode("upload");
    setStatus({
      type: "idle",
      message: `Loaded file: ${file.name} (${Math.round(file.size / 1024)} KB)`,
    });
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="title">Refactor Studio</div>
            <div className="subtitle">Input → Diff → Reasons</div>
          </div>
        </div>

        <div className="headerActions">
          <button onClick={handleLoadSample} className="secondaryButton">
            Sample
          </button>
          <button onClick={handleClear} className="secondaryButton">
            Clear
          </button>
          <button onClick={handleRefactor} disabled={!canRefactor} className="primaryButton">
            {isLoading ? "Refactoring…" : "Refactor"}
          </button>
        </div>
      </header>

      <main className="stack">
        <section className="panel">
          <div className="panelHeader">
            <div className="panelHeaderLeft">
              <span className="panelTitle">Input</span>
              <span className="badge">
                {stats.lines} lines • {stats.chars} chars
              </span>
            </div>

            <div className="tabs">
              <Tab active={inputMode === "paste"} onClick={() => setInputMode("paste")}>
                Paste
              </Tab>
              <Tab active={inputMode === "upload"} onClick={() => setInputMode("upload")}>
                Upload
              </Tab>
            </div>
          </div>

          {inputMode === "upload" && (
            <div className="uploadRow">
              <input
                ref={fileInputRef}
                type="file"
                className="hiddenInput"
                accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.cs,.cpp,.c,.rb,.php,.rs,.kt,.swift,.txt"
                onChange={handleFileSelected}
              />
              <button onClick={handleUploadClick} className="secondaryButton">
                Choose file
              </button>
              <div className="hint">Upload a code file; we’ll load it into the editor.</div>
            </div>
          )}

          <textarea
            value={originalCode}
            onChange={(e) => setOriginalCode(e.target.value)}
            placeholder="Paste your source code here…"
            spellCheck={false}
            className="codeArea"
          />
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div className="panelHeaderLeft">
              <span className="panelTitle">Diff</span>
              {refactoredCode ? <span className="badge">Ready</span> : <span className="badgeMuted">No result yet</span>}
            </div>
          </div>

          <div className="diffContainer">
            {refactoredCode ? (
              <SplitDiff oldValue={originalCode} newValue={refactoredCode} />
            ) : (
              <div className="emptyState">Run a refactor to see the diff.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div className="panelHeaderLeft">
              <span className="panelTitle">Reasons</span>
              {Array.isArray(reasons) && reasons.length ? (
                <span className="badge">{reasons.length} items</span>
              ) : (
                <span className="badgeMuted">None yet</span>
              )}
            </div>
          </div>

          <div className="reasonsContainer">
            <ReasonsPanel originalCode={originalCode} refactoredCode={refactoredCode} reasons={reasons} />
          </div>
        </section>
      </main>

      <footer className="statusBar">
        <StatusPill status={status} />
      </footer>
    </div>
  );
}