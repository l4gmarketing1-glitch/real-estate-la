# real-estate-la

Server-side Higgsfield generation using the official Node.js SDK. The model endpoint and its parameters live in a request file, so switching models does not require a code change.

## Setup

Requires Node.js 20 or newer. Run `npm ci`, then set `HF_CREDENTIALS` to your Higgsfield `KEY_ID:KEY_SECRET` in your shell or environment settings. Keep it out of the repository. A single combined API key works only if it is in this SDK-required format.

Create a request file such as `request.local.json`:

```json
{
  "endpoint": "flux-pro/kontext/max/text-to-image",
  "input": {
    "prompt": "Modern Los Angeles home at sunset",
    "aspect_ratio": "9:16"
  }
}
```

Run `npm run generate -- request.local.json`. The command waits for completion and prints the SDK result as JSON. It exits with an error for failed or moderated jobs. Request files ending in `.local.json` are ignored by Git.

To use another model, change `endpoint` and provide that model's required `input` fields. For example, image-to-video models may need image URLs and a model variant. Find endpoint names and accepted fields in the [Higgsfield model documentation](https://docs.higgsfield.ai/). A different model may return a video instead of an image; inspect the returned `jobs[].results` accordingly. Set `withPolling` to `false` in the request when you want the queued job response immediately.

Run `npm test` for the local integration test. Live generation needs valid credentials and may consume credits.
