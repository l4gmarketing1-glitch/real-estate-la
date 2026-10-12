# Spatial camera footage

The requested edit uses genuine Seedance 2.5 camera motion for the 11 scenes that previously used animated photographs, retaining the four reviewed original Seedance scenes. Final duration remains 30 seconds (15 scenes, two seconds each).

The authenticated API quote is $0.2056/second at 480p, before discounts. Three ten-second batches total $6.168; the budget check reserves 12% ($6.90816 total) against the approved $7 limit. Existing request IDs must always be reused. Do not run a fresh generation plan or erase `status.json` to retry a pending request.

The `generated/spatial-*` branches contain the latest receipts and completed source downloads. Copy their `status.json` and any `batch-*.mp4` files back before resuming. `mode: inspect` only checks/downloads saved requests and never submits generation. `mode: generate` with `resume: true` reuses saved request IDs and submits only missing batches; all three estimates, including already-submitted work, count toward the budget guard. An unknown submission without a request ID must be resolved with the provider, never blindly retried.

Before running `python3 scripts/edit-property-film.py --spatial`, visually review every scene, correct its selected start time in `edit.json`, and set its `reviewed` flag. Nominal time ranges alone are not evidence that the model followed the requested cuts. The renderer intentionally refuses unreviewed clips. Do not replace the live film until source identity, scene cuts, camera motion, text and playback have been checked.
