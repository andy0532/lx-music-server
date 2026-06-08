import { EventEmitter } from 'events'
import { getUserSpace } from '@/user'

export class ListEvent extends EventEmitter {
  async list_data_overwrite(
    userName: string,
    listData: MakeOptional<LX.List.ListDataFull, 'tempList'>,
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.listDataOverwrite(listData)
    this.emit('list_data_overwrite', userName, listData, isRemote)
  }

  async list_create(
    userName: string,
    position: number,
    lists: LX.List.UserListInfo[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    for (const list of lists) {
      await userSpace.listManage.listDataManage.userListCreate({
        ...list,
        position,
      })
    }
    this.emit('list_create', userName, position, lists, isRemote)
  }

  async list_remove(
    userName: string,
    ids: string[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.userListsRemove(ids)
    this.emit('list_remove', userName, ids, isRemote)
  }

  async list_update(
    userName: string,
    lists: LX.List.UserListInfo[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.userListsUpdate(lists)
    this.emit('list_update', userName, lists, isRemote)
  }

  async list_update_position(
    userName: string,
    position: number,
    ids: string[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.userListsUpdatePosition(
      position,
      ids,
    )
    this.emit('list_update_position', userName, position, ids, isRemote)
  }

  async list_music_overwrite(
    userName: string,
    listId: string,
    musicInfos: LX.Music.MusicInfo[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.listMusicOverwrite(
      listId,
      musicInfos,
    )
    this.emit('list_music_overwrite', userName, listId, musicInfos, isRemote)
  }

  async list_music_add(
    userName: string,
    listId: string,
    musicInfos: LX.Music.MusicInfo[],
    addMusicLocationType: LX.AddMusicLocationType,
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.listMusicAdd(
      listId,
      musicInfos,
      addMusicLocationType,
    )
    this.emit(
      'list_music_add',
      userName,
      listId,
      musicInfos,
      addMusicLocationType,
      isRemote,
    )
  }

  async list_music_move(
    userName: string,
    fromId: string,
    toId: string,
    musicInfos: LX.Music.MusicInfo[],
    addMusicLocationType: LX.AddMusicLocationType,
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.listMusicMove(
      fromId,
      toId,
      musicInfos,
      addMusicLocationType,
    )
    this.emit(
      'list_music_move',
      userName,
      fromId,
      toId,
      musicInfos,
      addMusicLocationType,
      isRemote,
    )
  }

  async list_music_remove(
    userName: string,
    listId: string,
    ids: string[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.listMusicRemove(listId, ids)
    this.emit('list_music_remove', userName, listId, ids, isRemote)
  }

  async list_music_update(
    userName: string,
    musicInfos: LX.List.ListActionMusicUpdate,
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.listMusicUpdateInfo(musicInfos)
    this.emit('list_music_update', userName, musicInfos, isRemote)
  }

  async list_music_clear(
    userName: string,
    ids: string[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.listMusicClear(ids)
    this.emit('list_music_clear', userName, ids, isRemote)
  }

  async list_music_update_position(
    userName: string,
    listId: string,
    position: number,
    ids: string[],
    isRemote: boolean = false,
  ) {
    const userSpace = getUserSpace(userName)
    await userSpace.listManage.listDataManage.listMusicUpdatePosition(
      listId,
      position,
      ids,
    )
    this.emit(
      'list_music_update_position',
      userName,
      listId,
      position,
      ids,
      isRemote,
    )
  }
}

type EventMethods = Omit<EventType, keyof EventEmitter>
declare class EventType extends ListEvent {
  on<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this
  once<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this
  off<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this
}
export type ListEventType = Omit<
  EventType,
  keyof Omit<EventEmitter, 'on' | 'off' | 'once'>
>
