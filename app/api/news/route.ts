// app/api/news/route.ts
//
// Configure one of these in Project Settings (Server):
// - GSHEETS_GVIZ_URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?sheet=Sheet1
// - GSHEETS_CSV_URL:  Published "File → Share → Publish to the web" CSV link
//
// Expected columns (case-insensitive):
// - title
// - mediaUrl
// - mediaType (image|video)
//
// If no env is set, we return sample data (served from /public).

import { NextResponse } from "next/server"

type NewsItem = {
  id: string
  title: string
  mediaUrl: string
  mediaType: "image" | "video"
}

function normalizeLabel(label: string | null | undefined) {
  return (label || "").trim().toLowerCase()
}

function parseGviz(text: string): NewsItem[] {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return []
  const json = JSON.parse(text.slice(start, end + 1))
  const cols: { label: string }[] = json.table?.cols || []

  const colIndex: Record<string, number> = {}
  cols.forEach((c: any, i: number) => {
    const label = normalizeLabel(c?.label)
    if (label) colIndex[label] = i
  })

  const rows = json.table?.rows || []
  const items: NewsItem[] = rows
    .map((r: any, idx: number) => {
      const c = r?.c || []
      const title = c[colIndex["title"]]?.v ?? ""
      const mediaUrl = c[colIndex["mediaurl"]]?.v ?? c[colIndex["media_url"]]?.v ?? ""
      const mediaTypeRaw = c[colIndex["mediatype"]]?.v ?? c[colIndex["media_type"]]?.v ?? ""
      const mediaType = String(mediaTypeRaw || "").toLowerCase() === "video" ? "video" : "image"

      if (!title && !mediaUrl) return null
      return {
        id: String(idx + 1),
        title: String(title || "").trim(),
        mediaUrl: String(mediaUrl || "").trim(),
        mediaType,
      } as NewsItem
    })
    .filter(Boolean) as NewsItem[]

  return items
}

// Minimal CSV parser (handles simple quoted fields)
function parseCsv(text: string): NewsItem[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  const header = splitCsvLine(lines[0])
  const indices: Record<string, number> = {}
  header.forEach((h, i) => {
    const key = normalizeLabel(h)
    if (key) indices[key] = i
  })

  const items: NewsItem[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const get = (name: string) => {
      const ix = indices[name]
      return ix != null ? cols[ix] || "" : ""
    }
    const title = get("title")
    const mediaUrl = get("mediaurl") || get("media_url")
    const mediaTypeRaw = get("mediatype") || get("media_type")
    const mediaType = (mediaTypeRaw || "").toLowerCase() === "video" ? "video" : "image"
    if (!title && !mediaUrl) continue
    items.push({
      id: String(i),
      title: title.trim(),
      mediaUrl: (mediaUrl || "").trim(),
      mediaType,
    })
  }
  return items
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export async function GET() {
  try {
    const gvizUrl = process.env.GSHEETS_GVIZ_URL
    const csvUrl = process.env.GSHEETS_CSV_URL

    let items: NewsItem[] = []

    if (gvizUrl) {
      const res = await fetch(gvizUrl, { cache: "no-store" })
      if (!res.ok) throw new Error(`GViz fetch failed: ${res.status}`)
      const text = await res.text()
      items = parseGviz(text)
    } else if (csvUrl) {
      const res = await fetch(csvUrl, { cache: "no-store" })
      if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`)
      const text = await res.text()
      items = parseCsv(text)
    } else {
      // Fallback sample
      items = [
        {
          id: "1",
          title: "Record Monsoon Rains Hit Coastal Region, Authorities Issue Red Alert",
          mediaUrl: "/monsoon-rains-coast.jpg",
          mediaType: "image",
        },
        {
          id: "2",
          title: "Tech Giant Unveils Next-Gen AI Chipset for Edge Devices",
          mediaUrl: "/ai-chipset-event.jpg",
          mediaType: "image",
        },
      ]
    }

    return NextResponse.json({ items })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load news", items: [] }, { status: 500 })
  }
}
