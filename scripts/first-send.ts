import Courier from "@trycourier/courier";

const courier = new Courier({ apiKey: process.env.COURIER_API_KEY });

const { requestId } = await courier.send.message({
  message: {
    to: { email: process.env.DEMO_EMAIL },
    content: { title: "Hello from Courier", body: "Your Node.js app can send email." },
    routing: { method: "single", channels: ["email"] },
  },
});

console.log(`Sent. Request id: ${requestId}`);
