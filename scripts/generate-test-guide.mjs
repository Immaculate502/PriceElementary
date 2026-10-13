import fs from "node:fs"
import path from "node:path"
import PDFDocument from "pdfkit"

const SITE = "https://rootedministry.online"
const OUT = path.resolve("docs/ROOTED-User-Guide-and-Test-Plan.pdf")

const C = {
  ink: "#1F2A24",
  muted: "#5B665F",
  brand: "#2F5D46",
  accent: "#B7823A",
  rule: "#D9DED9",
  tint: "#F1F4F0",
}

const doc = new PDFDocument({
  size: "LETTER",
  margins: { top: 64, bottom: 64, left: 64, right: 64 },
  bufferPages: true,
  info: { Title: "ROOTED — User Guide & Test Plan", Author: "ROOTED" },
})
fs.mkdirSync(path.dirname(OUT), { recursive: true })
doc.pipe(fs.createWriteStream(OUT))

const W = doc.page.width - doc.page.margins.left - doc.page.margins.right
const L = doc.page.margins.left
let testNo = 0

function ensure(space) {
  if (doc.y + space > doc.page.height - doc.page.margins.bottom) doc.addPage()
}

function h1(text, kicker) {
  doc.addPage()
  if (kicker) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.accent)
      .text(kicker.toUpperCase(), L, doc.y, { characterSpacing: 1.5 })
    doc.moveDown(0.4)
  }
  doc.font("Helvetica-Bold").fontSize(24).fillColor(C.brand).text(text, L)
  const y = doc.y + 6
  doc.moveTo(L, y).lineTo(L + 48, y).lineWidth(3).strokeColor(C.accent).stroke()
  doc.y = y + 18
}

function h2(text) {
  ensure(70)
  doc.moveDown(0.6)
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.ink).text(text, L)
  doc.moveDown(0.35)
}

function p(text) {
  doc.font("Helvetica").fontSize(10.5).fillColor(C.ink)
    .text(text, L, doc.y, { width: W, lineGap: 2.5 })
  doc.moveDown(0.5)
}

function meta(label, value) {
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.muted)
    .text(`${label}  `, L, doc.y, { continued: true })
  doc.font("Helvetica").fillColor(C.ink).text(value, { width: W })
  doc.moveDown(0.2)
}

function bullets(items) {
  for (const item of items) {
    ensure(28)
    const y = doc.y
    doc.circle(L + 4, y + 6, 1.8).fill(C.brand)
    doc.font("Helvetica").fontSize(10.5).fillColor(C.ink)
      .text(item, L + 14, y, { width: W - 14, lineGap: 2 })
    doc.moveDown(0.3)
  }
  doc.moveDown(0.3)
}

function steps(items) {
  items.forEach((item, i) => {
    ensure(28)
    const y = doc.y
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.brand)
      .text(`${i + 1}.`, L, y, { width: 18 })
    doc.font("Helvetica").fillColor(C.ink)
      .text(item, L + 20, y, { width: W - 20, lineGap: 2 })
    doc.moveDown(0.3)
  })
  doc.moveDown(0.3)
}

function callout(title, text) {
  doc.font("Helvetica").fontSize(10)
  const h = doc.heightOfString(text, { width: W - 28, lineGap: 2 }) + 34
  ensure(h + 10)
  const y = doc.y
  doc.rect(L, y, W, h).fill(C.tint)
  doc.rect(L, y, 3, h).fill(C.accent)
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.brand).text(title, L + 16, y + 10)
  doc.font("Helvetica").fontSize(10).fillColor(C.ink)
    .text(text, L + 16, doc.y + 2, { width: W - 28, lineGap: 2 })
  doc.y = y + h + 12
}

function test(name, how, expect) {
  testNo += 1
  doc.font("Helvetica").fontSize(9.5)
  const hHow = doc.heightOfString(how, { width: W - 120, lineGap: 1.5 })
  const hExp = doc.heightOfString(expect, { width: W - 120, lineGap: 1.5 })
  const block = 24 + hHow + hExp + 26
  ensure(block)
  const y = doc.y
  doc.rect(L, y + 1, 11, 11).lineWidth(1).strokeColor(C.brand).stroke()
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.ink)
    .text(`T${String(testNo).padStart(2, "0")}  ${name}`, L + 20, y, { width: W - 20 })
  doc.moveDown(0.25)
  for (const [label, text] of [["Do", how], ["Expect", expect]]) {
    const ry = doc.y
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.muted)
      .text(label.toUpperCase(), L + 20, ry, { width: 70, characterSpacing: 0.8 })
    doc.font("Helvetica").fontSize(9.5).fillColor(C.ink)
      .text(text, L + 100, ry, { width: W - 120, lineGap: 1.5 })
    doc.moveDown(0.2)
  }
  const ry = doc.y + 2
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.muted)
    .text("NOTES", L + 20, ry, { characterSpacing: 0.8 })
  doc.moveTo(L + 100, ry + 10).lineTo(L + W, ry + 10).lineWidth(0.5).strokeColor(C.rule).stroke()
  doc.y = ry + 18
  doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.5).strokeColor(C.rule).stroke()
  doc.y += 10
}

