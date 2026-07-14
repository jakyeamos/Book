# Book v2 Design System

## Register

product

## Physical Scene

A reader is alone in a dim room late at night; the interface should recede into a deep, quiet surface while text, sound, and a few deliberate transitions carry the mood. An editor works in daylight at a desk; Author Studio should be neutral, precise, and easy to scan.

## Color Strategy

Use two intentional modes over shared semantic tokens:

- Reader: restrained near-black neutral, warm high-contrast text, and a chapter-controlled accent used sparingly for atmosphere and state.
- Studio: neutral light surface with clear ink, borders, focus, success, warning, and error roles; chapter color appears in preview, not as navigation chrome.

Use OKLCH tokens. Do not use gradient text, decorative glass, low-contrast tinted body text, or chapter colors as the only status signal.

## Typography

- Reader prose: a highly legible literary serif with a 65–75ch measure, generous leading, and balanced headings.
- Studio controls: a neutral sans with compact, explicit hierarchy.
- Use `text-wrap: balance` for headings and `text-wrap: pretty` for long prose.

## Motion

Motion is atmospheric and purposeful: chapter transitions, scene changes, audio crossfades, selection actions, and state feedback. Content is visible before animation. `prefers-reduced-motion` disables nonessential transitions, particles, parallax, and automatic audio start.

## Surfaces

- Reader shell: minimal header, reading canvas, contextual tools, library/account sheets.
- Studio shell: chapter rail, focused workspace, synchronized preview, timeline, inspector, and explicit publish review.

## Shared Primitives

Buttons, inputs, selects, status messages, tooltips, dialogs, live regions, empty states, timeline controls, and focus treatments are shared primitives. Reader and Studio may compose them at different densities, but must not fork their accessibility behavior.
