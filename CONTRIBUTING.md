# Contributing to Open Apps

Thanks for helping maintain a useful directory of real open-source apps.

## Inclusion criteria

A submission should be a usable application, not a library, tutorial,
boilerplate, one-screen demo, or marketing-only page. It needs a public source
repository, a verifiable open-source license, and enough documentation or
project history for another developer to evaluate it.

Popularity is useful context, not an automatic pass. Reviewers consider
product scope, source quality, maintenance, documentation, and learning value.

## Add an app

1. Open `/submit` on the site and paste the canonical GitHub repository URL.
2. Review the generated YAML draft.
3. Choose category, primary stack, platforms, and free-form tags carefully.
   Categories and stacks come from `data/taxonomy/`; tags do not replace them.
4. Add the draft as `data/records/<slug>.yml`.
5. Run `pnpm exec grove check` and `pnpm build`.
6. Open a pull request explaining why the app is useful to run or study.

## Update an app

Human-owned fields such as description, taxonomy, `bestFor`, `whyListed`,
`caveats`, and curation labels may be edited directly. GitHub metadata and
health signals are refreshed by Grove workflows; avoid hand-editing those
blocks unless the change specifically fixes bad automation output.

If a repository moved, verify the canonical replacement before changing its
URL. For removal, open an issue or pull request with the reason. Security,
malware, copyright, and takedown concerns should follow `SECURITY.md`.

## Style

- Keep one app per YAML file and use two-space indentation.
- Write plain-language descriptions ending with a full stop.
- Do not repeat category or primary stack values as a substitute for useful
  tags.
- Keep generated files and one-off scripts out of the repository.
- Do not add a new taxonomy value for a single synonym; reuse an existing
  controlled value when it describes the project accurately.

## Local checks

```sh
corepack enable
pnpm install
pnpm exec grove check
pnpm build
```

By participating, you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
