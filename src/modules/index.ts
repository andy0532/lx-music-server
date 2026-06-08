import { sync as dislikeSync } from './dislike'
import { sync as listSync } from './list'

export const callObj = Object.assign({}, listSync.handler, dislikeSync.handler)

export const modules = {
  list: listSync,
  dislike: dislikeSync,
}

export { DislikeEvent, type DislikeEventType, DislikeManage } from './dislike'
export { ListEvent, type ListEventType, ListManage } from './list'

export const featureVersion = {
  list: 1,
  dislike: 1,
} as const
