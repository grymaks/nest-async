export interface IKafkaMessage {
  key?: string | Buffer;
  value: string | Buffer | null;
  headers?: Record<string, string | Buffer>;
  partition?: number;
  timestamp?: string;
}

export interface IEachMessagePayload {
  topic: string
  partition: number
  message: IKafkaMessage
  heartbeat(): Promise<void>
  pause(): () => void
}