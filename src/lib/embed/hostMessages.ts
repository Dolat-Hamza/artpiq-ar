// Messages to the Squarespace loader (public/embed/widget.js) when we run inside its iframe.
function post(message: object): void {
  if (window.parent !== window) window.parent.postMessage(message, '*')
}

export function tellHostClose(): void {
  post({ type: 'artpiq:close' })
}

// The host hides its own close button while ours is on screen, so they never overlap.
export function tellHostOwnClose(value: boolean): void {
  post({ type: 'artpiq:own-close', value })
}
