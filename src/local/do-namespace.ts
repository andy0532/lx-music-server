// DurableObjectNamespace adapter — manages DO instances per user name
// Replaces c.env.USER_SYNC in Cloudflare Workers

import { LocalDOState } from './do-state'
import type { UserSyncDO } from '@/durable/UserSyncDO'

export class LocalDONamespace {
  private instances = new Map<string, UserSyncDO>()
  private states = new Map<string, LocalDOState>()

  idFromName(name: string): DurableObjectId {
    return { name } as DurableObjectId
  }

  get(id: DurableObjectId): DurableObjectStub {
    const userName = (id as any).name
    let instance = this.instances.get(userName)
    if (!instance) {
      const state = new LocalDOState(userName)
      this.states.set(userName, state)
      instance = new (require('@/durable/UserSyncDO').UserSyncDO)(state, {}) as UserSyncDO
      this.instances.set(userName, instance)
    }
    return {
      fetch: (req: Request) => instance.fetch(req),
    } as DurableObjectStub
  }

  getOrCreate(userName: string): UserSyncDO {
    let instance = this.instances.get(userName)
    if (!instance) {
      const state = new LocalDOState(userName)
      this.states.set(userName, state)
      const { UserSyncDO: DOClass } = require('@/durable/UserSyncDO')
      instance = new DOClass(state, {}) as UserSyncDO
      this.instances.set(userName, instance)
    }
    return instance
  }
}
