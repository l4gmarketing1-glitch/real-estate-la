// The provider returns descriptive pricing for this model. Do not infer a
// different resolution, duration or token tariff when the known format changes.
export function estimateSpatialCost(description, duration = 10) {
  const match = description.match(/\$(\d+(?:\.\d+)?) per second of generated video at 480p/);
  if (!match) throw new Error('unrecognized_pricing_requires_review');
  const rate = Number(match[1]);
  if (!Number.isFinite(rate) || rate <= 0 || duration !== 10) throw new Error('invalid_pricing');
  return { duration, resolution: '480p', ratePerSecond: rate, estimatedUSD: rate * duration };
}
export function checkSpatialBudget(estimates) {
  if (estimates.length !== 3) throw new Error('invalid_batch_count');
  const estimatedTotalUSD = estimates.reduce((sum, x) => sum + x.estimatedUSD, 0);
  const reservedUSD = estimatedTotalUSD * 1.12;
  if (!Number.isFinite(reservedUSD) || reservedUSD <= 0 || reservedUSD > 7) throw new Error('budget_exceeded');
  return { estimatedTotalUSD, reservedUSD };
}
