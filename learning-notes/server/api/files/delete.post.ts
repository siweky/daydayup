import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.path) {
    throw createError({
      statusCode: 400,
      message: '未提供文件路径',
    })
  }

  const filePath = body.path as string

  // Security: only allow deleting files inside the content directory
  const contentDir = join(process.cwd(), 'content')
  const fullPath = resolve(process.cwd(), filePath)

  if (!fullPath.startsWith(contentDir)) {
    throw createError({
      statusCode: 403,
      message: '不允许删除此路径下的文件',
    })
  }

  // Verify the file is a markdown file
  if (!filePath.endsWith('.md') && !filePath.endsWith('.markdown')) {
    throw createError({
      statusCode: 400,
      message: '仅支持删除 Markdown 文件',
    })
  }

  try {
    await fs.unlink(fullPath)
    return {
      success: true,
      message: '文件已删除',
    }
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        message: '文件未找到',
      })
    }
    throw createError({
      statusCode: 500,
      message: '删除文件失败',
    })
  }
})
