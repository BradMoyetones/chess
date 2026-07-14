npx react-doctor@latest --verbose

React Doctor v0.7.8



✔ Choose what to scan › Full codebase

  

✔ Scanned 90 files in 5.4s [~4 workers]



  ✖ Bugs: Effect subscription or timer never cleaned up ×6

    Learn more: https://react.doctor/docs/rules/react-doctor/effect-needs-cleanup

    `on` creates a subscription in useEffect without guaranteed

    cleanup. Return a cleanup function that owns every

    allocation so it does not leak after unmount.

    → Return a cleanup function that stops the subscription or

    timer: `return () => target.removeEventListener(name,

    handler)` for listeners, `return () => clearInterval(id)`

    or `clearTimeout(id)` for timers, `return () =>

    observer.disconnect()` for observers, `return () =>

    socket.close()` for connections, or `return unsubscribe` if

    the subscribe call already gave you one.



    src/components/ui/carousel.tsx:96

    ┌──────────────────────────────────────────────────────────────┐

    │   95 |                                                       │

    │ > 96 |   React.useEffect(() => {                             │

    │      |   ^                                                   │

    │   97 |     if (!api) return                                  │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-bot-match.ts:107

    ┌──────────────────────────────────────────────────────────────┐

    │   106 |                                                      │

    │ > 107 |     useEffect(() => {                                │

    │       |     ^                                                │

    │   108 |         if (status !== 'playing' || !botConfig || !… │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-core-game.ts:8

    ┌──────────────────────────────────────────────────────────────┐

    │   7 |                                                        │

    │ > 8 |     useEffect(() => {                                  │

    │     |     ^                                                  │

    │   9 |         setBoardSnapshot(app.getSnapshot());           │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-online-match.ts:70

    ┌──────────────────────────────────────────────────────────────┐

    │   69 |                                                       │

    │ > 70 |     useEffect(() => {                                 │

    │      |     ^                                                 │

    │   71 |         const handleUpdate = () => {                  │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-online-match.ts:100

    ┌──────────────────────────────────────────────────────────────┐

    │    99 |                                                      │

    │ > 100 |     useEffect(() => {                                │

    │       |     ^                                                │

    │   101 |         const newSocket = io(import.meta.env.VITE_W… │

    └──────────────────────────────────────────────────────────────┘



    src/pages/play/online/[id]/components/game-history-panel.tsx:29

    ┌──────────────────────────────────────────────────────────────┐

    │   28 |                                                       │

    │ > 29 |     useEffect(() => {                                 │

    │      |     ^                                                 │

    │   30 |         const activeBtn = document.getElementById(`m… │

    └──────────────────────────────────────────────────────────────┘



  ⚠ Bugs: Array index used as a key ×4

    Learn more: https://react.doctor/docs/rules/react-doctor/no-array-index-as-key

    Your users can see & submit the wrong data when this list

    reorders or filters, so use a stable id like

    `key={item.id}`, not the array index "i".

    → Use a stable id from the item, like `key={item.id}` or

    `key={item.slug}`. Index keys break when the list reorders

    or filters.



    src/components/board/board-highlights.tsx:100



    src/components/ui/chart.tsx:209



    src/components/ui/chart.tsx:307



    src/components/ui/field.tsx:205



  ⚠ Bugs: Missing effect dependencies ×3

    Learn more: https://react.doctor/docs/rules/react-doctor/exhaustive-deps

    `useEffect` can run with a stale `setBoardSnapshot` & show

    your users old data.

    → Don't blindly add missing dependencies. Read the hook

    callback first.

    

    Bad:

    useEffect(() => {

      setCount(count + 1);

    }, [count]);

    

    Better:

    useEffect(() => {

      setCount((currentCount) => currentCount + 1);

    }, []);

    

    If the missing value is recreated every render, move it

    inside the hook or stabilize it before adding it to deps.



    src/hooks/use-bot-match.ts:186



    src/pages/play/online/[id]/components/game-history-panel.tsx:52



    src/pages/play/online/[id]/components/pgn-buttons-navigate.tsx:38



  ⚠ Performance: Unstable context provider value ×3

    Learn more: https://react.doctor/docs/rules/react-doctor/jsx-no-constructed-context-values

    Every reader of this context redraws on each render because

    you build its `value` inline.

    → Wrap the context value in `useMemo` or move it outside

    the component so consumers do not redraw every render.



    src/components/ui/carousel.tsx:109



    src/components/ui/chart.tsx:63



    src/components/ui/toggle-group.tsx:51



  ⚠ Performance: Heavy library loaded eagerly

    Learn more: https://react.doctor/docs/rules/react-doctor/prefer-dynamic-import

    "recharts" ships extra code to your users up front & slows

    page load. Load it on demand with React.lazy() or

    next/dynamic.

    → Load it only when needed: `const Component = dynamic(()

    => import('library'), { ssr: false })` from next/dynamic,

    or React.lazy().



    src/components/ui/chart.tsx:4



  ⚠ Bugs: Parent kept in sync with a callback effect ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/no-prop-callback-in-effect

    Your parent re-renders on every local state change because

    this useEffect calls the prop "setBoardSnapshot" just to

    stay in sync.

    → Move the shared state into a Provider so both sides read

    the same value. Then you don't need a useEffect to keep

    them in sync.



    src/pages/play/online/[id]/components/game-history-panel.tsx:42



    src/pages/play/online/[id]/components/pgn-buttons-navigate.tsx:28



  ⚠ Maintainability: deslop/unused-file ×50

    Unused file is not reachable from any entry point, so it

    adds maintenance surface without shipping any code.

    → Delete the file if it is truly unreachable, or import it

    from an entry point.



    src/components/ui/accordion.tsx



    src/components/ui/alert-dialog.tsx



    src/components/ui/alert.tsx



    src/components/ui/aspect-ratio.tsx



    src/components/ui/attachment.tsx



    src/components/ui/avatar.tsx



    src/components/ui/breadcrumb.tsx



    src/components/ui/bubble.tsx



    src/components/ui/button-group.tsx



    src/components/ui/calendar.tsx



    src/components/ui/carousel.tsx



    src/components/ui/chart.tsx



    src/components/ui/checkbox.tsx



    src/components/ui/collapsible.tsx



    src/components/ui/combobox.tsx



    src/components/ui/command.tsx



    src/components/ui/context-menu.tsx



    src/components/ui/dialog.tsx



    src/components/ui/direction.tsx



    src/components/ui/drawer.tsx



    src/components/ui/dropdown-menu.tsx



    src/components/ui/empty.tsx



    src/components/ui/field.tsx



    src/components/ui/hover-card.tsx



    src/components/ui/input-group.tsx



    src/components/ui/input-otp.tsx



    src/components/ui/item.tsx



    src/components/ui/kbd.tsx



    src/components/ui/marker.tsx



    src/components/ui/menubar.tsx



    src/components/ui/message-scroller.tsx



    src/components/ui/message.tsx



    src/components/ui/native-select.tsx



    src/components/ui/navigation-menu.tsx



    src/components/ui/pagination.tsx



    src/components/ui/popover.tsx



    src/components/ui/progress.tsx



    src/components/ui/radio-group.tsx



    src/components/ui/resizable.tsx



    src/components/ui/scroll-area.tsx



    src/components/ui/select.tsx



    src/components/ui/sheet.tsx



    src/components/ui/sidebar.tsx



    src/components/ui/skeleton.tsx



    src/components/ui/slider.tsx



    src/components/ui/table.tsx



    src/components/ui/textarea.tsx



    src/components/ui/toggle-group.tsx



    src/components/ui/toggle.tsx



    src/hooks/use-mobile.ts



  ⚠ Accessibility: Role used instead of HTML tag ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/prefer-tag-over-role

    Screen reader users get more reliable semantics from `<a>`

    than `role="link"`, so use `<a>` instead.

    → Use the matching HTML element when one exists so browsers

    and assistive tech get native semantics.



    src/components/ui/breadcrumb.tsx:66



    src/components/ui/item.tsx:12



  ⚠ Accessibility: Interaction on static element ×5

    Learn more: https://react.doctor/docs/rules/react-doctor/no-static-element-interactions

    Screen reader users can't tell this click handler is

    interactive because it has no `role`, so add a `role` or

    use a button or link.

    → Give clickable static elements a `role`, or use a button

    or link.



    src/pages/play/online/[id]/components/game-board.tsx:528



    src/pages/play/online/[id]/components/game-board.tsx:571



    src/pages/play/online/[id]/components/game-board.tsx:586



    src/pages/play/online/[id]/components/game-board.tsx:613



    src/pages/play/online/[id]/components/game-board.tsx:639



  ⚠ Performance: Full Framer Motion import ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/use-lazy-motion

    Importing "motion" ships about 30 kb of extra code and

    slows page load. Use "m" with LazyMotion instead.

    → Use `import { LazyMotion, m } from "framer-motion"` with

    `domAnimation` features. Saves about 30kb.



    src/pages/play/online/components/lobby-board.tsx:2



    src/pages/play/online/components/lobby-panel.tsx:2



  ⚠ Accessibility: Text is too small

    Learn more: https://react.doctor/docs/rules/react-doctor/no-tiny-text

    Your users strain to read 10px text, so use at least 12px

    for body text, & 16px is best.

    → Use at least 12px for body text, and 16px is best. Small

    text is hard to read, especially on phones.



    src/pages/play/online/[id]/components/captured-material.tsx:87



  ⚠ Accessibility: Click handler missing keyboard handler ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/click-events-have-key-events

    Keyboard users can't trigger this click handler because

    there's no keyboard one, so add `onKeyUp`, `onKeyDown`, or

    `onKeyPress`.

    → Pair `onClick` with a key handler so keyboard users can

    trigger it.



    src/pages/play/online/[id]/components/game-board.tsx:571



    src/pages/play/online/[id]/components/game-board.tsx:586



  ⚠ Maintainability: Static value rebuilt every render

    Learn more: https://react.doctor/docs/rules/react-doctor/prefer-module-scope-static-value

    `order` inside `CapturedMaterial` uses no local state but

    is rebuilt every render, so it looks new each time & breaks

    memoized children. Move it to the top of the file, outside

    the component.

    → Move the value above the component, at the top of the

    file. It doesn't use local state, so rebuilding it each

    update is wasted and makes it look new every time.



    src/pages/play/online/[id]/components/captured-material.tsx:84



  ⚠ Performance: useMemo before an early return

    Learn more: https://react.doctor/docs/rules/react-doctor/rerender-memo-before-early-return

    This runs even when the component bails out because the

    useMemo builds JSX before an early return, so move the JSX

    into a child wrapped in memo to skip it on the early return

    → Move the JSX into a child component wrapped in memo, so

    the parent's early return skips it



    src/components/ui/chart.tsx:149



  ⚠ Accessibility: Redundant ARIA role

    Learn more: https://react.doctor/docs/rules/react-doctor/no-redundant-roles

    Screen reader users gain nothing from this `role` because

    `<nav>` already acts as a `navigation`, so remove it.

    → Remove redundant `role` attributes so assistive tech

    reads the element's native semantics without extra noise.



    src/components/ui/pagination.tsx:10



  ⚠ Performance: Overly precise SVG path values

    Learn more: https://react.doctor/docs/rules/react-doctor/rendering-svg-precision

    Your users download extra bytes for SVG d precision they

    can't see, so round it to 1 or 2 decimals.

    → Round path, points, and transform decimals to 1 or 2

    digits. The extra precision adds bytes with no visible

    difference.



    src/components/board/board-effects.tsx:7



  ⚠ Maintainability: Large component is hard to read and change

    Learn more: https://react.doctor/docs/rules/react-doctor/no-giant-component

    Component "GameBoard" is over 300 lines long, which is hard

    to read & change. Split it into a few smaller components.

    → Pull each section into its own component so the parent is

    easier to read, test, and change.



    src/pages/play/online/[id]/components/game-board.tsx:115



  ⚠ Performance: Chained array iterations ×5

    Learn more: https://react.doctor/docs/rules/react-doctor/js-combine-iterations

    This loops over your list twice because .filter().map()

    makes two passes, so do it in one pass with .reduce() or a

    for...of loop

    → Combine `.map().filter()` style chains into one pass with

    `.reduce()` or a `for...of` loop, so you only loop over the

    list once



    src/components/ui/chart.tsx:200



    src/components/ui/chart.tsx:299



    src/pages/play/online/[id]/components/game-board.tsx:503



    src/pages/play/online/[id]/components/game-board.tsx:512



    src/pages/play/online/components/lobby-board.tsx:22



  ⚠ Maintainability: Non-component export in component file ×7

    Learn more: https://react.doctor/docs/rules/react-doctor/only-export-components

    This file exports non-components, so Fast Refresh can't

    safely preserve component state.

    → Move non-component exports out of component files so Fast

    Refresh can preserve component state instead of

    full-reloading.



    src/components/ui/badge.tsx:52



    src/components/ui/button-group.tsx:86



    src/components/ui/button.tsx:58



    src/components/ui/marker.tsx:71



    src/components/ui/navigation-menu.tsx:166



    src/components/ui/tabs.tsx:80



    src/components/ui/toggle.tsx:45





  ────────────────────────────────────────────────────────────



  All 98 issues



  Bugs › 6 errors, 9 warnings

  Performance › 13 warnings

  Accessibility › 11 warnings

  Maintainability › 59 warnings



  ⚠ Migration-scale change: sample before you sweep

    deslop/unused-file ×50 across 50 files

    Fixing all of them at once is hard to review and prone to

    subtle mistakes across the whole repo. Fix a representative

    few first and confirm the recipe holds. Then get the code

    owner's sign-off before changing the rest.

    Scope it down one area at a time: npx react-doctor@latest <path>



  ┌─────┐  43 / 100 Critical

  │ x x │  ██████████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░

  │  ▽  │  React Doctor (https://react.doctor)

  └─────┘



  You could improve +27% by fixing the top 3 issues

  Full diagnostics written to /var/folders/45/8pp0n0f57tq9j23x1k6slv040000gn/T/react-doctor-9d261f1f-2700-4bcd-b385-c8ae1a957938



  ────────────────────────────────────────────────────────────



  Share: https://react.doctor/share?p=chess-test&s=43&e=6&w=92&f=64

  Tell others how you did on socials



  Docs: https://react.doctor/docs

  Learn more about fixing issues, setting up CI/CD, and

  configuring rules with a config file



  GitHub: https://github.com/millionco/react-doctor

  Report issues and star the repository!





✔ What would you like to do next? › Copy prompt to clipboard

Copied the prompt to your clipboard.

clear

npx react-doctor@latest --verbose

React Doctor v0.7.8



  

✔ Scanned 90 files in 5.1s [~4 workers]



  ✖ Accessibility: react-doctor/require-reduced-motion

    Project uses a motion library but has no

    prefers-reduced-motion handling — required for

    accessibility (WCAG 2.3.3)

    → Add `useReducedMotion()` from your animation library, or

    a `@media (prefers-reduced-motion: reduce)` CSS query



    package.json



  ✖ Bugs: Effect subscription or timer never cleaned up ×6

    Learn more: https://react.doctor/docs/rules/react-doctor/effect-needs-cleanup

    `on` creates a subscription in useEffect without guaranteed

    cleanup. Return a cleanup function that owns every

    allocation so it does not leak after unmount.

    → Return a cleanup function that stops the subscription or

    timer: `return () => target.removeEventListener(name,

    handler)` for listeners, `return () => clearInterval(id)`

    or `clearTimeout(id)` for timers, `return () =>

    observer.disconnect()` for observers, `return () =>

    socket.close()` for connections, or `return unsubscribe` if

    the subscribe call already gave you one.



    src/components/ui/carousel.tsx:96

    ┌──────────────────────────────────────────────────────────────┐

    │   95 |                                                       │

    │ > 96 |   React.useEffect(() => {                             │

    │      |   ^                                                   │

    │   97 |     if (!api) return                                  │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-bot-match.ts:110

    ┌──────────────────────────────────────────────────────────────┐

    │   109 |                                                      │

    │ > 110 |     useEffect(() => {                                │

    │       |     ^                                                │

    │   111 |         if (status !== 'playing' || !botConfig || !… │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-core-game.ts:8

    ┌──────────────────────────────────────────────────────────────┐

    │   7 |                                                        │

    │ > 8 |     useEffect(() => {                                  │

    │     |     ^                                                  │

    │   9 |         setBoardSnapshot(app.getSnapshot());           │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-online-match.ts:68

    ┌──────────────────────────────────────────────────────────────┐

    │   67 |                                                       │

    │ > 68 |     useEffect(() => {                                 │

    │      |     ^                                                 │

    │   69 |         setBoardSnapshot(app.getSnapshot());          │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-online-match.ts:101

    ┌──────────────────────────────────────────────────────────────┐

    │   100 |                                                      │

    │ > 101 |     useEffect(() => {                                │

    │       |     ^                                                │

    │   102 |         const newSocket = io(import.meta.env.VITE_W… │

    └──────────────────────────────────────────────────────────────┘



    src/pages/play/online/[id]/components/game-history-panel.tsx:29

    ┌──────────────────────────────────────────────────────────────┐

    │   28 |                                                       │

    │ > 29 |     useEffect(() => {                                 │

    │      |     ^                                                 │

    │   30 |         const activeBtn = document.getElementById(`m… │

    └──────────────────────────────────────────────────────────────┘



  ⚠ Bugs: Array index used as a key ×4

    Learn more: https://react.doctor/docs/rules/react-doctor/no-array-index-as-key

    Your users can see & submit the wrong data when this list

    reorders or filters, so use a stable id like

    `key={item.id}`, not the array index "i".

    → Use a stable id from the item, like `key={item.id}` or

    `key={item.slug}`. Index keys break when the list reorders

    or filters.



    src/components/board/board-highlights.tsx:100



    src/components/ui/chart.tsx:209



    src/components/ui/chart.tsx:307



    src/components/ui/field.tsx:205



  ⚠ Bugs: Missing effect dependencies ×3

    Learn more: https://react.doctor/docs/rules/react-doctor/exhaustive-deps

    `useEffect` can run with a stale `setBoardSnapshot` & show

    your users old data.

    → Don't blindly add missing dependencies. Read the hook

    callback first.

    

    Bad:

    useEffect(() => {

      setCount(count + 1);

    }, [count]);

    

    Better:

    useEffect(() => {

      setCount((currentCount) => currentCount + 1);

    }, []);

    

    If the missing value is recreated every render, move it

    inside the hook or stabilize it before adding it to deps.



    src/hooks/use-bot-match.ts:191



    src/pages/play/online/[id]/components/game-history-panel.tsx:52



    src/pages/play/online/[id]/components/pgn-buttons-navigate.tsx:38



  ⚠ Performance: Unstable context provider value ×3

    Learn more: https://react.doctor/docs/rules/react-doctor/jsx-no-constructed-context-values

    Every reader of this context redraws on each render because

    you build its `value` inline.

    → Wrap the context value in `useMemo` or move it outside

    the component so consumers do not redraw every render.



    src/components/ui/carousel.tsx:109



    src/components/ui/chart.tsx:63



    src/components/ui/toggle-group.tsx:51



  ⚠ Performance: Heavy library loaded eagerly

    Learn more: https://react.doctor/docs/rules/react-doctor/prefer-dynamic-import

    "recharts" ships extra code to your users up front & slows

    page load. Load it on demand with React.lazy() or

    next/dynamic.

    → Load it only when needed: `const Component = dynamic(()

    => import('library'), { ssr: false })` from next/dynamic,

    or React.lazy().



    src/components/ui/chart.tsx:4



  ⚠ Bugs: Parent kept in sync with a callback effect ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/no-prop-callback-in-effect

    Your parent re-renders on every local state change because

    this useEffect calls the prop "setBoardSnapshot" just to

    stay in sync.

    → Move the shared state into a Provider so both sides read

    the same value. Then you don't need a useEffect to keep

    them in sync.



    src/pages/play/online/[id]/components/game-history-panel.tsx:42



    src/pages/play/online/[id]/components/pgn-buttons-navigate.tsx:28



  ⚠ Performance: Full Framer Motion import ×4

    Learn more: https://react.doctor/docs/rules/react-doctor/use-lazy-motion

    Importing "motion" ships about 30 kb of extra code and

    slows page load. Use "m" with LazyMotion instead.

    → Use `import { LazyMotion, m } from "framer-motion"` with

    `domAnimation` features. Saves about 30kb.



    src/components/board/board-effects.tsx:2



    src/pages/play/computer/components/bot-lobby-panel.tsx:2



    src/pages/play/online/components/lobby-board.tsx:2



    src/pages/play/online/components/lobby-panel.tsx:2



  ⚠ Maintainability: deslop/unused-file ×50

    Unused file is not reachable from any entry point, so it

    adds maintenance surface without shipping any code.

    → Delete the file if it is truly unreachable, or import it

    from an entry point.



    src/components/ui/accordion.tsx



    src/components/ui/alert-dialog.tsx



    src/components/ui/alert.tsx



    src/components/ui/aspect-ratio.tsx



    src/components/ui/attachment.tsx



    src/components/ui/avatar.tsx



    src/components/ui/breadcrumb.tsx



    src/components/ui/bubble.tsx



    src/components/ui/button-group.tsx



    src/components/ui/calendar.tsx



    src/components/ui/carousel.tsx



    src/components/ui/chart.tsx



    src/components/ui/checkbox.tsx



    src/components/ui/collapsible.tsx



    src/components/ui/combobox.tsx



    src/components/ui/command.tsx



    src/components/ui/context-menu.tsx



    src/components/ui/dialog.tsx



    src/components/ui/direction.tsx



    src/components/ui/drawer.tsx



    src/components/ui/dropdown-menu.tsx



    src/components/ui/empty.tsx



    src/components/ui/field.tsx



    src/components/ui/hover-card.tsx



    src/components/ui/input-group.tsx



    src/components/ui/input-otp.tsx



    src/components/ui/item.tsx



    src/components/ui/kbd.tsx



    src/components/ui/marker.tsx



    src/components/ui/menubar.tsx



    src/components/ui/message-scroller.tsx



    src/components/ui/message.tsx



    src/components/ui/native-select.tsx



    src/components/ui/navigation-menu.tsx



    src/components/ui/pagination.tsx



    src/components/ui/popover.tsx



    src/components/ui/progress.tsx



    src/components/ui/radio-group.tsx



    src/components/ui/resizable.tsx



    src/components/ui/scroll-area.tsx



    src/components/ui/select.tsx



    src/components/ui/sheet.tsx



    src/components/ui/sidebar.tsx



    src/components/ui/skeleton.tsx



    src/components/ui/slider.tsx



    src/components/ui/table.tsx



    src/components/ui/textarea.tsx



    src/components/ui/toggle-group.tsx



    src/components/ui/toggle.tsx



    src/hooks/use-mobile.ts



  ⚠ Accessibility: Role used instead of HTML tag ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/prefer-tag-over-role

    Screen reader users get more reliable semantics from `<a>`

    than `role="link"`, so use `<a>` instead.

    → Use the matching HTML element when one exists so browsers

    and assistive tech get native semantics.



    src/components/ui/breadcrumb.tsx:66



    src/components/ui/item.tsx:12



  ⚠ Accessibility: Interaction on static element ×5

    Learn more: https://react.doctor/docs/rules/react-doctor/no-static-element-interactions

    Screen reader users can't tell this click handler is

    interactive because it has no `role`, so add a `role` or

    use a button or link.

    → Give clickable static elements a `role`, or use a button

    or link.



    src/pages/play/online/[id]/components/game-board.tsx:522



    src/pages/play/online/[id]/components/game-board.tsx:565



    src/pages/play/online/[id]/components/game-board.tsx:580



    src/pages/play/online/[id]/components/game-board.tsx:607



    src/pages/play/online/[id]/components/game-board.tsx:633



  ⚠ Accessibility: Text is too small

    Learn more: https://react.doctor/docs/rules/react-doctor/no-tiny-text

    Your users strain to read 10px text, so use at least 12px

    for body text, & 16px is best.

    → Use at least 12px for body text, and 16px is best. Small

    text is hard to read, especially on phones.



    src/pages/play/online/[id]/components/captured-material.tsx:87



  ⚠ Performance: State only used in handlers ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/rerender-state-only-in-handlers

    Each update to "hintState" redraws your component for

    nothing because this useState is set but never shown on

    screen.

    → Use useRef instead of useState when the value is only set

    and never shown on screen. `ref.current = ...` updates it

    without redrawing the component.



    src/pages/play/computer/index.tsx:69-70



  ⚠ Accessibility: Click handler missing keyboard handler ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/click-events-have-key-events

    Keyboard users can't trigger this click handler because

    there's no keyboard one, so add `onKeyUp`, `onKeyDown`, or

    `onKeyPress`.

    → Pair `onClick` with a key handler so keyboard users can

    trigger it.



    src/pages/play/online/[id]/components/game-board.tsx:565



    src/pages/play/online/[id]/components/game-board.tsx:580



  ⚠ Maintainability: Static value rebuilt every render ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/prefer-module-scope-static-value

    `localPlayerProfile` inside `ComputerMatch` uses no local

    state but is rebuilt every render, so it looks new each

    time & breaks memoized children. Move it to the top of the

    file, outside the component.

    → Move the value above the component, at the top of the

    file. It doesn't use local state, so rebuilding it each

    update is wasted and makes it look new every time.



    src/pages/play/computer/index.tsx:170



    src/pages/play/online/[id]/components/captured-material.tsx:84



  ⚠ Performance: useMemo before an early return

    Learn more: https://react.doctor/docs/rules/react-doctor/rerender-memo-before-early-return

    This runs even when the component bails out because the

    useMemo builds JSX before an early return, so move the JSX

    into a child wrapped in memo to skip it on the early return

    → Move the JSX into a child component wrapped in memo, so

    the parent's early return skips it



    src/components/ui/chart.tsx:149



  ⚠ Accessibility: Redundant ARIA role

    Learn more: https://react.doctor/docs/rules/react-doctor/no-redundant-roles

    Screen reader users gain nothing from this `role` because

    `<nav>` already acts as a `navigation`, so remove it.

    → Remove redundant `role` attributes so assistive tech

    reads the element's native semantics without extra noise.



    src/components/ui/pagination.tsx:10



  ⚠ Maintainability: Pure function rebuilt every render ×3

    Learn more: https://react.doctor/docs/rules/react-doctor/prefer-module-scope-pure-function

    `colorToId` inside `BoardAnnotations` uses no local state

    but is rebuilt on every render, so it wastes work & breaks

    memoized children. Move it to the top of the file, outside

    the component.

    → Move the function above the component, at the top of the

    file. It doesn't use local state, so rebuilding it each

    update is wasted work.



    src/components/board/board-annotations.tsx:49



    src/components/board/board-effects.tsx:76



    src/pages/play/online/[id]/components/player-info-bar.tsx:18



  ⚠ Performance: Overly precise SVG path values

    Learn more: https://react.doctor/docs/rules/react-doctor/rendering-svg-precision

    Your users download extra bytes for SVG d precision they

    can't see, so round it to 1 or 2 decimals.

    → Round path, points, and transform decimals to 1 or 2

    digits. The extra precision adds bytes with no visible

    difference.



    src/components/board/board-effects.tsx:7



  ⚠ Maintainability: Large component is hard to read and change

    Learn more: https://react.doctor/docs/rules/react-doctor/no-giant-component

    Component "GameBoard" is over 300 lines long, which is hard

    to read & change. Split it into a few smaller components.

    → Pull each section into its own component so the parent is

    easier to read, test, and change.



    src/pages/play/online/[id]/components/game-board.tsx:109



  ⚠ Performance: .map().filter(Boolean) loops twice

    Learn more: https://react.doctor/docs/rules/react-doctor/js-flatmap-filter

    This loops over your list twice because

    .map().filter(Boolean) makes two passes, so use .flatMap()

    to change & drop items in one pass

    → Use `.flatMap(item => condition ? [value] : [])` to

    change and drop items in one pass, instead of building a

    throwaway array in between



    src/components/board/board-annotations.tsx:46



  ⚠ Performance: Chained array iterations ×5

    Learn more: https://react.doctor/docs/rules/react-doctor/js-combine-iterations

    This loops over your list twice because .filter().map()

    makes two passes, so do it in one pass with .reduce() or a

    for...of loop

    → Combine `.map().filter()` style chains into one pass with

    `.reduce()` or a `for...of` loop, so you only loop over the

    list once



    src/components/ui/chart.tsx:200



    src/components/ui/chart.tsx:299



    src/pages/play/online/[id]/components/game-board.tsx:497



    src/pages/play/online/[id]/components/game-board.tsx:506



    src/pages/play/online/components/lobby-board.tsx:22



  ⚠ Maintainability: Non-component export in component file ×7

    Learn more: https://react.doctor/docs/rules/react-doctor/only-export-components

    This file exports non-components, so Fast Refresh can't

    safely preserve component state.

    → Move non-component exports out of component files so Fast

    Refresh can preserve component state instead of

    full-reloading.



    src/components/ui/badge.tsx:52



    src/components/ui/button-group.tsx:86



    src/components/ui/button.tsx:58



    src/components/ui/marker.tsx:71



    src/components/ui/navigation-menu.tsx:166



    src/components/ui/tabs.tsx:80



    src/components/ui/toggle.tsx:45



  ⚠ Performance: Animating scale from zero

    Learn more: https://react.doctor/docs/rules/react-doctor/no-scale-from-zero

    This looks abrupt to your users because scale: 0 pops the

    element in from a single point, so use scale: 0.95 with

    opacity: 0 for a smoother entrance

    → Use `initial={{ scale: 0.95, opacity: 0 }}`. Elements

    should gently shrink and fade, not vanish into a point



    src/components/board/board-effects.tsx:183



  ✖ Bugs: State updater has side effects ×2

    Learn more: https://react.doctor/docs/rules/react-doctor/no-impure-state-updater

    This state updater performs the nested state update

    "setStatus()". React may run updater functions more than

    once, so side effects here can repeat or observe

    inconsistent external state.

    → Keep state updater callbacks pure and return only the

    next state. Move notifications, storage, timers, ref

    writes, and other external work into the event or effect

    that queues the update.



    src/hooks/use-bot-match.ts:85

    ┌──────────────────────────────────────────────────────────────┐

    │   84 |             if (realTurn === 'w') {                   │

    │ > 85 |                 setLocalWhiteTime(prev => {           │

    │      |                                   ^                   │

    │   86 |                     if (prev === null) return null;   │

    └──────────────────────────────────────────────────────────────┘



    src/hooks/use-bot-match.ts:95

    ┌──────────────────────────────────────────────────────────────┐

    │   94 |             } else {                                  │

    │ > 95 |                 setLocalBlackTime(prev => {           │

    │      |                                   ^                   │

    │   96 |                     if (prev === null) return null;   │

    └──────────────────────────────────────────────────────────────┘



  ✖ Bugs: Ref mutated during render ×4

    Learn more: https://react.doctor/docs/rules/react-doctor/no-ref-current-in-render

    This ref is mutated during render. React can replay or

    discard render work, so the mutation can leak from UI that

    never commits.

    → Move ref writes into an event handler or effect. Render

    must stay pure because React can replay or discard it. The

    predictable null-guarded lazy initialization pattern

    remains supported.



    src/hooks/use-online-match.ts:25-26

    ┌──────────────────────────────────────────────────────────────┐

    │   24 |     const playerAvatarRef = useRef(playerAvatar);     │

    │ > 25 |     playerNameRef.current = playerName;               │

    │ > 26 |     playerAvatarRef.current = playerAvatar;           │

    │   27 |                                                       │

    └──────────────────────────────────────────────────────────────┘



    src/pages/play/online/[id]/components/game-board.tsx:46

    ┌──────────────────────────────────────────────────────────────┐

    │   45 |         }                                             │

    │ > 46 |         lastFenRef.current = currentFen;              │

    │      |         ^                                             │

    │   47 |                                                       │

    └──────────────────────────────────────────────────────────────┘



    src/pages/play/online/[id]/components/game-board.tsx:102

    ┌──────────────────────────────────────────────────────────────┐

    │   101 |                                                      │

    │ > 102 |         piecesMapRef.current = nextMap;              │

    │       |         ^                                            │

    │   103 |         return Array.from(nextMap.values()).sort((a… │

    └──────────────────────────────────────────────────────────────┘





  ────────────────────────────────────────────────────────────



  All 115 issues



  Bugs › 12 errors, 9 warnings

  Performance › 19 warnings

  Accessibility › 1 error, 11 warnings

  Maintainability › 63 warnings



  ⚠ Migration-scale change: sample before you sweep

    deslop/unused-file ×50 across 50 files

    Fixing all of them at once is hard to review and prone to

    subtle mistakes across the whole repo. Fix a representative

    few first and confirm the recipe holds. Then get the code

    owner's sign-off before changing the rest.

    Scope it down one area at a time: npx react-doctor@latest <path>



  ┌─────┐  33 / 100 Critical

  │ x x │  █████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░

  │  ▽  │  React Doctor (https://react.doctor)

  └─────┘



  You could improve +33% by fixing the top 3 issues

  Full diagnostics written to /var/folders/45/8pp0n0f57tq9j23x1k6slv040000gn/T/react-doctor-34b0c1f4-5b1c-4fa8-97df-d32b09d0ce65



  ────────────────────────────────────────────────────────────



  Share: https://react.doctor/share?p=chess-test&s=33&e=13&w=102&f=69

  Tell others how you did on socials



  Docs: https://react.doctor/docs

  Learn more about fixing issues, setting up CI/CD, and

  configuring rules with a config file



  GitHub: https://github.com/millionco/react-doctor

  Report issues and star the repository!





✔ What would you like to do next? › Copy prompt to clipboard

Copied the prompt to your clipboard.

Fix the top 3 React Doctor issues in chess-test on this pass — leave the rest for a follow-up.



1. ERROR Accessibility: react-doctor/require-reduced-motion (×1)

   Project uses a motion library but has no prefers-reduced-motion handling — required for accessibility (WCAG 2.3.3)

   - package.json

2. WARN Performance: .map().filter(Boolean) loops twice (×1)

   This loops over your list twice because .map().filter(Boolean) makes two passes, so use .flatMap() to change & drop items in one pass

   Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/js-flatmap-filter

   - src/components/board/board-annotations.tsx:46

3. WARN Maintainability: Pure function rebuilt every render (×3)

   `colorToId` inside `BoardAnnotations` uses no local state but is rebuilt on every render, so it wastes work & breaks memoized children. Move it to the top of the file, outside the component.

   Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/prefer-module-scope-pure-function

   - src/components/board/board-annotations.tsx:49

   - src/components/board/board-effects.tsx:76

   - src/pages/play/online/[id]/components/player-info-bar.tsx:18



Full results for all 115 issues (diagnostics.json + a .txt per rule): /var/folders/45/8pp0n0f57tq9j23x1k6slv040000gn/T/react-doctor-fdd9c316-0d26-44f3-a493-7e5a2d5e5eb8



Read each file and fix the root cause — don't suppress or silence the rule.



Findings that share a `fixGroupId` (in diagnostics.json) are one root cause — a single fix clears all of them, so treat each `fixGroupId` as ONE task, not one per site.



Verify against the real thing, don't assume: confirm each change matches the canonical fix recipe you fetched for that rule, then re-run `npx react-doctor@latest --verbose` and check the issue is actually gone against the real tool before moving on.



Teach me as you go: for every issue you touch, explain it in plain language (no jargon) — what the problem is, why it's a problem, and how serious it is in human terms. Describe the real-world impact and severity concretely (e.g. "this crashes the page for users on Safari" vs. "this is a minor cleanup with no user impact") so I understand why it matters, not just what changed.



Some of the rest are migration-scale (span dozens of files): deslop/unused-file (50 files). For each, fix a representative sample, confirm the recipe holds, and get the code owner's sign-off before changing the rest in one pass.



Then work through the rest from the full results above.