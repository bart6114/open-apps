# Messenger

Related Code's Messenger is an open-source SwiftUI recreation of
Facebook Messenger's chat UI that talks to Messenger's internal
GraphQL endpoints. It is widely used as a reference implementation
for iOS chat apps rather than a working client against Meta's
servers — the value is in the SwiftUI views, the data model, and
the GraphQL subscription plumbing, not in any sort of usable
account on Meta's infrastructure.

## Why it matters

- **The canonical SwiftUI chat UI reference.** Related Code ships the
  same family of projects (Messenger, Chat, Progress, and a few
  smaller utilities) at roughly the same cadence, and Messenger is
  the one that everyone studying SwiftUI chat UIs lands on first.
  The conversation list, the chat thread, the typing indicator, the
  read-receipt bubbles, the audio call sheet, the reactions tray —
  all of the pieces designers reference when they say "build
  something like Messenger" are wired up here in pure SwiftUI,
  including the auto-layout, the keyboard-avoidance, and the
  scroll-to-bottom behavior.
- **Real GraphQL plumbing, real-time.** Unlike UI-only mocks, the
  project ships a real GraphQL client with subscriptions over
  WebSocket, queries for fetching threads and messages, and
  mutations for sending. You can read the subscription lifecycle,
  the message-state reducer, and the cache invalidation patterns
  as if it were a production codebase, which is exactly why it
  shows up in iOS engineering reading lists.
- **Honest about being a reference.** The README is explicit that
  this is a UI clone of Facebook Messenger that targets Messenger's
  internal GraphQL endpoints. Meta rotates those endpoints and
  changes their schema regularly, so the app breaks in production
  environments on a schedule; the maintainers treat it as a learning
  artifact, not a product.

## How it works

The project is structured as a single Xcode workspace with a
`Messenger` iOS app target and a small local Swift package called
`MessengerClient` that holds the GraphQL schema, the generated
operation types, and the network transport. The iOS target's
`Messenger/` folder is where most of the readable code lives:
`Messenger/Views/Conversations/` contains the conversation list
(`ConversationsView`) and the per-thread screen
(`ConversationView`), `Messenger/Views/Chat/` holds the message
bubbles, the input bar, the typing indicator, and the attachment
sheet, and `Messenger/Views/Secondary/` groups the secondary sheets
(audio call, profile, settings). View models live next to their
views as `@StateObject` / `@ObservedObject` classes so each screen
can be read in isolation.

The GraphQL side is the interesting bit. The client opens a
WebSocket subscription against Messenger's `graphql.messenger.com`
endpoint, hydrates a local Core Data store from incoming events,
and reconciles that store with the queries that fire when the user
opens a conversation. Sending a message is a mutation that the
client optimistically applies to the local cache and then rolls
back on failure. There is no Meta authentication wired up — the
project ships with hard-coded credentials (and the README asks you
not to ship them to the App Store), which is the single biggest
reason it lives as a reference and not a product.

## Caveats

- **UI reference, not a production client.** This project ships a
  SwiftUI chat UI that resembles Facebook Messenger and that calls
  Messenger's internal GraphQL endpoints. Meta rotates those
  endpoints and breaks the schema periodically; the project does
  not authenticate against Meta's servers, does not support push
  notifications in any production sense, and is not built to be
  submitted to the App Store as-is.
- **No real backend to talk to.** Out of the box the app cannot
  reach any working messenger service. To exercise the UI you need
  a valid Messenger auth cookie or a mock GraphQL server, neither
  of which the repo provides. Treat it like a UI snapshot — read
  the code, study the views, run it locally against a fake
  endpoint, but do not expect a working account on Meta.

## Deployment notes

Clone the repo, open `Messenger/Messenger.xcodeproj` in Xcode 14+
on macOS, pick the `Messenger` scheme and a development team, and
build to a simulator or a device. The project uses SwiftUI
throughout, so the iOS deployment target is the only constraint
that matters; modern Xcode versions resolve both the `Messenger`
target and the local `MessengerClient` Swift package without
configuration. For full functionality you need to provide a
working GraphQL endpoint for Messenger (either a real one you
have a session for, which is brittle, or a local Apollo Server
that speaks the same schema) and the auth credentials to go with
it. Without that the views render with empty state, which is
actually enough to study the SwiftUI layout.

**Integration tip:** if you want a real reference chat UI for your
own iOS project, copy the `Messenger/Views/` tree and the view
model patterns rather than the GraphQL client — the views are
what people come for, and the GraphQL plumbing is what makes the
project break.
