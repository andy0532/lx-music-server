// SQLite-free KV store using JSON file — replaces Cloudflare KV
import * as fs from 'fs'
import * as path from 'path'

export class LocalKV {
  private data: Record<string, string> = {}
  private filePath: string
  private dirty = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'lx-kv.json')
    const dir = path.dirname(this.filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
      } catch { this.data = {} }
    }
  }

  async get(key: string): Promise<string | null> {
    return this.data[key] ?? null
  }

  async put(key: string, value: string): Promise<void> {
    this.data[key] = value
    this.scheduleFlush()
  }

  async delete(key: string): Promise<void> {
    delete this.data[key]
    this.scheduleFlush()
  }

  private scheduleFlush() {
    this.dirty = true
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flushNow()
      }, 1000)
    }
  }

  private flushNow() {
    if (this.dirty) {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
      this.dirty = false
    }
    this.timer = null
  }

  close() {
    if (this.timer) clearTimeout(this.timer)
    this.flushNow()
  }
}
