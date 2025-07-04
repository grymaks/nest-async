import { 
  Injectable, 
  Inject, 
  Logger, 
  OnModuleInit, 
  OnModuleDestroy 
} from '@nestjs/common';
import { Kafka, Producer, Admin, RecordMetadata } from 'kafkajs';
import { KAFKA_MODULE_OPTIONS } from '../constants';
import { NestAsyncModuleOptions } from '../interfaces';
import { IKafkaMessage } from '../interfaces';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private producer!: Producer;
  private admin!: Admin;
  private isInitialized = false;

  constructor(
    @Inject(KAFKA_MODULE_OPTIONS)
    private readonly options: NestAsyncModuleOptions,
    private readonly kafka: Kafka,
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize producer
      this.producer = this.kafka.producer(this.options.producer || {});
      await this.producer.connect();
      this.logger.log('Kafka producer connected');

      // Initialize admin client if needed
      if (this.options.admin) {
        this.admin = this.kafka.admin(this.options.admin);
        await this.admin.connect();
        this.logger.log('Kafka admin connected');
      }

      this.isInitialized = true;
    } catch (err: any) {
      this.logger.error('Failed to initialize Kafka service', err.stack);
      throw err;
    }
  }

  async send(topic: string, messages: IKafkaMessage[]): Promise<RecordMetadata[]> {
    if (!this.isInitialized) {
      throw new Error('Kafka producer is not initialized');
    }

    try {
      const result = await this.producer.send({ topic, messages });
      this.logger.debug(`Sent ${messages.length} messages to ${topic}`);
      return result;
    } catch (err: any) {
      this.logger.error(`Failed to send messages to ${topic}`, err.stack);
      throw err;
    }
  }

  async createTopic(topic: string, numPartitions = 1, replicationFactor = 1): Promise<void> {
    if (!this.admin) {
      throw new Error('Kafka admin client is not initialized');
    }

    try {
      await this.admin.createTopics({
        topics: [{
          topic,
          numPartitions,
          replicationFactor
        }]
      });
      this.logger.log(`Topic ${topic} created`);
    } catch (err: any) {
      this.logger.error(`Failed to create topic ${topic}`, err.stack);
      throw err;
    }
  }

  async listTopics(): Promise<string[]> {
    if (!this.admin) {
      throw new Error('Kafka admin client is not initialized');
    }
    return this.admin.listTopics();
  }

  async onModuleDestroy() {
    const disconnectPromises: Promise<void>[] = [];

    if (this.producer) {
      disconnectPromises.push(this.producer.disconnect().then(() => {
        this.logger.log('Producer disconnected');
      }));
    }

    if (this.admin) {
      disconnectPromises.push(this.admin.disconnect().then(() => {
        this.logger.log('Admin disconnected');
      }));
    }

    await Promise.all(disconnectPromises);
  }

  getProducer(): Producer {
    if (!this.producer) {
      throw new Error('Producer is not initialized');
    }
    return this.producer;
  }

  getAdmin(): Admin {
    if (!this.admin) {
      throw new Error('Admin client is not initialized');
    }
    return this.admin;
  }
}
