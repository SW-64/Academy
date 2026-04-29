import { parentPort } from 'worker_threads';
import * as bcrypt from 'bcrypt';

type WorkerInput =
  | { type: 'hash'; password: string; rounds: number }
  | { type: 'compare'; password: string; hash: string };

parentPort!.on('message', async (input: WorkerInput) => {
  try {
    let result: string | boolean;
    if (input.type === 'hash') {
      result = await bcrypt.hash(input.password, input.rounds);
    } else {
      result = await bcrypt.compare(input.password, input.hash);
    }
    parentPort!.postMessage({ result });
  } catch (err: any) {
    parentPort!.postMessage({ error: err.message });
  }
});
