'use client'

import { useState } from 'react'
import { Share2, ExternalLink, Check, RefreshCw } from 'lucide-react'

interface ShareButtonsProps {
  filename: string
  downloadUrl?: string
  fileId?: string
}

const SITE_TEXT = 'Free PDF, Image & Document Tools — No Registration Required.\nhttps://toolifypdf.online'

export function ShareButtons({ filename, downloadUrl, fileId }: ShareButtonsProps) {
  const [sharingFile, setSharingFile] = useState(false)
  const [siteDone, setSiteDone] = useState(false)

  const handleShareFile = async () => {
    setSharingFile(true)
    try {
      let blob: Blob
      if (downloadUrl) {
        const res = await fetch(downloadUrl)
        blob = await res.blob()
      } else if (fileId) {
        const res = await fetch(`/api/files/${fileId}`)
        if (!res.ok) throw new Error('fetch failed')
        blob = await res.blob()
      } else return

      const file = new File([blob], filename || 'file', { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else if (navigator.share) {
        await navigator.share({ title: filename })
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setSharingFile(false)
    }
  }

  const handleShareSite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: SITE_TEXT })
      } else {
        await navigator.clipboard.writeText(SITE_TEXT)
        setSiteDone(true)
        setTimeout(() => setSiteDone(false), 2000)
      }
    } catch {
      await navigator.clipboard.writeText(SITE_TEXT).catch(() => {})
      setSiteDone(true)
      setTimeout(() => setSiteDone(false), 2000)
    }
  }

  const hasFile = !!(downloadUrl || fileId)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasFile && (
        <>
          <button
            onClick={handleShareFile}
            disabled={sharingFile}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {sharingFile
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Share2 className="w-3.5 h-3.5" />}
            Share File
          </button>
          <span className="w-px h-4 bg-green-200" />
        </>
      )}

      <button
        onClick={handleShareSite}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        {siteDone
          ? <Check className="w-3.5 h-3.5 text-green-600" />
          : <ExternalLink className="w-3.5 h-3.5" />}
        {siteDone ? 'Copied!' : 'Share ToolifyPDF'}
      </button>
    </div>
  )
}
