import type {
  Activity,
  Member,
  PrayerSlot,
  ReadingPlanDay,
  Submission,
} from "./types"

export const DEMO_MEMBER: Member = {
  id: "demo-member",
  name: "Grace Adeyemi",
  email: "grace@fame.community",
  role: "member",
  joinedAt: "2025-01-12",
  avatarColor: "var(--pillar-faith)",
  streak: 23,
}

export const DEMO_ADMIN: Member = {
  id: "demo-admin",
  name: "Pastor David Okoro",
  email: "david@fame.community",
  role: "admin",
  joinedAt: "2024-06-01",
  avatarColor: "var(--pillar-ministry)",
  streak: 140,
}

export const DEMO_ACTIVITIES: Activity[] = [
  {
    id: "a1",
    pillar: "faith",
    title: "Morning Devotion",
    description: "Spend 15 minutes in prayer and the Word before your day begins.",
    points: 10,
    frequency: "daily",
  },
  {
    id: "a2",
    pillar: "faith",
    title: "Scripture Memory",
    description: "Memorize and recite the weekly memory verse.",
    points: 15,
    frequency: "weekly",
  },
  {
    id: "a3",
    pillar: "action",
    title: "Acts of Kindness",
    description: "Perform an intentional act of service for someone in need.",
    points: 10,
    frequency: "daily",
  },
  {
    id: "a4",
    pillar: "action",
    title: "Fasting Discipline",
    description: "Participate in the monthly community fast.",
    points: 25,
    frequency: "monthly",
  },
  {
    id: "a5",
    pillar: "ministry",
    title: "Serve on a Team",
    description: "Volunteer with a ministry team during the week.",
    points: 20,
    frequency: "weekly",
  },
  {
    id: "a6",
    pillar: "ministry",
    title: "Mentor Check-in",
    description: "Meet with your discipleship group or mentor.",
    points: 15,
    frequency: "weekly",
  },
  {
    id: "a7",
    pillar: "evangelism",
    title: "Share Your Faith",
    description: "Have a gospel conversation with someone this week.",
    points: 20,
    frequency: "weekly",
  },
  {
    id: "a8",
    pillar: "evangelism",
    title: "Invite to Gathering",
    description: "Invite a friend to a service or community event.",
    points: 15,
    frequency: "monthly",
  },
]

export const DEMO_SUBMISSIONS: Submission[] = [
  {
    id: "s1",
    memberId: "demo-member",
    memberName: "Grace Adeyemi",
    type: "testimony",
    pillar: "evangelism",
    title: "A door opened at work",
    body: "I finally shared my testimony with a coworker who has been asking questions. She agreed to come to service this Sunday!",
    status: "approved",
    createdAt: "2026-07-28T09:12:00Z",
    isPrivate: false,
  },
  {
    id: "s2",
    memberId: "demo-member",
    memberName: "Grace Adeyemi",
    type: "prayer-request",
    pillar: "faith",
    title: "Wisdom for a big decision",
    body: "Please pray for clarity as I consider a move to serve with the outreach team full-time.",
    status: "approved",
    createdAt: "2026-07-27T18:40:00Z",
    isPrivate: false,
  },
  {
    id: "s3",
    memberId: "m3",
    memberName: "Samuel Bright",
    type: "journal",
    pillar: "faith",
    title: "Learning to rest",
    body: "This week the Lord reminded me through Psalm 23 that He restores my soul. I journaled about surrendering my anxiety.",
    status: "pending",
    createdAt: "2026-07-29T07:05:00Z",
    isPrivate: true,
  },
  {
    id: "s4",
    memberId: "m4",
    memberName: "Naomi Chen",
    type: "activity",
    pillar: "ministry",
    title: "Served with the welcome team",
    body: "Completed my Sunday service on the welcome team. Greeted 12 first-time guests.",
    status: "pending",
    createdAt: "2026-07-29T14:22:00Z",
    isPrivate: false,
  },
  {
    id: "s5",
    memberId: "m5",
    memberName: "Elijah Ford",
    type: "confession",
    pillar: "faith",
    title: "Struggling with consistency",
    body: "Confessing that I let my quiet time slip this week. Committing to rebuild the habit.",
    status: "pending",
    createdAt: "2026-07-29T21:15:00Z",
    isPrivate: true,
  },
  {
    id: "s6",
    memberId: "m6",
    memberName: "Ruth Adeyemi",
    type: "bible-study",
    pillar: "faith",
    title: "Romans 8 reflection",
    body: "Our small group studied Romans 8. Key takeaway: there is no condemnation for those in Christ.",
    status: "approved",
    createdAt: "2026-07-26T19:00:00Z",
    isPrivate: false,
  },
]

export const DEMO_READING_PLAN: ReadingPlanDay[] = [
  { day: 1, reference: "John 1:1-18", theme: "The Word Became Flesh", completed: true },
  { day: 2, reference: "John 3:1-21", theme: "Born Again", completed: true },
  { day: 3, reference: "John 6:25-59", theme: "Bread of Life", completed: true },
  { day: 4, reference: "John 10:1-21", theme: "The Good Shepherd", completed: true },
  { day: 5, reference: "John 14:1-31", theme: "The Way, Truth, Life", completed: false },
  { day: 6, reference: "John 15:1-17", theme: "The True Vine", completed: false },
  { day: 7, reference: "John 17:1-26", theme: "The High Priestly Prayer", completed: false },
]

export const DEMO_PRAYER_SLOTS: PrayerSlot[] = [
  { id: "p1", time: "5:00 AM", focus: "Revival & the nations", members: ["Grace A.", "Samuel B."] },
  { id: "p2", time: "9:00 AM", focus: "Families & marriages", members: ["Naomi C."] },
  { id: "p3", time: "12:00 PM", focus: "The persecuted church", members: ["Elijah F.", "Ruth A."] },
  { id: "p4", time: "6:00 PM", focus: "Youth & next generation", members: ["Grace A."] },
  { id: "p5", time: "9:00 PM", focus: "Healing & breakthrough", members: ["David O."] },
]

export const MEMORY_VERSE = {
  reference: "Matthew 5:16",
  text: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.",
}

export const CONFESSIONS = [
  "I am a child of God, chosen and dearly loved. (John 1:12)",
  "I can do all things through Christ who strengthens me. (Philippians 4:13)",
  "No weapon formed against me shall prosper. (Isaiah 54:17)",
  "I am the righteousness of God in Christ Jesus. (2 Corinthians 5:21)",
  "God has not given me a spirit of fear, but of power, love, and a sound mind. (2 Timothy 1:7)",
]
