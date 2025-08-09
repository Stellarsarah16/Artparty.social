# CSS Guidelines

Purpose: Make styles consistent, maintainable, and scalable across desktop and mobile while we add user help and UX improvements.

## Design Tokens

Define and use CSS variables (already present in `frontend/css/styles.css :root`):
- Colors: `--primary-color`, semantic variants (success, error, warning)
- Spacing: `--space-xs` … `--space-xl`
- Typography: font sizes via utility classes or component styles
- Radii/Shadows: `--border-radius*`, `--shadow-*`

Guideline: avoid hard-coded values; prefer tokens.

## Breakpoints

Standard breakpoints:
- Phone: max-width 600px
- Tablet: 601–1024px
- Desktop: 1025–1279px
- Wide: ≥1280px

Place responsive rules next to the component they affect.

## File Structure

- `frontend/css/styles.css` (temporary aggregate)
- Future structure:
  - `frontend/css/base/` (reset, tokens)
  - `frontend/css/components/` (buttons, toolbars, palettes, cards)
  - `frontend/css/pages/` (viewer, editor, canvas-list)
  - `frontend/css/utils/` (rare utilities)

## Naming

Prefer component scoping and BEM-like blocks:
- Block: `.floating-tools-panel`, `.canvas-stats-bar`, `.editor-header`
- Elements: `.floating-tools-panel__middle`, `.editor-header__title`
- Modifiers: `.tool-btn--active`, `.palette--compact`

Avoid global element overrides that leak styles.

## Component Rules

- Define a minimal global baseline; scope layout/spacing inside component selectors
- Keep phone-specific grid/stacking rules under `@media (max-width: 600px)`
- Keep desktop defaults under `@media (min-width: 769px)` when necessary

## Duplicates & Conflicts

- Consolidate repeated selectors (e.g., multiple `.color-grid`) under component-scoped versions:
  - Use `.floating-tools-panel .color-grid` for toolbar palette
  - Use `.palette .color-grid` for shared palette components

## Accessibility

- Ensure focus states on interactive elements
- Respect reduced motion where applicable
- Maintain sufficient color contrast

## Process

- Small, scoped edits per component
- Visual check (desktop + phone) before merging
- Remove dead/duplicate rules when a component is migrated

Definition of Done (per component)
- Uses tokens; no magic numbers
- Mobile + desktop rules scoped in the component
- No duplicate selectors left behind
- Screens pass basic accessibility checks