// ---------- Cover ----------
doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.brand)
doc.font("Helvetica-Bold").fontSize(11).fillColor("#E8D3AE")
  .text("ROOTED  ·  YOUTH DISCIPLESHIP PLATFORM", L, 150, { characterSpacing: 2 })
doc.font("Helvetica-Bold").fontSize(42).fillColor("#FFFFFF")
  .text("User Guide &\nTest Plan", L, 185, { lineGap: 4 })
doc.moveTo(L, doc.y + 18).lineTo(L + 64, doc.y + 18).lineWidth(4).strokeColor(C.accent).stroke()
doc.font("Helvetica").fontSize(13).fillColor("#DCE6DF")
  .text(
    "How to use every part of ROOTED — for members, church leaders, and platform owners — plus a step-by-step checklist to verify each function works.",
    L, doc.y + 40, { width: W - 40, lineGap: 4 },
  )
doc.font("Helvetica").fontSize(10).fillColor("#DCE6DF")
  .text(`Live site: ${SITE}`, L, doc.page.height - 140)
  .text(`Prepared: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`)

// ---------- Getting started ----------
h1("Getting started", "Section 1")
p("ROOTED helps a church disciple its members across four growth areas: Faith, Action, Ministry, and Evangelism. Each church is its own private space — members only ever see their own church's content.")
h2("The three roles")
bullets([
  "Member — uses the main app: activities, lessons, journal, prayer, testimonies, VOCAL video reflections, and community chat.",
  "Leader (church admin) — runs the Leadership console at /admin: reviews submissions, builds lessons, manages activities and members, and handles billing.",
  "Platform owner (super admin) — sees every church at /platform, can suspend or reactivate churches, and views estimated monthly revenue.",
])
h2("Key addresses")
meta("Member sign in", `${SITE}/login`)
meta("Start a church", `${SITE}/signup`)
meta("Join a church", `${SITE}/join/<church-slug>  (from your leader's invite link)`)
meta("Leadership console", `${SITE}/admin/login`)
meta("Billing", `${SITE}/billing`)
meta("Platform console", `${SITE}/platform`)
h2("Before you test")
bullets([
  "Use a real email inbox you can open — reset and invite emails are delivered from info@rootedministry.online.",
  "Prepare three accounts: one leader, one or two members, and one platform owner (an email listed in PLATFORM_SUPER_ADMIN_EMAILS).",
  "Use Stripe test mode for billing checks. Test card: 4242 4242 4242 4242, any future expiry, any CVC, any ZIP.",
  "Keep a short video clip (under 50 MB) on your device for upload tests, or use a device with a camera.",
])
callout("Tip", "Test in an incognito window when switching between accounts so sessions don't overlap. Work through the test plan in order — later tests rely on data created by earlier ones.")

// ---------- Member guide ----------
h1("Using ROOTED as a member", "Section 2")
h2("Create your account")
steps([
  "Open the invite link your leader shared (it looks like /join/your-church).",
  "Enter your name, email, and a password, then create your account.",
  "Sign in at /login. You land on the Home page, \"Your walk this week.\"",
])
callout("Already signed up but see \"not linked to a church\"?", "Paste your church's invite link (or just the church slug) into the form on that screen and select Join church. You'll be connected immediately.")
h2("Home")
p("Your weekly snapshot across Faith, Action, Ministry, and Evangelism. Use it to see where you're growing and what to do next.")
h2("Activities")
p("The spiritual disciplines your leaders set for each growth area. Open an activity, complete it, and submit it for review. Leaders approve submissions and your progress updates.")
h2("Lessons (Reading Plan)")
p("Each lesson has a teaching video, assigned scripture, study instructions, and questions. Watch, read, then answer the questions and submit. Leaders review your responses.")
h2("Bible Study")
p("Share what God is teaching you and read reflections from others in your church.")
h2("My Journal")
p("A private space to record what God is doing. Each entry can stay private or be shared with your church.")
h2("Daily Confessions")
p("Declare scripture-based truths over your life. Read them aloud and add your own personal confessions.")
h2("Prayer Requests and Prayer Schedule")
p("Submit a prayer request — once approved, public requests appear for the church to pray over. On the Prayer Schedule, join a time slot so the community keeps a rhythm of prayer throughout the day.")
h2("Testimonies")
p("Share what God has done to encourage others. Testimonies appear after leader approval.")
h2("VOCAL")
p("Record a spoken video reflection with your camera, or upload a video file (up to 50 MB). VOCAL videos go privately to leadership — they never appear publicly.")
h2("Community")
p("Chat with members of your church and the wider ROOTED fellowship.")
h2("Profile and password")
p("Update your name and details on My Profile. Forgot your password? Select \"Forgot password\" on the sign-in page, enter your email, and follow the link sent to your inbox.")

