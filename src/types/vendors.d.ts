// CF Workers with nodejs_compat 支持 global，但 TS 需要声明
declare var global: typeof globalThis

// events 模块（nodejs_compat 提供运行时，此处仅声明类型）
declare module 'events' {
  export class EventEmitter {
    emit(event: string, ...args: any[]): boolean
    on(event: string, listener: (...args: any[]) => void): this
    off(event: string, listener: (...args: any[]) => void): this
    once(event: string, listener: (...args: any[]) => void): this
    addListener(event: string, listener: (...args: any[]) => void): this
    removeListener(event: string, listener: (...args: any[]) => void): this
  }
}

// aes-js 无官方类型包
declare module 'aes-js' {
  namespace ModeOfOperation {
    class ecb {
      constructor(key: Uint8Array)
      encrypt(data: Uint8Array): Uint8Array
      decrypt(data: Uint8Array): Uint8Array
    }
  }

  export { ModeOfOperation }
}

// @noble/hashes 子路径类型
declare module '@noble/hashes/legacy.js' {
  export function md5(data: Uint8Array): Uint8Array
}
declare module '@noble/hashes/utils.js' {
  export function bytesToHex(bytes: Uint8Array): string
}
