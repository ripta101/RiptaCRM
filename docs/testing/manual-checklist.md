# Manual Test Checklist

This checklist covers what automated tests (Vitest unit tests, Playwright E2E specs under `e2e/tests/`) can't usefully verify: visual/UX judgment, responsive layout, drag-and-drop "feel", and cross-browser/touch behavior (the Playwright project here is Chromium-only).

If an item describes a *functional* flow rather than a visual/UX judgment call, it belongs in a Playwright spec instead — don't duplicate it here.

Re-run this checklist (or the relevant section) whenever you touch the module it covers. Update this file whenever you add/change a screen or feature.

## How to use

- [ ] boxes are for a specific pass, not permanent state — check off what you verified, then reset before the next full pass (or just re-read it as a prompt list; don't bother committing checked boxes).
- Test at three breakpoints per the project's responsiveness rule: **desktop** (~1440px), **laptop** (~1024px), **mobile** (~390px, e.g. browser dev tools device emulation or a real phone).

## Host shell (login, nav, dashboard)

- [ ] Login page renders correctly and is usable at all three breakpoints (no overlapping fields, buttons reachable)
- [ ] Side menu / nav collapses to a usable pattern (drawer, hamburger, etc.) on mobile
- [ ] Dashboard widgets (Open Cases, Recent Activity, Recent Config Changes) reflow sensibly on narrow screens — no horizontal scroll, no clipped text
- [ ] `RemoteLoadErrorBoundary` degrades gracefully: stop one remote's dev server (customer or case-management) and confirm the host shows a readable fallback instead of a blank panel or crash
- [ ] Theme (colors, spacing, typography) is visually consistent across the host and both loaded remotes — no jarring MUI theme mismatch at the seams

## Customer module

- [ ] Search form and results list are usable on mobile (tap targets big enough, no cramped columns)
- [ ] Master-detail view (customer list + detail panel) adapts on narrow screens — e.g. detail doesn't render squeezed next to a list that should stack instead
- [ ] Interaction workspace / Wrap Up screen readable and operable on mobile
- [ ] Loading, empty, and error states for customer search look intentional (not just a blank white screen)

## Case Management module

- [ ] Case type list and detail tabs are usable on mobile (tabs don't overflow illegibly)
- [ ] **Stage flow canvas (`StageFlowEditor`)**: dragging a node feels smooth and responsive, not janky or laggy
- [ ] Drawing a new transition edge — the connection handles are discoverable/visible enough that a new admin user would find them without being told
- [ ] Canvas is usable on a touch device (tablet) — pinch-zoom, single-finger pan, and node drag don't fight each other (Playwright's Chromium-only automation can't meaningfully test touch gesture conflicts)
- [ ] Stage/field/action table drag-to-reorder feels natural, with clear visual feedback (drop indicator, drag handle affordance) — not just "it technically works"
- [ ] Field/action config forms remain usable at mobile width
- [ ] Loading, empty, and error states (e.g. no case types yet, a fetch failure) look intentional

## WebChat module

- [ ] Admin config MFE (Sites / Queues / Capacity Overrides / Routing Rules) is usable at all three breakpoints
- [ ] Copy-embed-snippet and Regenerate Key controls on `SiteEditor` are usable on mobile (button reachable, snippet text doesn't overflow)
- [ ] Script-embed widget (bubble + iframe on `apps/webchat-sample-site`'s Home/Pricing/Support pages) renders and is usable at mobile width — bubble doesn't overlap page content awkwardly, iframe panel is readable
- [ ] Module Federation embed path (`react-embed-demo.html`) renders the same chat panel correctly, visually consistent with the iframe path
- [ ] Auto-popup: with a `webchat-agent` queue member logged in and the queue's `autoPopup` on, a new inbound chat screen-pops without manual navigation; with `autoPopup` off, it appears only in the Worklist, "Claim" button, not a screen-pop
- [ ] Worklist's generic table (cases + chats mixed, sorted by due date) is usable on mobile — kind indicator, title, and Claim/Open actions are all still legible and tappable
- [ ] Claim-race UX: trigger a 409 (two admin sessions racing the same unclaimed chat) and confirm the inline error + refetch reads clearly, not just a raw error string
- [ ] Spot-check the widget (bubble + iframe) in at least one non-Chromium browser — it runs on arbitrary third-party customer sites, so cross-browser rendering matters more here than for the rest of the app
- [ ] Agent's "Close conversation" button (in the chat panel) is usable on mobile; after closing, the input disables and the closed notice is readable at narrow widths
- [ ] Supervisor Dashboard (`/supervisor`) filter row (Queue / Profile / Agent search / date range) wraps sensibly on mobile instead of overflowing; results table is at least horizontally scrollable at mobile width
- [ ] Access Management → a Profile's new Supervised Queues / Supervised Profiles sections are usable on mobile — pickers and per-row delete buttons stay reachable
- [ ] Webchat interaction tab's combined layout (Search Customer + chat rail) stacks to a single column below the `md` breakpoint instead of squeezing side-by-side; the chat panel is still fully usable once stacked
- [ ] On desktop, scroll through a customer's profile/case list inside a webchat tab and confirm the chat rail stays pinned in view (sticky) rather than scrolling away, and that this never forces the whole page to scroll past the top bar (tab bar should always stay visible)
- [ ] Clicking a webchat tab's X shows the customer wrap-up screen (not an instant close); finishing wrap-up actually closes the tab
- [ ] Pre-chat Fields editor (`SiteEditor`, below Routing Rules) is usable on mobile — the Add Field row's inputs stay reachable and don't overflow
- [ ] With Pre-chat Fields configured on a site, the widget's pre-chat form (select/textarea/checkbox field types, not just text) is legible and usable at mobile width inside the iframe panel; the "Visitor details" section on the agent's chat panel wraps sensibly on mobile instead of overflowing

## Cross-browser

- [ ] Spot-check the above in at least one non-Chromium browser (Firefox or Safari) periodically — the Playwright E2E suite here only runs Chromium, so it cannot catch browser-specific rendering or drag/drop event differences

## Business Admin experience

- [ ] Business Admin's config-focused views are visually distinct enough from the frontline experience that an admin doesn't feel lost (per the separate-experience design)
- [ ] Config screens usable at all three breakpoints
