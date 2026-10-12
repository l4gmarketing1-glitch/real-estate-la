import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateSpatialCost, checkSpatialBudget } from './spatial-budget.js';
test('accepts the quoted three-batch rate with the safety margin under $7', () => {
  const estimate = estimateSpatialCost('For 16:9 video without video input, your request costs roughly $0.2056 per second of generated video at 480p, $0.4622 at 720p.');
  const budget = checkSpatialBudget([estimate, estimate, estimate]);
  assert.equal(budget.estimatedTotalUSD, 6.168);
  assert.ok(budget.reservedUSD < 7);
});
test('stops when tariff increases, pricing is unknown or batch count changes', () => {
  const increased = estimateSpatialCost('$0.25 per second of generated video at 480p');
  assert.throws(() => checkSpatialBudget([increased, increased, increased]), /budget_exceeded/);
  assert.throws(() => estimateSpatialCost('$0.10 per second at 720p'), /unrecognized/);
  assert.throws(() => estimateSpatialCost('$0 per second of generated video at 480p'), /invalid/);
  assert.throws(() => checkSpatialBudget([increased]), /invalid_batch_count/);
  assert.throws(() => checkSpatialBudget(Array(3).fill({ estimatedUSD: NaN })), /budget_exceeded/);
});
