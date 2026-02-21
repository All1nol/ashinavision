export type MathBlockType = "inline" | "display" | "environment";

export type MathBlock = {
  id: string;
  type: MathBlockType;
  environmentName?: string;
  latex: string;
  lineNumber: number;
  contextBefore: string;
};

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

const getContextBefore = (source: string, index: number): string => {
  const before = source.substring(Math.max(0, index - 80), index);
  const lastNewline = before.lastIndexOf("\n");
  const line = lastNewline >= 0 ? before.substring(lastNewline + 1) : before;
  return line.trim();
};

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
      contextBefore: getContextBefore(texContent, matchIndex),
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

  blocks.sort((a, b) => a.lineNumber - b.lineNumber);
  blocks.forEach((block, i) => {
    block.id = `math-${i}`;
  });

  return blocks;
};
