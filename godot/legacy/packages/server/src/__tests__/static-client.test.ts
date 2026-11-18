import { afterEach, describe, expect, it } from 'vitest'
import express from 'express'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer, request } from 'node:http'
import { brotliCompressSync, brotliDecompressSync, gzipSync, gunzipSync } from 'node:zlib'
import { mountClient } from '../static-client.js'

const cleanup: (() => void)[] = []
afterEach(() => { cleanup.splice(0).forEach(fn => fn()) })
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'word-static-'))
  mkdirSync(path.join(root, 'assets'))
  writeFileSync(path.join(root, 'index.html'), '<title>星语群岛</title>')
  const text = Buffer.from('console.log("星灯")')
  writeFileSync(path.join(root, 'assets/app-123.js'), text)
  writeFileSync(path.join(root, 'assets/app-123.js.br'), brotliCompressSync(text))
  writeFileSync(path.join(root, 'assets/app-123.js.gz'), gzipSync(text))
  const app = express(); mountClient(app, root)
  const server = createServer(app)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(() => { server.close(); rmSync(root, { recursive: true, force: true }) })
  const address = server.address() as { port: number }
  const get = (url: string, encoding: string, headers: Record<string, string> = {}, method='GET') => new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: address.port, path: url, method, headers: { 'accept-encoding': encoding, ...headers } }, res => {
      const chunks: Buffer[] = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks) }))
    }); req.on('error', reject); req.end()
  })
  return { get, text }
}
describe('static delivery', () => {
  it('negotiates compressed representations with the correct type and cache identity', async () => {
    const { get, text } = await fixture()
    const br = await get('/assets/app-123.js', 'br, gzip')
    expect(br.status).toBe(200); expect(br.headers['content-encoding']).toBe('br')
    expect(br.headers['content-type']).toContain('javascript')
    expect(brotliDecompressSync(br.body)).toEqual(text)
    expect(br.headers.vary).toContain('Accept-Encoding')
    expect(br.headers['cache-control']).toContain('immutable')
    const gzip = await get('/assets/app-123.js', 'br;q=0, gzip')
    expect(gzip.headers['content-encoding']).toBe('gzip'); expect(gunzipSync(gzip.body)).toEqual(text)
    const plain = await get('/assets/app-123.js', 'identity')
    expect(plain.headers['content-encoding']).toBeUndefined(); expect(plain.body).toEqual(text)
    const unchanged = await get('/assets/app-123.js', 'br', { 'if-none-match': br.headers.etag! })
    expect(unchanged.status).toBe(304)
    const head = await get('/assets/app-123.js', 'br', {}, 'HEAD')
    expect(head.headers['content-encoding']).toBe('br'); expect(head.body.length).toBe(0)
  })
  it('revalidates HTML and never returns the SPA as a missing image', async () => {
    const { get } = await fixture()
    const html = await get('/', 'identity')
    expect(html.headers['cache-control']).toBe('no-cache')
    expect((await get('/art/missing.webp', 'identity')).status).toBe(404)
    expect((await get('/assets/missing.js', 'br')).status).toBe(404)
    expect((await get('/journey', 'identity')).status).toBe(200)
  })
})
