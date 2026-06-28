// Local Node.js server — replaces workerd + wrangler dev
// HTTP: Hono on Node.js http server
// WebSocket: ws library with DO-compatible pair creation

import * as http from 'http'
import { WebSocketServer } from 'ws'
import { Hono } from 'hono'
import { LocalKV } from './kv'
import { LocalDOState } from './do-state'
import { UserSyncDO } from '@/durable/UserSyncDO'

const CFG = {
  users: JSON.parse(process.env.LX_USERS || '[{"name":"sunjian","password":"200174"},{"name":"suri","password":"suri200174"},{"name":"yanhui","password":"yanhui200174"},{"name":"andy","password":"andy200174"}]') as LX.User[],
  serverName: process.env.SERVER_NAME || 'LX Music Server',
  port: parseInt(process.env.PORT || '5679'),
}
const kv = new LocalKV()

// DO instance cache
const doCache = new Map<string, { do: UserSyncDO; state: LocalDOState }>()

function getDO(userName: string): UserSyncDO {
  let entry = doCache.get(userName)
  if (!entry) {
    const state = new LocalDOState(userName)
    const doObj = new UserSyncDO(state as any, {
      KV: { get: (k: string) => kv.get(k), put: (k: string, v: string) => kv.put(k, v), delete: (k: string) => kv.delete(k) },
      LX_USERS: JSON.stringify(CFG.users),
      SERVER_NAME: CFG.serverName,
      _wsPair: null as any,
    } as any)
    entry = { do: doObj, state }
    doCache.set(userName, entry)
  }
  return entry.do
}

// Build env bindings
function makeEnv(): LX.Env {
  return {
    KV: { get: (k: string) => kv.get(k), put: (k: string, v: string) => kv.put(k, v), delete: (k: string) => kv.delete(k) },
    USER_SYNC: {
      idFromName: (name: string) => ({ name } as any),
      get: (id: any) => ({ fetch: (req: any, init?: any) => {
        let request: Request
        if (typeof req === 'string' && init) {
          request = new Request(req, init)
        } else if (typeof req === 'string') {
          request = new Request(req)
        } else if (init) {
          request = new Request(req, init)
        } else {
          request = req
        }
        return getDO(id.name).fetch(request)
      } }),
    },
    LX_USERS: JSON.stringify(CFG.users),
    SERVER_NAME: CFG.serverName,
  } as any
}

async function main() {
  const app = new Hono()
  app.use('*', async (c, next) => { (c as any).env = makeEnv(); await next() })
  
  // Mount routes
  app.route('/', (await import('@/routes/hello')).default)
  app.route('/', (await import('@/routes/auth')).default)
  app.route('/', (await import('@/routes/devices')).default)

  // Debug: list all routes
  console.log('Routes:', app.routes?.map((r: any) => `${r.method} ${r.path}`).join(', '))

  const server = http.createServer()

  // HTTP handler
  server.on('request', async (req, res) => {
    // Convert IncomingMessage to Request
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
    })
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body,
    })
    console.log('Request:', req.method, url.pathname)
    try {
      const response = await app.fetch(request, makeEnv() as any, {} as any)
      const headers: Record<string, string> = {}
      response.headers.forEach((v, k) => { headers[k] = v })
      res.writeHead(response.status, headers)
      if (response.body) {
        const reader = (response.body as ReadableStream).getReader()
        const pump = () => reader.read().then(({ done, value }: any) => {
          if (done) { res.end(); return }
          res.write(Buffer.from(value))
          pump()
        }).catch(() => res.end())
        pump()
      } else {
        res.end()
      }
    } catch (e) {
      console.error('Hono error:', e)
      res.writeHead(500)
      res.end('Internal Server Error')
    }
  })

  // WebSocket handler — bridge client WebSocket to DO with EventEmitter
  const EventEmitter = (require('events')).EventEmitter

  const clientWss = new WebSocketServer({ noServer: true })

  server.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url || '', 'http://localhost')
    console.log('WS UPGRADE:', url.pathname, url.search)
    if (url.pathname !== '/socket') { socket.destroy(); return }

    const clientId = url.searchParams.get('i')
    const token = url.searchParams.get('t')
    if (!clientId || !token) { socket.destroy(); return }

    try {
      const userName = await kv.get(`client:${clientId}`)
      if (!userName) { socket.destroy(); return }

      // Accept client WebSocket upgrade
      clientWss.handleUpgrade(req, socket, head, (clientWs) => {
        // Create a fake DO-side WebSocket that mirrors clientWs
        const doWs = new EventEmitter() as any
        doWs.readyState = 1
        doWs.accept = () => {}
        doWs.send = (data: any) => {
          if (clientWs.readyState === 1) {
            console.log('doWs.send, data length:', typeof data === 'string' ? data.length : 'non-string')
            clientWs.send(data)
          }
        }
        doWs.close = (code?: number) => {
          console.log('doWs.close, code:', code)
          clientWs.close(code)
        }
        doWs.addEventListener = (event: string, handler: any) => {
          if (event === 'message') {
            clientWs.on('message', (data: any) => {
              const msg = typeof data === 'string' ? data : Buffer.isBuffer(data) ? data.toString() : String(data)
              if (msg.substring(0,3) === 'cg_') {
                console.log('clientWs gzip: len=' + msg.length + ' base64=' + msg.substring(3, 33))
              } else {
                console.log('clientWs json: len=' + msg.length + ' preview=' + msg.substring(0, 80))
              }
              handler({ data: msg })
            })
          } else if (event === 'close') {
            clientWs.on('close', () => handler({}))
          } else if (event === 'error') {
            clientWs.on('error', (err: any) => handler(err))
          }
        }

        // Pass the pair to DO
        const doInstance = getDO(userName)
        ;(doInstance as any).env._wsPair = () => [clientWs, doWs]

        doInstance.fetch(new Request(
          `https://do/ws?i=${encodeURIComponent(clientId)}&t=${encodeURIComponent(token)}`,
          { headers: req.headers as any }
        )).catch((err: Error) => {
          console.error('DO ws error:', err.message)
          clientWs.close()
        })
      })
    } catch (err) {
      console.error('Upgrade error:', err)
      socket.destroy()
    }
  })

  server.listen(CFG.port, '0.0.0.0', () => {
    console.log(`\n  LX Music Server (Node.js) — http://0.0.0.0:${CFG.port}`)
    console.log(`  Users: ${CFG.users.map((u: any) => u.name).join(', ')}\n`)
  })
}

main().catch(console.error)
