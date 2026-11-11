import { promises as fs } from 'node:fs'
import { join, relative, extname } from 'node:path'

export default defineEventHandler(async () => {
  const contentDir = join(process.cwd(), 'content')
  const categories = ['notes', 'nuxt', 'nitro', 'python', 'ai-agent']
  const files: Array<{ name: string; category: string; path: string }> = []

  for (const category of categories) {
    const categoryDir = join(contentDir, category)

    try {
      const entries = await fs.readdir(categoryDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isFile() && (extname(entry.name) === '.md' || extname(entry.name) === '.markdown')) {
          files.push({
            name: entry.name,
            category,
            path: `content/${category}/${entry.name}`,
          })
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return { files }
})
