"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/app-shell";

export default function UploadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceUrl.trim()) {
      setError("Please enter a video URL");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Untitled Project",
          sourceUrl: sourceUrl.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch {
      setError("Failed to create project. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Project</h1>
        <p className="mt-1 text-sm text-zinc-500">Upload a video URL to start processing</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-4">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-300">Project Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Podcast Episode 42"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="sourceUrl" className="mb-1 block text-sm font-medium text-zinc-300">Video URL *</label>
            <input
              id="sourceUrl"
              type="url"
              value={sourceUrl}
              onChange={(e) => { setSourceUrl(e.target.value); setError(""); }}
              placeholder="https://youtube.com/watch?v=..."
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-zinc-500">Paste a YouTube, Vimeo, or direct video URL</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
