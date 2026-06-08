import { callObj as _callObj } from '@/modules'
import handler from './handler'

export { modules } from '@/modules'
export * from './event'
export { sync } from './sync'

export const callObj = {
  ...handler,
  ..._callObj,
}
