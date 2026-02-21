# Accessibility (Blind-first)

This product is built **screen-reader-first** (NVDA/JAWS on Windows, VoiceOver on macOS/iOS). Any new UI should remain fully usable without sight, without a mouse, and without relying on custom text-to-speech.

## Non-negotiables

- **Keyboard-only**: every flow must be completable using only a keyboard.
- **Semantics first**: use real elements (`button`, `a`, `input`, headings, landmarks) before adding ARIA.
- **No duplicate IDs**: IDs used by `aria-controls`, `aria-labelledby`, or labels must be unique per page.
- **Clear focus**: focus must always be visible and never trapped.
- **Announce async state**: conversions, errors, and status updates must be exposed via `aria-live` / `role="status"` / `role="alert"`.

## Global behaviors

- **Skip link**: there is a "Skip to main content" link at the top of every page.
- **Route focus**: on navigation, focus moves to `#main-content` and the new page title is announced.

## Arrow-navigation for expression cards (uploaded .tex)

In the document reader, each math expression is an expandable card:

- **Tab**: moves focus into the expressions list (only one expression card is tabbable at a time).
- **Up / Down**: moves focus between expressions.
- **Enter / Space**: expands or collapses details for the focused expression.

## PR review checklist

- Does every interactive control have an accessible name?
- Can you complete the feature with keyboard only?
- Does focus land somewhere sensible after actions (submit, open panel, route change)?
- Are dynamic results/errors announced to screen readers?
- Did you avoid adding ARIA when native semantics already works?

