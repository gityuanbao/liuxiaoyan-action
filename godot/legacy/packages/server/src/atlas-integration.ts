import type { Express } from 'express'
import path from 'path'
import fs from 'fs'

const SOURCE = 'https://github.com/sallowayma-git/IELTS-practice'
const RUNTIME_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.pdf', '.txt'])

// Keep the unmodified GPL application in its own checkout and URL namespace.
// Serve only runtime files, never the checkout's Git or development directories.
export function mountAtlas(app: Express, serverDirectory: string) {
  const atlasRoot = path.resolve(process.env.IELTS_ATLAS_DIR || path.resolve(serverDirectory, '../../../../ielts-practice'))
  const atlasAvailable = fs.existsSync(path.join(atlasRoot, 'index.html'))
  const resolvedRoot = atlasAvailable ? fs.realpathSync(atlasRoot) : atlasRoot
  let readingCount = 0
  try {
    const manifest = fs.readFileSync(path.join(atlasRoot, 'assets/generated/reading-exams/manifest.js'), 'utf8')
    readingCount = new Set(Array.from(manifest.matchAll(/"examId"\s*:\s*"([^"]+)"/g), match => match[1])).size
  } catch { /* A missing optional library must not prevent TypeDuel from starting. */ }

  app.get('/api/atlas-status', (_req, res) => {
    res.json({ available: atlasAvailable, readingCount, listeningRequiresOwnResources: true,
      source: SOURCE, license: 'GPL-3.0', url: '/ielts-atlas/',
      notice: 'IELTS Atlas 作为独立学习组件运行；题源与第三方素材仅供本地个人学习，听力需自行导入。' })
  })

  app.get(/^\/ielts-atlas$/, (_req, res) => res.redirect(302, '/ielts-atlas/'))
  app.use('/ielts-atlas', (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.sendStatus(405); return }
    if (!atlasAvailable) { res.status(503).type('text').send('IELTS Atlas 尚未安装。请将完整项目放在 TypeDuel 同级目录 ielts-practice。'); return }
    let relativePath: string
    try { relativePath = decodeURIComponent(req.path).replace(/^\/+/, '') || 'index.html' }
    catch { res.sendStatus(400); return }
    const segments = relativePath.split(/[\\/]/)
    if (segments.some(segment => !segment || segment.startsWith('.') || segment === '..') || relativePath.includes('\\')) {
      res.sendStatus(404); return
    }
    const isRootFile = relativePath === 'index.html' || relativePath === 'LICENSE'
    const isRuntimeFolder = ['js', 'css', 'assets', 'ReadingPractice', 'ListeningPractice', '三月'].includes(segments[0])
      && !(segments[0] === 'assets' && segments[1] === 'scripts')
    const isRuntimeTemplate = ['templates/exam-placeholder.html', 'templates/template_base.html', 'templates/question-types.js'].includes(relativePath)
    if (!(isRootFile || ((isRuntimeFolder || isRuntimeTemplate) && RUNTIME_EXTENSIONS.has(path.extname(relativePath).toLowerCase())))) {
      res.sendStatus(404); return
    }
    const filePath = path.resolve(atlasRoot, relativePath)
    let realFile: string
    try { realFile = fs.realpathSync(filePath) }
    catch { res.sendStatus(404); return }
    const relativeReal = path.relative(resolvedRoot, realFile)
    if (relativeReal.startsWith('..') || path.isAbsolute(relativeReal) || !fs.statSync(realFile).isFile()) {
      res.sendStatus(404); return
    }
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (path.extname(realFile).toLowerCase() === '.html') {
      // Every original practice window retains its opener/session handshake.
      // The bridge reads committed records, so iframe and popup results converge.
      const original = fs.readFileSync(realFile, 'utf8')
      const bridge = '<script src="/atlas-bridge.js"></script>'
      res.type('html').send(original.replace(/<\/head>/i, `${bridge}</head>`))
      return
    }
    if (relativePath === 'LICENSE') res.type('text')
    res.sendFile(realFile)
  })
}
