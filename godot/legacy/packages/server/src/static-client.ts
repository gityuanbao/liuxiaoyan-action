import express, { type Express } from 'express'
import path from 'node:path'
import { existsSync } from 'node:fs'

export function mountClient(app: Express, root: string) {
  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) || !/^\/assets\/[\w.-]+\.(js|css)$/.test(req.path)) return next()
    const encoding = req.acceptsEncodings('br', 'gzip', 'identity')
    const suffix = encoding === 'br' ? '.br' : encoding === 'gzip' ? '.gz' : ''
    const file = path.join(root, req.path + suffix)
    if (!suffix || !existsSync(file)) return next()
    res.vary('Accept-Encoding')
    res.setHeader('Content-Encoding', encoding as string)
    res.type(req.path.endsWith('.js') ? 'application/javascript' : 'text/css')
    res.sendFile(file, { maxAge: '1y', immutable: true, acceptRanges: false })
  })
  app.use(express.static(root, { maxAge: '1d', setHeaders(res, file) {
    if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
    if (/[/\\]assets[/\\].+\.(js|css)$/.test(file)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.vary('Accept-Encoding')
    }
    if (/[/\\]optimized-v1[/\\].+-[a-f0-9]{12}\.webp$/.test(file)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }}))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/health')) return next()
    if (/^\/(assets|art|audio)\//.test(req.path)) { res.status(404).end(); return }
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(root, 'index.html'))
  })
}
