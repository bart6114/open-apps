#!/usr/bin/env node
/**
 * Tests for scripts/build-llms-full.mjs
 *
 * Run with: `node --test scripts/build-llms-full.test.mjs`
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// Bug being tested: forks should be read from
// `a.github?.repository?.forks_count`, not `a.activity?.forks`.
// The fix to build-llms-full.mjs uses a `pickForks` helper that
// picks the right path; this test pins that behavior.
//
// build-llms-full.mjs is a script with no exports, so we duplicate
// the helper here. If the script ever exports pickForks, swap the
// import below.

function pickForks(a) {
  if (typeof a?.github?.repository?.forks_count === "number") {
    return a.github.repository.forks_count;
  }
  if (typeof a?.forks === "number") return a.forks;
  if (typeof a?.activity?.forks === "number") return a.activity.forks;
  return null;
}

test("pickForks reads from github.repository.forks_count (schema v1 shape)", () => {
  const app = { github: { repository: { forks_count: 5799 } } };
  assert.equal(pickForks(app), 5799);
});

test("pickForks falls back to top-level forks (index shape)", () => {
  const app = { forks: 100 };
  assert.equal(pickForks(app), 100);
});

test("pickForks falls back to activity.forks (legacy shape)", () => {
  const app = { activity: { forks: 42 } };
  assert.equal(pickForks(app), 42);
});

test("pickForks prefers schema v1 over legacy when both exist", () => {
  const app = {
    github: { repository: { forks_count: 5799 } },
    activity: { forks: 0 },
  };
  assert.equal(pickForks(app), 5799);
});

test("pickForks returns null when no forks signal is present", () => {
  assert.equal(pickForks({}), null);
  assert.equal(pickForks(null), null);
  assert.equal(pickForks({ github: { repository: {} } }), null);
});
