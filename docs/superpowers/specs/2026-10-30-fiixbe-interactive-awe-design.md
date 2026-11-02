# FiixBE website: interactive product moments

Status: approved by Parth to build. Date: 2026-10-30.

This design builds on [2026-10-29-fiixbe-nextjs-website-design.md](2026-10-29-fiixbe-nextjs-website-design.md). Every rule in that spec still applies unless this document changes it.

## Intent

The rebuilt site in `web/` is clean, but it does not make a visitor say "wow". The product tech is shown small and the pages explain it with text. Stock photos on the For patients and For physios pages show neither the tech nor the care.

Parth wants a first-time visitor to feel two things:

1. Awe at the technology.
2. Trust in the solution.

The way to get there: the visitor plays with real tracking output and sees the physio in charge of every number. Information reads as short lines next to visuals that react to the visitor, not as paragraphs in rows.

## Goals

- Fix the scroll story bug that hides three homepage sections.
- Put the 3D phone in the first screen of the homepage, with a large live readout of joint angles next to it.
- Let the visitor scrub the squat clip by dragging, and pick the measured joint by tapping it.
- Replace the stock photo heroes on For patients and For physios with interactive product views.
- Turn plain text lists into rich, hover-interactive and tap-interactive sections.
- Make every new section work well at every screen width and with touch input.

## Non-goals

- No camera on the homepage or on the marketing pages. Visitors who want to try FiixBE on themselves use the session page (`/session`), which already streams to the backend.
- No changes to the Python backend.
- No real physio dashboard product. The dashboard on For physios is a demo with sample data.
- No new footage in this project. A squat clip of an Indian patient is a possible later change (see "Still open").

## Anti-goals

All anti-goals of the 2026-10-29 spec apply. In addition, the project fails in these cases:

- An interactive section looks right on desktop but breaks, overflows or loses its interaction on a phone or a tablet.
- A name or an avatar does not match the person in the footage or photo next to it.
- A section becomes busy. Each section has one interactive idea, not several.
- Hover is the only way to reach content. Every hover interaction also works with tap and with the keyboard.

## Decisions Parth made

- The main path needs no camera. Real footage that the visitor can scrub, turn and tap is the awe moment.
- The homepage hero uses the existing 3D phone, with the live readout next to it.
- Dragging on the phone scrubs the squat. It no longer turns the phone. The phone still turns with scroll and tilts toward the cursor.
- The For physios hero is the interactive dashboard from mockup 2, version 3.
- The For physios feature section uses large serif tabs, three feature cards per tab, and one visual panel that changes on hover. Parth said the hover effect "is cool" and the earlier table layout "looks boring".
- The For patients page gets the same treatment: a recovery slider hero, a body map, and live demos instead of text lists.
- The homepage steps (Prescribe, Practice, Review) become one visual that changes with each step.
- People must match. The squat patient is "Maya Thomas", with an avatar cropped from the squat clip. "Arjun Mehta" goes with the shoulder raises photo. "Rohan Kulkarni" goes with the straight leg raise photo.
- Responsiveness must be "on point" in the final product.

## Reference mockups

All mockups are in `.superpowers/brainstorm/90472-1793340934/content/`. They are throwaway HTML. Copy the behavior, not the code.

| File | What it shows |
|---|---|
| `hero-scrub.html` | Homepage hero: scrub the squat, tap a joint, big angle readout, target track, reps, deepest bend, form score |
| `physios-v3.html` | For physios: dashboard hero, and the tabbed feature section |
| `maya.jpg`, `maya-tile.jpg` | Avatar and video-call tile cropped from the squat clip poster |

## 1. Fix the scroll story pin

`useScrollStory.ts` pins the phone section with GSAP ScrollTrigger. GSAP turns off pin spacing when the parent of the pinned element is a flex container. The parent is `<main className="flex flex-1 flex-col">`. As a result, the pinned phone covers the Problem, How it works and Both sides sections for about 2,160 px of scroll.

