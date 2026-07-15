import { promises as fs } from 'node:fs'
import { join } from 'node:path'

interface BookmarkNode {
  id: string
  name: string
  type: 'url' | 'folder'
  url?: string
  path: string
  children?: BookmarkNode[]
  count?: number
}

function parseNode(node: any, parentPath: string): BookmarkNode | null {
  const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name

  if (node.type === 'url') {
    return {
      id: node.id,
      name: node.name,
      type: 'url',
      url: node.url,
      path: parentPath,
    }
  }

  if (node.children || node.type === 'folder') {
    const children: BookmarkNode[] = []
    for (const child of (node.children || [])) {
      const parsed = parseNode(child, currentPath)
      if (parsed) children.push(parsed)
    }

    const urlCount = countUrls(node)

    return {
      id: node.id,
      name: node.name,
      type: 'folder',
      path: currentPath,
      children,
      count: urlCount,
    }
  }

  return null
}

function countUrls(node: any): number {
  if (node.type === 'url') return 1
  if (!node.children) return 0
  return node.children.reduce((sum: number, child: any) => sum + countUrls(child), 0)
}

function flattenBookmarks(node: any, parentPath: string): Array<{ name: string; url: string; path: string }> {
  const results: Array<{ name: string; url: string; path: string }> = []

  if (node.type === 'url') {
    results.push({ name: node.name, url: node.url, path: parentPath })
    return results
  }

  if (node.children) {
    const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name
    for (const child of node.children) {
      results.push(...flattenBookmarks(child, currentPath))
    }
  }

  return results
}

let cachedData: { tree: BookmarkNode[]; flat: Array<{ name: string; url: string; path: string }> } | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function loadData() {
  const now = Date.now()
  if (cachedData && now - cacheTime < CACHE_TTL) return cachedData

  const filePath = join(process.cwd(), 'server', 'data', 'bookmarks.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const data = JSON.parse(raw)

  const tree: BookmarkNode[] = []
  const flat: Array<{ name: string; url: string; path: string }> = []

  const bookmarkBar = data.roots?.bookmark_bar
  if (bookmarkBar?.children) {
    for (const child of bookmarkBar.children) {
      const parsed = parseNode(child, '')
      if (parsed) tree.push(parsed)
      flat.push(...flattenBookmarks(child, ''))
    }
  }

  cachedData = { tree, flat }
  cacheTime = now
  return cachedData
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.q as string || '').trim().toLowerCase()

  const data = await loadData()

  if (search) {
    const results = data.flat.filter(
      b => b.name.toLowerCase().includes(search) || b.url.toLowerCase().includes(search) || b.path.toLowerCase().includes(search)
    ).slice(0, 200)
    return { mode: 'search' as const, results, total: data.flat.length }
  }

  return { mode: 'tree' as const, tree: data.tree, total: data.flat.length }
})
