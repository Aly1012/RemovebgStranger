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
  if (!file) return NextResponse.json({ error: 'no image' }, { status: 400 })

  const tmpPath = join(tmpdir(), `${randomUUID()}.${file.name.split('.').pop() ?? 'jpg'}`)
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(tmpPath, buf)

    const scriptPath = join(process.cwd(), 'scripts', 'detect.py')
    const { stdout } = await execFileAsync('python3', [scriptPath, tmpPath], {
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024,
    })

    // 只取最后一行有效 JSON，过滤 YOLO 可能输出的 ANSI/进度信息
    const lines = stdout.trim().split('\n').filter(l => l.trim().startsWith('{'))
    if (!lines.length) {
      console.error('detect stdout was:', stdout)
      return NextResponse.json({ error: 'detection output invalid' }, { status: 500 })
    }

    const data = JSON.parse(lines[lines.length - 1])
    return NextResponse.json(data)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}
