# 14127 Lemay — Los Angeles property presentation

An English-language, responsive landing page for **14127 Lemay Street, Van Nuys, CA 91405**, offered at **$1,175,000**. The page uses the 26 supplied listing photographs, local fonts, a filterable photo gallery, keyboard/touch lightbox, CSS perspective effects, scroll transitions, and a mobile tour button. Tour buttons open an accessible request dialog with name, phone, email and preferred date. Requests POST to FormSubmit for tropicagency.co@gmail.com. The recipient must activate FormSubmit using its first-request activation email before delivery works. Submission continues to FormSubmit verification; the site does not claim a confirmed booking or email delivery. Browser tests intercept submission and never send real leads.

## Develop and test

Requires Node.js 20 or newer. The website is plain HTML, CSS and JavaScript with no build step or production framework dependencies.

```sh
npm ci
npm run dev
```

The development server serves `site/` on port 4173 and supports byte-range requests for video seeking. Use `npm run dev -- 4174` to choose another port. In a restricted cloud environment, use `npm ci --cache /tmp/higgsfield-npm-cache` if the default npm cache is not writable.

```sh
npm test
npx playwright install chromium
npm run test:site
```

Browser tests cover desktop and mobile: listing content, resource errors, initial photo-mode transfer under 600 KB, horizontal overflow, gallery filters, all 26 photographs, keyboard navigation, mobile navigation, reduced motion, scroll-driven video seeking and film playback. The tiny solid-color video in `e2e/fixtures/` is a test fixture only; it is never served as property media. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when using an existing system Chromium. GitHub Actions runs both the SDK unit test and browser tests without API credentials or paid generation.

## Content and performance

- Edit listing copy, metadata and facts in `site/index.html`; edit gallery order, categories and captions in `site/property.js`.
- Real listing photographs are in `site/assets/images/` as 640px and 1024px WebP files. The original photo watermarks remain intact.
- Fonts are served locally with their licenses in `site/assets/fonts/`. No third-party fonts, analytics, map embeds or animation libraries are loaded by visitors.
- The main photograph renders immediately. Gallery images are lazy-loaded, and the full film downloads only when requested. The short hero video uses a separate smaller mobile encode.
- Reduced-motion preferences disable the scrolling animation. Data Saver and slow 2G connections retain the photograph instead of automatically fetching the hero video.
- The supplied listing gives two slightly different lot sizes; the page uses its structured value of 7,498 sq ft. Verify current listing facts and availability before publication.

The current publication is **GitHub Pages** at **`vila4.l4g.ro`**, with DNS managed at **Romarg**. The root entry redirects to the actual page under `site/`. The earlier GPT Sites hosting request remains a separate migration; see [DEPLOYMENT.md](DEPLOYMENT.md) for current deployment details.

Publish the **`site/` directory** as static files. The host should serve MP4 files with byte-range support and enable compression for HTML/CSS/JS. Configure cache lifetimes and asset versioning together; the current assets have readable, unversioned filenames. Publishing repository code does not itself deploy the website.

## Property film — Higgsfield Seedance 2.5 only

`media/lemay-request.json` defines the original generated source footage: 20 seconds, 720p, 16:9, four ordered photographs, restrained camera movement and instrumental audio. It uses `bytedance/seedance-2.5/reference-to-video`. The original reference images are in `media/references/`; the workflow supplies public HTTPS URLs pinned to the exact source commit. No other generation provider or model is used.

Add **`HF_CREDENTIALS`** as a GitHub Actions repository secret, containing the official SDK's `KEY_ID:KEY_SECRET` credential pair. Never add it to website files or commit it. Repository secrets are available in Actions, not automatically in the local/cloud development shell.

1. Run **Actions → Estimate Lemay film cost** for an authenticated estimate without generating media. It saves `cost-estimate.json` as an artifact and on a `generated/lemay-estimate-*` review branch.
2. Run **Actions → Create Lemay property film** to submit a paid generation. A push changing `media/film-generation-trigger.txt` on `main` also triggers it. Ordinary website or request-file edits do not submit paid generations.
3. On success, the workflow downloads the output and uses FFmpeg to prepare the 30-second edited presentation plus 4.5-second desktop/mobile scrolling clips. It checks the film duration and writes `manifest.json` with `ready: true`.
4. Download the `lemay-property-film` artifact or inspect the `generated/lemay-film-<run>-<attempt>` branch. Review the generated film against the reference photographs before copying its `site/assets/media/` files to `main` and deploying. Review branches are not published automatically.

The film controls and hero video activate only when `site/assets/media/manifest.json` says `ready: true`. Set `ready: false` to use the photographic fallback when generated media is unavailable. Failed jobs save `generation-status.json`; a green **Test** run validates the code and does not prove that a film was generated.

If Higgsfield reports insufficient credits, check the balance in [Higgsfield Console](https://console.higgsfield.ai) for the account associated with the stored API key. According to [Higgsfield billing documentation](https://docs.higgsfield.ai/docs/concepts/billing-and-retention), failed generations are not charged and reserved credits are refunded. Do not repeatedly submit the same failed job without resolving its cause.

The reviewed Seedance film and both hero clips are included in `site/assets/media/`. The presentation is 30 seconds at 1280 × 720 with AAC audio, with exactly 15 shots of 2 seconds and English property details; the scrolling clips contain only the opening exterior scene and have no audio. `generation-status.json` records the provider and request identifier.

### Rebuild the edit without spending API credits

Run `python3 scripts/edit-property-film.py` with Pillow, FFmpeg/libass and DejaVu fonts installed. The script reuses `media/source/seedance-property-20s.mp4`, the supplied listing photographs, and the source soundtrack. It performs no API calls. `media/film-30s-storyboard.json` records all 15 shots, their two-second durations, and the property captions. The primary result is `site/assets/media/film-30s-motion.mp4`; `film-30s.mp4` and `film.mp4` are compatibility copies for previously shared links. Every photograph has a gentle animated zoom and pan; the original Seedance shots retain their camera movement. Compact translucent green caption strips leave more of each property image visible.

The root `index.html` redirects to `site/` for hosting configurations that publish the entire repository. This prevents the project README from appearing instead of the property page. `.nojekyll` ensures GitHub Pages can serve the static files directly. Hosts configured to publish `site/` continue to serve it directly.

## Flexible SDK integration

`src/higgsfield.js` uses the official `@higgsfield/client/v2` SDK. Its model endpoint and input parameters come from a request file, so the generic integration can use any model enabled for your API account without changing core code. The property-film configuration remains Seedance 2.5 as requested.

```json
{
  "endpoint": "bytedance/seedance-2.5/text-to-video",
  "input": {
    "prompt": "A gentle cinematic view of a garden at sunset.",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

Save this as an ignored `request.local.json`, supply `HF_CREDENTIALS` server-side, and run `npm run generate -- request.local.json`. For machine-readable output without npm's command banner, use `node src/generate.js request.local.json > generation-result.json`. Completed video requests return `video`; image requests return `images`. Set `withPolling: false` to return the queued response immediately.

The separate **Generate with Higgsfield** manual workflow accepts any endpoint and JSON input supported by your account. Successful live generation can consume credits. Refer to the [official SDK documentation](https://docs.higgsfield.ai/docs/how-to/sdk) and [Seedance reference-to-video model documentation](https://docs.higgsfield.ai/docs/models/seedance-2-5/reference-to-video) for current schemas.

The smooth edit uses fixed-scale, subpixel affine sampling for photo pans at 48 fps, with smoothstep easing and alternating horizontal directions. Existing Seedance clips retain their original motion cadence. No additional API generation or credit spend is required.
