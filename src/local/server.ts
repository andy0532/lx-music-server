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
      LX_USERS: CFG.users as any,
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
      get: (id: any) => ({ fetch: (req: Request) => getDO(id.name).fetch(req) }),
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

  const server = http.createServer()

  // HTTP handler
  server.on('request', (req, res) => {
    app.fetch(req as any, makeEnv() as any, {} as any)
      .then((r: Response) => {
        const headers: Record<string, string> = {}
        r.headers.forEach((v, k) => { headers[k] = v })
        res.writeHead(r.status, headers)
        if (r.body) {
          const reader = (r.body as ReadableStream).getReader()
          const pump = () => reader.read().then(({ done, value }: any) => {
            if (done) return res.end()
            res.write(Buffer.from(value))
            pump()
          })
          pump()
        } else {
          res.end()
        }
      })
      .catch((e: Error) => { res.writeHead(500); res.end(String(e)) })
  })

  // WebSocket handler — use background pair server
  const pairSrv = http.createServer()
  const pairWss = new WebSocketServer({ server: pairSrv })
  pairSrv.listen(0, '127.0.0.1')

  const clientWss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '', 'http://localhost')
    if (url.pathname !== '/socket') { socket.destroy(); return }

    const clientId = url.searchParams.get('i')
    const token = url.searchParams.get('t')
    if (!clientId || !token) { socket.destroy(); return }

    kv.get(`client:${clientId}`).then(userName => {
      if (!userName) { socket.destroy(); return }

      const doInstance = getDO(userName)

      // Create a DO-side WebSocket via pair server
      const doWsPromise = new Promise<import('ws').WebSocket>(resolve => {
        pairWss.once('connection', ws => { (ws as any).accept = ()=>{}; resolve(ws) })
      })

      // Accept client WebSocket
      clientWss.handleUpgrade(req, socket, head, clientWs => {
        // Tell DO to use our pair
        const pairAddr = pairSrv.address() as { port: number }
        ;(doInstance as any).env._wsPair = () => {
          const clientDoWs = new (require('ws').WebSocket)(`ws://127.0.0.1:${pairAddr.port}`)
          return [clientDoWs, null] // [0]=client (sent to client), [1]=server (used by DO)
        }

        doInstance.fetch(new Request(
          `https://do/ws?i=${encodeURIComponent(clientId)}&t=${encodeURIComponent(token)}`,
          { headers: req.headers as any }
        )).then(async () => {
          const doWs = await doWsPromise
          // Bridge: clientWs ↔ doWs
          clientWs.on('message', d => doWs.readyState === 1 && doWs.send(d))
          doWs.on('message', d => clientWs.readyState === 1 && clientWs.send(d))
          clientWs.on('close', () => doWs.close())
          doWs.on('close', () => clientWs.close())
        }).catch((err: Error) => {
          console.error('DO ws error:', err)
          clientWs.close()
        })
      })
    }).catch((err: Error) => {
      console.error('Upgrade error:', err)
      socket.destroy()
    })
  })

  server.listen(CFG.port, '0.0.0.0', () => {
    console.log(`\n  LX Music Server (Node.js) — http://0.0.0.0:${CFG.port}`)
    console.log(`  Users: ${CFG.users.map((u: any) => u.name).join(', ')}\n`)
  })
}

main().catch(console.error)
