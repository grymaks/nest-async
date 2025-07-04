import { DynamicModule, Module, Provider } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { KAFKA_MODULE_OPTIONS } from './constants';
import { NestAsyncModuleOptions, NestAsyncModuleAsyncOptions } from './interfaces';
import { KafkaService } from './services';
import { ConsumerService } from './services';

@Module({})
export class NestAsyncModule {
  static forRoot(options: NestAsyncModuleOptions): DynamicModule {
    return {
      module: NestAsyncModule,
      providers: [
        {
          provide: KAFKA_MODULE_OPTIONS,
          useValue: options,
        },
        this.createKafkaClientProvider(),
        KafkaService,
        ConsumerService,
      ],
      exports: [KafkaService, ConsumerService],
    };
  }

  static forRootAsync(options: NestAsyncModuleAsyncOptions): DynamicModule {
    return {
      module: NestAsyncModule,
      providers: [
        {
          provide: KAFKA_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        this.createKafkaClientProvider(),
        KafkaService,
        ConsumerService,
      ],
      exports: [KafkaService, ConsumerService],
    };
  }

  private static createKafkaClientProvider(): Provider {
    return {
      provide: Kafka,
      useFactory: (options: NestAsyncModuleOptions) => new Kafka(options.client),
      inject: [KAFKA_MODULE_OPTIONS],
    };
  }
}
