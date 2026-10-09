<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep mock generation and grouping in a browser-safe pure module so payload and note-size rules can be tested independently.
- Keep generated notes as page-local drafts and insert into existing reminders only on approval so unapproved content never reaches review.
- Store review schedules per user and reminder, separate from shared example content, so learners never overwrite each other's progress.
- Save completed review sessions through an authenticated server function and an atomic idempotent SQL operation so retries cannot advance repetitions twice.
- Keep fluency scoring and SM-2 calculations in a pure module; automatic scores are heuristic, not validated neuroscience or an AI model response.
- Keep the shared study-station shell, surface shadows and motion in semantic global tokens; presentation changes must not alter recall, approval or scheduling rules.
- Keep external error capture and mentor mock generation separate from review completion so review telemetry never writes notebook entries.
