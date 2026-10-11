import { loadPublicStore } from "../server/public-store.mjs";
import { sitemapFor } from "../server/pages.mjs";
import { readonlyMethod, send, sendProblem } from "../server/http.mjs";
export default async function (req, res) {
  try {
    if (!readonlyMethod(req, res)) return;
    send(
      res,
      200,
      "application/xml",
      sitemapFor(await loadPublicStore()),
      req.method,
    );
  } catch (e) {
    sendProblem(res, e, req.method);
  }
}
