import Link from "next/link";

const clips = [
  { rank: 1, score: 46, title: "Adoption story with emotional arc", style: "cinematic", engagement: 78, quality: 82 },
  { rank: 2, score: 36, title: "College adoption detail", style: "podcast", engagement: 71, quality: 75 },
  { rank: 3, score: 35, title: "Three stories hook", style: "hype", engagement: 85, quality: 79 },
  { rank: 4, score: 34, title: "Commencement opening", style: "podcast", engagement: 68, quality: 72 },
  { rank: 5, score: 32, title: "Adoption setup", style: "documentary", engagement: 65, quality: 80 },
  { rank: 6, score: 29, title: "Reed College dropout", style: "educational", engagement: 62, quality: 74 },
];

export default function StudioPage() {
  return (
    <div className="flex flex-1">
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900/50 p-4 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">CF</div>
          <span className="text-lg font-semibold text-white">Studio</span>
        </div>
        <nav className="flex flex-col gap-1">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800">Dashboard</Link>
          <Link href="/studio" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white">Studio</Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-xl font-bold text-white">Steve Jobs Stanford — 6 Clips</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-500">3 min source · All validated</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clips.map((c) => (
            <div key={c.rank} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="mb-2 flex justify-between">
                <span className="text-xs text-zinc-500">#{c.rank}</span>
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400">{c.style}</span>
              </div>
              <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-zinc-800 text-2xl">🎬</div>
              <h3 className="text-sm font-medium text-white">{c.title}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-zinc-500">Engagement</span><div className="mt-1 h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.engagement}%` }} /></div></div>
                <div><span className="text-zinc-500">Quality</span><div className="mt-1 h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${c.quality}%` }} /></div></div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">Edit Plan</button>
                <button className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">Preview</button>
                <button className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">Export</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
