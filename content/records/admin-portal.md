# Invoice Ninja Admin Portal

The admin portal is the operator half of Invoice Ninja: the app a
business owner or bookkeeper opens to raise a quote, convert it to an
invoice, chase the payment, and reconcile it against a bank feed. It is
a pure client — all persistence lives in the separate
`invoiceninja/invoiceninja` Laravel server (v5), which the portal talks
to over REST. A public demo backend (`demo.invoiceninja.com`) is wired
into the login screen so you can drive the whole UI before standing up
your own instance.

## Why it matters

- **Six platforms, one codebase.** Flutter builds ship to the
  Microsoft Store, the Mac App Store, Snap and Flatpak on Linux, the
  App Store, and both Play Store and F-Droid. The F-Droid build is a
  genuine FOSS variant: `pubspec.foss.yaml` plus swapped-out OAuth,
  in-app-review, and upgrade-dialog files strip the proprietary
  dependencies rather than just relabelling the release.
- **The whole money lifecycle, not just invoices.** `lib/redux` carries
  a directory per entity — client, vendor, product, quote, invoice,
  recurring invoice, credit, purchase order, payment, payment term,
  expense, recurring expense, subscription, tax rate, bank account,
  bank transaction, transaction rule, project, task, task status,
  company gateway, webhook, token, design, schedule, and reports.
- **Desktop is a first-class target, not a port.** `window_manager`
  handles native windowing, `desktop_drop` accepts dragged-in receipts
  and attachments, and MSIX packaging is configured in `pubspec.yaml`.

## How it works

State is Redux — `flutter_redux` over a store whose models are
`built_value` immutables regenerated with `build_runner`. Each entity
folder repeats the same shape: model, state, actions, reducer,
selectors, middleware, with a matching `lib/ui/<entity>` folder holding
the list, view, and edit screens. It is a lot of files, but the
repetition means any entity is legible once you have read one.

Payments are configured, not processed, in the client: `constants.dart`
enumerates ~29 gateway *types* the server can expose — credit card,
bank transfer, PayPal, SEPA and BECS and ACSS direct debit, iDEAL,
Bancontact, Sofort, Giropay, Przelewy24, EPS, KBC, FPX, Alipay, Apple
Pay, Venmo, MercadoPago, Klarna, Bacs, and crypto — and the portal
renders the right settings form per gateway. PDFs are produced through
the `printing` package, and `nimble_charts` drives the dashboard.

## Caveats

- **Useless without a server.** There is no local mode; you need an
  Invoice Ninja v5 backend, self-hosted or on their cloud.
- **Redux boilerplate is heavy.** ~14k commits of accumulated
  entity scaffolding, and code generation is a required build step.
- **License is `noassertion`** on the record — verify terms yourself
  before shipping a fork.

## Deployment notes

```bash
git clone https://github.com/invoiceninja/admin-portal.git
cd admin-portal
cp lib/.env.dart.example lib/.env.dart
flutter packages pub run build_runner build --delete-conflicting-outputs
flutter run
```

**Integration tip:** the constants file also lists ~20 e-invoicing
formats — EN16931, PEPPOL, the full XInvoice 1.0–3.0 range, FatturaPA,
Facturae, FACT1, VERIFACTU, and Order-X. If you are evaluating open
billing stacks for EU or LATAM compliance, that list is the most
concrete signal in the repo.
