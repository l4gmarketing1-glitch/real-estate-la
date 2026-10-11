#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createGenerator } from './higgsfield.js';

async function main() {
  const [file] = process.argv.slice(2);
  if (!file || process.argv.length !== 3) {
    throw new Error('Usage: npm run generate -- <request.json>');
  }

  const request = JSON.parse(await readFile(file, 'utf8'));
  const generate = createGenerator();
  const result = await generate(request);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.isFailed || result.isNsfw) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
