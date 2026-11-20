# Courier daily digest: Node.js quickstart

An Express backend that sends one digest email per user instead of an email per comment. Each comment invokes a Courier journey whose Batch node holds that user's comments and sends them as one email when the window closes.

Guide: https://www.courier.com/docs/guides/batch-notifications-into-a-daily-digest-in-node

## Commands

- `npm install`: install dependencies (Node 22.18 or newer)
- `npm run first-send`: send one plain email to `DEMO_EMAIL`, to check the key and provider
- `npm run setup`: create or update the journey and its digest template, then publish both
- `npm run dev`: start the comment endpoint on port 3000
- `npm run send`: post three comments to the running server
- `npm run build`: type-check with `tsc`

## Environment (`.env`, loaded by `tsx --env-file`)

- `COURIER_API_KEY`: read in `lib/courier.ts` and `scripts/first-send.ts`
- `DEMO_EMAIL`: the demo recipient, read in `server.ts` and the scripts
- `COURIER_DIGEST_JOURNEY_ID`: printed by `npm run setup`, read in `lib/courier.ts`
- `DIGEST_WINDOW`: ISO 8601 batch window, read in `scripts/setup.ts` (`P1D` daily, `PT1M` to test)

## Files

- `lib/courier.ts`: the Courier client and `notifyNewComment`, which invokes the journey
- `scripts/setup.ts`: the journey definition (trigger, batch, send, exit) and the digest template
- `server.ts`: `POST /posts/:postId/comments`, the trigger point
- `scripts/send.ts`: posts test comments; `scripts/first-send.ts`: one direct send

## Rules

- Keep `COURIER_API_KEY` on the server. Never send it to a browser or commit `.env`.
- Invoke the journey once per event, with an `Idempotency-Key` built from the event's database id.
- Change the journey or template in `scripts/setup.ts` and rerun it. It overwrites console edits.
- Template variables use strict scope: `data.batch.count`, a loop over `data.batch.items`, and `$.item.<field>`.
- `wait_period` is 1 minute to 1 day. `max_wait_period` is at least `wait_period` and at most 7 days.
- Use the `@trycourier/courier` SDK, not raw HTTP, and don't call the email provider directly.
