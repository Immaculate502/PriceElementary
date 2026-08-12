export type Pillar = "faith" | "action" | "ministry" | "evangelism"

export interface Member {
  id: string
  name: string
  email: string
  role: "member" | "admin"
  joinedAt: string
  avatarColor: string
  streak: number
}

export type ActivityFrequency = "daily" | "weekly" | "monthly"

export interface Activity {
  id: string
  pillar: Pillar
  title: string
  description: string
  points: number
  frequency: ActivityFrequency
  /**
   * Retired activities are hidden from members but kept in the database so
   * previously logged submissions, points and streaks stay intact.
   */
  active: boolean
}

export type SubmissionType =
  | "journal"
  | "confession"
  | "prayer-request"
  | "testimony"
  | "bible-study"
  | "activity"

export type SubmissionStatus = "pending" | "approved" | "rejected"

export interface Submission {
  id: string
  memberId: string
  memberName: string
  type: SubmissionType
  pillar: Pillar
  title: string
  body: string
  status: SubmissionStatus
  createdAt: string
  isPrivate: boolean
  videoUrl?: string | null
}

export interface ReadingPlanDay {
  day: number
  reference: string
  theme: string
  completed: boolean
}

export type QuestionKind = "open" | "choice"

export interface LessonQuestion {
  id: string
  prompt: string
  position: number
  kind: QuestionKind
  /** Answer choices, in display order. Always empty for open questions. */
  options: string[]
  /** 0-based index into `options`. Always null for open questions. */
  correctOption: number | null
}

export interface Lesson {
  id: string
  title: string
  summary: string
  scripture: string
  instructions: string
  /** Signed, time-limited URL to the teaching video (null when none/expired). */
  videoUrl: string | null
  /** Raw storage key, used by leadership when editing. */
  videoPath: string | null
  position: number
  /** Retired lessons are hidden from members but keep member responses intact. */
  active: boolean
  questions: LessonQuestion[]
}

/**
 * A member's single answer to one lesson question. Open questions use `answer`;
 * choice questions use `selectedOption`.
 */
export interface LessonAnswer {
  questionId: string
  answer: string
  selectedOption: number | null
}

/** Auto-graded tally of the multiple-choice questions in one response. */
export interface LessonScore {
  correct: number
  total: number
}

/** A member's full response to a lesson, reviewed like a submission. */
export interface LessonResponse {
  id: string
  lessonId: string
  memberId: string
  memberName: string
  status: SubmissionStatus
  createdAt: string
  updatedAt: string
  answers: LessonAnswer[]
}

/**
 * VOCAL — a member's spoken video journal entry. Visible only to its owner and
 * leadership. `videoUrl` is a short-lived signed URL (null if it could not be
 * signed); `reviewedAt` is null until leadership marks it reviewed.
 */
export interface VocalVideo {
  id: string
  memberId: string
  memberName: string
  title: string
  note: string
  videoUrl: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface PrayerSlot {
  id: string
  time: string
  focus: string
  members: string[]
}

export const PILLAR_META: Record<
  Pillar,
  { label: string; letter: string; blurb: string; token: string }
> = {
  faith: {
    label: "Faith",
    letter: "F",
    blurb: "Deepen your walk through prayer, worship, and the Word.",
    token: "var(--pillar-faith)",
  },
  action: {
    label: "Action",
    letter: "A",
    blurb: "Live out your convictions through daily disciplines.",
    token: "var(--pillar-action)",
  },
  ministry: {
    label: "Ministry",
    letter: "M",
    blurb: "Serve the body and steward your gifts.",
    token: "var(--pillar-ministry)",
  },
  evangelism: {
    label: "Evangelism",
    letter: "E",
    blurb: "Share the good news and disciple others.",
    token: "var(--pillar-evangelism)",
  },
}
