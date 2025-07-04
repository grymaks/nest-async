import { IEachMessagePayload } from './message.interface';

export interface SubscribeToOptions {
  fromBeginning?: boolean;
}

export interface TopicHandlerMap extends SubscribeToOptions {
  handler: KafkaMessageHandler
}

export type KafkaMessageHandler = (payload: IEachMessagePayload) => Promise<void>;

export enum DecodersEnum {
  AVRO = 'avro',
  JSON = 'json',
  STRING = 'string'
}
