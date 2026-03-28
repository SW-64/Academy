#!/usr/bin/env node
/**
 * PreToolUse Hook — .env 파일 보호
 * Read / Grep 도구가 .env 파일에 접근하려 할 때 차단합니다.
 */

const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    process.exit(0);
  }

  const { tool_name, tool_input } = input;

  // .env 파일 경로 패턴 (예: .env, .env.local, .env.production 등)
  const ENV_PATTERN = /(^|[/\\])\.env(\.[^/\\]*)?$/;

  let targetPath = '';

  if (tool_name === 'Read') {
    targetPath = tool_input?.file_path ?? '';
  } else if (tool_name === 'Grep') {
    targetPath = tool_input?.path ?? '';
  }

  if (ENV_PATTERN.test(targetPath)) {
    const response = {
      decision: 'block',
      reason: `보안 정책: .env 파일(${targetPath}) 접근이 차단되었습니다. 환경 변수가 필요하면 env-validation.config.ts 또는 CLAUDE.md의 Environment Variables 섹션을 참고하세요.`,
    };
    process.stdout.write(JSON.stringify(response));
    process.exit(2);
  }

  process.exit(0);
});
