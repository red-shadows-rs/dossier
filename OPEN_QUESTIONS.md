# Open questions

When something in `DOSSIER_PLAN.md` is unclear or conflicts, do NOT guess. Append here using the format of section 0.4, then stop and report.

## Q-1 — 2026-10-09 — T-040
- Question: Should Dossier automatically create the matching task-board project/task when a Dossier project is created (and on later changes), using `TASKBOARD_API_URL` + `TASKBOARD_API_TOKEN`? And what is the intended human link for `taskboardRef` (is it a task-board project id, a task id, or a full URL)?
- What the spec says: The T-040 card says "Implement ONLY: editable `taskboardRef` on projects and a link display (`TASKBOARD_API_URL` optional). Do NOT implement automatic task creation unless the owner answers a question you raised in `OPEN_QUESTIONS.md`." Section 3.1 lists `TASKBOARD_API_URL` / `TASKBOARD_API_TOKEN` as "Phase 4 optional integration" only.
- Options considered: (a) no automatic creation (a manual `taskboardRef` field + link display only); (b) create a task-board project automatically on project creation; (c) an on-demand "create task-board project" button. For the link: use `taskboardRef` as an absolute URL when it is one, otherwise join it onto `TASKBOARD_API_URL`.
- What I did meanwhile: safest default — stored/validated `taskboardRef` (≤200 chars) + a link display, **no network calls** and **no automatic task creation**. The link resolves from an absolute URL in the reference, else `${TASKBOARD_API_URL}/${ref}`; if neither applies the reference is shown as plain text.

