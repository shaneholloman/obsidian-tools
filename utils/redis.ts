import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function getRedis() {
  if (!redis) {
    redis = new Redis({
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      url: process.env.UPSTASH_REDIS_REST_URL,
    })
  }

  return redis
}
