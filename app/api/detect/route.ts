import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'no image' }, { status: 400 })

  const tmpPath = join(tmpdir(), `${randomUUID()}.${file.name.split('.').pop() ?? 'jpg'}`)
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(tmpPath, buf)

    const scriptPath = join(process.cwd(), 'scripts', 'detect.py')
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${tmpPath}"`, {
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024,
    })

    if (stderr && !stdout) {
      console.error('detect stderr:', stderr)
      return NextResponse.json({ error: 'detection failed' }, { status: 500 })
    }

    const data = JSON.parse(stdout)
    return NextResponse.json(data)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}
