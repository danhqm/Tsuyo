import { readFileSync } from "node:fs";
import { render } from "../dist-server/entry-server.js";
import { createPageHandler } from "../server/page-handler.mjs";
const template = readFileSync(
  new URL("../dist-server/template.html", import.meta.url),
  "utf8",
);
export default createPageHandler({ render, template });
