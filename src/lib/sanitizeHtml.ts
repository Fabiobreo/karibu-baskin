import sanitize from "sanitize-html";

/**
 * Sanitizza l'HTML prodotto dall'editor TipTap dei post.
 *
 * Prima si usava `isomorphic-dompurify`, che lato server tira dentro jsdom: nel
 * bundle serverless di Vercel il require di jsdom esplodeva con ERR_REQUIRE_ESM
 * (html-encoding-sniffer -> @exodus/bytes ESM), facendo fallire l'intera rotta
 * /api/posts al caricamento del modulo. `sanitize-html` e' puro JS su
 * htmlparser2: nessun DOM, nessuna dipendenza nativa.
 *
 * L'allowlist copre quello che l'editor puo' generare (StarterKit + Link).
 */
export function sanitizePostHtml(html: string): string {
  return sanitize(html, {
    allowedTags: [
      "p",
      "br",
      "hr",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "strong",
      "b",
      "em",
      "i",
      "s",
      "u",
      "a",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    // Niente javascript:, data: o altri schemi eseguibili nei link.
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
    // I link aperti in una nuova scheda non devono poter toccare window.opener.
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.target
          ? { ...attribs, rel: "noopener noreferrer nofollow" }
          : { ...attribs, rel: "noopener nofollow" },
      }),
    },
    disallowedTagsMode: "discard",
  });
}
