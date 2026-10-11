#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createGenerator } from './higgsfield.js';

let selectedEndpoint;

async function main() {
  const [file] = process.argv.slice(2);
  if (!file || process.argv.length !== 3) {
    throw new Error('Usage: npm run generate -- <request.json>');
  }

  const request = JSON.parse(await readFile(file, 'utf8'));
  selectedEndpoint = request.endpoint;
  const generate = createGenerator();
  const result = await generate(request);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (['failed', 'nsfw', 'canceled'].includes(result.status)) process.exitCode = 1;
}

main().catch((error) => {
  if (error.response?.status === 404) {
    console.error(`Higgsfield returned HTTP 404 for endpoint "${selectedEndpoint}". Check its current endpoint ID and whether your API account has access to that model.`);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});
