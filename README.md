# real-estate-la

Server-side Higgsfield generation using the official Node.js SDK. The model endpoint and its parameters live in a request file, so switching models does not require a code change.

## Setup

Requires Node.js 20 or newer. Run `npm ci`, then set `HF_CREDENTIALS` to your Higgsfield `KEY_ID:KEY_SECRET` in your shell or environment settings. Keep it out of the repository. A single combined API key works only if it is in this SDK-required format.

Create a request file such as `request.local.json`:

```json
{
  "endpoint": "bytedance/seedance-2.5/text-to-video",
  "input": {
    "prompt": "A cinematic tracking shot of a modern Los Angeles home at sunset.",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

Run `npm run generate -- request.local.json`. The command waits for completion and prints the SDK result as JSON. It exits with an error for failed or moderated jobs. Request files ending in `.local.json` are ignored by Git.

To use another model, change `endpoint` and provide that model's required `input` fields. Your API account must have access to that model. Seedance 2.5 also supports `bytedance/seedance-2.5/image-to-video`, which requires a public image URL. An image model such as `higgsfield-ai/soul/v2/standard` requires separate access. Find current endpoint IDs and accepted fields in the [Higgsfield model documentation](https://docs.higgsfield.ai/docs/models.md). Completed image requests return `images`; completed video requests return `video`. Set `withPolling` to `false` in the request when you want the queued job response immediately.

Run `npm test` for the local integration test. Live generation needs valid credentials and may consume credits.

## Generate from GitHub Actions

Add `HF_CREDENTIALS` as a repository secret in GitHub Actions. Its value must be `KEY_ID:KEY_SECRET`. Then open **Actions → Generate with Higgsfield → Run workflow**. Enter a model endpoint and a JSON object containing that model's input fields. The run uses the repository secret and saves the response in the `higgsfield-result` artifact. Download that artifact to get the generated image or video URL.

This workflow runs only when started manually. Each successful generation may use Higgsfield credits. The green **Test** workflow checks installation and local integration only; it does not call Higgsfield. GitHub repository secrets are available to GitHub Actions, but are not automatically available in a local shell or this project's cloud environment.
