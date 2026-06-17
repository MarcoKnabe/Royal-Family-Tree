import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve the static front-end.
app.use(express.static(join(__dirname, "public")));

// Serve the genealogical dataset. Read on each request so editing the data
// file during `npm run dev` is reflected without a manual restart.
app.get("/api/people", async (_req, res) => {
  try {
    const raw = await readFile(join(__dirname, "data", "royals.json"), "utf8");
    res.type("application/json").send(raw);
  } catch (err) {
    console.error("Failed to read dataset:", err);
    res.status(500).json({ error: "Could not load the royal dataset." });
  }
});

app.listen(PORT, () => {
  console.log(`Royal Family Tree running at http://localhost:${PORT}`);
});
