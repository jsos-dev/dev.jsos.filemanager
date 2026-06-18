import express from 'express'
import multer from 'multer'
import { ZipArchive as Archiver } from 'archiver'
import AdmZip from 'adm-zip'
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, existsSync, createReadStream, createWriteStream, cpSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, 'dist')
const DEBUG = process.env.DEBUG !== 'false'

if (DEBUG) console.log('[File Manager] Debug mode enabled')

const app = express()
app.use(express.json())
app.use(express.static(DIST_DIR))

const upload = multer({ dest: join(__dirname, '.upload-tmp') })

function sortEntries(a, b) {
  if (a.isDirectory !== b.isDirectory) return b.isDirectory - a.isDirectory
  return a.name.localeCompare(b.name)
}

function isBinaryFile(buffer) {
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    if (buffer[i] === 0) return true
  }
  return false
}

app.get('/api/files', (req, res) => {
  try {
    const dirPath = req.query.path || process.env.DATA_DIR || '/'
    if (DEBUG) console.log(`Listing directory: ${dirPath}`)

    if (!existsSync(dirPath)) {
      if (DEBUG) console.log(`Directory not found: ${dirPath}`)
      return res.status(404).json({ error: 'Directory not found' })
    }

    const stat = statSync(dirPath)
    if (!stat.isDirectory()) {
      if (DEBUG) console.log(`Path is not a directory: ${dirPath}`)
      return res.status(400).json({ error: 'Path is not a directory' })
    }

    const entries = readdirSync(dirPath).map(name => {
      try {
        const entryStat = statSync(join(dirPath, name))
        return {
          name,
          isDirectory: entryStat.isDirectory(),
          size: entryStat.isDirectory() ? null : entryStat.size,
          mtime: entryStat.mtime.toISOString(),
        }
      } catch {
        return {
          name,
          isDirectory: false,
          size: null,
          mtime: null,
        }
      }
    }).sort(sortEntries)

    const parent = dirPath === '/' ? null : dirname(dirPath)

    if (DEBUG) console.log(`Found ${entries.length} items in ${dirPath}`)
    res.json({ path: dirPath, parent, entries })
  } catch (err) {
    if (DEBUG) console.error(`Error listing directory:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/files/content', (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    if (DEBUG) console.log(`Reading file: ${filePath}`)

    if (!existsSync(filePath)) {
      if (DEBUG) console.log(`File not found: ${filePath}`)
      return res.status(404).json({ error: 'File not found' })
    }

    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      if (DEBUG) console.log(`Path is a directory: ${filePath}`)
      return res.status(400).json({ error: 'Cannot read directory content' })
    }

    const buffer = readFileSync(filePath)
    const binary = isBinaryFile(buffer)

    if (binary) {
      if (DEBUG) console.log(`Binary file detected: ${filePath} (${stat.size} bytes)`)
      return res.json({
        path: filePath,
        content: null,
        isBinary: true,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      })
    }

    if (DEBUG) console.log(`Text file loaded: ${filePath} (${stat.size} bytes)`)
    res.json({
      path: filePath,
      content: buffer.toString('utf-8'),
      isBinary: false,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    })
  } catch (err) {
    if (DEBUG) console.error(`Error reading file:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/files', (req, res) => {
  try {
    const { path: dirPath, name, type } = req.body

    if (DEBUG) console.log(`Creating ${type}: ${dirPath}/${name}`)

    if (!dirPath || !name) {
      return res.status(400).json({ error: 'Path and name are required' })
    }

    if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
      return res.status(400).json({ error: 'Invalid name' })
    }

    const fullPath = join(dirPath, name)

    if (existsSync(fullPath)) {
      if (DEBUG) console.log(`Already exists: ${fullPath}`)
      return res.status(409).json({ error: 'File or folder already exists' })
    }

    if (type === 'directory') {
      mkdirSync(fullPath, { recursive: true })
      if (DEBUG) console.log(`Created directory: ${fullPath}`)
    } else {
      writeFileSync(fullPath, '', 'utf-8')
      if (DEBUG) console.log(`Created file: ${fullPath}`)
    }

    res.json({ success: true, path: fullPath })
  } catch (err) {
    if (DEBUG) console.error(`Error creating:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/files', (req, res) => {
  try {
    const { oldPath, newPath } = req.body

    if (DEBUG) console.log(`Renaming: ${oldPath} -> ${newPath}`)

    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Old path and new path are required' })
    }

    if (!existsSync(oldPath)) {
      if (DEBUG) console.log(`Source not found: ${oldPath}`)
      return res.status(404).json({ error: 'Source not found' })
    }

    if (existsSync(newPath)) {
      if (DEBUG) console.log(`Destination already exists: ${newPath}`)
      return res.status(409).json({ error: 'Destination already exists' })
    }

    renameSync(oldPath, newPath)

    if (DEBUG) console.log(`Renamed successfully: ${newPath}`)
    res.json({ success: true, path: newPath })
  } catch (err) {
    if (DEBUG) console.error(`Error renaming:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/files', (req, res) => {
  try {
    const filePath = req.query.path

    if (DEBUG) console.log(`Deleting: ${filePath}`)

    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    if (!existsSync(filePath)) {
      if (DEBUG) console.log(`File not found: ${filePath}`)
      return res.status(404).json({ error: 'File not found' })
    }

    rmSync(filePath, { recursive: true, force: true })

    if (DEBUG) console.log(`Deleted successfully: ${filePath}`)
    res.json({ success: true })
  } catch (err) {
    if (DEBUG) console.error(`Error deleting:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

// ========== Move files ==========
app.put('/api/files/move', (req, res) => {
  try {
    const { sources, destDir } = req.body
    if (DEBUG) console.log(`Moving ${sources?.length || 0} items to: ${destDir}`)

    if (!sources || sources.length === 0) {
      return res.status(400).json({ error: 'No sources provided' })
    }

    if (!destDir || !existsSync(destDir)) {
      return res.status(400).json({ error: 'Invalid destination directory' })
    }

    const moved = []
    const errors = []

    for (const srcPath of sources) {
      if (!existsSync(srcPath)) {
        errors.push({ path: srcPath, error: 'Source not found' })
        continue
      }

      const name = basename(srcPath)
      let destPath = join(destDir, name)

      if (existsSync(destPath)) {
        const base = name.replace(/\.[^.]+$/, '')
        const ext = name.includes('.') ? '.' + name.split('.').pop() : ''
        let counter = 1
        while (existsSync(destPath)) {
          destPath = join(destDir, `${base} (${counter})${ext}`)
          counter++
        }
      }

      try {
        renameSync(srcPath, destPath)
        moved.push(destPath)
        if (DEBUG) console.log(`Moved: ${srcPath} -> ${destPath}`)
      } catch (err) {
        errors.push({ path: srcPath, error: err.message })
        if (DEBUG) console.error(`Failed to move ${srcPath}:`, err.message)
      }
    }

    res.json({ success: errors.length === 0, moved, errors })
  } catch (err) {
    if (DEBUG) console.error('Move error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ========== Copy files ==========
app.put('/api/files/copy', (req, res) => {
  try {
    const { sources, destDir } = req.body
    if (DEBUG) console.log(`Copying ${sources?.length || 0} items to: ${destDir}`)

    if (!sources || sources.length === 0) {
      return res.status(400).json({ error: 'No sources provided' })
    }

    if (!destDir || !existsSync(destDir)) {
      return res.status(400).json({ error: 'Invalid destination directory' })
    }

    const copied = []
    const errors = []

    for (const srcPath of sources) {
      if (!existsSync(srcPath)) {
        errors.push({ path: srcPath, error: 'Source not found' })
        continue
      }

      const name = basename(srcPath)
      let destPath = join(destDir, name)

      if (existsSync(destPath)) {
        const base = name.replace(/\.[^.]+$/, '')
        const ext = name.includes('.') ? '.' + name.split('.').pop() : ''
        let counter = 1
        while (existsSync(destPath)) {
          destPath = join(destDir, `${base} (${counter})${ext}`)
          counter++
        }
      }

      try {
        cpSync(srcPath, destPath, { recursive: true })
        copied.push(destPath)
        if (DEBUG) console.log(`Copied: ${srcPath} -> ${destPath}`)
      } catch (err) {
        errors.push({ path: srcPath, error: err.message })
        if (DEBUG) console.error(`Failed to copy ${srcPath}:`, err.message)
      }
    }

    res.json({ success: errors.length === 0, copied, errors })
  } catch (err) {
    if (DEBUG) console.error('Copy error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ========== Batch delete ==========
app.put('/api/files/batch-delete', (req, res) => {
  try {
    const { paths } = req.body
    if (DEBUG) console.log(`Deleting ${paths?.length || 0} items`)

    if (!paths || paths.length === 0) {
      return res.status(400).json({ error: 'No items to delete' })
    }

    const deleted = []
    const errors = []

    for (const filePath of paths) {
      if (!existsSync(filePath)) {
        errors.push({ path: filePath, error: 'Not found' })
        continue
      }

      try {
        rmSync(filePath, { recursive: true, force: true })
        deleted.push(filePath)
        if (DEBUG) console.log(`Deleted: ${filePath}`)
      } catch (err) {
        errors.push({ path: filePath, error: err.message })
        if (DEBUG) console.error(`Failed to delete ${filePath}:`, err.message)
      }
    }

    res.json({ success: errors.length === 0, deleted, errors })
  } catch (err) {
    if (DEBUG) console.error('Batch delete error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ========== Batch compress ==========
app.put('/api/files/batch-compress', (req, res) => {
  try {
    const { paths, destDir, zipName } = req.body
    if (DEBUG) console.log(`Compressing ${paths?.length || 0} items to: ${destDir}`)

    if (!paths || paths.length === 0) {
      return res.status(400).json({ error: 'No items to compress' })
    }

    if (!destDir || !existsSync(destDir)) {
      return res.status(400).json({ error: 'Invalid destination directory' })
    }

    const archiveName = zipName || `archive-${Date.now()}.zip`
    const zipPath = join(destDir, archiveName)

    const output = createWriteStream(zipPath)
    const archive = new Archiver({ zlib: { level: 6 } })

    output.on('close', () => {
      if (DEBUG) console.log(`Compressed: ${zipPath} (${archive.pointer()} bytes)`)
      res.json({ success: true, path: zipPath, size: archive.pointer() })
    })

    archive.on('error', (err) => {
      if (DEBUG) console.error('Archive error:', err.message)
      res.status(500).json({ error: err.message })
    })

    archive.pipe(output)

    for (const itemPath of paths) {
      if (!existsSync(itemPath)) continue
      const itemStat = statSync(itemPath)
      const name = basename(itemPath)
      if (itemStat.isDirectory()) {
        archive.directory(itemPath, name)
      } else {
        archive.file(itemPath, { name })
      }
    }

    archive.finalize()
  } catch (err) {
    if (DEBUG) console.error('Batch compress error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/files/content', (req, res) => {
  try {
    const { path: filePath, content } = req.body

    if (DEBUG) console.log(`Saving file: ${filePath}`)

    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    if (!existsSync(filePath)) {
      if (DEBUG) console.log(`File not found: ${filePath}`)
      return res.status(404).json({ error: 'File not found' })
    }

    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      if (DEBUG) console.log(`Path is a directory: ${filePath}`)
      return res.status(400).json({ error: 'Cannot write to a directory' })
    }

    writeFileSync(filePath, content, 'utf-8')

    if (DEBUG) console.log(`File saved: ${filePath} (${Buffer.byteLength(content, 'utf-8')} bytes)`)
    res.json({ success: true, path: filePath })
  } catch (err) {
    if (DEBUG) console.error(`Error saving file:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/files/search', (req, res) => {
  try {
    const { path: dirPath, q: query } = req.query

    if (DEBUG) console.log(`Searching: "${query}" in ${dirPath}`)

    if (!dirPath || !query) {
      return res.status(400).json({ error: 'Path and query are required' })
    }

    if (!existsSync(dirPath)) {
      if (DEBUG) console.log(`Directory not found: ${dirPath}`)
      return res.status(404).json({ error: 'Directory not found' })
    }

    const results = []
    const searchQuery = query.toLowerCase()

    function searchRecursive(currentPath, maxDepth = 5) {
      if (maxDepth <= 0) return

      try {
        const entries = readdirSync(currentPath)
        for (const name of entries) {
          const fullPath = join(currentPath, name)
          try {
            const stat = statSync(fullPath)
            if (name.toLowerCase().includes(searchQuery)) {
              results.push({
                name,
                path: fullPath,
                isDirectory: stat.isDirectory(),
                parent: currentPath,
              })
            }
            if (stat.isDirectory()) {
              searchRecursive(fullPath, maxDepth - 1)
            }
          } catch {
            // skip inaccessible entries
          }
        }
      } catch {
        // skip inaccessible directories
      }
    }

    searchRecursive(dirPath)

    if (DEBUG) console.log(`Search completed: ${results.length} results found`)
    res.json({ results: results.slice(0, 100) })
  } catch (err) {
    if (DEBUG) console.error(`Error searching:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/config', (req, res) => {
  res.json({ defaultPath: process.env.DATA_DIR || '/' })
})

// ========== Directory Stats ==========
app.get('/api/files/stats', (req, res) => {
  try {
    const dirPath = req.query.path || process.env.DATA_DIR || '/'
    if (!existsSync(dirPath)) {
      return res.status(404).json({ error: 'Directory not found' })
    }

    let fileCount = 0
    let dirCount = 0
    let totalSize = 0

    function countRecursive(currentPath) {
      try {
        const entries = readdirSync(currentPath)
        for (const name of entries) {
          const fullPath = join(currentPath, name)
          try {
            const stat = statSync(fullPath)
            if (stat.isDirectory()) {
              dirCount++
              countRecursive(fullPath)
            } else {
              fileCount++
              totalSize += stat.size
            }
          } catch {}
        }
      } catch {}
    }

    countRecursive(dirPath)

    res.json({ fileCount, dirCount, totalSize })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ========== File Upload ==========
app.post('/api/files/upload', upload.array('files', 50), (req, res) => {
  try {
    const dirPath = req.body.path || process.env.DATA_DIR || '/'
    if (DEBUG) console.log(`Uploading ${req.files?.length || 0} files to: ${dirPath}`)

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' })
    }

    if (!existsSync(dirPath)) {
      return res.status(404).json({ error: 'Directory not found' })
    }

    const uploaded = []
    for (const file of req.files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
      const destPath = join(dirPath, originalName)
      try {
        renameSync(file.path, destPath)
        uploaded.push(originalName)
        if (DEBUG) console.log(`Uploaded: ${destPath}`)
      } catch (err) {
        if (DEBUG) console.error(`Failed to upload ${originalName}:`, err.message)
        try { rmSync(file.path) } catch {}
      }
    }

    res.json({ success: true, uploaded })
  } catch (err) {
    if (DEBUG) console.error('Upload error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ========== File Download ==========
app.get('/api/files/download', (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      if (DEBUG) console.log(`Zipping directory for download: ${filePath}`)
      const archive = new Archiver({ zlib: { level: 6 } })
      const zipName = `${basename(filePath)}.zip`
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`)
      archive.pipe(res)
      archive.directory(filePath, basename(filePath))
      archive.finalize()
      return
    }

    if (DEBUG) console.log(`Downloading: ${filePath}`)
    res.download(filePath, basename(filePath))
  } catch (err) {
    if (DEBUG) console.error('Download error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ========== Raw File (inline preview) ==========
app.get('/api/files/raw', (req, res) => {
  try {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'Cannot read a directory' })
    }

    const ext = basename(filePath).split('.').pop()?.toLowerCase()
    const mimeMap = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
      bmp: 'image/bmp', ico: 'image/x-icon',
      pdf: 'application/pdf',
      mp4: 'video/mp4', webm: 'video/webm',
    }
    const contentType = mimeMap[ext] || 'application/octet-stream'

    if (DEBUG) console.log(`Serving raw file: ${filePath} (${contentType})`)
    res.contentType(contentType)
    res.sendFile(filePath)
  } catch (err) {
    if (DEBUG) console.error('Raw file error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ========== ZIP Compress ==========
app.post('/api/files/compress', (req, res) => {
  try {
    const { paths, destDir, zipName } = req.body
    if (DEBUG) console.log(`Compressing ${paths?.length || 0} items to: ${destDir}`)

    if (!paths || paths.length === 0) {
      return res.status(400).json({ error: 'No items to compress' })
    }

    if (!destDir || !existsSync(destDir)) {
      return res.status(400).json({ error: 'Invalid destination directory' })
    }

    const archiveName = zipName || `archive-${Date.now()}.zip`
    const zipPath = join(destDir, archiveName)

    const output = createWriteStream(zipPath)
    const archive = new Archiver({ zlib: { level: 6 } })

    output.on('close', () => {
      if (DEBUG) console.log(`Compressed: ${zipPath} (${archive.pointer()} bytes)`)
      res.json({ success: true, path: zipPath, size: archive.pointer() })
    })

    archive.on('error', (err) => {
      if (DEBUG) console.error('Archive error:', err.message)
      res.status(500).json({ error: err.message })
    })

    archive.pipe(output)

    for (const itemPath of paths) {
      if (!existsSync(itemPath)) continue
      const itemStat = statSync(itemPath)
      const name = basename(itemPath)
      if (itemStat.isDirectory()) {
        archive.directory(itemPath, name)
      } else {
        archive.file(itemPath, { name })
      }
    }

    archive.finalize()
  } catch (err) {
    if (DEBUG) console.error('Compress error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ========== ZIP Decompress ==========
app.post('/api/files/decompress', (req, res) => {
  try {
    const { zipPath, destDir } = req.body
    if (DEBUG) console.log(`Decompressing: ${zipPath} -> ${destDir}`)

    if (!zipPath || !existsSync(zipPath)) {
      return res.status(400).json({ error: 'ZIP file not found' })
    }

    if (!destDir) {
      return res.status(400).json({ error: 'Invalid destination directory' })
    }

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    const zip = new AdmZip(zipPath)
    zip.extractAllTo(destDir, true)

    if (DEBUG) console.log(`Decompressed: ${zipPath} -> ${destDir}`)
    res.json({ success: true, path: destDir })
  } catch (err) {
    if (DEBUG) console.error('Decompress error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('*', (req, res) => {
  res.sendFile(join(DIST_DIR, 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`File Manager server running on port ${PORT}`)
})
