# Deployment: vila4.l4g.ro

The current deployment is **GitHub Pages**, from `main`, with `vila4.l4g.ro` in the root `CNAME` file. The user manages DNS at Romarg. Preserve the existing domain configuration and the separate `vila3.l4g.ro` site.

## Entry point

The public repository root previously displayed the project README because it had no `index.html`. The root entry now redirects to `./site/`, preserving query strings and anchor links. `.nojekyll` enables direct static-file serving. The actual landing page is `site/index.html`.

- Main URL: `https://vila4.l4g.ro/`
- Direct page URL: `https://vila4.l4g.ro/site/`
- Current film: `https://vila4.l4g.ro/site/assets/media/film-30s-smooth.mp4`
- Publish changes by pushing to `main`, then verify the GitHub **pages build and deployment** workflow and **Test** workflow.

## Static assets and video

The `site/` directory requires no build step or browser-side credentials. It includes the edited 30-second film (15 shots of exactly 2 seconds), original photographs and separate desktop/mobile hero clips. The edit reuses existing Seedance 2.5 footage and costs no new API credits. Do not regenerate footage during deployment.

MP4 hosting must support byte-range requests and the `video/mp4` MIME type. The local `npm run dev` server supports these. The browser test suite checks the real 30-second video and seeks through its final shot on desktop and mobile.

## Earlier GPT Sites request

The user originally requested GPT Sites hosting. This session has no GPT Sites publishing or domain-management tools. The existing GitHub Pages publication was repaired in place; this is not a migration to GPT Sites. If migrating later, publish the `site/` directory directly, update the social-preview image URL to match the new public path, and obtain the exact DNS/verification records from GPT Sites before changing Romarg DNS.

Direct HTTPS inspection of the custom domain is blocked by this development environment's network policy. GitHub deployment status and local browser tests can be checked here; a live-domain browser check must be made from an environment with access.
