import { KafkaMessageHandler, SubscribeToOptions, TopicHandlerMap } from '../interfaces/consumer.interface';

export const TOPIC_HANDLERS_MAP = new Map<string, TopicHandlerMap>();

export function SubscribeTo(topic: string, options?: SubscribeToOptions) {
  return (target: any, key: any, descriptor: any) => {
    const handler: KafkaMessageHandler = target[key];
    TOPIC_HANDLERS_MAP.set(topic, { handler, ...options });
    return descriptor;
  };
}