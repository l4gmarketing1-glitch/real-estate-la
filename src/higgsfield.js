import { createHiggsfieldClient } from '@higgsfield/client/v2';

export function createGenerator({ credentials = process.env.HF_CREDENTIALS, client } = {}) {
  if (!client && !credentials) {
    throw new Error('HF_CREDENTIALS is required (KEY_ID:KEY_SECRET).');
  }

  const sdk = client ?? createHiggsfieldClient({ credentials });

  return async function generate({ endpoint, input, withPolling = true }) {
    if (typeof endpoint !== 'string' || !endpoint.trim()) {
      throw new TypeError('endpoint must be a non-empty model endpoint string.');
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('input must be an object with parameters for the selected model.');
    }

    return sdk.subscribe(endpoint, { input, withPolling });
  };
}
