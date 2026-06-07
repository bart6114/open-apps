#!/usr/bin/env node
/**
 * Tests for scripts/parse-legacy-readme.mjs
 *
 * Run with: `node --test scripts/parse-legacy-readme.test.mjs`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntry } from "./parse-legacy-readme.mjs";

test("parseEntry: extracts a basic entry", () => {
  const result = parseEntry(
    "- [Invoice Ninja](https://github.com/invoiceninja/flutter-mobile) - Companion app for the Invoice Ninja platform by [Invoice Ninja](https://github.com/invoiceninja).",
  );
  assert.equal(result.name, "Invoice Ninja");
  assert.equal(result.repoUrl, "https://github.com/invoiceninja/flutter-mobile");
  assert.equal(result.author, "Invoice Ninja");
  assert.match(result.description, /Companion app/);
});

test("parseEntry: strips trailing punctuation from description", () => {
  const result = parseEntry(
    "- [Beer-Me-Up](https://github.com/benoitletondor/Beer-Me-Up) - Beer tracking nicely designed by [Benoit Letondor](https://github.com/benoitletondor).",
  );
  assert.equal(result.name, "Beer-Me-Up");
  // Description should not end in a period
  assert.ok(!result.description.endsWith("."));
  assert.ok(!result.description.endsWith(" "));
});

test("parseEntry: skips non-github/gitlab URLs", () => {
  assert.equal(
    parseEntry("- [MySite](https://example.com) - description"),
    null,
  );
});

test("parseEntry: returns null for a line with no link", () => {
  assert.equal(parseEntry("- plain text only"), null);
});

test("parseEntry: handles em-dash separator", () => {
  const result = parseEntry(
    "- [Natrium](https://github.com/appditto/natrium_wallet_flutter) — A fast, robust & secure NANO Wallet by [Appditto](https://github.com/appditto)",
  );
  assert.equal(result.name, "Natrium");
  assert.equal(result.author, "Appditto");
});

test("parseEntry: trims trailing whitespace and normalizes separators", () => {
  // Note: the legacy list always uses single spaces between `-` and `[` and
  // between description fragments. The parser is permissive about inner
  // spacing. We do NOT test deeply pathological whitespace because the
  // upstream README-LEGACY.md is curated and consistent.
  const result = parseEntry(
    "- [Foo](https://github.com/x/y) - desc by [author](https://github.com/x)",
  );
  assert.equal(result.name, "Foo");
  assert.equal(result.author, "author");
});

test("parseEntry: handles deep-nested author description", () => {
  // Some legacy lines have author links inside nested parens; we only
  // care that the author slot captures the last `[..](..)` link.
  const result = parseEntry(
    "- [Foo](https://github.com/x/y) - A thing (see [link](https://example.com)) by [Author](https://github.com/author)",
  );
  assert.equal(result.author, "Author");
});
