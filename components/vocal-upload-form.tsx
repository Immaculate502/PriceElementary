"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2, Loader2, Mic, Video, X } from "lucide-react"
import { createVocalVideo, type ActionResult } from "@/app/actions"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200 MB — matches the bucket cap
const VIDEO_BUCKET = "vocal-videos"

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Posting…" : "Send to leadership"}
    </Button>
  )
}

/**
 * Records a VOCAL entry. The file goes straight from the browser to the private
 * `vocal-videos` bucket (storage RLS pins it to the member's own folder), then
 * the form posts only the resulting object key.
 */
export function VocalUploadForm() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createVocalVideo,
    null,
  )
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [videoPath, setVideoPath] = useState("")
  const [videoName, setVideoName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const supabaseReady = getSupabaseBrowserClient() !== null

  function resetVideo() {
    setVideoPath("")
    setVideoName("")
    setUploadError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setUploadError("")
    if (!file) return

    if (!file.type.startsWith("video/")) {
      setUploadError("Please choose a video file.")
      resetVideo()
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUploadError("Video must be 200 MB or smaller.")
      resetVideo()
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setUploadError("Video upload needs Supabase connected.")
      return
    }

    setUploading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUploading(false)
      setUploadError("Your session expired. Please sign in again.")
      resetVideo()
      return
    }

    const ext = file.name.split(".").pop() || "mp4"
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    setUploading(false)
    if (error) {
      setUploadError(error.message)
      resetVideo()
      return
    }
    setVideoPath(path)
    setVideoName(file.name)
  }

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      resetVideo()
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="videoPath" value={videoPath} />

      <div className="grid min-w-0 gap-2 [&>*]:min-w-0">
        <label htmlFor="vocal-title" className="text-sm font-medium text-foreground">
          Title
        </label>
        <input
          id="vocal-title"
          name="title"
          required
          maxLength={200}
          placeholder="What is this recording about?"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      <div className="grid min-w-0 gap-2 [&>*]:min-w-0">
        <label htmlFor="vocal-note" className="text-sm font-medium text-foreground">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="vocal-note"
          name="note"
          rows={4}
          maxLength={5000}
          placeholder="Anything you'd like leadership to know before they watch…"
          className="resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      <div className="grid min-w-0 gap-2 [&>*]:min-w-0">
        <span className="text-sm font-medium text-foreground">Your recording</span>

        {videoPath ? (
          <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm">
            <Video className="h-4 w-4 shrink-0 text-pillar-ministry" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-foreground">{videoName}</span>
            <button
              type="button"
              onClick={resetVideo}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
              aria-label="Remove video"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground hover:border-ring ${
              uploading || !supabaseReady ? "opacity-60" : ""
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading…
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" aria-hidden="true" />
                {supabaseReady
                  ? "Record or attach your video (max 200 MB)"
                  : "Video upload activates once Supabase is connected"}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={uploading || !supabaseReady}
              onChange={handleVideoSelect}
            />
          </label>
        )}

        {uploadError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive" role="status">
            <AlertCircle className="h-4 w-4" />
            {uploadError}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton disabled={uploading || !videoPath} />
        {state && (
          <p
            className={`flex items-center gap-1.5 text-sm ${
              state.ok ? "text-success" : "text-destructive"
            }`}
            role="status"
          >
            {state.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
