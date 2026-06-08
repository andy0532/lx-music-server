import { EventEmitter } from 'events'
import { getUserSpace } from '@/user'

export class DislikeEvent extends EventEmitter {
  async dislike_data_overwrite(
    userName: string,
    dislikeData: LX.Dislike.DislikeRules,
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.dislikeManage.dislikeDataManage.overwriteDislikeInfo(
      dislikeData,
    )
    this.emit('dislike_data_overwrite', userName, dislikeData, isRemote)
  }

  async dislike_music_add(
    userName: string,
    musicInfo: LX.Dislike.DislikeMusicInfo[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.dislikeManage.dislikeDataManage.addDislikeInfo(musicInfo)
    this.emit('dislike_music_add', userName, musicInfo, isRemote)
  }

  async dislike_music_clear(userName: string, isRemote: boolean = false) {
    const userSpace = getUserSpace(userName)
    await userSpace.dislikeManage.dislikeDataManage.overwriteDislikeInfo('')
    this.emit('dislike_music_clear', userName, isRemote)
  }
}

type EventMethods = Omit<EventType, keyof EventEmitter>
declare class EventType extends DislikeEvent {
  on<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this
  once<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this
  off<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this
}
export type DislikeEventType = Omit<
  EventType,
  keyof Omit<EventEmitter, 'on' | 'off' | 'once'>
>
