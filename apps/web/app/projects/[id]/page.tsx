"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../components/app-shell";

interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  sourcePath: string;
  sourceUrl?: string;
  clips: Array<{ id: string; title: string; score: number }>;
  stats: {
    totalCandidates: number;
    selectedClips: number;
    avgEngagement: number;
    avgQuality: number;
  };
  createdAt: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then(setProject)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleProcess() {
    setProcessing(true);
    try {
      await fetch(`/api/v1/projects/${id}/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourcePath: project?.sourcePath ?? "" }) });
      // Reload project status
      const updated = await fetch(`/api/projects/${id}`).then((r) => r.json());
      setProject(updated);
    } catch { /* ignore */ }
    setProcessing(false);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="text-sm text-zinc-500">Loading project...</div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="text-center py-16">
          <h1 className="text-xl font-bold text-white">Project not found</h1>
          <Link href="/projects" className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300">← Back to projects</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8">
        <Link href="/projects" className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-300">← Projects</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Status: <span className="text-zinc-300">{project.status}</span> · Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          {project.status === "created" && (
            <button
              onClick={handleProcess}
              disabled={processing}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {processing ? "Processing..." : "▶ Start Processing"}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {project.stats && (
        <div className="mb-8 grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <dt className="text-xs text-zinc-500">Candidates</dt>
            <dd className="mt-1 text-2xl font-bold text-white">{project.stats.totalCandidates}</dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <dt className="text-xs text-zinc-500">Selected Clips</dt>
            <dd className="mt-1 text-2xl font-bold text-white">{project.stats.selectedClips}</dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <dt className="text-xs text-zinc-500">Avg Engagement</dt>
            <dd className="mt-1 text-2xl font-bold text-indigo-400">{project.stats.avgEngagement}%</dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <dt className="text-xs text-zinc-500">Avg Quality</dt>
            <dd className="mt-1 text-2xl font-bold text-emerald-400">{project.stats.avgQuality}%</dd>
          </div>
        </div>
      )}

      {/* Clips */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="border-b border-zinc-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-300">Clips ({project.clips?.length ?? 0})</h2>
        </div>
        {(!project.clips || project.clips.length === 0) ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-500">
            {project.status === "created" ? "Start processing to generate clips." : "No clips generated yet."}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {project.clips.map((clip) => (
              <div key={clip.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400 text-sm">🎬</div>
                  <div>
                    <h3 className="text-sm font-medium text-white">{clip.title}</h3>
                    <p className="text-xs text-zinc-500">Score: {clip.score}/100</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
