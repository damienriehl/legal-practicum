---
title: "Turnstile's interactive challenge stranded students on the client-interview page"
date: 2026-09-30
category: chat
module: app/chat/chat.js
problem_type: integration_issue
component: frontend
symptoms:
  - "An 8-second fail-open timer settled an empty token while the interactive Verify-you-are-human checkbox was still showing, so /v1/session answered turnstile_failed and the page said reload"
  - "The Turnstile container was aria-hidden, hiding an interactive control from assistive technology"
  - "After the student passed the check, the late token never minted a session, so SEND dead-ended"
  - "The browser mock fired error-callback synchronously inside render(), so the regression exercised the wrong ordering"
root_cause: async_timing
resolution_type: code_fix
severity: high
tags: [turnstile, cloudflare, bot-gate, fail-open, interactive-challenge, accessibility, session-mint, test-mock-ordering]
---

# Turnstile's interactive challenge stranded students on the client-interview page

## Problem

The consultation room (`app/chat/chat.js`) mints a free session from `/v1/session`, and that request is gated by a managed Cloudflare Turnstile widget. Usually the widget stays invisible and hands back a token on its own. On PROD, Cloudflare sometimes escalates to an interactive "Verify you are human" checkbox. The client was never built for that case:

- An unconditional 8 s fail-open timer settled the token as `''` while the checkbox was still on screen. The mint went out with no token, and the worker answered `403 turnstile_failed` (`app/worker/src/turnstile.js:88-90`).
- The page showed the server's message, "Verification could not be completed. Please reload the page and try again." Pressing SEND then added a second line, "The line isn't connected yet — one moment."
- The widget container had `aria-hidden="true"`, so screen readers could not reach the checkbox.
- If the person ticked the checkbox after the failure, the token went into the widget state and nothing used it. No mint was triggered, SEND could not mint, and the only way out was a page reload.

## Symptoms

- Stacked stage directions: a reload instruction followed by "The line isn't connected yet — one moment." on every SEND.
- A visible Turnstile checkbox at the bottom right that did nothing when solved.
- `/v1/session` called once with no `cf_ts=` parameter and never called again.
- None of the automated gates caught it. The persona harness (44/44) and the bot-gate verifier both passed, because automation either skips the gate (`?bypass`, `?sample=1`) or never gets an escalated challenge. A judged human-style walk in Chrome found it.

## What Didn't Work

**The first browser regression tested nothing.** In the branch's pre-merge state (observed in this session; the mock never reached `main` in that form), the `F8 late token auto-mint` scenario in `tools/verify_chat_critique.js` was the one failure in a 28/29 run. The `turnstile_late` mock in `app/chat/test.html` called `options['error-callback']()` synchronously inside `render()`. Boot calls `turnstile.init()` (which renders) before `mintSession()` (`app/chat/chat.js:1369-1375`), so the error settled the widget before any waiter existed. The next `get()` then hit the "settled with no token" branch (`app/chat/chat.js:1157-1163`), reset the widget, and waited again. The scenario never produced the tokenless failure it was written to test. The Node unit tests passed only because they call `mintSession()` and register a waiter before driving the callbacks (`tools/tests/chat_connection.test.js:54-55`, `69-70`). The browser boot order and the unit-test order were different.

The fix was in the mock, not the product. The simulated error is now deferred one macrotask so boot can register its waiter first (`app/chat/test.html:84-85`):

```js
// Let boot register its token waiter before simulating a widget error.
if (SCEN === 'turnstile_late') setTimeout(function () { options['error-callback'](); }, 0);
```

## Solution

### Before (`git show af745f5:app/chat/chat.js`, the tree before PR #87)

The timer was set once and ignored widget state. The container was hidden from assistive tech. `get()` returned whatever was settled, including `''`. Nothing reacted to a later token, and `submit()` stopped when there was no session:

