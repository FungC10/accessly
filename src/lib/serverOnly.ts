// tiny helper to assert server env
export function assertServer() {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server')
  }
}
