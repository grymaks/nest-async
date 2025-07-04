import { Test, TestingModule } from '@nestjs/testing';
import { ConsumerService } from '../src/services/consumer.service';
import { Kafka } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { KafkaService } from '../src';

// 1. Создаем полные моки для всех зависимостей
class MockKafka {
  consumer() {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn(),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
  }
}

class MockSchemaRegistry {
  decode = jest.fn().mockImplementation(buffer => 
    buffer ? JSON.parse(buffer.toString()) : null
  );
}

describe('ConsumerService', () => {
  let testingModule: TestingModule
  let service: ConsumerService;
  let mockConsumer: any;
  let mockSchemaRegistry: MockSchemaRegistry;

  beforeAll(async () => {
    // 2. Инициализируем моки
    mockConsumer = new MockKafka().consumer();
    mockSchemaRegistry = new MockSchemaRegistry();

    testingModule = await Test.createTestingModule({
      providers: [
        ConsumerService,
        {
          provide: 'KAFKA_MODULE_OPTIONS',
          useValue: {
            client: { brokers: ['localhost:9092'] },
            consumer: { groupId: 'test-group' },
          },
        },
        {
          provide: Kafka,
          useValue: new MockKafka(), // Используем класс-мок вместо jest.fn()
        },
      ],
    }).compile();

    service = testingModule.get<ConsumerService>(ConsumerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // describe('onModuleInit', () => {
  //   it('should connect consumer', async () => {
  //     await service.onModuleInit();
  //     expect(mockConsumer.connect).toHaveBeenCalled();
  //   });
  // });

  describe('subscribe', () => {
    it('should subscribe to topic', async () => {
      const testHandler = jest.fn();
      mockConsumer.run.mockImplementation(({ eachMessage }: any) => 
        eachMessage({
          topic: 'test-topic',
          partition: 0,
          message: {
            value: Buffer.from(JSON.stringify({ key: 'value' })),
            offset: '0',
            headers: {},
          },
        })
      );

      await service.onModuleInit();
      await service.subscribe('test-topic', testHandler);

      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'test-topic',
        fromBeginning: false,
      });
      expect(testHandler).toHaveBeenCalled();
    });
  });
});
