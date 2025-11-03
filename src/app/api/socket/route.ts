// Socket.io adapter (if using Socket.io)
export async function GET() {
  return new Response('Socket.io route', { status: 200 })
}