```js
// container(): hidden from assistive tech
c.setAttribute('aria-hidden', 'true');

// render(): no interactive hooks, no recovery on late token
callback: function (t) { settle(t); },
'error-callback': function () { settle(''); return true; },

// init(): unconditional fail-open
setTimeout(function () { if (!settled) settle(''); }, 8000);

// get(): a settled '' is returned forever
if (settled) return resolve(token);

// mintSession(): not single-flight; server message rendered verbatim
stageDirection(e.message || 'Couldn’t open a session ... reload to retry the connection.');

// submit(): dead end
if (!session) { stageDirection('The line isn’t connected yet — one moment.'); return; }
```

### After (current tree, merged in PR #87)

1. **Interactive challenges suspend the timer.** `armTimer()` arms only when nothing has settled and no challenge is showing (`app/chat/chat.js:1083-1086`). `before-interactive-callback` sets `interactive = true`, clears the timer, and shows a single instruction. `after-interactive-callback` re-arms it (`app/chat/chat.js:1130-1134`):

   ```js
   function armTimer() {
     clearTimeout(timer);
     if (!settled && !interactive) timer = setTimeout(function () { settle(''); }, 8000);
   }
   ...
   'before-interactive-callback': function () {
     interactive = true; settled = false; token = ''; clearTimeout(timer);
     connectionNotice('Complete the verification check (bottom right) to connect.');
   },
   'after-interactive-callback': function () { interactive = false; armTimer(); },
   ```

2. **A late token mints automatically.** The success callback waits for any in-flight mint to finish. If there is still no session, it mints with the new token (`app/chat/chat.js:1122-1129`):

   ```js
   callback: function (t) {
     interactive = false;
     settle(t);
     if (!session) {
       // A token can arrive while an earlier tokenless mint is in flight.
       Promise.resolve(minting).then(function () { if (!session && token) mintSession(); });
     }
   },
   ```

3. **Tokens are single-use.** `settle()` clears the stored token when it hands it to a waiter (`app/chat/chat.js:1088-1094`). `get()` consumes a cached token. A settled empty result with a live widget triggers `reset()` and a fresh wait, so an empty token is never reused (`app/chat/chat.js:1154-1166`).

4. **Minting is single-flight.** `mintSession()` returns the in-flight `minting` promise instead of starting a second request, and clears it on completion (`app/chat/chat.js:1171-1200`).

5. **One connection notice, replaced in place.** `connectionNotice()` keeps a single `role="status"` stage direction and replaces its text (`app/chat/chat.js:498-504`). A successful mint removes it (`app/chat/chat.js:1185`). The client now writes its own retry wording instead of the server's "reload the page" text (`app/chat/chat.js:1191-1193`).

6. **SEND retries instead of stopping.** With no session, `submit()` mints and sends the draft only if the room is still IDLE and the draft is unchanged (`app/chat/chat.js:604-616`):

   ```js
   if (!session) {
     mintSession().then(function () {
       if (session && state === S.IDLE && refs.input.value.trim() === text) send(text);
     });
     return;
   }
   ```

7. **The checkbox is accessible.** The container dropped `aria-hidden` and now has `role="region"` and `aria-label="Connection verification"` (`app/chat/chat.js:1100-1101`).

**Still open:** if a SEND is queued while a tokenless mint is in flight, and a late token then rescues the session through the callback path, the queued SEND is dropped. `submit()`'s `.then` runs after the failed tokenless mint, while the session is still missing, and nothing sends the draft after the callback's recovery mint succeeds. A validator confirmed this as a P2. The fix is pending in `docs/plans/2026-09-30-2000-fix-review-p2-followups-plan.md` (R1), which requires the queued submission to be sent exactly once after recovery.

## Why This Works

The old code treated "no token yet" as "the widget is broken," but "a person is solving a challenge" looks the same from the outside. The fail-open timer exists to keep a blocked or slow widget from hanging the room. Turnstile announces an interactive challenge through `before-interactive-callback`, so suspending the timer during the challenge separates the two cases. Fail-open still covers a missing script or sitekey.

