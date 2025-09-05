// app/breaking-news/page.tsx

import { BreakingNewsCard } from "@/components/breaking-news-card"
import { VideoGenerator } from "@/components/video-generator"

async function getNews() {
  // In an RSC, a relative fetch to /api routes is supported.
  const res = await fetch("/api/news", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load news")
  return res.json()
}

export default async function Page() {
  const data = await getNews()
  const item =
    data?.items?.[0] ||
    ({
      title: "Sample: City Council Approves New Urban Green Plan",
      mediaUrl: "/urban-green.jpg",
      mediaType: "image",
    } as const)

  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center gap-6 p-6">
      <h1 className="text-balance text-center font-sans text-2xl font-semibold">Breaking News Module</h1>

      <BreakingNewsCard title={item.title} mediaUrl={item.mediaUrl} mediaType={item.mediaType as "image" | "video"} />

      <VideoGenerator
        title={item.title}
        mediaUrl={item.mediaUrl}
        mediaType={item.mediaType as "image" | "video"}
        durationSec={5}
      />

      <section className="max-w-3xl text-sm text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">Connect Google Sheets</h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>In Google Sheets, File → Share → Publish to the web (publish the sheet you want to read).</li>
          <li>Set one env var in Project Settings → Environment Variables (Server):</li>
          <ul className="ml-6 list-disc">
            <li>
              GSHEETS_GVIZ_URL (recommended): https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?sheet=Sheet1
            </li>
            <li>or GSHEETS_CSV_URL: use the published CSV link</li>
          </ul>
          <li>Columns required (case-insensitive): title, mediaUrl, mediaType (image|video).</li>
        </ol>
      </section>
    </main>
  )
}
