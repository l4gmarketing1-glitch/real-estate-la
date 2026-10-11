# GPT Sites deployment handoff

The user requests hosting on GPT Sites and the custom domain `vila4.l4g.ro`, with DNS managed at Romarg. Their existing GPT Sites example is `vila3.l4g.ro`. Do not replace or change that existing site.

## Ready to deploy

- Repository: `https://github.com/l4gmarketing1-glitch/real-estate-la`, branch `main`.
- Static publish directory: `site/`; entry point: `site/index.html`.
- No build step or browser-side credentials are required.
- The real 20-second Seedance 2.5 film and desktop/mobile hero clips are already committed under `site/assets/media/`. Do not regenerate them during deployment.
- Serve `.js` as JavaScript, `.mp4` as `video/mp4`, and support HTTP byte-range requests for video seeking.
- If the platform requires a running server instead of a static directory, `npm run dev` serves the site on `PORT` (default 4173). Use the platform's documented production deployment mechanism.

## Pending platform operations

1. Use the GPT Sites publishing integration to create a new site from this repository's static directory.
2. Verify the provider-assigned public URL, all images, video playback and scroll seeking on desktop and mobile.
3. Associate `vila4.l4g.ro` with the new site using the platform's custom-domain process.
4. Obtain the exact DNS records and any verification token from the platform. No DNS target or token is known yet; do not invent them or assume the target used by `vila3` belongs to the new site.
5. Add only the required records at the authoritative DNS provider, expected to be Romarg. Verify the authoritative nameservers before applying changes. Preserve unrelated records, including mail and `vila3`.
6. Verify DNS resolution, HTTPS certificate provisioning and the complete website at `https://vila4.l4g.ro/`.

Publishing and DNS changes remain pending because this conversation exposes cloud-environment and GitHub access but no GPT Sites publishing or domain-management tools. The existing site's HTTPS inspection was also blocked by the environment's network policy. This is not evidence that the existing site is unavailable.
