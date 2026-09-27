import Link from "next/link";

const MOCK_PROJECTS = [
  { id: "1", title: "Podcast Interview — AI in 2026", duration: "1h 42m", clips: 10, status: "completed" as const, score: 92 },
  { id: "2", title: "Startup Founder AMA", duration: "2h 14m", clips: 8, status: "completed" as const, score: 87 },
  { id: "3", title: "Tech Conference Keynote", duration: "58m", clips: 5, status: "processing" as const, score: 0 },
];

const STATUS_COLORS = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  processing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function DashboardPage() {
  const completed = MOCK_PROJECTS.filter((p) => p.status === "completed");
  const totalClips = completed.reduce((acc, p) => acc + p.clips, 0);

  return (
    <div className="flex flex-1">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900/50 p-4 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">CF</div>
          <span className="text-lg font-semibold text-white">ClipForge</span>
        </div>
        <nav className="flex flex-col gap-1">
          <Link href="/dashboard" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white">Dashboard</Link>
          <span className="rounded-lg px-3 py-2 text-sm text-zinc-500">Projects</span>
          <span className="rounded-lg px-3 py-2 text-sm text-zinc-500">Clips</span>
          <span className="rounded-lg px-3 py-2 text-sm text-zinc-500">Settings</span>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="mt-1 text-sm text-zinc-500">Overview of your video intelligence projects</p>
            </div>
            <Link href="/upload" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
              + New Project
            </Link>
          </div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <dt className="text-sm text-zinc-500">Projects</dt>
              <dd className="mt-1 text-3xl font-bold text-white">{MOCK_PROJECTS.length}</dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <dt className="text-sm text-zinc-500">Total Clips</dt>
              <dd className="mt-1 text-3xl font-bold text-white">{totalClips}</dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <dt className="text-sm text-zinc-500">Avg Score</dt>
              <dd className="mt-1 text-3xl font-bold text-white">{completed.length > 0 ? Math.round(completed.reduce((a, p) => a + p.score, 0) / completed.length) : 0}</dd>
            </div>
          </div>

          {/* Projects list */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="border-b border-zinc-800 px-5 py-3">
              <h2 className="text-sm font-semibold text-zinc-300">Recent Projects</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {MOCK_PROJECTS.map((project) => (
                <div key={project.id} className="flex items-center justify-between px-5 py-4 transition hover:bg-zinc-800/50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">🎙️</div>
                    <div>
                      <h3 className="text-sm font-medium text-white">{project.title}</h3>
                      <p className="text-xs text-zinc-500">{project.duration} · {project.clips} clips</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {project.score > 0 && (
                      <span className="text-sm font-semibold text-indigo-400">{project.score}/100</span>
                    )}
                    <span className={`rounded-full border px-3 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                      {project.status === "completed" ? "Completed" : "Processing..."}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
