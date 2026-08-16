import { existsSync } from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import {
  renderStatementPdf,
  type StatementPdfData,
} from './statement-pdf';

interface Job {
  data: StatementPdfData;
  resolve: (buffer: Buffer) => void;
  reject: (error: Error) => void;
}

const DEFAULT_SIZE = 4;

/**
 * Small worker-thread pool for PDF rendering. pdfkit is CPU-bound and runs on
 * the worker thread so the event loop is not blocked while statements render.
 *
 * Falls back to in-thread rendering when the compiled worker file is not
 * available (e.g. running under ts-jest) so unit tests keep working.
 */
class StatementPdfPool {
  private workers: (Worker | null)[] = [];
  private idle: number[] = [];
  private pending = new Map<number, Job>();
  private queue: Job[] = [];
  private size = 0;
  private degraded = false;
  private initialized = false;

  private readonly workerPath = path.join(__dirname, 'statement-pdf.worker.js');

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    const envSize = Number(process.env.PDF_POOL_SIZE ?? '');
    this.size =
      Number.isInteger(envSize) && envSize > 0 ? envSize : DEFAULT_SIZE;

    if (existsSync(this.workerPath)) {
      this.workers = new Array<Worker | null>(this.size).fill(null);
      for (let i = 0; i < this.size; i++) this.spawn(i);
    } else {
      this.degraded = true;
    }
  }

  private spawn(index: number) {
    let worker: Worker;
    try {
      worker = new Worker(this.workerPath);
    } catch {
      this.degraded = true;
      this.drainInline();
      return;
    }
    this.workers[index] = worker;

    worker.on('message', (msg: { ok?: boolean; buffer?: ArrayBuffer; error?: string }) => {
      const job = this.pending.get(index);
      this.pending.delete(index);
      if (job) {
        if (msg.ok && msg.buffer) job.resolve(Buffer.from(msg.buffer));
        else job.reject(new Error(msg.error ?? 'PDF render failed'));
      }
      this.idle.push(index);
      this.pump();
    });

    const handleDeath = (error: Error) => {
      if (this.workers[index] === null) return;
      const job = this.pending.get(index);
      this.pending.delete(index);
      if (job) job.reject(error);
      this.workers[index] = null;
      const idleAt = this.idle.indexOf(index);
      if (idleAt >= 0) this.idle.splice(idleAt, 1);
      this.spawn(index);
    };

    worker.on('error', (err) => handleDeath(err));
    worker.on('exit', () =>
      handleDeath(new Error(`PDF worker for slot ${index} exited`)),
    );

    this.idle.push(index);
    this.pump();
  }

  private pump() {
    while (this.queue.length > 0) {
      const index = this.idle.shift();
      if (index == null) break;
      const worker = this.workers[index];
      if (!worker) continue;
      const job = this.queue.shift()!;
      this.pending.set(index, job);
      worker.postMessage({ data: job.data });
    }
  }

  private drainInline() {
    const jobs = this.queue.splice(0);
    for (const job of jobs) {
      renderStatementPdf(job.data).then(job.resolve).catch(job.reject);
    }
  }

  render(data: StatementPdfData): Promise<Buffer> {
    this.ensureInitialized();
    if (this.degraded) return renderStatementPdf(data);
    return new Promise<Buffer>((resolve, reject) => {
      this.queue.push({ data, resolve, reject });
      this.pump();
    });
  }
}

export const pdfRenderPool = new StatementPdfPool();
