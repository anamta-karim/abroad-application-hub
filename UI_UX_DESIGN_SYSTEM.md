# UI/UX design brief and design system

## Design direction

**Selected theme: Warm Paper + Forest.** A calm, thoughtful workspace that feels dependable and human. It should look like a well-organized planning tool, not a generic AI dashboard.

### Core palette

- Warm paper background: `#F7F6F2`
- Forest primary: `#315C4B`
- Sage secondary: `#DCE7DF`
- Ink text: `#252A27`
- White surface: `#FFFFFF`
- Muted text: `#626B65`
- Border/rule: `#D9DED9`
- Error: `#9E3D36` (use sparingly)
- Warning: `#8A5B18` (use sparingly)
- Success: forest/sage combination, not bright green

Maintain adequate contrast; do not use pale accent colors for small text. Make the forest primary the main action color, with clear focus/pressed states. No gradients.

## Layout

- Responsive from narrow mobile to wide desktop.
- Desktop app shell: slim left navigation rail/sidebar and a wide content area; restrained header.
- Mobile: compact header plus labeled menu/bottom navigation; content in one column.
- Use whitespace, headings, alignment, tables, lists, dividers, and clear section grouping.
- Avoid card-heavy layouts. A few bordered panels are acceptable only when they communicate a real grouping; default to open sections and rows.
- Forms use explicit labels, inline help, and visible validation.
- Dashboard prioritizes deadlines and next actions, then application list and document readiness.

## Typography and shape

- Use a readable sans-serif system stack or one carefully selected open font with reliable fallback.
- Clear hierarchy: page title, section title, body, metadata.
- Body text should be comfortable on mobile (16px baseline recommended).
- Moderate line length; avoid dense walls of text.
- Use restrained corner rounding. Prefer thin rules and subtle surfaces over floating cards and shadows.

## Icons and decoration

- Do not use Lucide icons or decorative emoji.
- Prefer text labels. If a symbol is necessary, use a small custom CSS/native glyph only when it improves comprehension and has an accessible text label.
- No animated arrows, hover animations, confetti, parallax, pulsing, or decorative motion.
- All key controls must work by touch and keyboard; hover must not reveal essential information.
- Respect reduced-motion preferences; avoid nonessential motion entirely.

## Copy voice

- Plain, direct, warm, and specific.
- Explain what happens next and what the user can do.
- Avoid generic AI language such as “unlock your potential,” “seamlessly,” “delve,” “I’m excited,” or “Here’s your personalized journey.”
- No em dash. Prefer periods, commas, or parentheses.
- Never pretend the app is certain when the source is unclear.
- Example: “We couldn’t find a deadline in these documents. Add one yourself or check the program website.”
- Example: “These two awards both mention tuition support. The documents do not say whether you can combine them. Check with each provider.”

## Components

- Primary/secondary/text buttons with clear labels.
- Compact application table/list with status text and due date.
- Deadline list grouped by date.
- Checklist rows with task, status, due date, and linked document.
- Source citation with filename or page/section and open-source action.
- Extraction review fields with confidence/verification state expressed in words, not opaque scores.
- Inline empty states that include a next action.
- Status badges use subtle tints and text; never color-only meaning.
- Toast/alert for saved, failed, or quota states; ensure screen-reader announcement.

## Responsive behavior

- Test at 360px, 390px, 768px, 1024px, and wide desktop.
- No horizontal page overflow.
- Touch targets at least 44px high where practical.
- On small screens, convert data tables to labeled stacked rows or a controlled horizontal scroll region.
- Keep upload, add-source, update-status, and view-deadline flows easy with one hand.

## Accessibility and interaction

- Semantic landmarks, heading order, labels, error associations, keyboard focus, visible focus ring.
- Contrast target WCAG AA for text and controls.
- Never rely on color alone for status or warnings.
- Dialogs trap focus and return focus to trigger; avoid unnecessary dialogs.
- Show destructive effects clearly before deletion.
- Avoid hover states as the only feedback. Use focus/pressed states with adequate contrast.

## Theme options considered

Warm Paper + Forest was selected. The alternatives were Cool White + Navy and Cream + Terracotta. Do not change the selected palette without user direction.
