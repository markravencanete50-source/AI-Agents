# Office controls and creative team

The office has 18 AI roles and a separate human CEO workstation. The CEO avatar's live status requires an authenticated CEO session; the anonymous sample labels it as a preview.

Click **Office** in the navigation to enter a room-only view. Escape returns to the overview. Browser Back also exits when entered through the navigation. Compact, single-line role badges stay visible above every robot in this view, including the CEO, while zooming and on narrow screens. Hover a badge for the full role title. Click a robot or its role label for its current task, status, deliverable and explicit limitations. The CEO work card opens the approval queue.

Drag to orbit. Scroll or pinch to zoom, and right-drag/two-finger drag to pan. The overview also has zoom buttons, with a range from roughly 55% to 500%. In immersive mode, `+`/`=` and `-` change zoom; `0` resets it. A maximum zoom crops the room intentionally so individual keyboards and robots can be inspected. Dark mode is available in the header and Settings, and is remembered on that browser. Reduced motion disables walking, typing, blinking and breathing movements.

Robot, role badge, sidebar teammate, team-list tile and workflow buttons all open the same work card. While the card is open, the authenticated snapshot refreshes every three seconds. The card shows the assigned objective, task stage, elapsed time, waiting dependency, latest synchronization time, recent task events and saved handoffs with evidence links. Worker reports arrive every eight seconds and are marked delayed when no current task report is available. Local-model tasks stream a bounded, unfinished deliverable preview; only the validated final handoff is saved as completed. Codex tasks show execution stages and a final review, without a live desktop or editor screen. No private model thinking is displayed.

Agents breathe and look around while idle. Working agents turn toward their keyboards and type with alternating hands. Their occasional bounded aisle walk uses measured displacement for limb timing and smooth heading changes. Motion depicts task state, not the precise physical activity of an AI process. No simulated completion is substituted for worker results.

## Creative roles

**Frame — Video Editor & Motion Designer:** narrative, pacing, edit decision lists, storyboards, J/L and action cuts, speed ramps, stabilization, masking, tracking, compositing, color management, motion principles, kinetic type, captions, sound, and export QA. Its fixed playbook is informed by the installed `video-editing` skill. The worker requires supplied evidence and lists missing footage, transcripts, brand assets and rights. It does not invent timecodes or claim a render.

**Hue — Graphic Designer:** audience and brand direction, hierarchy, grids, type, color, layouts, thumbnails, carousels, vector/raster specifications, accessibility, safe areas, licensing and export QA.

**Pulse — Social Media Manager:** content pillars, platform-specific briefs, calendars, captions, CTA variations, campaign measurement plans and community reply drafts. It coordinates Frame and Hue and distinguishes supplied analytics from missing data. Publishing, scheduling and replies are disabled.

Video workflow: COO → Frame → Hue → Frame → COO. Design: COO → Hue → COO. Social campaign: COO → Pulse → Hue → Frame → Pulse → COO.

These profiles guide an existing local LLM; they are not new model training or proof of unlimited expertise. The current adapters produce text handoffs and source proposals. Footage decoding/transcription, actual FFmpeg/Remotion renders, graphic exports and social account execution need separate scoped adapters and verification before they can be enabled. No paid generation API was added.
