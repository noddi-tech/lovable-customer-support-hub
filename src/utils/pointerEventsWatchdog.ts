/**
 * Safety net for the known Radix "stuck body pointer-events" bug.
 *
 * When two Radix modals (dropdown + dialog) briefly own the body scroll lock,
 * or the subtree owning the lock unmounts mid-cleanup, `<body>` keeps an inline
 * `pointer-events: none` and the whole page becomes unclickable while still
 * looking perfectly normal.
 *
 * This watchdog clears the inline lock whenever no Radix overlay is actually
 * mounted. It never touches the lock while a real dialog/menu is open.
 */

const OVERLAY_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  "[role=dialog][data-state=open]",
  "[role=alertdialog][data-state=open]",
  "[role=menu][data-state=open]",
  "[data-radix-focus-guard]",
  "[data-state=open][data-radix-portal]",
].join(",")

function hasOpenOverlay(): boolean {
  return document.querySelector(OVERLAY_SELECTOR) !== null
}

function unstick() {
  const body = document.body
  if (!body) return
  if (body.style.pointerEvents !== "none") return
  if (hasOpenOverlay()) return
  body.style.removeProperty("pointer-events")
  console.warn("[pointerEventsWatchdog] Cleared stuck body pointer-events lock")
}

export function startPointerEventsWatchdog() {
  if (typeof document === "undefined") return

  const observer = new MutationObserver(() => {
    // Let Radix finish its own cleanup first, then verify.
    setTimeout(unstick, 0)
  })
  observer.observe(document.body, { attributes: true, attributeFilter: ["style"] })

  // Belt and braces: a click that lands on nothing while the body is locked.
  window.addEventListener("pointerdown", unstick, true)

  // Periodic sweep for locks that survive without further mutations.
  window.setInterval(unstick, 1000)
}
