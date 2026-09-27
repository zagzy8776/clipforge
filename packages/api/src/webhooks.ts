/**
 * Webhook system — POST events to registered URLs.
 * Each event has a type, payload, and timestamp.
 */

export type WebhookEvent =
  | { event: "job.created"; jobId: string; projectId: string; type: string }
  | { event: "job.started"; jobId: string; projectId: string; type: string }
  | { event: "job.progress"; jobId: string; projectId: string; progress: number; message: string }
  | { event: "job.completed"; jobId: string; projectId: string; type: string }
  | { event: "job.failed"; jobId: string; projectId: string; type: string; error: string }
  | { event: "job.cancelled"; jobId: string; projectId: string; type: string }
  | { event: "clip.created"; clipId: string; projectId: string }
  | { event: "clip.rendered"; clipId: string; projectId: string }
  | { event: "project.created"; projectId: string }
  | { event: "project.completed"; projectId: string; clipCount: number };

const webhookSubscribers = new Map<string, string[]>(); // projectId → URLs

/** Register a webhook URL for a project. */
export function registerWebhook(projectId: string, url: string) {
  const urls = webhookSubscribers.get(projectId) ?? [];
  if (!urls.includes(url)) urls.push(url);
  webhookSubscribers.set(projectId, urls);
}

/** Send a webhook event to all registered URLs for a project. */
export async function sendWebhook(projectId: string, event: WebhookEvent): Promise<void> {
  const urls = webhookSubscribers.get(projectId) ?? [];
  const payload = JSON.stringify({ ...event, timestamp: new Date().toISOString() });

  for (const url of urls) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      // Webhook failures are non-fatal — log and continue
      console.warn(`Webhook delivery failed: ${url}`);
    }
  }
}

/** Get registered webhooks for a project. */
export function getWebhooks(projectId: string): string[] {
  return webhookSubscribers.get(projectId) ?? [];
}
