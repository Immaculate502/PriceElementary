"use client"

import { useActionState, useCallback, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2, Circle, Loader2, Square, Upload, Video, X } from "lucide-react"
import { createVocalVideo, type ActionResult } from "@/app/actions"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200 MB — matches the bucket cap
const VIDEO_BUCKET = "vocal-videos"

// Preferred recording containers/codecs, best first. The browser picks the
// first it actually supports; Safari falls through to mp4.
const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
]

function pickRecordingMime(): string {
  if (typeof MediaRecorder === "undefined") return ""
  for (const type of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type
    } catch {
      // ignore and keep trying
    }
  }
  return ""
}

function extFor(mime: string): string {
  if (mime.includes("mp4")) return "mp4"
  if (mime.includes("webm")) return "webm"
  return "webm"
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

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

type Mode = "record" | "attach"

/**
 * Records or attaches a VOCAL entry. Recording captures the camera + mic in the
 * browser with MediaRecorder; either path uploads the resulting file straight
 * to the private `vocal-videos` bucket (storage RLS pins it to the member's own
 * folder), then the form posts only the resulting object key.
 */
export function VocalUploadForm() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createVocalVideo,
    null,
  )
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live camera preview + recorder machinery.
  const livePreviewRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [mode, setMode] = useState<Mode>("record")
  const [cameraOn, setCameraOn] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState("") // playback of the recorded clip

  const [videoPath, setVideoPath] = useState("")
  const [videoName, setVideoName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const supabaseReady = getSupabaseBrowserClient() !== null
  const canRecord =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (livePreviewRef.current) livePreviewRef.current.srcObject = null
    setCameraOn(false)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Tear everything down on unmount.
  useEffect(() => {
    return () => {
      stopTimer()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [stopTimer, previewUrl])

  /** Shared upload: pushes a blob/file to the member's folder and records its key. */
  async function uploadToStorage(data: Blob, filename: string, contentType: string) {
    setUploadError("")
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setUploadError("Video upload needs Supabase connected.")
      return
    }
    if (data.size > MAX_VIDEO_BYTES) {
      setUploadError("Video must be 200 MB or smaller.")
      return
    }

    setUploading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setUploading(false)
      setUploadError("Your session expired. Please sign in again.")
      return
    }

    const ext = filename.split(".").pop() || extFor(contentType)
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(path, data, { contentType, upsert: false })

    setUploading(false)
    if (error) {
      setUploadError(error.message)
      return
    }
    setVideoPath(path)
    setVideoName(filename)
  }

  function clearRecordedVideo() {
    setVideoPath("")
    setVideoName("")
    setUploadError("")
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl("")
    }
    setElapsed(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ---- Recording ----------------------------------------------------------

  async function startCamera() {
    setUploadError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      })
      streamRef.current = stream
      setCameraOn(true)
      // Attach after paint so the ref exists.
      requestAnimationFrame(() => {
        if (livePreviewRef.current) {
          livePreviewRef.current.srcObject = stream
          livePreviewRef.current.play().catch(() => {})
        }
      })
    } catch (err) {
      const name = err instanceof Error ? err.name : ""
      setUploadError(
        name === "NotAllowedError"
          ? "Camera and microphone access was blocked. Please allow it and try again."
          : name === "NotFoundError"
            ? "No camera or microphone was found on this device."
            : "Could not start the camera. You can attach a file instead.",
      )
    }
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return
    const mimeType = pickRecordingMime()
    let recorder: MediaRecorder
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch {
      setUploadError("Recording isn't supported in this browser. Please attach a file instead.")
      return
    }

    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = async () => {
      const type = recorder.mimeType || mimeType || "video/webm"
      const blob = new Blob(chunksRef.current, { type })
      chunksRef.current = []
      // Local playback for review.
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      stopStream()
      const filename = `recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${extFor(type)}`
      await uploadToStorage(blob, filename, type)
    }

    recorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }

  function stopRecording() {
    stopTimer()
    setIsRecording(false)
    recorderRef.current?.stop()
    recorderRef.current = null
  }

  function cancelCamera() {
    stopTimer()
    setIsRecording(false)
    recorderRef.current?.stop()
    recorderRef.current = null
    stopStream()
  }

  // ---- File attach --------------------------------------------------------

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setUploadError("")
    if (!file) return
    if (!file.type.startsWith("video/")) {
      setUploadError("Please choose a video file.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    await uploadToStorage(file, file.name, file.type || "video/mp4")
  }

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      clearRecordedVideo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const hasVideo = !!videoPath

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

      <div className="grid min-w-0 gap-3 [&>*]:min-w-0">
        <span className="text-sm font-medium text-foreground">Your recording</span>

        {!supabaseReady && (
          <p className="rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground">
            Video upload activates once Supabase is connected.
          </p>
        )}

        {supabaseReady && hasVideo && (
          <div className="flex flex-col gap-3">
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className="w-full rounded-lg border border-border bg-black"
              />
            ) : null}
            <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm">
              <Video className="h-4 w-4 shrink-0 text-pillar-ministry" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-foreground">{videoName}</span>
              <button
                type="button"
                onClick={clearRecordedVideo}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
                aria-label="Remove video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {supabaseReady && !hasVideo && (
          <div className="flex flex-col gap-3">
            {/* Mode toggle */}
            <div className="inline-flex w-fit rounded-lg border border-border bg-muted/40 p-0.5 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("record")
                  setUploadError("")
                }}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  mode === "record"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={mode === "record"}
              >
                Record video
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("attach")
                  cancelCamera()
                  setUploadError("")
                }}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  mode === "attach"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={mode === "attach"}
              >
                Upload a file
              </button>
            </div>

            {mode === "record" && (
              <div className="flex flex-col gap-3">
                {!canRecord ? (
                  <p className="rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground">
                    This browser can&apos;t record video. Switch to{" "}
                    <button
                      type="button"
                      className="font-medium text-navy underline"
                      onClick={() => setMode("attach")}
                    >
                      uploading a file
                    </button>
                    .
                  </p>
                ) : (
                  <>
                    <div className="relative overflow-hidden rounded-lg border border-border bg-black">
                      <video
                        ref={livePreviewRef}
                        muted
                        playsInline
                        autoPlay
                        className={`aspect-video w-full object-cover ${cameraOn ? "" : "opacity-40"}`}
                      />
                      {!cameraOn && !uploading && (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                          Camera preview
                        </div>
                      )}
                      {isRecording && (
                        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-destructive/90 px-2.5 py-1 text-xs font-medium text-destructive-foreground">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                          {formatDuration(elapsed)}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!cameraOn && !uploading && (
                        <Button
                          type="button"
                          onClick={startCamera}
                          className="gap-2 bg-navy text-navy-foreground hover:bg-navy/90"
                        >
                          <Video className="h-4 w-4" />
                          Start camera
                        </Button>
                      )}
                      {cameraOn && !isRecording && (
                        <>
                          <Button
                            type="button"
                            onClick={startRecording}
                            className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            <Circle className="h-4 w-4 fill-current" />
                            Start recording
                          </Button>
                          <Button type="button" variant="ghost" onClick={cancelCamera}>
                            Cancel
                          </Button>
                        </>
                      )}
                      {isRecording && (
                        <Button
                          type="button"
                          onClick={stopRecording}
                          className="gap-2 bg-navy text-navy-foreground hover:bg-navy/90"
                        >
                          <Square className="h-4 w-4 fill-current" />
                          Stop &amp; save
                        </Button>
                      )}
                      {uploading && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading…
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {mode === "attach" && (
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground hover:border-ring ${
                  uploading ? "opacity-60" : ""
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Choose a video file (max 200 MB)
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>
        )}

        {uploadError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive" role="status">
            <AlertCircle className="h-4 w-4" />
            {uploadError}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton disabled={uploading || !hasVideo} />
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
