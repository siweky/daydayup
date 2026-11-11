import { promises as fs } from 'node:fs'
import { join, extname, basename } from 'node:path'

export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)

  if (!body || body.length === 0) {
    throw createError({
      statusCode: 400,
      message: '未提供文件',
    })
  }

  let fileData: { data: Buffer; filename: string } | null = null
  let category = 'notes'

  for (const part of body) {
    if (part.name === 'file') {
      fileData = {
        data: part.data,
        filename: part.filename || 'untitled.md',
      }
    } else if (part.name === 'category') {
      category = part.data.toString('utf-8')
    }
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      message: '未找到文件数据',
    })
  }

  // Validate category
  const validCategories = ['notes', 'nuxt', 'nitro', 'python', 'ai-agent']
  if (!validCategories.includes(category)) {
    throw createError({
      statusCode: 400,
      message: '无效的分类，可选值: notes, nuxt, nitro, python, ai-agent',
    })
  }

  // Validate file extension
  const ext = extname(fileData.filename).toLowerCase()
  if (ext !== '.md' && ext !== '.markdown') {
    throw createError({
      statusCode: 400,
      message: '仅支持 Markdown 文件 (.md, .markdown)',
    })
  }

  // Ensure the filename ends with .md
  let filename = fileData.filename
  if (ext === '.markdown') {
    filename = filename.replace(/\.markdown$/, '.md')
  }

  // Build target path
  const contentDir = join(process.cwd(), 'content', category)
  await fs.mkdir(contentDir, { recursive: true })

  const targetPath = join(contentDir, filename)

  // Write file
  await fs.writeFile(targetPath, fileData.data)

  return {
    success: true,
    message: '文件上传成功',
    path: `content/${category}/${filename}`,
  }
})
