import { DislikeManage } from '@/modules/dislike/manage'
import { ListManage } from '@/modules/list/manage'
import { type DevicesInfo, UserDataManage } from './data'

export interface UserSpace {
  dataManage: UserDataManage
  listManage: ListManage
  dislikeManage: DislikeManage
  getDevices: () => Promise<LX.Sync.KeyInfo[]>
  removeDevice: (clientId: string) => Promise<void>
  flush: () => Promise<void>
}

// 模块级别单例，由 UserSyncDO 在 blockConcurrencyWhile 中初始化
let _userSpace: UserSpace | null = null

export const setUserSpace = (userSpace: UserSpace) => {
  _userSpace = userSpace
}

export const getUserSpace = (_name?: string): UserSpace => {
  if (!_userSpace) throw new Error('UserSpace not initialized')
  return _userSpace
}

export const createUserSpace = (
  devicesInfo: DevicesInfo,
  storage: DurableObjectStorage,
  listSnapshotInfo: any,
  listData: LX.Sync.List.ListData,
  dislikeSnapshotInfo: any,
  dislikeRules: LX.Dislike.DislikeRules,
  userName: string,
  maxSnapshotNum: number,
): UserSpace => {
  const dataManage = new UserDataManage(devicesInfo, storage)
  const listManage = new ListManage(
    storage,
    listSnapshotInfo,
    listData,
    userName,
    maxSnapshotNum,
  )
  const dislikeManage = new DislikeManage(
    storage,
    dislikeSnapshotInfo,
    dislikeRules,
    userName,
    maxSnapshotNum,
  )

  const userSpace: UserSpace = {
    dataManage,
    listManage,
    dislikeManage,
    async getDevices() {
      return this.dataManage.getAllClientKeyInfo()
    },
    async removeDevice(clientId) {
      await listManage.removeDevice(clientId)
      await dislikeManage.removeDevice(clientId)
      await dataManage.removeClientKeyInfo(clientId)
    },
    async flush() {
      await Promise.all([listManage.flush(), dislikeManage.flush()])
    },
  }
  return userSpace
}

export * from './data'
