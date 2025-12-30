import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMembership } from '@/lib/rbac'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/export?roomId=...&format=json|html|pdf
 * Export room/thread data (JSON, HTML, or PDF)
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const format = searchParams.get('format') || 'json' // json, html, pdf

    if (!roomId) {
      return Response.json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'roomId is required',
      }, { status: 400 })
    }

    // Verify user exists in DB
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { id: true },
    })

    if (!dbUser) {
      return Response.json({
        ok: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found in database',
      }, { status: 404 })
    }

    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        tags: true,
        type: true,
        status: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: { role: 'OWNER' },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!room) {
      return Response.json({
        ok: false,
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      }, { status: 404 })
    }

    // Check if user has access (must be member for private rooms)
    const membership = await getMembership(dbUser.id, roomId, prisma)
    if (room.type === 'PRIVATE' && !membership) {
      return Response.json({
        ok: false,
        code: 'FORBIDDEN',
        message: 'You do not have access to this room',
      }, { status: 403 })
    }

    // Get all messages with hierarchical structure
    const allMessages = await prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null, // Exclude deleted messages
      },
      select: {
        id: true,
        content: true,
        parentMessageId: true,
        createdAt: true,
        editedAt: true,
        reactions: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Build hierarchical structure
    type MessageWithReplies = typeof allMessages[0] & { replies: MessageWithReplies[] }
    const messageMap = new Map<string, MessageWithReplies>(allMessages.map(m => [m.id, { ...m, replies: [] as MessageWithReplies[] }]))
    const rootMessages: MessageWithReplies[] = []

    for (const msg of allMessages) {
      const messageWithReplies = messageMap.get(msg.id)!
      if (msg.parentMessageId) {
        const parent = messageMap.get(msg.parentMessageId)
        if (parent) {
          parent.replies.push(messageWithReplies)
        }
      } else {
        rootMessages.push(messageWithReplies)
      }
    }

    // Format messages for export
    const formatMessage = (msg: any): any => ({
      id: msg.id,
      content: msg.content,
      author: {
        id: msg.user.id,
        name: msg.user.name,
        email: msg.user.email,
      },
      timestamp: msg.createdAt.toISOString(),
      editedAt: msg.editedAt?.toISOString() || null,
      reactions: msg.reactions || null,
      replies: msg.replies ? msg.replies.map(formatMessage) : [],
    })

    const formattedMessages = rootMessages.map(formatMessage)

    // Build export data
    const exportData = {
      room: {
        id: room.id,
        name: room.name,
        title: room.title,
        description: room.description,
        tags: room.tags,
        type: room.type,
        status: room.status,
        createdAt: room.createdAt.toISOString(),
        creator: room.creator ? {
          id: room.creator.id,
          name: room.creator.name,
          email: room.creator.email,
        } : null,
        owner: room.members[0]?.user || null,
      },
      messages: formattedMessages,
      exportDate: new Date().toISOString(),
      exportedBy: {
        id: dbUser.id,
        email: session.user.email,
      },
    }

    // Return based on format
    if (format === 'html') {
      return new Response(generateHTML(exportData), {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="room-${roomId}-${Date.now()}.html"`,
        },
      })
    }

    if (format === 'pdf') {
      try {
        const puppeteer = await import('puppeteer')
        const html = generateHTML(exportData)
        
        const browser = await puppeteer.default.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })
        
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm',
          },
        })
        
        await browser.close()
        
        return new Response(pdf as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="room-${roomId}-${Date.now()}.pdf"`,
          },
        })
      } catch (error: any) {
        console.error('PDF generation error:', error)
        // Fallback to HTML if PDF generation fails
        const html = generateHTML(exportData)
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="room-${roomId}-${Date.now()}.html"`,
          },
        })
      }
    }

    // Default: JSON
    return Response.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="room-${roomId}-${Date.now()}.json"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting room:', error)
    return Response.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }, { status: 500 })
  }
}

function generateHTML(data: any): string {
  const { room, messages, exportDate, exportedBy } = data

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
  
  const escapeHtml = (text: string) => {
    if (!text) return ''
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const renderMessage = (msg: any, depth: number = 0): string => {
    const indent = depth * 20
    const borderLeft = depth > 0 ? 'border-l-4 border-slate-300 pl-4 ml-4' : ''
    
    return `
      <div class="message" style="margin-left: ${indent}px; ${depth > 0 ? 'border-left: 2px solid #cbd5e1; padding-left: 1rem; margin-top: 0.5rem;' : 'margin-top: 1rem;'}">
        <div class="message-header" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <div>
            <strong>${escapeHtml(msg.author.name || msg.author.email)}</strong>
            <span style="color: #64748b; font-size: 0.875rem; margin-left: 0.5rem;">
              ${formatDate(msg.timestamp)}
            </span>
            ${msg.editedAt ? `<span style="color: #94a3b8; font-size: 0.75rem;">(edited)</span>` : ''}
          </div>
        </div>
        <div class="message-content" style="white-space: pre-wrap; color: #1e293b;">
          ${escapeHtml(msg.content)}
        </div>
        ${msg.reactions && Object.keys(msg.reactions).length > 0 ? `
          <div class="reactions" style="margin-top: 0.5rem;">
            ${Object.entries(msg.reactions).map(([emoji, userIds]: [string, any]) => 
              `<span style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; margin-right: 0.5rem;">
                ${emoji} ${userIds.length}
              </span>`
            ).join('')}
          </div>
        ` : ''}
        ${msg.replies && msg.replies.length > 0 ? `
          <div class="replies" style="margin-top: 1rem;">
            ${msg.replies.map((reply: any) => renderMessage(reply, depth + 1)).join('')}
          </div>
        ` : ''}
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Export: ${escapeHtml(room.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #ffffff;
      color: #1e293b;
      line-height: 1.6;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    .room-info {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 0.5rem;
      margin-bottom: 2rem;
    }
    .room-info h1 {
      margin: 0 0 0.5rem 0;
      color: #0f172a;
    }
    .room-info p {
      margin: 0.5rem 0;
      color: #475569;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      margin-right: 0.5rem;
    }
    .badge-public { background: #dcfce7; color: #166534; }
    .badge-private { background: #f3e8ff; color: #6b21a8; }
    .badge-dm { background: #dbeafe; color: #1e40af; }
    .badge-ticket { background: #fed7aa; color: #9a3412; }
    .badge-open { background: #dcfce7; color: #166534; }
    .badge-waiting { background: #fef3c7; color: #92400e; }
    .badge-resolved { background: #e2e8f0; color: #475569; }
    .message {
      border-bottom: 1px solid #e2e8f0;
      padding: 1rem 0;
    }
    .message:last-child {
      border-bottom: none;
    }
    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 0.875rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Room Export</h1>
    <p>Exported on ${formatDate(exportDate)} by ${escapeHtml(exportedBy.email || 'Unknown')}</p>
  </div>

  <div class="room-info">
    <h1>${escapeHtml(room.title)}</h1>
    ${room.description ? `<p>${escapeHtml(room.description)}</p>` : ''}
    <p>
      <span class="badge badge-${room.type.toLowerCase()}">${room.type}</span>
      ${room.status ? `<span class="badge badge-${room.status.toLowerCase()}">${room.status}</span>` : ''}
      ${room.tags && room.tags.length > 0 ? room.tags.map((tag: string) => 
        `<span class="badge" style="background: #e2e8f0; color: #475569;">#${escapeHtml(tag)}</span>`
      ).join('') : ''}
    </p>
    <p><strong>Created:</strong> ${formatDate(room.createdAt)}</p>
    ${room.creator ? `<p><strong>Creator:</strong> ${escapeHtml(room.creator.name || room.creator.email)}</p>` : ''}
    ${room.owner ? `<p><strong>Owner:</strong> ${escapeHtml(room.owner.name || room.owner.email)}</p>` : ''}
    ${room.type === 'TICKET' && room.status ? `<p><strong>Status:</strong> ${room.status}</p>` : ''}
  </div>

  <div class="messages">
    <h2>Messages (${messages.length} root messages)</h2>
    ${messages.map((msg: any) => renderMessage(msg)).join('')}
  </div>

  <div class="footer">
    <p>Exported from Accessly on ${formatDate(exportDate)}</p>
  </div>
</body>
</html>`
}

