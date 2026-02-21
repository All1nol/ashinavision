export type MathBlockType = "inline" | "display" | "environment";

export type MathBlock = {
  id: string;
  type: MathBlockType;
  environmentName?: string;
  latex: string;
  lineNumber: number;
  sourceStart: number;
  sourceEnd: number;
};

export type DocumentSegment =
  | { type: "text"; content: string }
  | { type: "math"; block: MathBlock };

const MATH_ENVIRONMENTS = [
  "equation",
  "equation*",
  "align",
  "align*",
  "gather",
  "gather*",
  "multline",
  "multline*",
  "eqnarray",
  "eqnarray*",
  "math",
  "displaymath",
  "flalign",
  "flalign*",
  "split",
];

const getLineNumber = (source: string, index: number): number =>
  source.substring(0, index).split("\n").length;

export const extractMathBlocks = (texContent: string): MathBlock[] => {
  const blocks: MathBlock[] = [];
  let idCounter = 0;

  const capturedRanges: { start: number; end: number }[] = [];

  const isOverlapping = (start: number, end: number): boolean =>
    capturedRanges.some((r) => start < r.end && end > r.start);

  const addBlock = (
    matchIndex: number,
    matchLength: number,
    latex: string,
    type: MathBlockType,
    environmentName?: string,
  ) => {
    if (isOverlapping(matchIndex, matchIndex + matchLength)) return;
    capturedRanges.push({ start: matchIndex, end: matchIndex + matchLength });
    blocks.push({
      id: `math-${idCounter++}`,
      type,
      environmentName,
      latex,
      lineNumber: getLineNumber(texContent, matchIndex),
      sourceStart: matchIndex,
      sourceEnd: matchIndex + matchLength,
    });
  };

  for (const env of MATH_ENVIRONMENTS) {
    const escapedEnv = env.replace("*", "\\*");
    const regex = new RegExp(
      `\\\\begin\\{${escapedEnv}\\}([\\s\\S]*?)\\\\end\\{${escapedEnv}\\}`,
      "g",
    );
    let match;
    while ((match = regex.exec(texContent)) !== null) {
      addBlock(
        match.index,
        match[0].length,
        match[0],
        env === "math" ? "inline" : "environment",
        env,
      );
    }
  }

  const displayBracket = /\\\[([\s\S]*?)\\\]/g;
  let match;
  while ((match = displayBracket.exec(texContent)) !== null) {
    addBlock(match.index, match[0].length, match[1].trim(), "display");
  }

  const inlineParen = /\\\(([\s\S]*?)\\\)/g;
  while ((match = inlineParen.exec(texContent)) !== null) {
    addBlock(match.index, match[0].length, match[1].trim(), "inline");
  }

  const displayDollar = /\$\$([\s\S]*?)\$\$/g;
  while ((match = displayDollar.exec(texContent)) !== null) {
    addBlock(match.index, match[0].length, match[1].trim(), "display");
  }

  const inlineDollar = /(?<!\\)\$(?!\$)((?:[^$\\]|\\.)*)\$(?!\$)/g;
  while ((match = inlineDollar.exec(texContent)) !== null) {
    const inner = match[1].trim();
    if (!inner) continue;
    addBlock(match.index, match[0].length, inner, "inline");
  }

  blocks.sort((a, b) => a.sourceStart - b.sourceStart);
  blocks.forEach((block, i) => {
    block.id = `math-${i}`;
  });

  return blocks;
};

const cleanLatexText = (text: string): string =>
  text
    .replace(/%.*/g, "")
    .replace(/\\(?:sub)*section\*?\{([^}]*)\}/g, "\n$1\n")
    .replace(
      /\\(?:textbf|textit|emph|text|textrm|textsf|texttt)\{([^}]*)\}/g,
      "$1",
    )
    .replace(/\\(?:bf|it|em|rm|sf|tt)\b/g, "")
    .replace(/\\label\{[^}]*\}/g, "")
    .replace(/\\(?:eq)?ref\{[^}]*\}/g, "[ref]")
    .replace(/\\cite(?:\[[^\]]*\])?\{[^}]*\}/g, "[citation]")
    .replace(/\\item(?:\[[^\]]*\])?/g, "•")
    .replace(
      /\\(?:begin|end)\{(?:itemize|enumerate|description|figure|table|tabular|center|abstract|document|thebibliography)\}(?:\{[^}]*\})?/g,
      "",
    )
    .replace(
      /\\(?:par|noindent|bigskip|medskip|smallskip|newline|newpage|clearpage|maketitle|vspace|hspace)\*?(?:\{[^}]*\})?/g,
      "",
    )
    .replace(/\\(?:title|author|date)\{([^}]*)\}/g, "$1")
    .replace(
      /\\(?:large|Large|LARGE|huge|Huge|small|footnotesize|scriptsize|tiny|normalsize)\b/g,
      "",
    )
    .replace(/\\(?:centering|raggedright|raggedleft)\b/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\\\/g, " ")
    .replace(/~/g, " ")
    .replace(/\\[,;:!]/g, " ")
    .replace(/\\&/g, "&")
    .replace(/``|''/g, '"')
    .replace(/`|'/g, "'")
    .replace(/---/g, "\u2014")
    .replace(/--/g, "\u2013")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const extractDocumentSegments = (
  texContent: string,
): { segments: DocumentSegment[]; mathBlocks: MathBlock[] } => {
  const bodyMatch = texContent.match(
    /\\begin\{document\}([\s\S]*?)\\end\{document\}/,
  );

  let body: string;
  let lineOffset: number;

  if (bodyMatch) {
    const bodyStartIdx = bodyMatch.index! + "\\begin{document}".length;
    body = texContent.substring(
      bodyStartIdx,
      bodyMatch.index! + bodyMatch[0].length - "\\end{document}".length,
    );
    lineOffset = texContent.substring(0, bodyStartIdx).split("\n").length - 1;
  } else {
    body = texContent;
    lineOffset = 0;
  }

  const blocks = extractMathBlocks(body);
  blocks.forEach((b) => {
    b.lineNumber += lineOffset;
  });

  const segments: DocumentSegment[] = [];
  let cursor = 0;

  for (const block of blocks) {
    if (block.sourceStart > cursor) {
      const cleaned = cleanLatexText(body.substring(cursor, block.sourceStart));
      if (cleaned) segments.push({ type: "text", content: cleaned });
    }
    segments.push({ type: "math", block });
    cursor = block.sourceEnd;
  }

  if (cursor < body.length) {
    const cleaned = cleanLatexText(body.substring(cursor));
    if (cleaned) segments.push({ type: "text", content: cleaned });
  }

  return { segments, mathBlocks: blocks };
};
