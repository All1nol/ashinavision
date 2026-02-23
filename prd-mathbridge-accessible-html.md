# PRD: MathBridge — LaTeX to Accessible HTML (LLM-assisted)

## 1. Introduction / Overview

Blind STEM learners and professionals can often access **LaTeX source** (e.g., via refreshable Braille), but they are disadvantaged compared to sighted readers because:

- Sighted readers can **glance** to understand structure (fractions, integrals, nested expressions) in seconds.
- Blind readers must consume math **linearly**, reconstructing structure mentally, which increases cognitive load and time.
- Many published artifacts are **PDF-first**, and math in PDFs is frequently **inaccessible** to screen readers.

Kortemeyer (2023) explores using Large Language Models to generate **standards-compliant, accessible HTML** from LaTeX sources, while noting complications when the model starts *interpreting* content instead of faithfully translating.

This PRD specifies an MVP web product where a user **pastes LaTeX content**, the system calls an LLM via a backend API, and returns **accessible HTML** plus **plain-English math descriptions** suitable for screen readers.

## 2. Goals

- Convert pasted LaTeX content into **accessible HTML output** suitable for screen reader navigation.
- Provide **plain-English descriptions** for math expressions (at least: concise + detailed).
- Provide an **Equation Outline** (navigable structure) so users can understand complex math faster than linear reading.
- Provide a simple, accessible UI that works with keyboard-only navigation.
- Keep the system safe: input validation, rate limiting (basic), and safe HTML rendering.

## 3. User Stories

### US-001: Paste LaTeX content in a web UI
**Description:** As a user, I want to paste LaTeX content so that I can convert it without uploading files.

**Acceptance Criteria:**
- [ ] Page includes a labeled `<textarea>` for LaTeX input (supports multi-line paste).
- [ ] Input has a visible character counter and a documented max size (e.g., 20k chars).
- [ ] UI is keyboard accessible (Tab order is logical; focus visible).
- [ ] **Verify in browser using dev-browser skill**

### US-002: Submit conversion request to backend
**Description:** As a user, I want to click “Convert” so that my LaTeX is sent to the server for LLM processing.

**Acceptance Criteria:**
- [ ] “Convert” button calls `POST /api/convert` with JSON payload `{ latex: string }`.
- [ ] UI shows loading state and disables the button while request is in flight.
- [ ] UI shows a readable error message for non-200 responses (no raw stack traces).
- [ ] **Verify in browser using dev-browser skill**

### US-003: Backend API contract for conversion
**Description:** As a developer, I need a stable API contract so frontend and backend can be built independently.

**Acceptance Criteria:**
- [ ] Implement `POST /api/convert` that accepts `application/json`.
- [ ] Request schema validated server-side: `latex` required, string, length within limit.
- [ ] Response schema (success) is:
  - `html`: string (sanitized or safe-to-render HTML fragment)
  - `descriptions`: object `{ concise: string, detailed: string }`
  - `warnings`: string[] (optional)
- [ ] Response schema (error) is: `{ error: { code: string, message: string } }`.
- [ ] Typecheck/lint passes.

### US-004: LLM provider adapter (live calls)
**Description:** As a developer, I want the backend to call an LLM provider so that conversions are generated dynamically.

**Acceptance Criteria:**
- [ ] Provider configured via environment variables (at minimum: `LLM_API_KEY`, `LLM_MODEL`).
- [ ] Backend enforces a timeout (e.g., 30s) and returns a friendly error code on timeout.
- [ ] Backend returns a clear error when key is missing or provider rejects the request.
- [ ] Logs do **not** include the API key or full user LaTeX by default.
- [ ] Typecheck/lint passes.

### US-005: Prompting that avoids “interpretation”
**Description:** As a user, I want faithful structural descriptions so that I can trust the output matches the LaTeX.

**Acceptance Criteria:**
- [ ] Prompt includes explicit instruction to **not infer meaning** beyond the LaTeX structure.
- [ ] Prompt requests:
  - accessible HTML fragment
  - concise description
  - detailed description
  - warnings when input is ambiguous or contains unsupported constructs
- [ ] Prompt requires preserving indices/subscripts/superscripts and nesting.
- [ ] Prompt requires output in a strict JSON shape so parsing is deterministic.
- [ ] Typecheck/lint passes.

### US-006: Safe rendering of returned HTML
**Description:** As a user, I want to view the generated HTML safely so that the app cannot be used for script injection.

