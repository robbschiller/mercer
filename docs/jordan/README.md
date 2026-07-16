# Jordan's artifacts

Everything Jordan (AQP / first customer) sends us, archived verbatim — build
lists, specs, feedback. iMessage attachments get pruned by macOS; anything he
sends should land here same-day. Distilled outcomes belong in the worklog and
build plans; this folder keeps the originals.

## Contents

In the order they arrived:

- **AQP-OS-Engineering-Notes.md** — Jordan's original data-model & build notes
  for the "AQP operating system": Account → Property → Lead/Opportunity → Job
  hierarchy, per-object fields, AI features, workflows. The
  Lead → Opportunity → Job naming that Build List 01 asked for was already
  spelled out here.
- **AQP-Software-Fix-List.pdf** — the follow-up fix list (2026-07-13, 8 items);
  outcomes shipped same-day in bfbd635.
- **Mercer_Build_List_01_July16_2026.pdf** — 17-item fix/feature list from his
  first working field pass (2026-07-16), tested against the real Nona Terrace
  lead. Sections: A bugs · B renames (Bids→Opportunities, deal→project) ·
  C lead record & UX · D AI intake · E backlog direction (retire by-hand
  pricing). All items shipped in commit `1e78a5f`.
- **Nona_Terrace_SW_Paint_Specification.pdf** — the Sherwin-Williams paint
  spec (prepared by Ruthie Dichamp) for Nona Terrace, 11095 Savannah Landing
  Cir, Orlando. The acceptance-test document for AI lead intake (D1/D2); also
  attached to the live lead in-app.
- **jordan-claude-project-prompt.png** + **Alhambra_Village_No_1_Exterior_Repaint_Proposal.pdf**
  — Jordan's own claude.ai "creating proposals" project in action (2026-07-13,
  a real proposal for Yvonne Kamara / Soaring Management): input is a notes
  screenshot with shorthand takeoff math ("Bldg type 1 (3) – 700*22"), aerials,
  ground photos, a prior proposal, plus one casual sentence — output is the
  7-page branded, board-forwardable sales document. His words: "That's exactly
  what we need for the 'Create Proposal' section of the opportunity… it just
  needs to be set up to CRM." This pair is the UX north star for the
  opportunity → proposal flow.

## Related material elsewhere

- `docs/interview001–003.md` — early discovery interviews.
- `docs/Laurel Hills Villas - Full Exterior Repaint.pdf` — sample proposal.
- The AQP blueprint's other companions (SCHEMA.md, aqp-alpha.html) from an
  earlier session are still unarchived — backfill if they resurface.