- Set `pinSpacing: true` on the story trigger.
- Add an end-to-end test. The test scrolls to the end of the story and checks that the Problem section heading is visible in the viewport after the pin releases.
- Section 3 makes the hero part of the pinned stage. Apply the fix to that merged stage.

## 2. Homepage hero

### Layout

- Desktop (1024 px and wider): three columns. Left: headline, lead, buttons, the "apps coming soon" line. Center: the 3D phone. Right: the live readout. The phone and the readout are in the first viewport at 1280 x 720 and larger.
- Tablet (640 to 1023 px): headline and lead on top, full width. Below: the phone and the readout side by side.
- Phone (below 640 px): headline, lead and buttons. Then the phone. Then a compact readout under the phone: the angle number, the target track and one row with reps, deepest bend and form.
- The headline text stays "See every degree of your recovery."

### The live readout

- The joint name and a short sub line, for example "Knee" and "bend, measured live".
- The angle in Brygada 1918 at display size (about 110 to 190 px on desktop, about 72 px on phones). Tabular figures. The degree sign uses Instrument Sans at a smaller size, because the Brygada degree glyph looks wrong at display size.
- A target track: a line with a dot for the current angle and a mark for the physio's target. The label says "Your physio's target: 100°".
- The spoken cue as text, from the existing `RepCounter` cues.
- Three stats: reps, deepest (or "most lean" for the back), and form.
- Three buttons to pick the joint: Knee, Hip, Back.

### Joints and measures

| Joint | Measure | Landmarks | Target |
|---|---|---|---|
| Knee | angle at the knee | hip, knee, ankle | 100° |
| Hip | angle at the hip | shoulder, hip, knee | 90° |
| Back | lean of the trunk from vertical | shoulder, hip | under 45° |

Add these measures to `src/lib/pose/`. The existing `kneeAngle` stays. Reps always come from the knee angle, whatever joint is on show.

### Interaction

- Drag horizontally on the phone to scrub the clip. The video pauses during the drag. About 0.9 s after release, the video plays again.
- A tap on the phone (less than 6 px of movement) selects the nearest of the knee, hip and shoulder within 48 px. The phone screen draws an angle arc at the selected joint. The arc and the readout always show the same value.
- When the visitor scrubs backward, reset reps, deepest and form, because the count is no longer valid.
- Touch: the drag handle keeps `touch-action: pan-y`, so vertical swipes still scroll the page. Only horizontal drags scrub.
- Keyboard: the phone is focusable. Left and right arrow keys step the clip by 0.25 s. Enter cycles the joint.
- The hint under the phone says "Drag to move through the squat. Tap a joint to measure it." It fades after the visitor has dragged once and tapped once.

### The phone

- Dragging no longer turns the phone. Remove the drag-to-turn path from `useSpin`, or keep only the cursor lean (`leanToward`) and the scroll turn.
- The phone turns in as the page loads and tilts a little toward the cursor on desktop.
- The 2D fallback phone gets the same scrub, tap and readout behavior.
- The rep counter on the phone screen and the readout share one source of truth.

### Form score

