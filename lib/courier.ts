import Courier from "@trycourier/courier";

export const courier = new Courier({ apiKey: process.env.COURIER_API_KEY });

export type Comment = {
  id: string;
  post_title: string;
  commenter_name: string;
  text: string;
};

export type Recipient = {
  id: string;
  email: string;
};

/**
 * Adds one comment to the post author's digest.
 *
 * Call it once per comment. The journey's Batch node holds every comment for
 * the same user and sends one email when the window closes, so this function
 * never decides whether to send now or later.
 */
export async function notifyNewComment(recipient: Recipient, comment: Comment) {
  const journeyId = process.env.COURIER_DIGEST_JOURNEY_ID;
  if (!journeyId) {
    throw new Error("COURIER_DIGEST_JOURNEY_ID is not set. Run `npm run setup` first.");
  }

  const { runId } = await courier.journeys.invoke(journeyId, {
    user_id: recipient.id,
    // Merged into the stored profile, so the digest knows where to send.
    profile: { email: recipient.email },
    // Each invoke's `data` becomes one item in `data.batch.items`.
    data: {
      comment_id: comment.id,
      post_title: comment.post_title,
      commenter_name: comment.commenter_name,
      comment_text: comment.text,
    },
    // A retry for the same comment returns the first run instead of adding it twice.
    "Idempotency-Key": `comment-${comment.id}`,
  });

  return runId;
}
