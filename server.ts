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

  // Demo author at DEMO_EMAIL. A real app loads the post's author from its database.
  const postAuthor = { id: "user_123", email: process.env.DEMO_EMAIL! };

  try {
    const runId = await notifyNewComment(postAuthor, comment);
    res.status(201).json({ comment, runId });
  } catch (error) {
    // The comment is saved, so keep the 201. Your app should queue a retry with the same Idempotency-Key.
    console.error(`Digest invoke failed for comment ${comment.id}:`, error);
    res.status(201).json({ comment, runId: null });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
