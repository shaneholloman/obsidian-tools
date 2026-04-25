import { Client, Receiver } from '@upstash/qstash'
import { NextRequest } from 'next/server'
import pako from 'pako'
import getByteLength from 'string-byte-length'

import { RouteMessageMap, UpstashRoute } from '@/types/upstash'

const gzip = async (input: string): Promise<Buffer> => {
  return Buffer.from(pako.gzip(input))
}
let client: Client | null = null
let receiver: Receiver | null = null

type UpstashHeaders = {
  'Content-Type': string
  'Authorization': string
  'Upstash-Delay'?: string
  'Upstash-Not-Before'?: string
  'Upstash-Method'?: string
  'Content-Encoding'?: string
  'Upstash-Forward-Delay-Applied'?: string
}

function getClient() {
  if (!client) {
    client = new Client({ token: process.env.QSTASH_TOKEN! })
  }

  return client
}

function getReceiver() {
  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    })
  }

  return receiver
}

function getUpstashHeaders(): UpstashHeaders {
  return {
    'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function verifyUpstashSignature(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('Upstash-Signature') ?? ''
  let isValid = false
  try {
    isValid = await getReceiver().verify({ body, signature })
    if (!isValid) {
      console.log('Invalid signature')
      throw new Error('Invalid signature')
    }
  } catch (err) {
    console.log('Caught Error: ', err)
    throw new Error('Invalid signature')
  }
  return JSON.parse(body)
}

export async function getUpstashQueue(queueName: string) {
  const queue = getClient().queue({ queueName })
  const queueInfo = await queue.get()
  return queueInfo
}

export async function publishToUpstash<Route extends UpstashRoute>(
  url: Route,
  message: RouteMessageMap[Route],
  options?: {
    queue?: string
    queueParallelism?: number
    delay?: number
    absoluteDelay?: string
    upstashMethod?: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH'
  }
) {
  console.log('Publishing to Upstash')
  console.log('URL: ', url)
  const urlPath = `https://${process.env.NEXT_PUBLIC_SITE_URL}${url}`
  if (options?.queue) {
    const queue = getClient().queue({ queueName: options.queue })
    if (options.queueParallelism) {
      queue.upsert({ parallelism: options.queueParallelism })
    }
    await queue.enqueueJSON({
      url: urlPath,
      body: message,
    })
    return
  }
  if (options?.absoluteDelay) {
    // figure out seconds of absolute delay
    const secondsFromNow =
      Number(options.absoluteDelay) - Math.floor(Date.now() / 1000)
    console.log('Absolute Delay: ', secondsFromNow)
  }

  const headers = getUpstashHeaders()
  if (options?.delay) {
    headers['Upstash-Delay'] = `${options.delay}s`
    console.log('Delay: ', options.delay)
    headers['Upstash-Forward-Delay-Applied'] = `${options.delay}`
  }
  if (options?.absoluteDelay) {
    headers['Upstash-Not-Before'] = options.absoluteDelay
  }
  if (options?.upstashMethod) {
    headers['Upstash-Method'] = options.upstashMethod
  }
  let messageToSend: string | Buffer = JSON.stringify(message)
  const size = getByteLength(messageToSend)
  console.log('Size: ', size)

  if (size > 1000000) {
    console.log('Message too large, compressing...')
    headers['Content-Type'] = 'application/octet-stream'
    headers['Content-Encoding'] = 'gzip'
    messageToSend = await gzip(messageToSend)
  }
  console.log(`${process.env.QSTASH_URL}${urlPath}`)

  const response = await fetch(`${process.env.QSTASH_URL}${urlPath}`, {
    method: 'POST',
    headers,
    body: messageToSend,
  })
  if (response.ok) {
    console.log('Successfully published to Upstash')
    return await response.json()
  }
  console.log('Error publishing to Upstash')
  console.log('Status: ', response.status)
  // console.log('Message: ', message)
  // console.log(await response.json())
  throw new Error('Error publishing to Upstash')
}
