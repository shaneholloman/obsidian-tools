import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const routePath = './.next/server/app/api/email/route.js'

if (!existsSync(routePath)) {
  throw new Error('Build output is missing. Run `pnpm build` before `pnpm check:email`.')
}

process.env.SECRET_KEY = 'test-secret'
process.env.GITHUB_USERNAME = 'octo'
process.env.GITHUB_REPO = 'vault'
process.env.GITHUB_ACCESS_TOKEN = 'gh-token'
process.env.OBSIDIAN_INBOX_PATH = 'Inbox'

const require = createRequire(import.meta.url)
const route = require('../.next/server/app/api/email/route.js')
const { POST } = route.routeModule.userland

const calls = []

global.fetch = async (url, init = {}) => {
  calls.push({ init, url: String(url) })

  if (init.method === 'GET') {
    return new Response(JSON.stringify({ message: 'not found' }), {
      status: 404,
    })
  }

  if (init.method === 'PUT') {
    return new Response(JSON.stringify({ content: { sha: 'mock-sha' } }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    })
  }

  throw new Error(`Unexpected fetch method: ${init.method}`)
}

const unauthorized = await POST(
  new Request('https://example.test/api/email', {
    body: JSON.stringify({
      HtmlBody: '<p>x</p>',
      Subject: 'Nope',
      TextBody: 'x',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  }),
)

assert.equal(unauthorized.status, 401)
assert.equal(calls.length, 0)

const authorized = await POST(
  new Request('https://example.test/api/email?token=test-secret', {
    body: JSON.stringify({
      HtmlBody: '<h1>Hello</h1><p>World</p>',
      Subject: 'Fwd: Bad / Name: Test?',
      TextBody: 'fallback',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  }),
)
const responseBody = await authorized.json()

assert.equal(authorized.status, 200)
assert.equal(responseBody.fileId, 'mock-sha')
assert.equal(calls.length, 2)

const [getCall, putCall] = calls
assert.equal(getCall.init.method, 'GET')
assert.equal(putCall.init.method, 'PUT')
assert.match(
  getCall.url,
  /\/repos\/octo\/vault\/contents\/Inbox%2FClippings%2FBad%20%20Name%20Test\.md$/,
)

const putBody = JSON.parse(putCall.init.body)
const markdown = Buffer.from(putBody.content, 'base64').toString('utf8')

assert.equal(putBody.message, 'Add or update Bad  Name Test.md')
assert.equal(markdown.trim(), 'Hello\n=====\n\nWorld')

console.log('Email route smoke check passed.')
