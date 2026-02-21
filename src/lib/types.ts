export interface ConvertRequest {
  latex: string;
}

export interface OutlineNode {
  id: string;
  label: string;
  range: { start: number; end: number };
  children?: OutlineNode[];
}

export interface ConvertResponse {
  html: string;
  descriptions: { concise: string; detailed: string };
  outline: OutlineNode[];
  warnings: string[];
}

export interface ApiError {
  error: { code: string; message: string };
}