**Acceptance Criteria:**
- [ ] Frontend renders returned HTML only after sanitization (or renders a safe subset).
- [ ] Disallow `<script>`, inline event handlers, and `javascript:` URLs.
- [ ] Provide a “View as plain text” toggle for the HTML fragment.
- [ ] **Verify in browser using dev-browser skill**

### US-007: Output UX for copying and reuse
**Description:** As a user, I want to copy outputs so that I can reuse them in emails, docs, or LMS platforms.

**Acceptance Criteria:**
- [ ] Separate copy buttons exist for:
  - `descriptions.concise`
  - `descriptions.detailed`
  - `html`
- [ ] Copy action confirms success via an `aria-live` announcement.
- [ ] **Verify in browser using dev-browser skill**

### US-008: Basic accessibility guarantees for the UI itself
**Description:** As a blind user, I want the conversion UI to be accessible so that I can use it independently.

**Acceptance Criteria:**
- [ ] Page uses semantic landmarks (`header`, `main`, `footer`).
- [ ] All inputs/buttons have accessible names.
- [ ] Dynamic updates (loading, success, errors) are announced via `aria-live`.
- [ ] Keyboard-only flow supports: paste → convert → navigate outputs → copy.
- [ ] **Verify in browser using dev-browser skill**

### US-009: One-click demo presets (sample LaTeX)
**Description:** As a presenter, I want one-click presets so that the demo is reliable and fast.

**Acceptance Criteria:**
- [ ] UI provides at least 5 preset buttons (e.g., Euler, Quadratic, Schrödinger, Gaussian, Mass-energy).
- [ ] Clicking a preset fills the input textarea with the corresponding LaTeX (replacing existing content).
- [ ] After selecting a preset, focus moves to the Convert button (or a predictable next step) for keyboard flow.
- [ ] **Verify in browser using dev-browser skill**

### US-010: Backend returns an Equation Outline with LaTeX ranges
**Description:** As a blind user, I want a structural outline of the equation so that I can navigate parts without rereading everything.

**Acceptance Criteria:**
- [ ] `POST /api/convert` success response adds an `outline` field.
- [ ] `outline` is a tree (or flat list with parent references) where each node includes:
  - `id`: string (unique per response)
  - `label`: string (human-readable, e.g., "fraction", "numerator", "square root", "subscript i")
  - `range`: `{ start: number, end: number }` indices into the submitted `latex` string (0-based, end exclusive)
  - `children`: optional array of nodes (same shape)
- [ ] The outline is derived from LaTeX structure (operators, groups, fractions, roots, integrals, subscripts/superscripts).
- [ ] If the backend cannot confidently produce an outline, it returns `outline: []` and adds a warning in `warnings`.
- [ ] Typecheck/lint passes.

### US-011: Outline navigation in UI + focus-sync highlighting
**Description:** As a blind user, I want to move through the outline and have the corresponding LaTeX segment highlighted so that I can build a mental model quickly.

**Acceptance Criteria:**
- [ ] UI renders the outline as a keyboard-navigable tree (buttons/links with proper accessible names).
- [ ] When an outline node receives focus (or is activated), the app highlights the node’s `range` within a read-only LaTeX preview panel.
- [ ] The highlight change is announced via `aria-live` (e.g., “Selected: square root, characters 12 to 25” or “Selected: numerator”).
- [ ] Provide keyboard shortcuts:
  - Up/Down: move to previous/next visible node
  - Enter/Space: activate node (trigger highlight + announcement)
  - Left/Right: collapse/expand node (or move between parent/child if implemented)
- [ ] **Verify in browser using dev-browser skill**

## 4. Functional Requirements

- FR-1: The system must accept pasted LaTeX content as a single text field.
- FR-2: The system must provide a `POST /api/convert` endpoint that validates input and returns conversion output.
- FR-3: The backend must call an LLM provider using a server-side API key (not exposed to the browser).
- FR-4: The system must return:
  - accessible HTML fragment
  - concise description
  - detailed description
  - equation outline (structural navigation data)
  - optional warnings
- FR-5: The frontend must render outputs in an accessible way and allow copying each output.
- FR-6: The system must prevent XSS by sanitizing or restricting HTML rendering.
- FR-7: The UI must be keyboard navigable and screen-reader friendly.
- FR-8: The UI must include demo presets that can populate the input with representative samples.
- FR-9: When a user navigates the outline, the corresponding LaTeX segment must be highlighted in a preview.

