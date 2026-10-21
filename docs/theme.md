# Theme: Violet Drift

The look of the whole app: a light violet brand, a soft lavender-to-mint background, gradient buttons and a small animated mascot. The layout is unchanged from the earlier green theme.

## Colours

The brand scale is defined once in `src/index.css` (`@theme`). It replaces Tailwind's `emerald-*` colours, so every `emerald-*` class in the app is violet. Do not rename those classes; change the values instead.

| Step | Colour | Typical use |
| --- | --- | --- |
| 50 | `#f3f1ff` | tinted backgrounds, hover rows |
| 100 | `#e8e5ff` | badges, soft panels |
| 200 | `#d3ceff` | borders on tinted panels |
| 300 | `#b4acff` | focus rings, dividers |
| 400 | `#9387fb` | icons, mascot body (`#8f84fb`) |
| 500 | `#7466f5` | accents |
| 600 | `#5f4ee8` | links, active text |
| 700 | `#4f3fd0` | primary buttons |
| 800 | `#4034a8` | button hover, headings on tint |
| 900 | `#352d82` | dark text on tint |
| 950 | `#1f1a4d` | logo shield, mascot eyes |

Support colours: slate for text and borders (unchanged), teal `#2dd4bf` and amber `#fbbf24` only in the mascot and logo details, pink `#f9a8d4` for the mascot cheeks.

Text on `700` and darker passes 4.5:1 with white. Do not put white text on `400` or lighter.

## Surfaces

- Page background: `#f5f3ff` with two soft radial glows (lavender top left, mint bottom right), fixed while scrolling. Set on `body` in `src/index.css`. Screens use `bg-transparent` so the glow shows through.
- Cards stay white with a slate border.
- Shadows are violet tinted (`--shadow-xs` to `--shadow-lg` in `@theme`).
- Scrollbars use the same lavender tones.

## Buttons

Primary buttons keep the class `bg-[#4f3fd0]` in the markup. `src/index.css` adds a diagonal gradient (`#6a58f2` to `#4f3fd0`) to that class, lifts it 1 px on hover with a violet glow, and drops it back on press. Disabled buttons do not move. Hover colour in the markup is `#4034a8`.

## Motion

- `ap-rise`: content directly inside `main` fades up 8 px in 0.35 s.
- `ap-float`: the mascot floats up and down every 3.4 s.
- `ap-blink`: the mascot blinks every 4.5 s.
- All of it stops for users who set reduced motion in their system (`prefers-reduced-motion`).

## Mascot: Pip

`src/components/Pip.tsx`, an original round character with a graduation cap. Props: `size` (px, default 72). It is decorative (`aria-hidden`).

Used on the sign-in screen, the profile set-up header and the empty Discover list. Keep it to friendly moments; do not place it on error or payment screens.

## Logo and icons

`favicon.svg`, `public/favicon.svg` and `public/adminpath-logo.svg` use the violet shield. The PNGs in `public/` (`adminpath-logo-1024.png`, `adminpath-logo-512.png`, `icon-192.png`, `apple-touch-icon.png`) were rendered from that SVG. If the SVG changes, render the PNGs again at the same sizes.

## How to change the theme later

1. Change the `--color-emerald-*` values in `src/index.css`. That recolours the app.
2. Change the two hardcoded hex values that stay in class names: `#4f3fd0` (primary button) and `#4034a8` (its hover). If you change them, update the gradient selector in `src/index.css` to match.
3. Update the logo SVGs and the mascot fills in `Pip.tsx`.
4. Check contrast of white text on the new 700 step.

## Known limits

- Success states (for example "Email found") use the same violet as the brand, because they shared the old green class. Add a separate green only if success needs its own colour.
- Not checked on real phones or in iOS Safari yet.
