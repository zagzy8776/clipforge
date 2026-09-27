/* -------------------------------------------------------------------------- */
/* Queue interface — provider-agnostic job queue                              */
/* -------------------------------------------------------------------------- */

export interface QueueMessage<T = unknown> {
  id: string;
  jobId: string;
  projectId: string;
  payload: T;
  /** ISO timestamp when enqueued. */
  enqueuedAt: string;
  /** Number of times this message has been delivered. */
  attempts: number;
  /** Maximum attempts before dead-letter. */
  maxAttempts: number;
  /** ISO timestamp of next delivery attempt. */
  nextAttemptAt: string;
}

export interface Queue<T = unknown> {
  /** Enqueue a message. Returns the message ID. */
  enqueue(msg: Omit<QueueMessage<T>, "id" | "enqueuedAt" | "attempts" | "nextAttemptAt">): Promise<string>;
  /** Dequeue the next message (blocking or returns null). Returns null if empty. */
  dequeue(): Promise<QueueMessage<T> | null>;
  /** Acknowledge successful processing. Removes the message. */
  ack(messageId: string): Promise<void>;
  /** Negative acknowledgment — schedule retry with exponential backoff. */
  nack(messageId: string, error?: string): Promise<void>;
  /** Cancel a pending message. */
  cancel(messageId: string): Promise<void>;
  /** Get queue depth. */
  depth(): Promise<number>;
  /** Get failed messages (dead letter). */
  deadLetters(): Promise<QueueMessage<T>[]>;
}

/* -------------------------------------------------------------------------- */
/* MemoryQueue — in-memory queue for development                              */
/* -------------------------------------------------------------------------- */

export class MemoryQueue<T = unknown> implements Queue<T> {
  private pending: QueueMessage<T>[] = [];
  private processing = new Map<string, QueueMessage<T>>();
  private dead: QueueMessage<T>[] = [];

  async enqueue(msg: Omit<QueueMessage<T>, "id" | "enqueuedAt" | "attempts" | "nextAttemptAt">): Promise<string> {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const full: QueueMessage<T> = {
      ...msg, id, enqueuedAt: new Date().toISOString(), attempts: 0, maxAttempts: msg.maxAttempts ?? 3, nextAttemptAt: new Date().toISOString(),
    };
    this.pending.push(full);
    return id;
  }

  async dequeue(): Promise<QueueMessage<T> | null> {
    const now = new Date();
    const idx = this.pending.findIndex((m) => new Date(m.nextAttemptAt) <= now);
    if (idx === -1) return null;
    const msg = this.pending.splice(idx, 1)[0]!;
    msg.attempts++;
    this.processing.set(msg.id, msg);
    return msg;
  }

  async ack(messageId: string): Promise<void> {
    this.processing.delete(messageId);
  }

  async nack(messageId: string, error?: string): Promise<void> {
    const msg = this.processing.get(messageId);
    if (!msg) return;
    this.processing.delete(messageId);
    if (msg.attempts >= msg.maxAttempts) {
      this.dead.push({ ...msg, payload: { ...msg.payload as object, _error: error } } as QueueMessage<T>);
    } else {
      // Exponential backoff: 1s, 2s, 4s, ...
      const backoff = Math.min(30, Math.pow(2, msg.attempts - 1));
      msg.nextAttemptAt = new Date(Date.now() + backoff * 1000).toISOString();
      this.pending.push(msg);
    }
  }

  async cancel(messageId: string): Promise<void> {
    this.pending = this.pending.filter((m) => m.id !== messageId);
    this.processing.delete(messageId);
  }

  async depth(): Promise<number> {
    return this.pending.length;
  }

  async deadLetters(): Promise<QueueMessage<T>[]> {
    return [...this.dead];
  }
}
