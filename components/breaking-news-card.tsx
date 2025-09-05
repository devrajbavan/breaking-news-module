// components/breaking-news-card.tsx
// Top header "Breaking News" → Mid media (image/video) → Bottom title.

import Image from "next/image"
import { cn } from "@/lib/utils"

// Color system (4 colors total):
// - Primary: Red (#e11d48)
// - Neutrals: White (#ffffff), Near-black (#0a0a0a)
// - Accent: Gray-200 (#e5e7eb)
type Props = {
  title: string
  mediaUrl: string
  mediaType: "image" | "video"
  className?: string
}

export function BreakingNewsCard({ title, mediaUrl, mediaType, className }: Props) {
  return (
    <article
      className={cn("w-full max-w-3xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm", className)}
      aria-label="Breaking News"
    >
      {/* Top Header */}
      <header className="bg-rose-600 px-4 py-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-white">Breaking News</h2>
      </header>

      {/* Mid Section: Photo or Video */}
      <div className="relative aspect-video w-full bg-black">
        {mediaType === "video" ? (
          <video
            className="h-full w-full object-cover"
            src={mediaUrl}
            muted
            loop
            playsInline
            controls
            aria-label="News video"
          />
        ) : (
          <Image
            src={mediaUrl || "/placeholder.svg?height=640&width=960&query=breaking-news-image"}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        )}
      </div>

      {/* Bottom Section: Title */}
      <div className="px-4 py-3">
        <h3 className="font-sans text-pretty text-lg font-semibold leading-relaxed text-[#0a0a0a]">{title}</h3>
      </div>
    </article>
  )
}
