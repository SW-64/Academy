import { Injectable } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';

type WorkerInput =
  | { type: 'hash'; password: string; rounds: number }
  | { type: 'compare'; password: string; hash: string };

type WorkerOutput<T> = { result: T; error?: never } | { result?: never; error: string };

@Injectable()
export class BcryptService {
  private run<T>(data: WorkerInput): Promise<T> {
    return new Promise((resolve, reject) => {
      const isTs = __filename.endsWith('.ts');
      const workerPath = path.join(
        __dirname,
        isTs ? 'bcrypt.worker.ts' : 'bcrypt.worker.js',
      );

      const worker = new Worker(workerPath, {
        workerData: data,
        execArgv: isTs
          ? ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register']
          : [],
      });

      worker.once('message', ({ result, error }: WorkerOutput<T>) => {
        if (error !== undefined) reject(new Error(error));
        else resolve(result as T);
      });
      worker.once('error', reject);
      worker.once('exit', (code) => {
        if (code !== 0) reject(new Error(`bcrypt worker exited with code ${code}`));
      });
    });
  }

  hash(password: string, rounds: number): Promise<string> {
    return this.run<string>({ type: 'hash', password, rounds });
  }

  compare(password: string, hash: string): Promise<boolean> {
    return this.run<boolean>({ type: 'compare', password, hash });
  }
}
