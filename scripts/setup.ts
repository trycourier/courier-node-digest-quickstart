import type Courier from "@trycourier/courier";
import { courier } from "../lib/courier.ts";

// Creates the digest journey, or updates it when COURIER_DIGEST_JOURNEY_ID is set. Safe to rerun.

const JOURNEY_NAME = "Comment digest";
const TEMPLATE_NAME = "Comment digest email";

// P1D is a daily digest. Set DIGEST_WINDOW=PT1M and rerun this script to test in a minute.
const WINDOW = process.env.DIGEST_WINDOW || "P1D";

// The looped text element repeats once per retained comment in `data.batch.items`.
const notification = {
  name: TEMPLATE_NAME,
  tags: [],
  brand: null,
  subscription: null,
  content: {
    version: "2022-01-01" as const,
    // Strict scope: every variable path starts with `data.`.
    scope: "strict" as const,
    elements: [
      {
        type: "channel" as const,
        channel: "email",
        elements: [
          { type: "meta" as const, title: "New comments on your posts" },
          { type: "text" as const, content: "Comments since your last digest: {{data.batch.count}}" },
          {
            type: "text" as const,
            loop: "data.batch.items",
            content: "{{$.item.commenter_name}} on {{$.item.post_title}}: {{$.item.comment_text}}",
          },
        ],
      },
    ],
  },
};

function nodes(templateId?: string): Courier.JourneyNode[] {
  const trigger: Courier.JourneyNode = { type: "trigger", trigger_type: "api-invoke" };
  const exit: Courier.JourneyNode = { type: "exit" };
  if (!templateId) return [trigger, exit];

  return [
    trigger,
    {
      type: "batch",
      scope: "user",
      // Equal windows send each digest one WINDOW after its first comment.
      wait_period: WINDOW,
      // Hard ceiling from the first comment (at least wait_period, at most 7 days).
      max_wait_period: WINDOW,
      max_items: 100,
      // Keep the first 10 comments for the email. batch.count still counts them all.
      retain: { type: "first", count: 10 },
    },
    { type: "send", channel: "email", message: { template: templateId } },
    exit,
  ];
}

async function main() {
  // 1. The journey. A send node needs a template id, so a new journey starts empty.
  let journeyId = process.env.COURIER_DIGEST_JOURNEY_ID;
  if (!journeyId) {
    const journey = await courier.journeys.create({ name: JOURNEY_NAME, nodes: nodes() });
    journeyId = journey.id;
  }

  // 2. The digest template, scoped to this journey. Created once, replaced on reruns.
  const { results } = await courier.journeys.templates.list(journeyId);
  const existing = results.find((template) => template.name === TEMPLATE_NAME);
  const templateId = existing
    ? (await courier.journeys.templates.replace(existing.id, { templateId: journeyId, notification })).id
    : (await courier.journeys.templates.create(journeyId, { channel: "email", notification })).id;

  // A run sends the template's published version, so publish it before the journey.
  await courier.journeys.templates.publish(templateId, { templateId: journeyId });

  // 3. Wire trigger -> batch -> send -> exit, then publish so new invokes use it.
  await courier.journeys.replace(journeyId, { name: JOURNEY_NAME, nodes: nodes(templateId) });
  await courier.journeys.publish(journeyId);

  console.log(`Published "${JOURNEY_NAME}" with a ${WINDOW} batch window.`);
  if (!process.env.COURIER_DIGEST_JOURNEY_ID) {
    console.log("\nAdd this line to .env, then start the server:\n");
    console.log(`COURIER_DIGEST_JOURNEY_ID=${journeyId}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
