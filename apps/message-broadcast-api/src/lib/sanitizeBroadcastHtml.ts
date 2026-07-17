import sanitizeHtml from "sanitize-html";

// The single choke point between admin-authored HTML and dangerouslySetInnerHTML on every
// user's dashboard — runs on every create/update, before persisting. Emoji are plain Unicode
// text nodes, untouched by this. Forcing rel="noopener noreferrer" on links is a small
// reverse-tabnabbing hardening beyond what was asked for.
export function sanitizeBroadcastHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "span", "h1", "h2", "h3", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}
