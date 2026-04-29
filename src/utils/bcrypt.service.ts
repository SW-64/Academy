import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';

type WorkerInput =
  | { type: 'hash'; password: string; rounds: number }
  | { type: 'compare'; password: string; hash: string };

type WorkerOutput<T> = { result: T; error?: never } | { result?: never; error: string };

interface PoolWorker {
  worker: Worker;
  idle: boolean;
}

interface QueuedTask {
  data: WorkerInput;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

@Injectable()
export class BcryptService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: PoolWorker[] = [];
  private readonly queue: QueuedTask[] = [];
  private readonly poolSize = os.cpus().length;

  onModuleInit() {
    const isTs = __filename.endsWith('.ts');
    const workerPath = path.join(
      __dirname,
      isTs ? 'bcrypt.worker.ts' : 'bcrypt.worker.js',
    );
    const execArgv = isTs
      ? ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register']
      : [];

    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push({ worker: new Worker(workerPath, { execArgv }), idle: true });
    }
  }

  onModuleDestroy() {
    for (const task of this.queue) {
      task.reject(new Error('BcryptService is shutting down'));
    }
    this.queue.length = 0;
    for (const item of this.pool) {
      item.worker.terminate();
    }
    this.pool.length = 0;
  }

  private run<T>(data: WorkerInput): Promise<T> {
    return new Promise((resolve, reject) => {
      const idle = this.pool.find((w) => w.idle);
      if (idle) {
        this.assign(idle, data, resolve, reject);
      } else {
        this.queue.push({ data, resolve, reject });
      }
    });
  }

  private assign<T>(
    item: PoolWorker,
    data: WorkerInput,
    resolve: (v: T) => void,
    reject: (r: any) => void,
  ) {
    item.idle = false;

    const cleanup = () => {
      item.worker.removeListener('message', onMessage);
      item.worker.removeListener('error', onError);
    };

    const onMessage = ({ result, error }: WorkerOutput<T>) => {
      cleanup();
      item.idle = true;
      this.dequeue(item);
      if (error !== undefined) reject(new Error(error));
      else resolve(result as T);
    };

    const onError = (err: Error) => {
      cleanup();
      item.idle = true;
      this.dequeue(item);
      reject(err);
    };

    item.worker.on('message', onMessage);
    item.worker.on('error', onError);
    item.worker.postMessage(data);
  }

  private dequeue(item: PoolWorker) {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.assign(item, next.data, next.resolve, next.reject);
    }
  }

  hash(password: string, rounds: number): Promise<string> {
    return this.run<string>({ type: 'hash', password, rounds });
  }

  compare(password: string, hash: string): Promise<boolean> {
    return this.run<boolean>({ type: 'compare', password, hash });
  }
}
