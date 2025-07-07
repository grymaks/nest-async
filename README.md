# Nest Async - Kafka Module for NestJS

[![npm version](https://img.shields.io/npm/v/nest-async)](https://www.npmjs.com/package/nest-async)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A robust, production-ready Kafka integration module for NestJS built on [kafkajs](https://kafkajs.org/). Provides comprehensive Kafka client management with both synchronous and asynchronous configuration patterns.

## Features

- 🚀 **Decorator-based message handlers**
- ⚡ **Async configuration support** (works seamlessly with ConfigService)
- 🔄 **Automatic connection management**
- 📊 **Admin client for cluster operations**
- 🛡 **Full TypeScript support** with strict typing
- 🧩 **Modular architecture** (use only what you need)

## Installation

```bash
# Using yarn
yarn add nest-async kafkajs @nestjs/common

# Using npm
npm install nest-async kafkajs @nestjs/common
```

## Quick Start
### Basic Configuration
```ts
import { Module } from '@nestjs/common';
import { NestAsyncModule } from 'nest-async';

@Module({
  imports: [
    NestAsyncModule.forRoot({
      client: {
        brokers: ['localhost:9092'],
        clientId: 'my-app',
      },
      producer: {
        allowAutoTopicCreation: true,
      },
      valueDecoderType: DecodersEnum.JSON; // default DecodersEnum.JSON
      keyDecoderType: DecodersEnum.STRING; // default DecodersEnum.STRING
    }),
  ],
})
export class AppModule {}
```

### Producing Messages
```typescript
import { Injectable } from '@nestjs/common';
import { KafkaService } from 'nest-async';

@Injectable()
export class OrderService {
  constructor(private readonly kafkaService: KafkaService) {}

  async createOrder(orderData: any) {
    await this.kafkaService.send('orders', [{
      key: orderData.id,
      value: JSON.stringify(orderData),
      headers: {
        'event-type': 'order.created'
      }
    }]);
  }
}
```
### Consuming Messages
#### Decorator Style (Recommended)
```typescript
import { Controller } from '@nestjs/common';
import { SubscribeTo } from 'nest-async';

@Controller()
export class OrdersController {
  @SubscribeTo('topic-name', options)
  async handleNewOrders(payload: any) {
    const order = JSON.parse(payload.message.value.toString());
    console.log('Processing order:', order.id);
  }
}
```
#### Service Style
```typescript
import { OnModuleInit } from '@nestjs/common';
import { ConsumerService } from 'nest-async';

@Injectable()
export class AnalyticsService implements OnModuleInit {
  constructor(private readonly consumerService: ConsumerService) {}

  async onModuleInit() {
    await this.consumerService.subscribe(
      'analytics-events',
      this.processAnalyticsEvent.bind(this)
    );
  }

  private async processAnalyticsEvent(payload: any) {
    // Event processing logic
  }
}
```
### Advanced Configuration
#### Async Setup with ConfigService
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestAsyncModule } from 'nest-async';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestAsyncModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        client: {
          brokers: config.get('KAFKA_BROKERS').split(','),
          ssl: config.get('KAFKA_SSL') === 'true',
          sasl: {
            mechanism: 'scram-sha-256',
            username: config.get('KAFKA_USERNAME'),
            password: config.get('KAFKA_PASSWORD'),
          },
        },
        producer: {
          transactionTimeout: 30000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```
### Admin Operations
```typescript
import { Injectable } from '@nestjs/common';
import { KafkaService } from 'nest-async';

@Injectable()
export class KafkaAdminService {
  constructor(private readonly kafkaService: KafkaService) {}

  async setupTopics() {
    const admin = this.kafkaService.getAdmin();
    await admin.createTopics({
      topics: [
        {
          topic: 'orders',
          numPartitions: 3,
          replicationFactor: 2,
        },
        {
          topic: 'payments',
          numPartitions: 2,
          replicationFactor: 2,
        }
      ],
    });
  }
}
```
API Reference
Module Options
Option	Type	Description
client	KafkaConfig	Required Kafka client configuration
producer	ProducerConfig	Optional producer settings
consumer	ConsumerConfig	Optional consumer settings
admin	AdminConfig	Optional admin client settings
#### Decorators
Decorator	Parameters	Description
```ts
@SubscribeTo(topic: string, { fromBeginning?: boolean })
```
Marks method as message handler
#### Services
KafkaService
```ts
send(topic: string, messages: Message[]): Promise<RecordMetadata[]>

getProducer(): Producer

getAdmin(): Admin
```
ConsumerService
```ts
subscribe(topic: string, handler: (payload) => Promise<void>): Promise<void>

pause(topic: string): Promise<void>

resume(topic: string): Promise<void>
```
Best Practices
Error Handling: Always wrap message handlers in try/catch blocks

Connection Management: Let the module handle connections automatically

Message Serialization: Use consistent serialization (JSON recommended)

Topic Naming: Follow domain-driven naming conventions

Monitoring: Implement health checks for Kafka connections

License
MIT © [Max Grudinkin]