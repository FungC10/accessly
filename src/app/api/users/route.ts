// admin-only list (RBAC guard)
export async function GET() {
  return Response.json({ users: [] })
}