## 5. Non-Goals (Out of Scope)

- No PDF upload or PDF-to-LaTeX extraction in MVP.
- No automatic fetching of LaTeX from arXiv/DOI links in MVP.
- No user accounts, saved history, or collaboration features in MVP.
- No guarantee of mathematical correctness beyond **faithful structural translation**.
- No full WCAG certification process (we will do practical checks + basic audits only).

## 6. Design Considerations

- **Layout**: single-page flow: Input → Convert → Outputs (HTML + descriptions).
- **Accessibility**: visible focus states, logical headings, `aria-live` for status.
- **Controls**:
  - Preset sample buttons (for demo + quick start)
  - Convert button
  - Output tabs or sections (Concise / Detailed / HTML / Outline)
  - Copy buttons per output
  - “View as plain text” toggle for HTML
  - LaTeX preview panel used for outline highlighting (read-only)

## 7. Technical Considerations

### Recommended architecture (MVP)

- **Frontend**: static web UI (HTML/CSS/JS or a minimal framework).
- **Backend**: small web API service (Node/Express or Python/FastAPI), with:
  - input validation
  - LLM call wrapper
  - structured JSON response

### Security / safety

- Enforce maximum input size and reject extremely large requests.
- Avoid logging raw LaTeX content by default.
- Sanitize model-produced HTML before rendering.
- Add basic rate limiting (even a simple per-IP limit) to protect the LLM key.

### Deterministic parsing

- Require the model to output **strict JSON** only.
- Backend should parse JSON and return typed fields; if parsing fails, return a controlled error.

### Equation outline data model

- Prefer returning `range` offsets into the original input string (0-based) so the UI can highlight without needing to trust model-generated HTML IDs.
- The backend must clamp/validate all outline ranges before returning them (e.g., `0 <= start < end <= latex.length`), and discard invalid nodes.

### Research alignment (Kortemeyer, 2023)

- Focus on generating **accessible HTML** from LaTeX sources.
- Prefer faithful transcription/structure over interpretive explanation.
- Include warnings when model output may be interpretive or uncertain.

## 8. Success Metrics

- A user can paste a LaTeX sample and get outputs in **≤ 10 seconds** (typical case).
- For a small evaluation set (5–10 representative samples), the output is:
  - readable by a screen reader (tested with at least one, e.g., NVDA)
  - structurally faithful (manual spot-check vs input)
- Users can navigate at least 10 outline nodes using only the keyboard (no mouse) in under 30 seconds.
- Zero XSS when rendering model output (verified by attempting injection strings).

## 9. Open Questions

- Which specific LLM provider(s) should be supported first (OpenAI, Anthropic, etc.)?
- What is the maximum LaTeX size for MVP (chars / tokens)?
- Should the output HTML target MathML, ARIA-only descriptions, or both?
- Should we support multiple math blocks in one paste (full doc), and how do we delimit them?
- What “warnings” taxonomy do we want (unsupported macros, ambiguous parsing, truncation)?

---

## Appendix: Agent-sized task list (plain English)

These are intentionally small tasks that a coding agent can implement one by one.

1. Create a minimal backend service with a health route (`GET /health`).
2. Add `POST /api/convert` that validates `{ latex }` and returns a stubbed JSON response.
3. Add environment variable loading and startup failure message when `LLM_API_KEY` is missing.
4. Implement an LLM call function that takes LaTeX and returns model text.
5. Write a strict prompt that requests JSON with keys `html`, `descriptions.concise`, `descriptions.detailed`, `warnings`.
6. Parse the model output as JSON; if parsing fails, return `{ error: { code, message } }`.
7. Add simple rate limiting middleware (per-IP) to protect the API.
8. Create a frontend page with:
   - labeled textarea
   - preset sample buttons
   - convert button
   - output sections (including outline + LaTeX preview)
   - loading + error UI
9. Wire frontend “Convert” to call the backend and render results.
10. Add HTML sanitization before rendering and a plain-text view toggle.
11. Add copy buttons for concise, detailed, and html, plus `aria-live` confirmations.
12. Add outline rendering + keyboard navigation + focus-sync highlight in LaTeX preview.
13. Run a manual accessibility pass: keyboard-only flow + screen reader spot-check.

