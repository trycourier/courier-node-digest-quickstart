/**
 * Posts three comments to the running server, as if three people replied to
 * user_123's post. Each one invokes the journey; the Batch node holds all
 * three and sends one digest email to DEMO_EMAIL when the window closes.
 *
 * Start the server first: `npm run dev`.
 */
const baseUrl = `http://localhost:${process.env.PORT ?? 3000}`;

const comments = [
  { commenter_name: "Kai Turner", text: "Can we move the launch to Thursday?" },
  { commenter_name: "Kai Turner", text: "The pricing page copy looks good to me." },
  { commenter_name: "Kai Turner", text: "QA signed off on the checkout flow." },
];

async function main() {
  if (!process.env.DEMO_EMAIL) {
    console.error("DEMO_EMAIL is not set. Add your own email address to .env.");
    process.exit(1);
  }

  for (const comment of comments) {
    const response = await fetch(`${baseUrl}/posts/post_1/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comment),
    });
    if (!response.ok) {
      throw new Error(`POST /posts/post_1/comments returned ${response.status}: ${await response.text()}`);
    }
    const { runId } = await response.json();
    console.log(`Comment added to the batch. Run id: ${runId}`);
  }

  const window = process.env.DIGEST_WINDOW || "P1D";
  console.log(`\nOne digest with 3 comments goes to ${process.env.DEMO_EMAIL} when the ${window} window closes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
