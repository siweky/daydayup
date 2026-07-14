import { unlink } from 'fs/promises'
import { join, relative, normalize, resolve } from 'path'
import { existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'DELETE')

    // Get the path parameter from the catch-all route
    const params = getRouterParams(event)
    const requestPath = params.path

    if (!requestPath) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Missing file path. Provide the relative path within content/ directory.',
      })
    }

    const projectRoot = process.cwd()
    const contentDir = join(projectRoot, 'content')

    // Normalize and resolve the target path to prevent directory traversal
    const normalizedPath = normalize(requestPath)
    const targetPath = resolve(contentDir, normalizedPath)

    // Security check: ensure the resolved path is within the content directory
    const relativeToContent = relative(contentDir, targetPath)
    if (
      relativeToContent.startsWith('..') ||
      normalize(relativeToContent).startsWith('..') ||
      !relativeToContent
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Access denied. The file path must be within the content/ directory.',
      })
    }

    // Check if the file exists
    if (!existsSync(targetPath)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `File not found: ${requestPath}`,
      })
    }

    // Delete the file
    await unlink(targetPath)

    return {
      success: true,
      message: `File "${requestPath}" has been deleted successfully.`,
      data: {
        path: requestPath,
      },
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
