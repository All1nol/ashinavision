import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "span", "div", "br", "hr",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "strong", "em", "sub", "sup", "mark",
  "math", "mi", "mn", "mo", "ms", "mtext",
  "mrow", "mfrac", "msqrt", "mroot", "msub", "msup",
  "msubsup", "munder", "mover", "munderover",
  "mtable", "mtr", "mtd", "mfenced", "menclose",
  "semantics", "annotation",
];

const ALLOWED_ATTR = [
  "aria-label", "aria-describedby", "aria-hidden",
  "aria-live", "aria-atomic",
  "role", "tabindex", "title", "lang",
  "class", "id",
  "colspan", "rowspan", "scope",
  "mathvariant", "displaystyle", "scriptlevel",
  "open", "close", "separators",
];

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
  });
};
