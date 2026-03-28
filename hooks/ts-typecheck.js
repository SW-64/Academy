#!/usr/bin/env node
/**
 * PostToolUse Hook — TypeScript 타입 체크
 * Write / Edit / MultiEdit 도구로 .ts / .tsx 파일을 수정한 뒤
 * tsc --noEmit 을 실행하고 타입 에러가 있으면 Claude에게 피드백합니다.
 */

const { execSync } = require('child_process');
const path = require('path');

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

  // 수정된 파일 경로 추출
  let filePath = '';
  if (tool_name === 'Write' || tool_name === 'Edit') {
    filePath = tool_input?.file_path ?? '';
  } else if (tool_name === 'MultiEdit') {
    filePath = tool_input?.file_path ?? '';
  }

  // .ts / .tsx 파일만 대상으로 함 (test / spec / .d.ts 제외)
  if (!filePath || !/\.(tsx?)$/.test(filePath) || /\.(spec|test|d)\.tsx?$/.test(filePath)) {
    process.exit(0);
  }

  // 프로젝트 루트 찾기 (tsconfig.json 기준)
  const projectRoot = path.resolve(
    path.dirname(filePath),
    findProjectRoot(filePath)
  );

  try {
    execSync('npx tsc --noEmit --pretty false', {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
    });
    // 타입 에러 없음 — 피드백 없이 종료
    process.exit(0);
  } catch (err) {
    const output = [err.stdout?.toString(), err.stderr?.toString()]
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!output) {
      process.exit(0);
    }

    // 에러를 Claude에게 피드백
    const response = {
      decision: 'feedback',
      message: `TypeScript 타입 체크 실패 (tsc --noEmit):\n\n${output}\n\n위 타입 에러를 수정해 주세요.`,
    };
    process.stdout.write(JSON.stringify(response));
    process.exit(0);
  }
});

/**
 * 파일 경로에서 tsconfig.json이 있는 가장 가까운 상위 디렉터리까지의
 * 상대 경로를 반환합니다.
 */
function findProjectRoot(filePath) {
  const fs = require('fs');
  let dir = path.dirname(filePath);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'tsconfig.json'))) {
      return path.relative(path.dirname(filePath), dir) || '.';
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return '.';
}
