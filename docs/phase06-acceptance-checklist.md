# Phase 06 Acceptance Checklist

Status snapshot (2026-03-12):
- Local smoke scripts exist and pass.
- Production acceptance is not signed off.
- Live verification at `https://chsbook.netlify.app` showed `/admin` and `/login` returning HTTP 404.
- Keep checklist items unchecked until human end-to-end verification is completed.

## Admin + Editorial
- [ ] Admin login protects `/admin` route.
- [ ] DOCX import creates staged draft.
- [ ] Staging metadata edits persist.
- [ ] Chapter order, type, and visibility update from admin tools.
- [ ] Publish and rollback both succeed.

## Audio Studio
- [ ] Music and ambient assets can be uploaded and listed.
- [ ] Multiple cues can be assigned to the same chapter.
- [ ] Broken cues are detected after anchor changes.
- [ ] Publish is blocked until broken cues are repaired.

## Reader Sync
- [ ] Logged-in reader highlights sync across sessions.
- [ ] Notes are linked to highlights and restored on load.
- [ ] Progress sync restores resume state.
- [ ] Anonymous reading remains functional.

## Runtime Reliability
- [ ] Chapter transitions avoid stale/racing state application.
- [ ] Cue scheduling handles chapter changes and pause/resume.
- [ ] Metrics are emitted for author, audio, publish, and reader outcomes.
