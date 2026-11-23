import { randomUUID } from "node:crypto";
import express from "express";
import { notifyNewComment } from "./lib/courier.ts";

const app = express();
app.use(express.json());

app.post("/posts/:postId/comments", async (req, res) => {
  const { commenter_name, text } = req.body;

  // Save the comment in your database here. Its id keys the idempotent invoke.
  const comment = {
    id: randomUUID(),
    post_title: "Launch checklist",
    commenter_name,
    text,
  };

  // A real app loads the post's author from its database. The demo pins one
  // user and sends to DEMO_EMAIL so the digest reaches you.
  const postAuthor = { id: "user_123", email: process.env.DEMO_EMAIL! };

  try {
    const runId = await notifyNewComment(postAuthor, comment);
    res.status(201).json({ comment, runId });
  } catch (error) {
    // The comment is saved, so don't fail a request the client may repeat.
    // This demo only logs the failure, which leaves the comment out of the
    // digest. In your app, queue a retry keyed by the comment id: the same
    // Idempotency-Key makes a repeated invoke safe.
    console.error(`Digest invoke failed for comment ${comment.id}:`, error);
    res.status(201).json({ comment, runId: null });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
