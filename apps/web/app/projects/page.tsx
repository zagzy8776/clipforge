"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../components/app-shell";

interface Project {
  id: string;
  name: string;
  status: string;
  clips: unknown[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  processing: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  created: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  failed: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">All your video processing projects</p>
        </div>
        <Link href="/upload" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
          + New Project
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-zinc-500">No projects yet.</p>
            <Link href="/upload" className="mt-2 inline-block text-sm text-indigo-400 hover:text-indigo-300">
              Create your first project →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">🎙️</div>
                  <div>
                    <h3 className="text-sm font-medium text-white">{project.name}</h3>
                    <p className="text-xs text-zinc-500">
                      {project.clips?.length ?? 0} clips · Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status] ?? STATUS_COLORS.created}`}>
                    {project.status}
                  </span>
                  <span className="text-zinc-600">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