The mockup uses a placeholder formula. Use this one (Claude's call): for each completed rep, score = 100 when the deepest knee angle reaches the target, minus 2.2 points per degree short of the target, clamped to 0 to 100. Show the mean of completed reps, or "-" before the first rep.

## 3. Homepage scroll story

The hero and the scroll story are one pinned stage (Claude's call, after Parth asked Claude to decide). There is one phone and one 3D scene. The phone never moves across the page.

- The live chapter is the hero. Scrub position, selected joint and rep count carry into the story without a reset.
- Desktop: as the visitor scrolls, the left column changes from the headline, lead and buttons to the chapter notes. The right column changes from the live readout to the summary details, then to the plan details. Each column change is a short crossfade.
- The notes "Counts every rep" and "Measures your joints" are removed. The live readout shows both facts. "Corrects you out loud" goes with the summary chapter. "Keeps your physio close" goes with the plan chapter.
- The chapter rail under the phone stays.
- Phone and tablet widths: the copy (headline, lead, buttons) scrolls normally above the stage. Then the phone and the compact readout pin together. The readout area changes per chapter, like the right column on desktop.
- Reduced motion: no pin. The hero shows the phone and the readout. The summary and plan screens follow below as still sections.
- `Hero.tsx` and `PhoneStage.tsx` merge into one component.
- The plan screen greeting changes from "Good morning, Riya" to "Good morning, Maya". The avatar is the crop from the squat clip. This fixes the current mismatch between the Riya photo and the woman in the clip.
- Make the summary screen move with scroll: the depth bars fill one by one, and the score counts up to its value.

## 4. Homepage sections after the story

### How it works

Replace the three numbered text columns with one changing visual.

- Left: three steps (Prescribe, Practice, Review), each with a title and one line. The active step is a lifted card, as in the For physios feature cards.
- Right: one panel. Prescribe shows the physio's plan editor with a target angle. Practice shows the patient phone with the live squat. Review shows the physio's rep bars for that session.
- The steps change on hover, focus and tap. When nobody interacts, the steps advance every 5 s. Auto advance stops after the first interaction.
- Phone width: the panel sits above the three steps, and the steps become a row of three tabs.

### Problem and Both sides

Apply the same principle: short lines next to one visual that reacts. The builder picks the visual for each item from the product: the plan, a session, a report, a chat. One interactive idea per section.

## 5. For physios

### Hero dashboard

Replaces `doctor-tablet.webp`. Follow `physios-v3.html`.

- Patient list: Maya Thomas (squats, with video), Arjun Mehta (shoulder raises), Rohan Kulkarni (straight leg raise). Each row shows a seven-day strip: done, missed, or today.
- Session replay: for Maya, the squat clip with skeleton, knee arc, live knee angle, and rep marks on the timeline. For Arjun and Rohan, their exercise photo.
- Detail: name, condition and week, then form score, sessions this week, and pain.
- Rep bars: deepest knee bend per rep, from the three real reps in the clip (about 95°, 102° and 100° after rounding). A dashed line marks the target. Bars that reach the target use the accent color. A click on a bar loops that rep in the replay.
- Target slider: 85° to 130°. Moving it moves the line, recolors the bars and updates "x of 3 reached your target".
- "Worth a look" flags. A flag that names a rep replays that rep.
- Compute the rep bar values from the pose clip at build time or on load. Do not hard-code them.

### Feature section

Follow `physios-v3.html`.

- Three tabs in Brygada 1918 at about 28 px: See every session, Prescribe and follow up, Run your practice. The active tab has a 2 px accent underline.
- A one-line intro per tab.
- Three cards per tab. Each card has a title in Instrument Sans semibold at 17 px and one line in muted text at 15 px. The line is always visible.
- One visual panel. Hover, focus or tap on a card changes the panel.
- The icons in rounded squares are optional. Parth has not decided (see "Still open").

### Built for every kind of practice

Apply the same principle as the feature section. The builder picks one interactive idea.

## 6. For patients

### Hero: recovery slider

Replaces `patient-home-mat.webp`.

- A slider from Week 1 to Week 6.
- A skeleton figure, drawn on the page background, without video. The figure's deepest squat pose moves from a shallow squat (about 140° at the knee) in week 1 to the full depth of the clip (about 95°) in week 6.
- Build each week's pose by interpolating between the standing pose and the deepest pose of the real clip. Compute the angle from the interpolated pose. Do not type the angle values.
- A ghost of the target pose (100°) stays on the figure.
- Next to the figure: the knee angle at display size, and a small chart of the deepest bend per week with the target line.
- A caption says the figure is an illustration built from real pose tracking.

### Steps

The same changing visual as the homepage How it works, with the patient's view: the plan arrives, then the phone set up with a framing guide, then the progress chart.

### In every session

Replace the text list with three live demos. Each demo has a title, one line, and a small skeleton that plays from the pose clip. Real-time form correction shows the cue. Automatic rep counting shows the counter. A score for every rep shows the bars.

"Coming with the iPhone and Android apps" stays as a short list, styled as cards, not rule rows.

### Built for rehab after surgery and injury

Replaces `physio-knee.webp` with a body map.

- A standing skeleton figure from the clip.
- Hotspots at the knee, shoulder and hip only (Claude's call). These match the three exercises the session page supports: knee extension, shoulder raises and straight leg raise. There is no ankle hotspot, because FiixBE does not measure the ankle today and the repo has no ankle photos.
- Hover, focus or tap on a hotspot highlights the joint. A panel shows the condition, the exercises for it with their existing photos, and the angle FiixBE measures.
- The body map panel is marketing copy, not sample data. Every claim in it must be true of the product today.
- Under the figure, a row of four buttons: Knee, Shoulder, Hip, Sports injuries. "Sports injuries" highlights the knee, hip and shoulder together and uses the current copy ("Sprains, strains and sports-related muscle injuries."), with no angle claim.
- The buttons are also the way in on phones, so small hotspots are not the only way in.

## 7. Responsiveness

Parth requires every page to be pixel perfect at every width. The builder checks every new section at these widths: 360, 390, 430, 768, 1024, 1280 and 1440 px. Check light mode and dark mode at each width.

| Section | Below 640 px | 640 to 1023 px | 1024 px and wider |
|---|---|---|---|
| Homepage hero | Stacked: copy, phone, compact readout | Copy on top, phone and readout side by side | Three columns |
| How it works | Panel above, steps as three tabs | Panel above, steps as cards in a row | Steps left, panel right |
| Physio dashboard | Patient list as a horizontal row of avatars and names. Replay full width. Detail below. | Patient list on top, replay and detail side by side | Three columns |
| Feature tabs | Tabs scroll horizontally with no visible scrollbar. Panel above the cards. | Same as phone | Cards left, panel right |
| Recovery slider | Figure, then number and chart | Figure and number side by side | Copy, figure and readout |
| Body map | Figure, then condition buttons, then panel | Figure and panel side by side | Figure and panel side by side |

General rules:

- No horizontal page scroll at any width.
- Touch targets are at least 44 x 44 px.
- Text never drops below 13 px.
- Hover effects use `@media (hover: hover)`. On touch screens, a tap gives the same result as a hover.

## 8. Motion and fallbacks

- Reduced motion: no auto advance, no scroll-driven animation, no count-up. Scrub, tap and sliders still work, because the visitor drives them.
- Devices that fail the 3D capability check get the 2D phone with the same scrub and readout.
- The pose clip and video load once and are shared between the hero, the dashboard and the demos on a page.

## 9. Content rules

- Sample data is allowed inside product views: the dashboard, the phone screens, the demos and the recovery slider. Examples: patient names, scores, clinic names.
- Sample data never appears in marketing copy as a fact about FiixBE.
- A person's name, avatar and footage must match.

## 10. Testing

- Unit tests for the new joint measures, the form score formula, the rep extraction for the rep bars, and the week interpolation of the recovery slider.
- End-to-end tests:
  - The pin fix from section 1.
  - Scrub on the hero changes the angle readout.
  - A tap near the hip switches the readout to Hip.
  - The physio target slider changes the "reached your target" count.
  - Each tab and each card in the feature section changes the panel, with mouse, keyboard and tap.
  - No horizontal scroll on each page at 360 px.
- Screenshot every page at the widths in section 7, in both themes, and review them before calling the work done.

## Left to the builder

- Component structure, naming and file layout.
- The visuals for Problem, Both sides and "Built for every kind of practice", within the rules above.
- Exact sizes, spacing, easing and timing.
- The exact content of the summary and plan details in the right column, within section 3.

## Still open

- The icons in the feature cards: keep them, or let the titles carry the cards. Default: keep them, because Parth did not object after seeing them.
- A squat clip of an Indian patient for a more local feel. Optional, not in this project.