// ---------- Leader guide ----------
h1("Using ROOTED as a leader", "Section 3")
h2("Start your church")
steps([
  "Go to /signup, enter your church details and your leader account, and choose a plan.",
  "Complete payment on the Stripe checkout page.",
  "Sign in to the Leadership console at /admin/login.",
])
h2("Church setup wizard (/admin/setup)")
steps([
  "Confirm or rename your church.",
  "Select \"Add starter activities\" to load a ready-made activity catalog across all four growth areas.",
  "Copy your member invite link and share it with your youth group.",
])
h2("Dashboard (/admin)")
p("Your review queue. Approve or return member submissions, and moderate prayer requests, testimonies, and shared content. When the queue is empty you'll see \"All caught up.\"")
h2("Members")
p("See every member's progress across the four growth areas. Select a member to review their submissions, lesson responses, and VOCAL videos.")
h2("Activities")
p("Add, edit, and retire the activities members work through. Changes appear on members' Activities page right away.")
h2("Lessons and Lesson Builder")
p("Lessons: build a lesson with a teaching video, scripture, study instructions, and questions. Lesson Builder: generate KJV-based biblical lessons and AI teaching videos. Lesson responses: review, score, and approve members' answers.")
h2("VOCAL")
p("Watch members' private video reflections and mark each one reviewed so nothing is missed.")
h2("Billing (/billing)")
p("View and manage your church's subscription. If a payment lapses, members are paused until the subscription is active again.")

// ---------- Platform guide ----------
h1("Using ROOTED as the platform owner", "Section 4")
p("Sign in with an email listed as a platform super admin. You're routed to /platform automatically.")
bullets([
  "Churches list — every church, member counts, and subscription status.",
  "Suspend / reactivate — pause a church's access or restore it.",
  "Estimated MRR — monthly revenue from actively paying churches (trials excluded).",
])

// ---------- Test plan ----------
h1("Test plan", "Section 5")
p("Check the box when a test passes. Write anything unexpected in Notes — include the page address, what you did, and what you saw.")

h2("A. Church sign-up and billing")
test("Register a new church", "Go to /signup, fill in church and leader details, choose a plan, and continue.", "You're sent to Stripe checkout showing the plan price.")
test("Complete payment", "Pay with test card 4242 4242 4242 4242.", "You return to ROOTED; the church shows as active.")
test("Billing page", "As the leader, open /billing.", "Current plan and subscription status are shown.")
test("Starter activities load on payment", "After first payment, open /admin/activities.", "A starter activity list is present for your church.")

h2("B. Leader console")
test("Leader sign in", "Go to /admin/login and sign in with the leader account.", "The Leadership dashboard opens.")
test("Setup wizard", "Open /admin/setup. Rename the church and save.", "New name is saved; the step shows a green check.")
test("Add starter activities (idempotent)", "In setup, select Add starter activities. Select it again.", "Activities are added once; the second click doesn't create duplicates.")
test("Copy invite link", "In setup, copy the invite link.", "Link copies and looks like /join/<church-slug>.")
test("Add, edit, retire an activity", "In /admin/activities, add a new activity, edit its title, then retire it.", "Each change saves; the retired activity no longer shows for members.")
test("Create a lesson", "In /admin/lessons, create a lesson with a video, scripture, instructions, and two questions.", "The lesson saves and appears in the list.")
test("Lesson Builder", "In /admin/lesson-builder, generate a lesson on a topic (e.g. \"Faith over fear\").", "A KJV-based lesson draft is created; the teaching video starts generating.")

h2("C. Member onboarding and account")
test("Join via invite link", "In a new incognito window, open the invite link and create a member account.", "Account is created and linked to the church.")
test("Member sign in", "Sign in at /login.", "Home page \"Your walk this week\" opens.")
test("Join church from notice", "Sign in with a member that has no church; paste the invite link into the notice form.", "Member is linked and the app opens.")
test("Wrong password", "Sign in with an incorrect password.", "A generic \"invalid email or password\" message appears.")
test("Forgot password", "On /login select Forgot password, enter a registered email.", "A reset email from info@rootedministry.online arrives (check spam).")
test("Reset password", "Open the email link and choose a new password.", "Password updates; you can sign in with the new one.")
test("Profile update", "Open /profile, change your display name, save.", "New name shows in the app.")
test("Google sign-in (if enabled)", "On /login, select Continue with Google.", "Google consent opens and you return signed in. If not enabled, the button shows as unavailable.")

