# Courier daily digest — Node.js quickstart

A Node.js backend that sends one digest email per user per day instead of an email per comment. Every new comment invokes a [Courier journey](https://www.courier.com/docs/journeys/overview) whose [Batch node](https://www.courier.com/docs/journeys/nodes/batch) holds that user's comments and sends them together in one email. A setup script builds the journey through the API, so the whole flow lives in this repo.

This is the companion project for [Batch notifications into a daily digest in Node.js](https://www.courier.com/docs/guides/batch-notifications-into-a-daily-digest-in-node) in the Courier docs.

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

In `.env`, paste your key from [Platform → API Keys](https://app.courier.com/settings/api-keys) and set `DEMO_EMAIL` to the address you signed up to Courier with. Courier's built-in test email provider delivers to members of your own workspace, so you need no provider for the demo. To email anyone else, [connect your own provider](https://www.courier.com/docs/integrations/email/overview), such as Resend, SendGrid, or Postmark.

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

About a minute after the first comment, one email lands at `DEMO_EMAIL`: "You have 3 new comments", followed by all three. Open the run in [Courier's logs](https://app.courier.com/logs) to see it wait at the Batch node and then send.

Set `DIGEST_WINDOW=P1D` and rerun `npm run setup` to switch back to a daily digest. The script updates the same journey.

## How the pieces fit

```
Your app                         Courier
   |                                |
   |-- POST /journeys/{id}/invoke ->|   comment 1 opens a batch for user_123
   |-- POST /journeys/{id}/invoke ->|   comment 2 joins it
   |-- POST /journeys/{id}/invoke ->|   comment 3 joins it
   |                                |
   |                  window closes |-- one email: "You have 3 new comments"
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
| `npm run setup` | Create or update the journey and its digest template, then publish both |
| `npm run dev` | Start the comment endpoint on port 3000, reloading on change |
| `npm run send` | Post three comments to the running server |
| `npm run build` | Type-check with `tsc` |

## Troubleshooting

**`npm run setup` fails with `channel "email" is not configured`.** The API key's environment has no email provider. Use a key from the environment where your provider is connected, or connect one in [Integrations](https://app.courier.com/integrations/catalog).

**The digest never arrives.** Check that `DEMO_EMAIL` is your Courier login email, or that your own provider is connected. Then open the run in the [journey logs](https://www.courier.com/docs/monitor/logs#journey-logs): a run waiting at the Batch node is still inside its window.

**Three emails arrive instead of one.** The journey was published without the Batch node. Rerun `npm run setup`.

## Further reading

- [Journey batch node](https://www.courier.com/docs/journeys/nodes/batch) — every field, the payload, and categories
- [Build a journey](https://www.courier.com/docs/journeys/build) — the canvas and the API
- [Send a daily digest](https://www.courier.com/docs/guides/send-a-daily-digest) — per-user schedules on a subscription topic

## License

MIT
