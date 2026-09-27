"use client";

import Sidebar from "./sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
