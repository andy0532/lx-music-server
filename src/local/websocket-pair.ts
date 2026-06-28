// Global polyfill: WebSocketPair for Node.js
// Cloudflare Workers: new WebSocketPair() → [client, server] connected WebSockets
// Install this polyfill BEFORE importing any module that uses WebSocketPair

import * as http from 'http'
import { WebSocketServer } from 'ws'

export function installWebSocketPolyfill() {
  if (typeof globalThis.WebSocketPair !== 'undefined') return // already set

  ;(globalThis as any).WebSocketPair = class WebSocketPair {
    public [0]: import('ws').WebSocket
    public [1]: import('ws').WebSocket

    constructor() {
      const server = new http.Server()
      const wss = new WebSocketServer({ server })

      // Need to synchronously create the pair
      // Use a temporary server on random port
      let clientWs: import('ws').WebSocket | null = null
      let serverWs: import('ws').WebSocket | null = null
      let error: Error | null = null

      wss.on('connection', (ws) => {
        serverWs = ws
        ;(ws as any).accept = () => {} // CF WebSocket compatibility
      })

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number }
        try {
          clientWs = new (require('ws').WebSocket)(`ws://127.0.0.1:${addr.port}`)
          clientWs.on('open', () => {
            setImmediate(() => {
              server.close()
              wss.close()
            })
          })
        } catch (e) {
          error = e as Error
          server.close()
          wss.close()
        }
      })

      // Spin until we have the pair (synchronous requirement of WebSocketPair)
      // This is a hack but necessary since WebSocketPair must be synchronous
      const start = Date.now()
      while ((!clientWs || !serverWs) && !error && Date.now() - start < 3000) {
        require('deasync').runLoopOnce()
      }

      if (error) throw error
      if (!clientWs || !serverWs) throw new Error('WebSocketPair creation timed out')

      this[0] = clientWs
      this[1] = serverWs
    }
  }
}
