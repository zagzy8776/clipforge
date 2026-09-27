import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-950">
      <main className="flex flex-1 w-full max-w-5xl flex-col items-center justify-center px-8 py-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-400">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          AI-Powered Video Intelligence
        </div>

        <h1 className="text-center text-5xl font-bold tracking-tight text-white sm:text-7xl">
          Clip<span className="text-indigo-400">Forge</span>
        </h1>

        <p className="mt-6 max-w-2xl text-center text-lg text-zinc-400">
          Transform long-form videos into ranked, ready-to-post short-form clips.
          We understand your content first, then find the strongest moments.
        </p>

        <div className="mt-10 flex gap-4">
          <Link
            href="/dashboard"
            className="rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            Open Dashboard
          </Link>
          <a
            href="https://github.com/zagzy8776/clipforge"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 px-8 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
          >
            View Source
          </a>
        </div>

        <div className="mt-24 grid w-full max-w-3xl grid-cols-3 gap-8 text-center">
          {[
            { label: "Pipeline", value: "Understand → Rank → Render" },
            { label: "Output", value: "9:16 clips with captions" },
            { label: "Intelligence", value: "7-dimension scoring" },
          ].map((f) => (
            <div key={f.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <dt className="text-sm text-zinc-500">{f.label}</dt>
              <dd className="mt-2 text-sm font-medium text-zinc-300">{f.value}</dd>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

