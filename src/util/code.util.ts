import { randomInt } from 'crypto';

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = randomInt(0, CODE_CHARS.length);
    code += CODE_CHARS[idx];
  }
  return code;
}
