// DurableObjectState adapter — replaces DurableObjectState + DurableObjectStorage
import * as fs from 'fs'
import * as path from 'path'

export class LocalDOStorage {
  private data: Record<string, any> = {}
  private filePath: string
  private userName: string
  private dirty = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(userName: string, baseDir?: string) {
    this.userName = userName
    this.filePath = path.join(baseDir || path.join(process.cwd(), 'data'), `do-${sanitize(userName)}.json`)
    const dir = path.dirname(this.filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(this.filePath)) {
      try { this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) }
      catch { this.data = {} }
    }
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    return this.data[key] as T | undefined
  }

  async put(key: string, value: unknown): Promise<void> {
    this.data[key] = value
    this.scheduleFlush()
  }

  async delete(key: string): Promise<void> {
    delete this.data[key]
    this.scheduleFlush()
  }

  async list(prefix?: string): Promise<{ keys: { name: string }[] }> {
    const names = Object.keys(this.data).filter(k => !prefix || k.startsWith(prefix))
    return { keys: names.map(n => ({ name: n })) }
  }

  private scheduleFlush() {
    this.dirty = true
    if (!this.timer) {
      this.timer = setTimeout(() => {
        if (this.dirty) {
          fs.writeFileSync(this.filePath, JSON.stringify(this.data))
          this.dirty = false
        }
        this.timer = null
      }, 500)
    }
  }

  close() {
    if (this.timer) clearTimeout(this.timer)
    if (this.dirty) {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data))
      this.dirty = false
    }
  }
}

export class LocalDOState {
  storage: LocalDOStorage
  id: { name: string }

  constructor(userName: string, baseDir?: string) {
    this.id = { name: userName }
    this.storage = new LocalDOStorage(userName, baseDir)
  }

  async blockConcurrencyWhile(fn: () => Promise<void>): Promise<void> {
    await fn()
  }
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_')
}
