// Optional local dev server. On Render this is deployed as a *Static Site*
// (Publish Directory: public) and this file is not used. For local preview you
// still need an HTTP server because the page fetches royals.json — opening
// index.html via file:// would be blocked by the browser. Run `npm start`.
import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Royal Family Tree running at http://localhost:${PORT}`);
});
