# Courier daily digest — Node.js quickstart

A Node.js backend that sends one digest email per user per day instead of an email per comment. Every new comment invokes a [Courier journey](https://www.courier.com/docs/journeys/overview) whose [Batch node](https://www.courier.com/docs/journeys/nodes/batch) holds that user's comments and sends them together in one email. A setup script builds the journey through the API, so the whole flow lives in this repo.

This is the companion project for [Batch notifications into a daily digest in Node.js](https://www.courier.com/docs/guides/batch-notifications-into-a-daily-digest-in-node) in the Courier docs.

## Build it with a coding agent

Paste this into Claude Code, Cursor, or Codex:

```text
Add a daily comment digest to this Node.js app with Courier, instead of one email per comment.
Follow https://www.courier.com/docs/guides/batch-notifications-into-a-daily-digest-in-node.md
and the reference app at https://github.com/trycourier/courier-node-digest-quickstart.
Use @trycourier/courier and read COURIER_API_KEY from the environment.
Define the journey (API trigger, per-user Batch node, email send node) in a setup script,
and invoke it once per comment with an Idempotency-Key built from the comment id.
When done, run the setup script with DIGEST_WINDOW=PT1M, post three test comments, and show me the run ids.
```

Install the Courier skill with `npx skills add trycourier/courier-skills`, and connect the [Courier MCP server](https://www.courier.com/docs/resources/mcp) so the agent can read Courier Logs and templates itself.

## What it shows

- **The journey, defined in code** — `scripts/setup.ts` creates (or updates) a journey with an API trigger, a per-user Batch node, and a send node, plus the digest email template that loops over the batched comments.
- **One call per comment** — `lib/courier.ts` invokes the journey with `client.journeys.invoke`, keyed by the comment id so a retry never adds a comment twice.
- **The trigger point** — `server.ts` is an Express endpoint, `POST /posts/:postId/comments`, that calls it.
- **A round trip** — `scripts/send.ts` posts three comments, and one digest arrives at `DEMO_EMAIL`.

## Run it

You need Node.js 22.18 or newer and a [Courier account](https://app.courier.com/signup).

```bash
git clone https://github.com/trycourier/courier-node-digest-quickstart.git
cd courier-node-digest-quickstart
npm install
cp .env.example .env
```

In `.env`, paste your key from [Platform → API Keys](https://app.courier.com/settings/api-keys) and set `DEMO_EMAIL` to your own address. [Connect an email provider](https://www.courier.com/docs/integrations/email/overview), such as Resend, SendGrid, or Postmark, in the same environment as the key. Without one, a Test key still sends through Courier's testing provider, which delivers only to your workspace teammates, up to 100 emails.

Check the key and provider with one plain email. It prints a request id you can find in [Courier's logs](https://app.courier.com/logs):

```bash
npm run first-send
```

To see the digest in a minute rather than a day, set `DIGEST_WINDOW=PT1M` in `.env`. Then build the journey:

```bash
npm run setup
```

Copy the `COURIER_DIGEST_JOURNEY_ID=...` line it prints into `.env`, and start the server:

```bash
npm run dev
```

In a second terminal, post three comments:

```bash
npm run send
```

About a minute after the first comment, one email lands at `DEMO_EMAIL`: "Comments since your last digest: 3", followed by all three. This one-minute window has been run end to end and delivers a single digest with every comment. Open the run in [Courier's logs](https://app.courier.com/logs) to see it wait at the Batch node and then send.

Set `DIGEST_WINDOW=P1D` and rerun `npm run setup` to switch back to a daily digest. The script updates the same journey.

## How the pieces fit

```
Your app                         Courier
   |                                |
   |-- POST /journeys/{id}/invoke ->|   comment 1 opens a batch for user_123
   |-- POST /journeys/{id}/invoke ->|   comment 2 joins it
   |-- POST /journeys/{id}/invoke ->|   comment 3 joins it
   |                                |
   |                  window closes |-- one email: "Comments since your last digest: 3"
```

The first comment's run owns the batch and continues to the send node when the batch releases. Later comments end at the Batch node. A batch releases on whichever comes first:

| Setting | In `scripts/setup.ts` | Limits |
|---|---|---|
| Quiet window | `wait_period` | 1 minute to 1 day |
| Hard ceiling from the first event | `max_wait_period` | at least `wait_period`, at most 7 days |
| Max items | `max_items` | 1 to 1000 |

The template reads `data.batch.count` (every comment) and loops over `data.batch.items` (the retained comments, up to `retain.count`, 25 at most).

## Adapting it to your app

**Look up the real recipient.** `server.ts` pins the post author to `user_123` and `DEMO_EMAIL`. In your app, load the post's author from your database. If the user's email is already on their [Courier profile](https://www.courier.com/docs/recipients/overview), drop `profile` from the invoke.

**Invoke after you save.** Call `notifyNewComment` once the comment is committed, so the comment id is real. The id is the idempotency key, so retrying the call from a job queue is safe.

**Let users pick a schedule.** A Batch node uses the same window for everyone. To let each user choose daily, weekly, or instant in a preference center, use a [subscription topic digest](https://www.courier.com/docs/guides/send-a-daily-digest) instead.

## Scripts

| | |
|---|---|
| `npm run first-send` | Send one plain email to `DEMO_EMAIL` |
| `npm run setup` | Create or update the journey and its digest template, then publish both |
| `npm run dev` | Start the comment endpoint on port 3000, reloading on change |
| `npm run send` | Post three comments to the running server |
| `npm run build` | Type-check with `tsc` |

## Troubleshooting

**`npm run setup` fails with `channel "email" is not configured`.** The API key's environment has no email provider. Use a key from the environment where your provider is connected, or connect one in [Integrations](https://app.courier.com/integrations/catalog).

**The digest never arrives.** Check that an email provider is connected in the key's environment. Courier's testing provider covers only a Test key, only your workspace teammates, and only up to 100 emails. Then open the run in the [journey logs](https://www.courier.com/docs/monitor/logs#journey-logs): a run waiting at the Batch node is still inside its window.

**Three emails arrive instead of one.** The journey was published without the Batch node. Rerun `npm run setup`.

## Further reading

- [Journey batch node](https://www.courier.com/docs/journeys/nodes/batch) — every field, the payload, and categories
- [Build a journey](https://www.courier.com/docs/journeys/build) — the canvas and the API
- [Send a daily digest](https://www.courier.com/docs/guides/send-a-daily-digest) — per-user schedules on a subscription topic

## License

MIT
