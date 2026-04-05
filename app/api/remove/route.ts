import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { checkAndConsume } from '@/lib/quota'

const execFileAsync = promisify(execFile)

// 延长 API 路由超时至 5 分钟
export const maxDuration = 300

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '0.0.0.0'
  )
}

export async function POST(req: NextRequest) {
  // ── 限额检查 ────────────────────────────────────────
  const session = await getServerSession()
  const userId = (session?.user as any)?.id ?? null
  const ip = getClientIp(req)
  const quota = checkAndConsume(userId, ip)

  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: 'quota_exceeded',
        used: quota.used,
        limit: quota.limit,
        plan: quota.plan,
        credits: quota.credits,
      },
      { status: 429 }
    )
  }
  // ────────────────────────────────────────────────────

  const form = await req.formData()
  const file = form.get('image') as File | null
  const maskDataUrl = form.get('mask') as string | null

  if (!file || !maskDataUrl) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const uid = randomUUID()
  const tmpImagePath = join(tmpdir(), `${uid}.${ext}`)
  const tmpMaskPath = join(tmpdir(), `${uid}_mask.png`)

  try {
    // 保存原图
    await writeFile(tmpImagePath, Buffer.from(await file.arrayBuffer()))

    // 解析 mask dataURL → 保存为 PNG 文件
    const base64Data = maskDataUrl.replace(/^data:image\/\w+;base64,/, '')
    await writeFile(tmpMaskPath, Buffer.from(base64Data, 'base64'))

    // 调用 remove 脚本
    const removeScript = join(process.cwd(), 'scripts', 'remove.py')
    const { stdout: pngBuf } = await execFileAsync(
      'python3',
      [removeScript, tmpImagePath, tmpMaskPath],
      { timeout: 300000, maxBuffer: 100 * 1024 * 1024, encoding: 'buffer' }
    )

    // 响应头附带最新用量（前端可直接读取，免去额外 /api/usage 请求）
    const headers: Record<string, string> = {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="removed.png"',
      'X-Quota-Used': String(quota.used),
      'X-Quota-Limit': String(quota.limit),
      'X-Quota-Plan': quota.plan,
      'X-Quota-Credits': String(quota.credits),
    }

    return new NextResponse(Buffer.from(pngBuf as unknown as Buffer), { headers })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  } finally {
    await unlink(tmpImagePath).catch(() => {})
    await unlink(tmpMaskPath).catch(() => {})
  }
}
