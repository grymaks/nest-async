import { KafkaConfig, ProducerConfig, ConsumerConfig, AdminConfig } from 'kafkajs';
import { DecodersEnum } from './consumer.interface';

export interface NestAsyncModuleOptions {
  client: KafkaConfig;
  producer?: ProducerConfig;
  consumer?: ConsumerConfig;
  admin?: AdminConfig;
  schemaRegistryHost?: string;
  valueDecoderType?: DecodersEnum;
  keyDecoderType?: DecodersEnum;
}

export interface NestAsyncModuleAsyncOptions {
  useFactory: (
    ...args: any[]
  ) => Promise<NestAsyncModuleOptions> | NestAsyncModuleOptions;
  inject?: any[];
  imports?: any[];
}