The other half is that a failed mint is no longer final. A late token now starts the next mint itself, so the user does not have to reload or press SEND to trigger it. Single-flight minting plus waiting on `minting` before the follow-up keeps those two paths from racing. Consume-on-read tokens and `reset()` on an empty settle keep a stale or empty token from being reused. The worker's `turnstile_failed` stays retryable by design, and the client now behaves that way.

## Prevention

- **Match the real boot order in test fixtures.** A mock callback that fires synchronously inside `render()` runs before anything in the app has registered. Defer simulated widget events (`setTimeout(…, 0)`) so production code gets to the same point it would with the real script. If a browser scenario reports the wrong *before* state, as here (`mintCount`/`notices` in the F8 error message, `tools/verify_chat_critique.js:229`), check the fixture first.
- **Unit tests must cover both orderings.** `tools/tests/chat_connection.test.js` registers a waiter before driving callbacks. It also runs the browser mock from `test.html` inside a VM (`room({browserMock: true})`, `tools/tests/chat_connection.test.js:28`, `38-43`, `77-95`), so the fixture's timing is checked in Node too:

  ```js
  test('browser late-token fixture fails tokenless first, then mints once and enables SEND', async () => {
    const r = room({browserMock: true});
    r.context.mintSession();
    r.tick(); await flush();
    r.tick(); await flush();
    assert.equal(r.requests.length, 1, 'expected one tokenless mint before verification');
    assert.equal(r.requests[0], '/v1/session');
    assert.match(r.notices[0], /^Verification could not be completed\./);
    r.callbacks()['after-interactive-callback']();
    r.callbacks().callback('mock-verification-token'); await flush();
    r.tick(); await flush();
    assert.equal(r.requests.length, 2);
    assert.match(r.requests[1], /cf_ts=mock-verification-token/);
    r.context.submit(); await flush();
    assert.equal(r.sends(), 1);
    assert.equal(r.requests.length, 2, 'SEND must reuse the successful session');
  });
  ```

- **Treat the interactive path as its own scenario.** The tests assert the timer stays suspended, there is one notice, the container is accessible, and a double SEND mints once and sends once (`tools/tests/chat_connection.test.js:52-66`). The browser gate checks the same things with a real 8.5 s wait (`tools/verify_chat_critique.js:199-206`):

  ```js
  assert(await page.$eval('#cf-turnstile', el => !el.hasAttribute('aria-hidden') && !!el.getAttribute('aria-label')), 'F8 accessible check');
  await new Promise(resolve => setTimeout(resolve, 8500));
  assert(await page.evaluate(() => window.__MINT_COUNT__() === 0), 'F8 interactive timer suspended');
  ```

- **Cover a token that arrives during an in-flight request.** `late token arriving during tokenless request is used after failure` (`tools/tests/chat_connection.test.js:97-106`) holds the first `/v1/session` response open, delivers the token, then fails the request, and asserts the second request carries `cf_ts=`. The pending R1 fix should add the same setup with a `submit()` queued before the token, and assert `sends() === 1`.
- **Carve-outs stay widget-free.** `?sample=1` and `?bypass` must never render the widget and must keep their mint contract (`tools/tests/chat_connection.test.js:117-125`; `tools/verify_chat_critique.js:233-239`).
- **Bot gates need a human-style walk.** Automation that bypasses the gate cannot find bugs that appear only when the gate escalates. Release UAT for a gated surface should include a judged walk in a real browser that solves an interactive challenge, or a fixture that forces `before-interactive-callback`, before calling the gate verified.

## Related Issues

- PR #87 (fix), follow-up plan `docs/plans/2026-09-30-2000-fix-review-p2-followups-plan.md` (queued SEND in one late-token ordering).
- `docs/solutions/editor/2026-07-28-checks-that-cannot-fail.md`: the first F8 regression was a check that could not fail on the real defect.
- `docs/solutions/uat/2026-09-02-browser-journeys-measure-the-wrong-thing.md`: harness ordering differing from the real page ordering.
- `docs/solutions/editor/2026-09-27-css-tokens-defined-only-in-test-stubs.md`: a test double that diverged from production behaviour.
- UAT record: `docs/uat/2026-09-30-user-story-run.md` (finding F8).
