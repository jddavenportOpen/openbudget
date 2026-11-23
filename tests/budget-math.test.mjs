// Run with: npm test  (Node 22.18+ runs the .ts import directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import { envelopeMath, monthRange, monthTotals } from "../src/lib/budget-math.ts";

const env = (id, monthly_allocated) => ({ id, name: id, grp: "g", monthly_allocated, sort_order: 0 });
const txn = (amount, envelope_id = null, needs_review = false) => ({
  id: String(Math.random()), account_id: null, account: null, date: "2026-06-10",
  amount, description: null, payee: null, category: null, envelope_id,
  assigned: !!envelope_id, needs_review,
});

test("monthRange never produces an invalid date like June 31", () => {
  assert.deepEqual(monthRange("2026-06"), { start: "2026-06-01", nextStart: "2026-07-01" });
  assert.deepEqual(monthRange("2026-02"), { start: "2026-02-01", nextStart: "2026-03-01" });
});

test("monthRange rolls December into January of the next year", () => {
  assert.deepEqual(monthRange("2026-12"), { start: "2026-12-01", nextStart: "2027-01-01" });
});

test("spending counts against its envelope and income does not", () => {
  const [g] = envelopeMath([env("groceries", 500)], [txn(-120.5, "groceries"), txn(-30, "groceries"), txn(40, "groceries")]);
  assert.equal(g.spent, 150.5);
  assert.equal(g.remaining, 349.5);
});

test("unassigned spending touches no envelope", () => {
  const [g] = envelopeMath([env("groceries", 500)], [txn(-99)]);
  assert.equal(g.spent, 0);
  assert.equal(g.remaining, 500);
});

test("overspending shows as a negative remaining", () => {
  const [g] = envelopeMath([env("fun", 50)], [txn(-80, "fun")]);
  assert.equal(g.remaining, -30);
});

test("to be budgeted is income set aside minus what is allocated", () => {
  const envs = [env("a", 1200), env("b", 300)];
  const t = monthTotals(2000, envs, [txn(-100, "a"), txn(-25), txn(2500), txn(-5, null, true)]);
  assert.equal(t.totalAllocated, 1500);
  assert.equal(t.toBeBudgeted, 500);
  assert.equal(t.spent, 130);
  assert.equal(t.income, 2500);
  assert.equal(t.unassigned, 2);
  assert.equal(t.needsReview, 1);
});

test("allocating every dollar brings to be budgeted to zero", () => {
  assert.equal(monthTotals(1500, [env("a", 1000), env("b", 500)], []).toBeBudgeted, 0);
});
