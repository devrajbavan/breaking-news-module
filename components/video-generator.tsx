// components/video-generator.tsx
"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  title: string
  mediaUrl: string
  mediaType: "image" | "video"
  durationSec?: number
  width?: number
  height?: number
}

type GenState =
  | { status: "idle" }
  | { status: "recording"; progress: number }
  | { status: "done"; url: string; size: number }
  | { status: "error"; message: string }

export function VideoGenerator({ title, mediaUrl, mediaType, durationSec = 5, width = 1280, height = 720 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [state, setState] = useState<GenState>({ status: "idle" })

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, t: number, total: number, image?: HTMLImageElement, video?: HTMLVideoElement) => {
      const headerH = 100
      const footerH = 120
      const mediaY = headerH
      const mediaH = height - headerH - footerH
      const mediaW = width

      // Background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)

      // Header
      ctx.fillStyle = "#e11d48" // rose-600
      ctx.fillRect(0, 0, width, headerH)
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 42px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
      ctx.textBaseline = "middle"
      ctx.textAlign = "left"
      ctx.fillText("Breaking News", 36, headerH / 2)

      // Media area
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, mediaY, mediaW, mediaH)

      if (mediaType === "image" && image) {
        const progress = t / Math.max(total - 1, 1)
        const scale = 1.0 + progress * 0.1 // gentle Ken Burns zoom

        const iw = image.naturalWidth
        const ih = image.naturalHeight
        if (iw && ih) {
          const mediaAspect = mediaW / mediaH
          const imgAspect = iw / ih
          let drawW = mediaW * scale
          let drawH = mediaH * scale
          if (imgAspect > mediaAspect) {
            drawH = mediaH * scale
            drawW = drawH * imgAspect
          } else {
            drawW = mediaW * scale
            drawH = drawW / imgAspect
          }
          const offsetX = (mediaW - drawW) / 2
          const offsetY = (mediaH - drawH) / 2
          ctx.drawImage(image, offsetX, mediaY + offsetY, drawW, drawH)
        }
      } else if (mediaType === "video" && video && video.readyState >= 2) {
        const vw = video.videoWidth
        const vh = video.videoHeight
        if (vw && vh) {
          const mediaAspect = mediaW / mediaH
          const vidAspect = vw / vh
          let drawW = mediaW
          let drawH = mediaH
          if (vidAspect > mediaAspect) {
            drawH = mediaH
            drawW = drawH * vidAspect
          } else {
            drawW = mediaW
            drawH = drawW / vidAspect
          }
          const offsetX = (mediaW - drawW) / 2
          const offsetY = (mediaH - drawH) / 2
          ctx.drawImage(video, offsetX, mediaY + offsetY, drawW, drawH)
        }
      }

      // Footer Title (max 2 lines)
      ctx.fillStyle = "#0a0a0a"
      ctx.textAlign = "left"
      ctx.textBaseline = "top"
      ctx.font = "700 36px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
      const padding = 36
      const titleY = height - footerH + 24
      wrapText(ctx, title, padding, titleY, width - padding * 2, 44, 2)
    },
    [height, mediaType, width],
  )

  const handleGenerate = useCallback(async () => {
    try {
      setState({ status: "recording", progress: 0 })
      const canvas = canvasRef.current || Object.assign(document.createElement("canvas"), { width, height })
      canvasRef.current = canvas
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas 2D context not available.")

      // Prepare media
      let img: HTMLImageElement | undefined
      let vid: HTMLVideoElement | undefined

      if (mediaType === "image") {
        img = new Image()
        img.crossOrigin = "anonymous"
        img.src = mediaUrl || "/breaking-news-image.jpg"
        await waitImage(img)
      } else {
        vid = document.createElement("video")
        vid.crossOrigin = "anonymous"
        vid.playsInline = true
        vid.muted = true
        vid.loop = true
        vid.src = mediaUrl
        await vid.play().catch(() => {})
        await waitVideoReady(vid)
      }

      // Record canvas stream
      const fps = 30
      const stream = (canvas as HTMLCanvasElement).captureStream(fps)
      const mimeTypeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
      const mimeType = mimeTypeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || ""
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      const totalFrames = Math.max(1, Math.floor(durationSec * fps))
      recorder.start()

      for (let f = 0; f < totalFrames; f++) {
        drawFrame(ctx, f, totalFrames, img, vid)
        await waitMs(1000 / fps)
        if ((f + 1) % Math.max(1, Math.floor(totalFrames / 50)) === 0) {
          setState({ status: "recording", progress: (f + 1) / totalFrames })
        }
      }

      recorder.stop()
      const blob: Blob = await new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || "video/webm" }))
      })
      const url = URL.createObjectURL(blob)
      setState({ status: "done", url, size: blob.size })
    } catch (e: any) {
      setState({ status: "error", message: e?.message || "Failed to generate video" })
    }
  }, [drawFrame, durationSec, mediaType, mediaUrl, width, height])

  return (
    <div className="mt-6 flex w-full max-w-3xl flex-col gap-4">
      {/* Hidden canvas used for recording */}
      <canvas ref={canvasRef} width={width} height={height} className="hidden" />

      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate}>Generate 5s Video</Button>
        <p className="text-sm text-muted-foreground">Outputs 1280×720 WebM. Ensure media allows CORS for canvas.</p>
      </div>

      {state.status === "recording" && (
        <div className="text-sm">Rendering video… {Math.round((state.progress || 0) * 100)}%</div>
      )}

      {state.status === "done" && (
        <div className="flex flex-col gap-2">
          <video className="w-full rounded border" src={state.url} controls width={width} height={height} />
          <a href={state.url} download="breaking-news.webm" className="text-sm text-blue-600 underline">
            Download breaking-news.webm ({(state.size / 1024).toFixed(0)} KB)
          </a>
        </div>
      )}

      {state.status === "error" && <p className="text-sm text-red-600">Error: {state.message}</p>}
    </div>
  )
}

function waitMs(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

function waitImage(img: HTMLImageElement) {
  return new Promise<void>((res, rej) => {
    if (img.complete && img.naturalWidth) return res()
    img.onload = () => res()
    img.onerror = () => rej(new Error("Failed to load image for canvas."))
  })
}

function waitVideoReady(video: HTMLVideoElement) {
  return new Promise<void>((res) => {
    if (video.readyState >= 2) return res()
    video.onloadeddata = () => res()
    video.onloadedmetadata = () => res()
  })
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
) {
  const words = text.split(" ")
  let line = ""
  let lineCount = 0
  for (let n = 0; n < words.length; n++) {
    const testLine = line ? line + " " + words[n] : words[n]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y + lineCount * lineHeight)
      line = words[n]
      lineCount++
      if (lineCount >= maxLines - 1) {
        let rest = words.slice(n).join(" ")
        while (ctx.measureText(rest + "…").width > maxWidth && rest.length > 0) {
          rest = rest.slice(0, -1)
        }
        ctx.fillText(rest + "…", x, y + lineCount * lineHeight)
        return
      }
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y + lineCount * lineHeight)
}
