import { startDebateServer } from "./app.js";

const port = Number(process.env.PORT || 48731);

const started = await startDebateServer({ port });

console.log(`Adversarial Pixel Debate server listening on ${started.url}`);
