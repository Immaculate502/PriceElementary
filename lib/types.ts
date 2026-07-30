export type FamePillar = "faith" | "action" | "ministry" | "evangelism"

export interface Member {
  id: string
  name: string
  email: string
  role: "member" | "admin"
  joinedAt: string
  avatarColor: string
  streak: number
}

export interface Activity {
  id: string
  pillar: FamePillar
  title: string
  description: string
  points: number
  frequency: "daily" | "weekly" | "monthly"
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
  pillar: FamePillar
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

export interface PrayerSlot {
  id: string
  time: string
  focus: string
  members: string[]
}

export const PILLAR_META: Record<
  FamePillar,
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
