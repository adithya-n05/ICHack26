import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let subscriberClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => console.error('[Redis] Client Error:', err));

  await redisClient.connect();
  console.log('[Redis] Connected');

  return redisClient;
};

export const publishEvent = async (channel: string, data: Record<string, unknown>): Promise<void> => {
  if (!redisClient || !redisClient.isOpen) {
    await connectRedis();
  }
  if (redisClient) {
    await redisClient.publish(channel, JSON.stringify(data));
    console.log(`[Redis] Published to ${channel}:`, data);
  }
};

export const subscribeToChannel = async (
  channel: string,
  callback: (message: string) => void
): Promise<void> => {
  if (!redisClient || !redisClient.isOpen) {
    await connectRedis();
  }

  // Create a separate client for subscriptions
  if (!subscriberClient) {
    subscriberClient = redisClient!.duplicate();
    await subscriberClient.connect();
  }

  await subscriberClient.subscribe(channel, (message) => {
    console.log(`[Redis] Received on ${channel}:`, message);
    callback(message);
  });

  console.log(`[Redis] Subscribed to channel: ${channel}`);
};

export const getRedisClient = (): RedisClientType | null => redisClient;

export const disconnectRedis = async (): Promise<void> => {
  if (subscriberClient && subscriberClient.isOpen) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
  console.log('[Redis] Disconnected');
};
