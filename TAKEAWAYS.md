# Takeaway: Portugal Birthday Map MVP

## Why this file exists
This document captures the main issues we hit while building the interactive Portugal map, why they happened, and how we fixed them.

## 1) Map drifting while dragging
- Symptom: While holding mouse and dragging over regions, the map looked like it moved left.
- Root cause: Tilt rotation was still updating during pointer-down movement. Path tap scaling also added perceived motion.
- Fix:
  - Freeze tilt updates while pointer is down.
  - Reset drag state on pointer up/cancel/leave.
  - Remove path tap scaling on regions.
- Result: No movement while dragging. Hover tilt still works.

## 2) 3D card looked too aggressive
- Symptom: Card tilt felt too strong/jittery and reduced readability.
- Root cause: Rotation multipliers and spring settings were too high, and scene lighting/particles were too busy.
- Fix:
  - Lower tilt intensity and tune spring for smoother motion.
  - Soften lighting/material contrast in `MapTiltScene`.
  - Reduce particle density/speed.
- Result: Cleaner, premium subtle 3D feel.

## 3) Region color not visibly applying (particles only)
- Symptom: Click produced particles, but region color did not appear clearly.
- Root cause: Fill rendering relied too much on style-based behavior for `motion.path`; browser/render interactions made it unreliable.
- Fix:
  - Set `fill`, `fillOpacity`, and `stroke` directly on SVG path props.
  - Animate those attributes explicitly.
  - Use a stable fill rule (`nonzero`).
- Result: Whole region reliably fills on correct paint.

## 4) Map readability and scale
- Symptom: Map and icons felt small.
- Fix:
  - Increase map container max width.
  - Increase number/icon font sizes and label sizing.
- Result: Better visibility on desktop/tablet while staying responsive.

## 5) Screenshot + Share feature
- Requirement: Export/share final filled map.
- Implementation:
  - Added PNG capture with `html-to-image`.
  - Added `Save PNG` button.
  - Added `Share` button with fallback chain:
    1. Native Web Share with file
    2. Clipboard image copy
    3. Auto-download PNG
  - Excluded tooltip/particles from export.
- Result: Reliable export flow across devices/browsers.

## 6) Save/Share should only unlock at 100%
- Requirement: Prevent premature sharing.
- Fix:
  - Disable buttons unless completion is exactly 100%.
  - Add handler-level guard and status message for safety.
- Result: Feature is gated correctly at full completion.

## 7) Different users should not get identical palette mapping
- Requirement: Randomize colors per session.
- Fix:
  - Randomized palette mapping per browser session.
  - Kept mapping stable within the same session using `sessionStorage`.
  - Bound region target colors to that session palette.
- Result: Different sessions/users get different color layouts.

## 8) Performance risk with many sessions/localStorage
- Concern: Synchronous `localStorage` writes can block UI under heavy activity; random-session keys can accumulate.
- Fix:
  - Debounced writes.
  - Skip writes when state snapshot is unchanged.
  - Added bounded key index + pruning (keep latest N entries).
  - Timer cleanup to avoid unnecessary writes.
- Result: Lower main-thread pressure and controlled storage growth.

## Practical lessons
- For interactive SVG maps, prefer explicit SVG attributes (`fill`, `stroke`) over style-only updates.
- Any visual transform tied to pointer movement should be disabled during drag operations.
- `localStorage` is easy but synchronous; always debounce and cap saved state.
- For sharing/export, implement progressive fallbacks instead of a single API path.

## Current status
- Core flows (paint, undo, clear, autofill, progress, confetti, save/share) are working.
- Lint/build checks have been passing after each major change set.
