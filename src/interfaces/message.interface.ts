export interface IKafkaMessage<T = string | Buffer | null> {
  key?: string | Buffer;
  value: T;
  headers?: Record<string, string | Buffer>;
  partition?: number;
  timestamp?: string;
}

export interface IEachMessagePayload<T = string | Buffer | null> {
  topic: string
  partition: number
  message: IKafkaMessage<T>
  heartbeat(): Promise<void>
  pause(): () => void
}