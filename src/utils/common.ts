// 非业务工具方法

export const getRandom = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min)) + min

export const arrPush = <T>(list: T[], newList: T[]) => {
  for (let i = 0; i * 1000 < newList.length; i++) {
    list.push(...newList.slice(i * 1000, (i + 1) * 1000))
  }
  return list
}

export const arrUnshift = <T>(list: T[], newList: T[]) => {
  for (let i = 0; i * 1000 < newList.length; i++) {
    list.splice(i * 1000, 0, ...newList.slice(i * 1000, (i + 1) * 1000))
  }
  return list
}

export const arrPushByPosition = <T>(
  list: T[],
  newList: T[],
  position: number,
) => {
  for (let i = 0; i * 1000 < newList.length; i++) {
    list.splice(
      position + i * 1000,
      0,
      ...newList.slice(i * 1000, (i + 1) * 1000),
    )
  }
  return list
}

export function throttle<Args extends any[]>(
  fn: (...args: Args) => void | Promise<void>,
  delay = 100,
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let _args: Args
  return (...args: Args) => {
    _args = args
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      void fn(..._args)
    }, delay)
  }
}

export function debounce<Args extends any[]>(
  fn: (...args: Args) => void | Promise<void>,
  delay = 100,
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let _args: Args
  return (...args: Args) => {
    _args = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void fn(..._args)
    }, delay)
  }
}
