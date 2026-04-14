"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

const DOC_TYPES = [
  { value: "", label: "Auto-detect" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "rfq", label: "RFQ / Quote Request" },
  { value: "invoice", label: "Invoice" },
];

const ACCEPTED = ".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.tiff,.txt";

type Step = "upload" | "processing" | "done";

export default function NewSessionPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("");
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const addLog = (msg: string) =>
    setProcessingLog((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setError(null);
    setStep("processing");
    setProcessingLog([]);

    try {
      addLog("Creating session...");
      const session = await api.sessions.create({ document_type: docType || undefined });

      addLog(`Session created: ${session.id.substring(0, 8)}`);
      addLog(`Uploading ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);
      await api.sessions.upload(session.id, file);

      addLog("Starting processing pipeline...");
      addLog("  Detecting file type...");
      addLog("  Extracting text...");
      addLog("  Structuring with Gemini...");
      addLog("  Running hybrid product matching...");
      addLog("  Validating line items...");

      await api.sessions.process(session.id);
      addLog("Processing complete. Redirecting to review workspace...");

      setStep("done");
      setTimeout(() => router.push(`/sessions/${session.id}`), 800);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      setError(msg);
      addLog(`Error: ${msg}`);
      setStep("upload");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1>New Session</h1>
        <p className="text-sm text-gray-500 mt-1">Upload a document to begin processing</p>
      </div>

      {error && <div className="mb-4"><ErrorMessage error={error} /></div>}

      {step === "upload" && (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-gray-400 bg-gray-50"
                : file
                ? "border-green-300 bg-green-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              id="file-input"
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-2 text-xs text-gray-400 hover:text-red-500 underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500">Drop a file here, or click to select</p>
                <p className="text-xs text-gray-400 mt-2">PDF, Excel, CSV, Image, Text</p>
              </div>
            )}
          </div>

          {/* Document type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Document type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Auto-detect reads content and filename heuristics.
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={!file}>
              Process Document
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
            Processing document...
          </div>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs space-y-1 min-h-[200px]">
            {processingLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            <div className="animate-pulse text-gray-500">_</div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
          Processing complete. Redirecting to review workspace...
        </div>
      )}
    </div>
  );
}
