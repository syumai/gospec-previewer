import https from "https";
import type http from "http";
import { VercelRequest, VercelResponse } from "@vercel/node";

const refRegExp = /^[a-zA-Z0-9/.\-_]+$/;

/**
 * validateRef checks format of ref.
 */
const validateRef = (ref: string): boolean => {
  return refRegExp.test(ref);
};

/**
 * loadContent loads Go Spec HTML content and return it as plain HTML.
 */
const fetchContent = async (ref: string): Promise<string> => {
  if (!validateRef(ref)) {
    throw new Error(`invalid ref format: ${ref}`);
  }
  const url = `https://go.googlesource.com/go/+/${ref}/doc/go_spec.html?format=TEXT`;
  const req = https.get(url);
  const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
    req.on("response", (res) => resolve(res));
    req.on("error", (err) => reject(err));
  });
  res.setEncoding("utf8");
  const chunks = [];
  for await (const chunk of res) {
    chunks.push(chunk);
  }
  res.resume();
  return Buffer.from(chunks.join(""), "base64").toString("utf8");
};

/**
 * renderContent renders content as full HTML.
 */
const renderContent = (content: string): string => {
  const matchedContent = content.match(/<!--([^>]*)-->/);
  if (!matchedContent) {
    throw new Error("description JSON must be exist");
  }
  if (matchedContent.length < 2 || !matchedContent[1]) {
    throw new Error("description JSON didn't matched to the pattern");
  }
  const contentDesc = JSON.parse(matchedContent[1]);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#00ADD8">
    <title>${contentDesc.Subtitle} - Go Language Specification Previewer</title>
    <link href="https://fonts.googleapis.com/css?family=Work+Sans:600|Roboto:400,700" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Product+Sans&text=Supported%20by%20Google&display=swap" rel="stylesheet">
    <link type="text/css" rel="stylesheet" href="https://golang.org/lib/godoc/style.css">
  </head>
  <body>
  <main id="page" class="Site-content wide">
    <div class="container">
      <h1>
        ${contentDesc.Title}
        <span class="text-muted"></span>
      </h1>
      <h2>
        ${contentDesc.Subtitle}
        <span class="text-muted"></span>
      </h2>
      <div id="nav"></div>
      ${content}
    </div>
  </main>
  <div style="margin-bottom: 24px">
    <a href="https://golang.org/doc/copyright">Copyright</a>
  </div>
  <script src="/src/toc.js"></script>
  </body>
</html>`;
};

export default async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const {
    query: { ref },
  } = req;
  const refStr = Array.isArray(ref) ? ref[0] : ref;
  if (!refStr) {
    throw new Error("ref must be given");
  }
  const content = await fetchContent(refStr);
  res.setHeader("Cache-Control", "max-age=0, s-maxage=86400");
  res.send(renderContent(content));
};
