export const isNearBottom = (el: HTMLElement, px = 100) =>
  el.scrollHeight - el.scrollTop - el.clientHeight < px

export const scrollToBottom = (el: HTMLElement) => {
  // no animation: immediate jump
  el.scrollTop = el.scrollHeight
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

