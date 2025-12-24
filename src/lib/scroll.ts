export const isNearBottom = (el: HTMLElement, px = 100) =>
  el.scrollHeight - el.scrollTop - el.clientHeight < px

export const scrollToBottom = (el: HTMLElement) => {
  // no animation: immediate jump
  // Use scrollHeight to ensure we're at the absolute bottom
  // This accounts for any dynamic content like typing indicators
  el.scrollTop = el.scrollHeight
  // Force a reflow to ensure scroll position is applied
  void el.offsetHeight
}

/** When you prepend messages at the top, preserve the visible content */
export const preserveScrollOnPrepend = (el: HTMLElement, fnUpdate: () => void) => {
  const prevHeight = el.scrollHeight
  const prevTop   = el.scrollTop
  fnUpdate()

  // flush layout before adjustment
  requestAnimationFrame(() => {
    const newHeight = el.scrollHeight
    el.scrollTop = prevTop + (newHeight - prevHeight)
  })
}

