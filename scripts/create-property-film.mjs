import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHiggsfieldClient } from '@higgsfield/client/v2';

const output = 'site/assets/media';
await mkdir(output, { recursive: true });
const statusFile = `${output}/generation-status.json`;
const plan = JSON.parse(await readFile('media/lemay-request.json', 'utf8'));
const identity = { provider: 'Higgsfield', model: 'Seedance 2.5', endpoint: plan.endpoint };
try {
  if (!process.env.HF_CREDENTIALS?.trim()) throw new Error('missing_credentials');
  if (!process.env.GITHUB_REPOSITORY || !process.env.GITHUB_SHA) throw new Error('missing_source_commit');
  const root = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${process.env.GITHUB_SHA}/media/references`;
  const image_urls = plan.references.map((name) => `${root}/${encodeURIComponent(name)}`);
  // Check that the model can retrieve every public reference before making a billable request.
  for (const url of image_urls) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
      throw new Error('reference_unavailable');
    }
    await response.arrayBuffer();
  }
  const client = createHiggsfieldClient({
    credentials: process.env.HF_CREDENTIALS.trim(),
    maxRetries: 0,
    maxPollTime: 30 * 60 * 1000,
    pollInterval: 5000,
    headers: { 'Idempotency-Key': `lemay-${process.env.GITHUB_RUN_ID}` },
  });
  console.log('Submitting 20-second Seedance 2.5 property film with four property references.');
  const result = await client.subscribe(plan.endpoint, { input: { ...plan.input, image_urls }, withPolling: true });
  if (result.status !== 'completed' || !result.video?.url) {
    await writeFile(statusFile, JSON.stringify({ ...identity, state: result.status ?? 'unknown', requestId: result.request_id }, null, 2));
    process.exitCode = 1;
  } else {
    const mediaUrl = new URL(result.video.url);
    if (mediaUrl.protocol !== 'https:') throw new Error('invalid_media_url');
    const media = await fetch(mediaUrl, { signal: AbortSignal.timeout(120000) });
    if (!media.ok) throw new Error('download_failed');
    await writeFile('/tmp/lemay-source.mp4', Buffer.from(await media.arrayBuffer()));
    await writeFile(statusFile, JSON.stringify({ ...identity, state: 'generated', requestId: result.request_id, generatedAt: new Date().toISOString() }, null, 2));
    console.log('Film generated and downloaded. Preparing website copies.');
  }
} catch (error) {
  // Never serialize SDK request/config objects: they contain authentication headers.
  const reason = ['missing_credentials', 'missing_source_commit', 'reference_unavailable', 'invalid_media_url', 'download_failed'].includes(error.message) ? error.message : 'generation_failed';
  await writeFile(statusFile, JSON.stringify({ ...identity, state: 'failed', reason, httpStatus: error.statusCode ?? error.response?.status ?? null }, null, 2));
  console.error(`Property film failed: ${reason}${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}.`);
  process.exitCode = 1;
}
