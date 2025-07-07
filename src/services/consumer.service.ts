import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
import { KAFKA_MODULE_OPTIONS } from '../constants';
import { IEachMessagePayload, NestAsyncModuleOptions } from '../interfaces';
import { DecodersEnum, KafkaMessageHandler } from '../interfaces/consumer.interface';
import { TOPIC_HANDLERS_MAP } from '../decorators';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

@Injectable()
export class ConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly registry?: SchemaRegistry;
  private readonly logger = new Logger(ConsumerService.name);
  private consumer!: Consumer;
  private isConnected = false;
  private readonly valueDecoder: { decode: (payload: any) => any };
  private readonly keyDecoder: { decode: (payload: any) => any };


  constructor(
    @Inject(KAFKA_MODULE_OPTIONS)
    private readonly options: NestAsyncModuleOptions,
    private readonly kafka: Kafka,
  ) {
    this.logger.log('ConsumerService initialized');
    if (options.schemaRegistryHost) {
      this.registry = new SchemaRegistry({ host: options.schemaRegistryHost });
    }
    this.valueDecoder = this.getDecoder('valueDecoderType');
    this.keyDecoder = this.getDecoder('keyDecoderType');
  }

    async registerTopicHandlers() {
      for (const options of TOPIC_HANDLERS_MAP) {
        const handler = TOPIC_HANDLERS_MAP.get(options[0])!.handler;
        await this.subscribe(options[0], handler)
      }
  }

  async onModuleInit() {
    try {
      await this.connect();
      await this.registerTopicHandlers();
    } catch (err) {
      this.logger.error('Failed to initialize consumer', err);
      throw err;
    }
  }

  private async connect() {
    if (this.isConnected) return;

    this.logger.log('Attempting to connect consumer...');
    this.logger.debug(`Consumer config: ${JSON.stringify(this.options.consumer)}`);

    this.consumer = this.kafka.consumer({
      groupId: this.options.consumer?.groupId ?? 'nestjs-group',
      ...this.options.consumer
    });

    try {
      await this.consumer.connect();
      this.isConnected = true;
      this.logger.log('Kafka consumer connected successfully');
      this.logger.debug(`Connected to brokers: ${this.options.client.brokers} successfully`);
    } catch (err: any) {
      this.logger.error('Consumer connection error', {
        error: err.message,
        stack: err.stack,
        brokers: this.options.client.brokers
      });
      throw err;
    }
  }

  async subscribe(topic: string, handler: KafkaMessageHandler) {
    if (!this.isConnected) {
      throw new Error('Consumer is not connected');
    }

    try {
      this.logger.log(`Subscribing to topic: ${topic}`);
      await this.consumer.subscribe({ topic });
      await this.consumer.run({
        eachMessage: async (payload) => {
          
          try {
            const message = await this.decodeMessage(payload);
            this.logger.log(`Message received. TOPIC: ${topic}. Message ${JSON.stringify(message)}.`);
            await handler({ ...payload, ...message });
          } catch (err: any) {
            this.logger.error(`Error processing message from ${topic}`, {
              error: err.message,
              partition: payload.partition,
              offset: payload.message.offset
            });
          }
        },
      });
      this.logger.log(`Successfully subscribed to ${topic}`);
    } catch (err) {
      this.logger.error(`Failed to subscribe to ${topic}`, err);
      throw err;
    }
  }

  private readonly getDecoder = (type: 'keyDecoderType' | 'valueDecoderType') => {
    const defaultDecoder = type === 'keyDecoderType' ? DecodersEnum.STRING : DecodersEnum.JSON;
    const decoderType = this.options[type] ?? defaultDecoder;
    switch (decoderType) {
      case DecodersEnum.AVRO:
        return this.avroDecoder();
      case DecodersEnum.JSON:
        return this.jsonDecoder();
      default:
        return this.stringDecoder();
    }
  };

  

    private readonly decodeMessage = async <T>(payload: EachMessagePayload): Promise<IEachMessagePayload> => {
    const key = await this.keyDecoder.decode(payload.message.key) as string;
    const value = await this.valueDecoder.decode(payload.message.value);
    const headers = payload.message.headers || {}
    const decodedHeaders = Object.entries(headers).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {});
    return {...payload, message: { ...payload.message, value, key, headers: decodedHeaders }, };
  };

  private readonly avroDecoder = () => ({
    decode: (buffer: Buffer) => this.registry?.decode(buffer)
  });

  private readonly jsonDecoder = () => ({
    decode: (buffer: Buffer) => JSON.parse(String(buffer))
  });

  private readonly stringDecoder = () => ({
    decode: (buffer: Buffer) => String(buffer)
  });

  async onModuleDestroy() {
    if (this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.logger.log('Consumer disconnected successfully');
      } catch (err) {
        this.logger.error('Error during consumer disconnection', err);
      }
    }
  }
}
