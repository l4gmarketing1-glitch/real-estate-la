import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGenerator } from '../src/higgsfield.js';

test('passes any model endpoint and its input to the SDK', async () => {
  const calls = [];
  const generate = createGenerator({
    client: {
      async subscribe(...args) {
        calls.push(args);
        return { isCompleted: true, jobs: [] };
      },
    },
  });

  await generate({ endpoint: 'model-a/text-to-image', input: { prompt: 'A house' } });
  await generate({
    endpoint: '/v1/image2video/dop',
    input: { model: 'dop-turbo', input_images: [] },
    withPolling: false,
  });

  assert.deepEqual(calls, [
    ['model-a/text-to-image', { input: { prompt: 'A house' }, withPolling: true }],
    ['/v1/image2video/dop', { input: { model: 'dop-turbo', input_images: [] }, withPolling: false }],
  ]);
});
