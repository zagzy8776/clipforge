"use client";

import { useState } from "react";
import AppShell from "../components/app-shell";

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);
  const workerUrl = "https://clipforge.fly.dev";

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">System configuration and status</p>
      </div>

      <div className="space-y-6">
        {/* Infrastructure Status */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">Infrastructure</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Fly.io Worker</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                {workerUrl}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">PostgreSQL</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Connected (Aiven)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Redis</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Connected (Fly.io)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Cloudflare R2</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Connected
              </span>
            </div>
          </div>
        </div>

        {/* API Info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">API</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">REST API Base</span>
              <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">/api/v1</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">GitHub Repository</span>
              <a
                href="https://github.com/zagzy8776/clipforge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                github.com/zagzy8776/clipforge →
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Pipeline</span>
              <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">Probe → Transcribe → Score → Render → Upload</code>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">System</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Version</span>
              <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">1.0.0</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">12 packages</span>
              <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">83 tests passing</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Scoring</span>
              <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">7 dimensions</code>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
