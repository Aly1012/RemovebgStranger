import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('image') as File | null
  const idsRaw = form.get('ids') as string | null
  if (!file || !idsRaw) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const selectedIds: number[] = JSON.parse(idsRaw)
  const ext = file.name.split('.').pop() ?? 'jpg'
  const tmpPath = join(tmpdir(), `${randomUUID()}.${ext}`)

  try {
    await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()))

    // 重新检测获取掩码（无状态设计）
    const detectScript = join(process.cwd(), 'scripts', 'detect.py')
    const { stdout: detectOut } = await execFileAsync('python3', [detectScript, tmpPath], {
      timeout: 60000, maxBuffer: 50 * 1024 * 1024,
    })
    const { persons } = JSON.parse(detectOut) as { persons: { id: number; mask: number[][] }[] }

    const selectedMasks = persons.filter(p => selectedIds.includes(p.id)).map(p => p.mask)
    if (selectedMasks.length === 0) {
      return NextResponse.json({ error: 'no matching persons' }, { status: 400 })
    }

    // 调用 remove 脚本，stdout 为 PNG 二进制
    const removeScript = join(process.cwd(), 'scripts', 'remove.py')
    const { stdout: pngBuf } = await execFileAsync(
      'python3',
      [removeScript, tmpPath, JSON.stringify(selectedMasks)],
      { timeout: 60000, maxBuffer: 50 * 1024 * 1024, encoding: 'buffer' }
    )

    return new NextResponse(Buffer.from(pngBuf as unknown as Buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="removed.png"',
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}
