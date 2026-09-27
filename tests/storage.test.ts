import { describe, it, expect } from "vitest";
import { MemoryRepository, runPipeline } from "../packages/storage/src/index";

function tp(id="p1") { return { id, name:"Test", sourcePath:"/t.mp4", status:"created" as const, segments:[], sections:[], candidates:[], clips:[], stats:{totalCandidates:0,selectedClips:0,validatedClips:0,avgEngagement:0,avgQuality:0,totalRenderTimeMs:0,totalSizeMB:0}, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }; }
function tc(id="c1",pid="p1") { return { id, index:0, projectId:pid, sourceStart:0, sourceEnd:30, directorPlan:{hook:"t",pacing:"natural" as const,visualStyle:"clean" as const,musicStrategy:"none" as const,captionStrategy:"standard" as const,framingStrategy:"center" as const,effects:[],transitions:[],emphasisMoments:[],reasoning:"t",confidence:70}, profileName:"podcast", artifacts:{}, status:"rendered" as const, score:50 }; }

describe("MemoryRepository", () => {
  const repo = new MemoryRepository();
  it("CRUD projects", async () => {
    const p = tp(); await repo.createProject(p);
    expect(await repo.getProject(p.id)).toEqual(p);
    await repo.updateProject(p.id, { name: "Updated" });
    expect((await repo.getProject(p.id))!.name).toBe("Updated");
    await repo.deleteProject(p.id);
    expect(await repo.getProject(p.id)).toBeNull();
  });
  it("CRUD clips", async () => {
    const c = tc(); await repo.createClip(c);
    expect(await repo.getClip(c.id)).toEqual(c);
    await repo.updateClip(c.id, { score: 90 });
    expect((await repo.getClip(c.id))!.score).toBe(90);
    await repo.deleteClip(c.id);
  });
  it("CRUD jobs + cancel", async () => {
    const job = await repo.createJob({ projectId:"p1", type:"render", status:"queued", progress:0, message:"q", input:{}, artifacts:[], retries:0, maxRetries:2 });
    expect(await repo.getJob(job.id)).not.toBeNull();
    await repo.updateJob(job.id, { progress: 50 });
    expect((await repo.getJob(job.id))!.progress).toBe(50);
    await repo.cancelJob(job.id);
    expect((await repo.getJob(job.id))!.status).toBe("cancelled");
  });
  it("cascade delete", async () => {
    await repo.createProject(tp("px")); await repo.createClip(tc("cx","px"));
    await repo.createJob({ projectId:"px", type:"render", status:"running", progress:50, message:"t", input:{}, artifacts:[], retries:0, maxRetries:2 });
    await repo.deleteProject("px");
    expect((await repo.getClips("px")).length).toBe(0);
  });
});

describe("Job Runner", () => {
  it("runs full pipeline", async () => {
    const repo = new MemoryRepository(); await repo.createProject(tp("pp"));
    const stages: string[] = [];
    const r = await runPipeline("pp", repo, {
      ingest: async (_j,up) => { await up(50,"ing"); stages.push("ing"); return {_artifacts:["v.mp4"]}; },
      transcribe: async (_j,up) => { await up(50,"tr"); stages.push("tr"); return {_artifacts:["t.json"]}; },
      analyze: async (_j,up) => { await up(50,"an"); stages.push("an"); return {_artifacts:["a.json"]}; },
      direct: async (_j,up) => { await up(50,"di"); stages.push("di"); return {_artifacts:["d.json"]}; },
      render: async (_j,up) => { await up(50,"re"); stages.push("re"); return {_artifacts:["c.mp4"]}; },
      validate: async (_j,up) => { await up(100,"va"); stages.push("va"); return {_artifacts:[]}; },
    });
    expect(r.success).toBe(true);
    expect(stages).toEqual(["ing","tr","an","di","re","va"]);
  });
  it("stops on failure", async () => {
    const repo = new MemoryRepository(); await repo.createProject(tp("pf"));
    const stages: string[] = [];
    const r = await runPipeline("pf", repo, {
      ingest: async () => { stages.push("ing"); return {_artifacts:[]}; },
      transcribe: async () => { throw new Error("fail"); },
      analyze: async () => { stages.push("an"); return {_artifacts:[]}; },
    });
    expect(r.success).toBe(false);
    expect(stages).toEqual(["ing"]);
  });
  it("retries transient failures", async () => {
    const repo = new MemoryRepository(); await repo.createProject(tp("pr"));
    let n = 0;
    const r = await runPipeline("pr", repo, {
      render: async () => { n++; if(n<2) throw new Error("temp"); return {_artifacts:["c.mp4"]}; },
    });
    expect(r.success).toBe(true);
    expect(n).toBe(2);
  });
});
