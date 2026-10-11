import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { render } from "../dist-server/entry-server.js";
import { createSiteHandler } from "../server/site-handler.mjs";
const port = Number(process.env.PORT || 4173);
const origin = `http://127.0.0.1:${port}`;
const template = await readFile(
  new URL("../dist-server/template.html", import.meta.url),
  "utf8",
);
createServer(
  createSiteHandler({ render, template, allowedOrigins: [origin] }),
).listen(port, "127.0.0.1", () =>
  console.log(`Tsuyo production preview: ${origin}`),
);
