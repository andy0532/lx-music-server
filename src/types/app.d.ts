import { type DislikeEventType } from '@/modules/dislike/event'
import { type ListEventType } from '@/modules/list/event'

declare global {
  // eslint-disable-next-line no-var
  var event_list: ListEventType
  // eslint-disable-next-line no-var
  var event_dislike: DislikeEventType
}
