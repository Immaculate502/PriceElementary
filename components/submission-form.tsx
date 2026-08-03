"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { CheckCircle2, AlertCircle, Video, Loader2, X } from "lucide-react"
import { createSubmission, type ActionResult } from "@/app/actions"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { PILLAR_META, type FamePillar, type SubmissionType } from "@/lib/types"
import { Button } from "@/components/ui/button"

const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50 MB
const VIDEO_BUCKET = "prayer-videos"

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Submitting…" : label}
    </Button>
  )
}

export function SubmissionForm({
  type,
  defaultPillar = "faith",
  submitLabel = "Submit",
  showPrivate = false,
  allowVideo = false,
  titlePlaceholder = "Give it a title",
  bodyPlaceholder = "Write here…",
  bodyLabel = "Details",
}: {
  type: SubmissionType
  defaultPillar?: FamePillar
  submitLabel?: string
  showPrivate?: boolean
  allowVideo?: boolean
  titlePlaceholder?: string
  bodyPlaceholder?: string
  bodyLabel?: string
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createSubmission,
    null,
  )
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [videoPath, setVideoPath] = useState<string>("")
  const [videoName, setVideoName] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")

  const supabaseReady = allowVideo && getSupabaseBrowserClient() !== null

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
      setUploadError("Video must be 50 MB or smaller.")
      resetVideo()
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setUploadError("Video upload needs Supabase connected. Text will still submit.")
      return
    }

    setUploading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const ext = file.name.split(".").pop() || "mp4"
    const path = `${user?.id ?? "anon"}/${crypto.randomUUID()}.${ext}`

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
      <input type="hidden" name="type" value={type} />

      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder={titlePlaceholder}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="pillar" className="text-sm font-medium text-foreground">
          F.A.M.E. Pillar
        </label>
        <select
          id="pillar"
          name="pillar"
          defaultValue={defaultPillar}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        >
          {(Object.keys(PILLAR_META) as FamePillar[]).map((p) => (
            <option key={p} value={p}>
              {PILLAR_META[p].label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="body" className="text-sm font-medium text-foreground">
          {bodyLabel}
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          placeholder={bodyPlaceholder}
          className="resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      {allowVideo && (
        <div className="grid gap-2">
          <input type="hidden" name="videoPath" value={videoPath} />
          <span className="text-sm font-medium text-foreground">
            Video message <span className="font-normal text-muted-foreground">(optional)</span>
          </span>

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
                  <Video className="h-4 w-4" aria-hidden="true" />
                  {supabaseReady
                    ? "Record or attach a short video (max 50 MB)"
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
      )}

      {showPrivate && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="isPrivate" className="h-4 w-4 rounded border-input" />
          Keep this private (visible only to leadership)
        </label>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} disabled={uploading} />
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
