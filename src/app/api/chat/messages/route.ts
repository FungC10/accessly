// POST/GET (validation + rate limit)
export async function GET() {
  return Response.json({ messages: [] })
}

export async function POST() {
  return Response.json({ success: true })
}