h2("D. Member features")
test("Complete an activity", "On /activities, open an activity and submit it.", "Submission shows as pending review.")
test("Complete a lesson", "On /reading-plan, open the lesson, watch the video, answer questions, submit.", "Responses save and show as submitted.")
test("Bible Study reflection", "On /bible-study, post a reflection.", "It appears in the reflections feed.")
test("Journal — private entry", "On /journal, write an entry marked Private.", "It appears under Past entries with a Private label; other members can't see it.")
test("Journal — shared entry", "Write an entry marked shared.", "Entry saves as shared.")
test("Daily confession", "On /confessions, add a personal confession.", "It appears in your list.")
test("Prayer request", "On /prayer-requests, submit a public request.", "It's pending until a leader approves it.")
test("Prayer schedule", "On /prayer-schedule, join a time slot.", "Your name shows on that slot.")
test("Testimony", "On /testimonies, share a testimony.", "It's pending until approved.")
test("VOCAL — record", "On /vocal, record a short video with your camera and send.", "Upload completes and a success message appears.")
test("VOCAL — upload file", "On /vocal, upload a video file under 50 MB.", "Upload completes and a success message appears.")
test("VOCAL — oversize file", "Try uploading a file over 50 MB.", "A clear size-limit message appears; nothing uploads.")
test("Community chat", "On /community, send a message.", "The message appears in the conversation.")

h2("E. Leader review")
test("Approve a submission", "On /admin, approve the member's activity submission.", "It leaves the queue; the member's progress updates.")
test("Moderate prayer & testimony", "Approve the prayer request and testimony.", "Both appear publicly for members of that church.")
test("Review lesson responses", "On /admin/lessons/responses, score and approve answers.", "Response moves to Reviewed with the score shown.")
test("Member detail", "On /admin/members, open the test member.", "Progress, submissions, and VOCAL videos are listed.")
test("Review VOCAL", "On /admin/vocal, play the video and mark reviewed.", "Video plays; it's marked reviewed.")

h2("F. Privacy and access")
test("Church isolation", "Create a second church with its own member. Sign in as that member.", "None of the first church's content, members, or videos are visible.")
test("Member can't open admin", "As a member, visit /admin.", "Access is denied or you're redirected.")
test("Suspended church", "Suspend a church from /platform, then sign in as its member.", "Member sees a paused/inactive notice instead of the app.")

h2("G. Platform owner")
test("Platform console", "Sign in as a super admin.", "You're routed to /platform; all churches are listed.")
test("Suspend and reactivate", "Suspend a church, then reactivate it.", "Status changes each time; members regain access after reactivation.")
test("Estimated MRR", "Review the MRR card.", "Reflects active paying churches only, not trials.")

h2("H. Site and domain")
test("Domain and SSL", `Visit ${SITE} and www.rootedministry.online.`, "Both load securely (padlock) and land on the sign-in page.")
test("Mobile layout", "Open the site on a phone and navigate several pages.", "Pages fit the screen; navigation is usable.")

// ---------- Troubleshooting ----------
h1("Troubleshooting", "Section 6")
const rows = [
  ["No reset email arrives", "Make sure the email is registered and spelled exactly. Check spam. Request a new link — each link works once."],
  ["Reset link says expired", "Links are single-use and time-limited. Request a fresh link and click it once."],
  ["\"Not linked to a church\"", "Paste the church invite link into the form on that screen, or ask your leader for the link."],
  ["Video won't upload", "Keep files under 50 MB and use MP4/MOV/WebM. Allow camera permission in your browser for recording."],
  ["Google button disabled", "Google sign-in must be enabled in the Supabase Authentication settings first."],
  ["Members see a paused notice", "The church's subscription isn't active. A leader can fix it on /billing."],
  ["Site doesn't load", "Hard-refresh or try an incognito window to clear cached DNS."],
]
for (const [problem, fix] of rows) {
  ensure(50)
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.brand).text(problem, L, doc.y, { width: W })
  doc.font("Helvetica").fontSize(10).fillColor(C.ink).text(fix, L, doc.y + 2, { width: W, lineGap: 2 })
  doc.moveDown(0.8)
}
callout("Reporting an issue", "For each failed test, note the test number (e.g. T21), the page address, the account used, what you did, and what you saw. A screenshot helps.")

// ---------- Footers ----------
const range = doc.bufferedPageRange()
for (let i = 1; i < range.count; i++) {
  doc.switchToPage(i)
  const y = doc.page.height - 40
  doc.font("Helvetica").fontSize(8.5).fillColor(C.muted)
    .text("ROOTED — User Guide & Test Plan", L, y, { lineBreak: false })
    .text(`${i + 1} / ${range.count}`, L, y, { width: W, align: "right", lineBreak: false })
}

doc.end()
console.log(`Wrote ${OUT} with ${testNo} tests`)
