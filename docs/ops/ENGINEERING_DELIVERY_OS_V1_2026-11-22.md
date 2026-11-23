# FWA — DELIVERY ENGINEERING OS V1
**Owner directive 22/11/2026. Status: DRAFT on isolated ops branch. Not automatically enforced until review/merge and tests.**

## A. Mission and project boundaries
Một domain vieclamlivestream.online; PC là sàn nghề nghiệp, PWA/mobile UX mạng xã hội nghề; hạn nghiệm thu đồng bộ 18:00 26/11/2026.
P0 Privacy: lịch sử report 78 Zalo public / JS data (#3) cần retest, không suy đoán đã sửa. Không tự sở hữu profile dựa trên họ tên/OTP/trùng thông tin; không chia quyền Admin người thật và Admin AI. Không scrape Facebook/auto spam/nhập data person không quyền; user job data chỉ theo căn cứ pháp lý.
Operations principles align with Game's [Engineering Delivery OS V1](https://github.com/thondads-web/chuyen-sinh-the-gioi-moi/pull/184) but this is a **self-contained, project-specific runbook**; no shared game release SHA, database, auth, wallet, secret or deployed code.

## B. Accountable ownership & work-limit
Each production change: 1 `DRI` (directly responsible individual), one owned file set, one base commit, one acceptance test, one receiver, one eligible backup. Assign tasks in the existing FWA #25 (War Room), #3/#14 (Contact Gate), #8 (đăng ký/analytics), #34 (Profile Claim), #26 (mobile PWA), #13 (Human Admin vs AI Admin).
No more than one coding PR per AI at a time; up to three critical workstreams; reviewers independent; do not deploy `main`/production merely because Owner delegated routine engineering. User/Owner release and restricted operational actions retain respective approval gates. An Issue comment is a work assignment, not proof Muse/Codex has read/started it. Agent online/ACK must be verified in its own workspace/log.

Required issue fields:
```
PROJECT | ISSUE | P0/P1/P2 | DRI | RECEIVING_DRI | BACKUP
BASE_SHA | CHANGED_FILE_SET | DEPENDENCY | ACCEPTANCE_TEST
ARTIFACT_URL/SHA | TEST_URL | DEPLOYED_SHA | DEADLINE | STATUS
BLOCKER_REASON | FIRST_DETECTED_AT | NEXT_ACTION | ROLLBACK
```

## C. State machine — every state needs a verifiable receipt
`BACKLOG → READY → IN_PROGRESS → HANDOFF_READY → INTEGRATED → CI_PASS → TEST_DEPLOYED → QA_PASS → RELEASE_APPROVED`.
Side states: `BLOCKED, REJECTED, NO_GO, SUPERSEDED, ROLLED_BACK`.
- READY: scope, acceptance, DRI, owned paths, source SHA, dependencies.
- IN_PROGRESS: correct feature branch, commit/test/asset preview with accessible URL.
- HANDOFF_READY: all files pushed to permitted repo or artifact store, receipt contains full commit SHA, manifest/schema, test command, source/license, no uncommitted local dependencies. Receiving DRI **ACKs usable artifact**, lists rejected inputs. Files on local Muse computer are NOT handoff.
- INTEGRATED: consumer references actual new code/content, E2E path demonstrable. A mockup, isolated HTML and source import do not count.
- CI_PASS: build/lint/unit/integration/security checks at **same exact source SHA**, logs attached; failures marked.
- TEST_DEPLOYED: browser actually loads version under approved TEST/staging domain, exact source `gitSha`, `contentSha256` for actual bundle/HTML, release channel, immutable preview or equivalent, cache validated. Test repo Actions success is not a deployment.
- QA_PASS: independent smoke desktop 1280px and mobile 390px/360px where relevant; app journey, visible UI, console/network, auth, RLS, failure/retry and rollback verified. No browser QA on prior SHA as approval of new SHA.
- RELEASE_APPROVED: only after 0 known severe P0, owner/security/data gate, verified backups, change-risk and rollback. Production changes must use project-specific authorization.

## D. Priority and testing
**Critical paths now:** auth/session, Contact Gate thực sự tại server/RLS, signup/login/claim verified, public listing → moderate → discover → apply/contact, mobile/PC responsive, SEO/conversion, idempotent events, no contact fields exposed to guest.
**P0:** leak/unauthorized personal data, wrong identity ownership, billing/money/ledger, data loss, compromised auth, site outage; incident immediately stops affected deploy and triggers allowed containment/rollback. **P1:** broken primary sign-up/apply/site contact/mobile button, preview deploy mismatch, broken important CMS. **P2:** cosmetics/recoverable UX issues.
No P0 may be 'resolved' on unit test alone. Track regression test at bug ticket and run appropriate browser E2E. Separate TEST from LIVE and TEST data from real users.

## E. Blocker SLA, handoff and fallback
- P0 detected → prompt ACK from responsible active operator, target under 30 min; preserve factual evidence with no credentials/PII.
- If active operator cannot proceed >15 min: `BLOCKED | command or API step | exact error and link | DRI | authorized receiver | next safe action` in existing Issue.
- Active operator delivers visible changed file/PR/test evidence every 60 min for critical path (schedule/check-ins do **not** auto-wake disconnected agents).
- T+2h without artifact after verified ACK → Producer investigates/asks eligible backup to prepare. T+4h or two consecutive evidence failures → reassign *only* if backup has actual permissions, is available and file scope is unowned. Otherwise mark `CANNOT_EXECUTE_BACKUP` with reason; don't falsely claim another AI has worked.
- Require receipt `SENDER | RECEIVER | issue | source_SHA | consumed_SHA | file paths | test | status`. New handoff must close previous owner's editing scope to prevent PR collisions.
- A reviewer must not approve own PR. No duplicated browser QA between Ryan and independent security auditor.

## F. Changes, CI and deployment
1. Branch from correct current base. One small issue-focused PR; never code from stale SHA.
2. QA contract attached to PR. Run lint/type/build, unit/integration, permission/security checks, secret scan, supply-chain/license audit, browser E2E for impacted user journey.
3. Deploy to isolated preview or staging **only when protected**; no secret/service key in browser or repo; no unapproved DB migration/destructive changes. If cannot deploy due permissions, record `DEPLOY_BLOCKED`, do not reinterpret CI PASS as LIVE.
4. Validate deployed HTML/asset hash, version, domain, service workers and caches; especially if domain/prod and repo differ.
5. Independent QA checks exact deployment and real user journey. If new commit arrives, previous QA is SUPERSEDED.
6. Owner & security gate for Production; backup+restore rehearsal on relevant data path; safe rollback and post-release smoke.

## G. What to bring to 15:00 triage (and every future blocker review)
Each AI submits only **new, verifiable** issues, one row per bug:
```
PROJECT | ISSUE_ID | DISCOVERED_TIME | SEVERITY | DRI
EXPECTED | ACTUAL | REPRO_STEPS | SOURCE_SHA | DEPLOYED_SHA
TEST_URL | SCREENSHOT/LOG | LAST_SUCCESS | ROOT_CAUSE_HYPOTHESIS
STAGE_STUCK | RECEIVING_DRI | FIX_OWNER | ACTION_BEFORE_NEXT_CHECKPOINT
```
If cannot verify state, `UNKNOWN / NO EVIDENCE` and exact missing proof. Do not aggregate recurring old bugs as if new. If multiple reviewers found same defect, keep a single defect ID. Triage by **where pipeline first failed** and assign that stage owner. Fix critical path in safe feature PR and retest; no smoke performed = no GO.

## H. KPIs (targets, not claims about current performance)
- 100% item with DRI, acceptance and file owner; 100% usable handoffs have SHA + receiving ACK.
- 0 duplicate QA by same SHA/test, 0 approvals of stale SHA, 0 unauthorized claims/contacts/production releases.
- At every project review: `issue | stage | owner | source SHA | artifact SHA | live SHA | P0/P1 | blocker age | reproducible proof | next action`.
- Measure actual: lead time READY→TEST QA, first-pass QA rate, change failure, MTTR, escaped severe bugs, true signup/return/engagement if accessible. Unknown metric must read `NO DATA`.
- No new cron, owner control plane or overlapping War Room; use current schedules and Project Issues to avoid overhead.

## I. Implementation status and acceptance
This document and `AGENTS.md` on the process-only branch define **proposed operational rules**. They do not prove actual CI enforcement, any AI wake/ACK, completed fix, synchronized live deployments, or changed existing jobs. After independent review of PR, merge through existing release policy; update each agent's owned work instructions and applicable checks incrementally, without shifting current work's deadlines.
