interface ExpectEvent {
  inTransaction: (txHash: any, emitter: any, eventName: string, eventArgs: {}) => Promise<any>
}

interface Time {
  increase: (duration: number) => Promise<any>
  advanceBlockTo: (target: number) => Promise<any>
  latest: () => Promise<any>
}

declare module '@openzeppelin/test-helpers' {
  export const expectEvent: ExpectEvent
  export const time: Time
}
