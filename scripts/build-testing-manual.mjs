/**
 * Generates the ROOTED functional testing manual as a print-ready PDF.
 *
 * Run: node scripts/build-testing-manual.mjs
 * Output: public/rooted-testing-manual.pdf
 *
 * The manual walks a tester through every function of the app with concrete
 * steps, the expected result, and a Pass / Fail / Notes area for each.
 */
import PDFDocument from "pdfkit"
import { createWriteStream, mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, "..", "public", "rooted-testing-manual.pdf")
mkdirSync(dirname(OUT), { recursive: true })

// ---- Brand palette -------------------------------------------------------
const GOLD = "#b8892b"
const GOLD_SOFT = "#f5ecd8"
const NAVY = "#1a4732"
const INK = "#20252e"
const MUTE = "#5b6472"
const LINE = "#d9dee6"
const GREEN = "#2f7d4f"
const RED = "#b23b3b"

const PAGE = { margin: 54, width: 595.28, height: 841.89 } // A4 in points
const CONTENT_W = PAGE.width - PAGE.margin * 2

const doc = new PDFDocument({
  size: "A4",
  margins: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin },
  bufferPages: true,
})
doc.pipe(createWriteStream(OUT))

// ---- Low-level helpers ---------------------------------------------------
const F = "Helvetica"
const FB = "Helvetica-Bold"
const FO = "Helvetica-Oblique"

function ensureSpace(h) {
  if (doc.y + h > PAGE.height - PAGE.margin - 24) doc.addPage()
}

function gap(h = 10) {
  doc.y += h
}

function h1(num, title) {
  ensureSpace(70)
  gap(6)
  const y = doc.y
  doc.rect(PAGE.margin, y, 4, 26).fill(GOLD)
  doc
    .fill(GOLD)
    .font(FB)
    .fontSize(11)
    .text(`SECTION ${num}`, PAGE.margin + 14, y - 2)
  doc
    .fill(NAVY)
    .font(FB)
    .fontSize(19)
    .text(title, PAGE.margin + 14, y + 10)
  doc.y = y + 40
}

function para(text, opts = {}) {
  const size = opts.size ?? 10.5
  ensureSpace(size * 2)
  doc
    .fill(opts.color ?? INK)
    .font(opts.bold ? FB : F)
    .fontSize(size)
    .text(text, PAGE.margin, doc.y, { width: CONTENT_W, lineGap: 3, align: opts.align ?? "left" })
  gap(opts.after ?? 8)
}

/**
 * Renders one test as a bordered card. Because pdfkit can't measure a full
 * card before drawing, we lay out the text first to learn its height, then
 * draw the border behind it with a second pass.
 */
let testCounter = 0
function test({ title, tag, steps, expected }) {
  testCounter += 1
  const num = testCounter
  const padX = 14
  const innerW = CONTENT_W - padX * 2

  // --- measure ---
  doc.font(FB).fontSize(12)
  const titleH = doc.heightOfString(`${num}.  ${title}`, { width: innerW - 70, lineGap: 2 })
  let bodyH = 0
  doc.font(F).fontSize(10)
  bodyH += doc.heightOfString("Steps", { width: innerW }) + 4
  for (const s of steps) {
    bodyH += doc.heightOfString(`•  ${s}`, { width: innerW - 10, lineGap: 2 }) + 3
  }
  bodyH += 8
  doc.font(FB).fontSize(10)
  bodyH += doc.heightOfString("Expected result", { width: innerW }) + 4
  doc.font(F).fontSize(10)
  bodyH += doc.heightOfString(expected, { width: innerW, lineGap: 2 })
  const resultRowH = 26
  const cardH = 14 + titleH + 12 + bodyH + 16 + resultRowH + 14

  ensureSpace(cardH + 12)

  // --- draw border + header band ---
  const x = PAGE.margin
  const y = doc.y
  doc.roundedRect(x, y, CONTENT_W, cardH, 8).lineWidth(1).stroke(LINE)

  // number chip + title
  let cy = y + 14
  doc.font(FB).fontSize(12).fill(NAVY).text(`${num}.  ${title}`, x + padX, cy, {
    width: innerW - 80,
    lineGap: 2,
  })
  // tag pill (top-right)
  if (tag) {
    doc.font(FB).fontSize(7.5)
    const tw = doc.widthOfString(tag.toUpperCase()) + 14
    const px = x + CONTENT_W - padX - tw
    doc.roundedRect(px, y + 13, tw, 15, 7.5).fill(GOLD_SOFT)
    doc.fill(GOLD).text(tag.toUpperCase(), px, y + 17, { width: tw, align: "center" })
  }
  cy += titleH + 12

  // steps
  doc.font(FB).fontSize(10).fill(GOLD).text("Steps", x + padX, cy)
  cy = doc.y + 4
  doc.font(F).fontSize(10).fill(INK)
  for (const s of steps) {
    doc.text(`•  ${s}`, x + padX + 4, cy, { width: innerW - 10, lineGap: 2 })
    cy = doc.y + 3
  }
  cy += 5

  // expected
  doc.font(FB).fontSize(10).fill(GOLD).text("Expected result", x + padX, cy)
  cy = doc.y + 4
  doc.font(F).fontSize(10).fill(INK).text(expected, x + padX, cy, { width: innerW, lineGap: 2 })
  cy = doc.y + 12

  // result row: Pass / Fail boxes + notes line
  const boxY = cy
  doc.rect(x + padX, boxY, 11, 11).lineWidth(1).stroke(GREEN)
  doc.font(FB).fontSize(9.5).fill(GREEN).text("PASS", x + padX + 16, boxY + 1)
  doc.rect(x + padX + 58, boxY, 11, 11).lineWidth(1).stroke(RED)
  doc.font(FB).fontSize(9.5).fill(RED).text("FAIL", x + padX + 74, boxY + 1)
  doc.font(F).fontSize(9).fill(MUTE).text("Notes:", x + padX + 120, boxY + 1)
  doc
    .moveTo(x + padX + 152, boxY + 11)
    .lineTo(x + CONTENT_W - padX, boxY + 11)
    .lineWidth(0.7)
    .stroke(LINE)

  doc.y = y + cardH + 12
}

function calloutBox(title, lines, color = GOLD) {
  const padX = 14
  const innerW = CONTENT_W - padX * 2
  doc.font(FB).fontSize(11)
  let h = 14 + doc.heightOfString(title, { width: innerW }) + 6
  doc.font(F).fontSize(10)
  for (const l of lines) h += doc.heightOfString(`•  ${l}`, { width: innerW - 10, lineGap: 2 }) + 3
  h += 12
  ensureSpace(h + 10)
  const x = PAGE.margin
  const y = doc.y
  doc.roundedRect(x, y, CONTENT_W, h, 8).fill(GOLD_SOFT)
  doc.rect(x, y, 4, h).fill(color)
  doc.font(FB).fontSize(11).fill(NAVY).text(title, x + padX, y + 12, { width: innerW })
  let cy = doc.y + 4
  doc.font(F).fontSize(10).fill(INK)
  for (const l of lines) {
    doc.text(`•  ${l}`, x + padX + 2, cy, { width: innerW - 10, lineGap: 2 })
    cy = doc.y + 3
  }
  doc.y = y + h + 12
}

// ---- Cover page ----------------------------------------------------------
doc.rect(0, 0, PAGE.width, PAGE.height).fill(NAVY)
doc.rect(0, 300, PAGE.width, 6).fill(GOLD)

// The real ROOTED emblem, centred above the gold rule.
const EMBLEM_SIZE = 150
doc.image(join(__dirname, "..", "public", "rooted-emblem.png"), (PAGE.width - EMBLEM_SIZE) / 2, 112, {
  width: EMBLEM_SIZE,
  height: EMBLEM_SIZE,
})

doc.font(FB).fontSize(30).fill("#ffffff").text("ROOTED", 0, 340, { width: PAGE.width, align: "center" })
doc
  .font(F)
  .fontSize(13)
  .fill("#cfe0d3")
  .text("Spiritual Growth Portal", 0, 378, { width: PAGE.width, align: "center" })

doc
  .font(FB)
  .fontSize(22)
  .fill("#ffffff")
  .text("Functional Testing Manual", 0, 440, { width: PAGE.width, align: "center" })
doc
  .font(FO)
  .fontSize(12)
  .fill("#cfe0d3")
  .text("Try and verify every function, one step at a time", 0, 472, {
    width: PAGE.width,
    align: "center",
  })

doc
  .font(F)
  .fontSize(10)
  .fill("#8f99ab")
  .text(
    '"Let your light shine before others, that they may see your good works." — Matthew 5:16',
    80,
    720,
    { width: PAGE.width - 160, align: "center", lineGap: 3 },
  )

// ---- Intro ---------------------------------------------------------------
doc.addPage()
h1("0", "Before you begin")
para(
  "This manual lets one person test every function of the ROOTED portal from top to bottom. Work through each numbered test in order, follow the steps, and compare what you see against the expected result. Tick PASS or FAIL and jot any problems in the Notes line so they are easy to report.",
)
calloutBox("What you need to get started", [
  "A phone, tablet, or computer with a web browser.",
  "The web address of your published app (or the preview link).",
  "The Leadership password, to test the admin functions.",
  "About 20–30 minutes to go through everything once.",
])
para("Two accounts make testing easier", { bold: true, size: 12, after: 4 })
para(
  "Create one ordinary member account and one leader account. That way you can submit something as a member, then switch to the leader to review and approve it — exactly how it works in real life.",
)

// ---- Section 1: Accounts & sign-in --------------------------------------
h1("1", "Accounts & signing in")
test({
  title: "Create a new member account",
  tag: "Auth",
  steps: [
    "Open the app and go to the Sign up page.",
    "Enter a full name, an email address, and a password (at least 8 characters).",
    'Tap "Create account".',
  ],
  expected:
    "You are signed in immediately and land on the Dashboard — no confirmation email or waiting. Your first name appears in the welcome greeting.",
})
test({
  title: "Duplicate email is rejected",
  tag: "Auth",
  steps: [
    "Sign out, then go to Sign up again.",
    "Try to register using the same email you just used.",
  ],
  expected:
    "The app refuses to create a second account and shows a clear message. Your original account and name are left untouched.",
})
test({
  title: "Sign out",
  tag: "Auth",
  steps: ["While signed in, open the account/profile menu.", "Choose Sign out."],
  expected: "You are returned to the login screen and can no longer reach member pages.",
})
test({
  title: "Sign back in",
  tag: "Auth",
  steps: [
    "On the Login page, enter the email and password you registered.",
    'Tap "Sign in".',
  ],
  expected: "You are signed in and returned to the Dashboard.",
})
test({
  title: "Wrong password is refused",
  tag: "Auth",
  steps: ["On the Login page, enter your email with a deliberately wrong password.", "Submit."],
  expected: "Sign-in fails with a clear error, and you stay on the login page.",
})
test({
  title: "Request a password reset",
  tag: "Auth",
  steps: [
    'On the Login page, tap "Forgot password?".',
    "Enter your email and submit.",
  ],
  expected:
    "You see the same reassuring message whether or not the email exists (this protects members' privacy). See the note on email delivery in Section 6.",
})
test({
  title: "Set a new password from the reset link",
  tag: "Auth",
  steps: [
    "Open the reset link from the email (see Section 6 if emails are not yet delivering).",
    "Enter a new password twice and submit.",
  ],
  expected:
    "Mismatched passwords are refused. When they match, the password is changed and you are signed straight in. An expired or reused link shows a clear 'request a new one' notice.",
})

// ---- Section 2: Member features -----------------------------------------
h1("2", "Member features")
test({
  title: "Dashboard overview",
  tag: "Member",
  steps: ["Sign in and view the Dashboard."],
  expected:
    "You see your day streak, a count of active disciplines, your submission count, the memory verse, the four growth areas, and a list of recent community activity.",
})
test({
  title: "Browse activities",
  tag: "Member",
  steps: [
    'Open "Activities" from the menu.',
    "Scroll through the four growth areas: Faith, Action, Ministry, Evangelism.",
  ],
  expected:
    "Activities are grouped under their growth area, each showing its point value and how often it should be done (daily / weekly / monthly).",
})
test({
  title: "Write a journal entry",
  tag: "Member",
  steps: [
    "Open Journal.",
    "Fill in the entry and, if you wish, mark it private.",
    "Submit.",
  ],
  expected:
    "The entry is saved and enters review. A private entry is never shown in any public community list.",
})
test({
  title: "Submit a Bible study reflection",
  tag: "Member",
  steps: ["Open Bible Study.", "Write a reflection and submit."],
  expected: "The reflection is saved and enters the review queue for leadership.",
})
test({
  title: "Browse the Lessons list",
  tag: "Member · Lessons",
  steps: ['Open "Lessons" from the menu.'],
  expected:
    "Every lesson a leader has published is listed as a card showing its title, a short summary, its scripture reference, and how many questions it asks. Retired lessons do not appear.",
})
test({
  title: "Open a lesson and read it",
  tag: "Member · Lessons",
  steps: ["From the Lessons list, tap a lesson to open it."],
  expected:
    "The lesson opens showing (in order) the teaching video if one was added, a 'Scripture to read' card, a 'Reading instructions' card, and a 'Your answers' section listing each question with a text box beneath it.",
})
test({
  title: "Watch the teaching video",
  tag: "Member · Lessons · Video",
  steps: ["On a lesson that has a video, press play."],
  expected:
    "The teaching video plays inside the lesson. Lessons without a video simply omit the video block — nothing looks broken.",
})
test({
  title: "Answer the questions and submit",
  tag: "Member · Lessons",
  steps: [
    "In the 'Your answers' section, type an answer into each question's box.",
    'Tap "Submit for review".',
  ],
  expected:
    "Your answers are saved, a confirmation message appears, and the lesson now shows a 'Pending' status. Submitting with every box empty is refused with a clear message.",
})
test({
  title: "Reopen and update your answers",
  tag: "Member · Lessons",
  steps: [
    "Return to a lesson you already submitted.",
    "Change one of your answers.",
    'Tap "Update my answers".',
  ],
  expected:
    "Your previous answers are pre-filled so you can edit them. After updating, the button reads 'Update my answers' (not 'Submit'), and the response returns to 'Pending' for the leader to review again.",
})
test({
  title: "Record a confession",
  tag: "Member",
  steps: ["Open Confessions.", "Write your entry and submit."],
  expected: "The confession is submitted privately for leadership; it is not shown publicly.",
})
test({
  title: "Submit a prayer request (text only)",
  tag: "Member",
  steps: [
    "Open Prayer Requests.",
    "Write a request. Leave it public, or mark it private.",
    "Submit.",
  ],
  expected:
    "The request is saved and enters review. Once a leader approves a public request, it appears in the community list. Private requests never appear publicly.",
})
test({
  title: "Attach a video to a prayer request",
  tag: "Member · Video",
  steps: [
    "On the Prayer Requests page, start a new request.",
    "Attach a short video recorded on, or saved to, your device.",
    "Submit.",
  ],
  expected:
    "The video uploads successfully (up to the size limit). It is shared privately with leadership only and never appears in the public feed.",
})
test({
  title: "View the prayer schedule",
  tag: "Member",
  steps: ["Open Prayer Schedule."],
  expected: "The 24-hour prayer slots are shown, each with its time, focus, and who has joined.",
})
test({
  title: "Share a testimony",
  tag: "Member",
  steps: ["Open Testimonies.", "Write your testimony and submit."],
  expected:
    "The testimony enters review. After a leader approves it, it appears in the Recent testimonies list for everyone to be encouraged by.",
})
test({
  title: "Check your profile",
  tag: "Member",
  steps: ["Open My Profile."],
  expected:
    "Your name, email, role, join date, and day streak are shown, along with a count of your submissions across each of the four growth areas.",
})

// ---- Section 3: Review flow ---------------------------------------------
h1("3", "How submissions become public")
para(
  "Anything a member submits (testimony, prayer request, journal, etc.) starts as pending. It only becomes visible in a community list after leadership approves it. The next test proves that end to end.",
)
test({
  title: "Member submits, leader approves, it appears",
  tag: "End-to-end",
  steps: [
    "As a member, submit a testimony with a memorable title.",
    "Confirm it does NOT yet appear in the Recent testimonies list.",
    "Sign in as a leader, unlock Leadership (Section 4), and approve that testimony.",
    "Return to the Testimonies page as a member.",
  ],
  expected:
    "Before approval the testimony is hidden from the public list; after approval it appears for everyone. This confirms the review gate works.",
})

// ---- Section 4: Leadership ----------------------------------------------
h1("4", "Leadership (admin) functions")
calloutBox(
  "The Leadership Console is a separate portal",
  [
    "Leadership is no longer part of the member menu — members see no trace of it. Reach it by going to the /admin web address directly (bookmark it).",
    "Two things are required: you must be signed in as a member AND enter the Leadership password.",
    "Sign up as normal, sign in to the console, then use 'Make leader' on your own member card.",
    "Change the Leadership password after your first sign-in — the starter password should not stay in use.",
  ],
  GOLD,
)
test({
  title: "Sign in to the Leadership Console",
  tag: "Leader",
  steps: [
    "While signed in as a member, go to the /admin web address.",
    "On the sign-in screen, enter the Leadership password and tap 'Enter console'.",
  ],
  expected:
    "A standalone sign-in screen appears (marked 'Restricted') with no member sidebar. The correct password opens the console, which has its own dark header and its own menu — Dashboard, Members, Activities, Lessons — plus a 'Back to member portal' link. A wrong password is refused with a clear message.",
})
test({
  title: "Leadership is hidden from members",
  tag: "Security",
  steps: [
    "Sign in as an ordinary member and look through the whole menu (and the mobile menu).",
  ],
  expected:
    "No 'Leadership', 'Admin', 'Members', or 'Activities' management links appear anywhere in the member menu. Members only see member features.",
})
test({
  title: "Lock the console when finished",
  tag: "Leader",
  steps: ["In the console header, tap 'Lock console'."],
  expected:
    "You are returned to the Leadership sign-in screen and must re-enter the password to get back in. Your member session stays signed in.",
})
test({
  title: "Review the admin dashboard",
  tag: "Leader",
  steps: ["With Leadership unlocked, view the Admin Dashboard."],
  expected:
    "You see community statistics and a list of submissions awaiting review, plus shortcut cards to manage activities, manage lessons (with a count of responses waiting), and download this testing manual as a PDF.",
})
test({
  title: "View the members list",
  tag: "Leader",
  steps: ['Open "Members" under Leadership.'],
  expected: "Every registered member is listed with their name and role.",
})
test({
  title: "Promote a member to leader (and back)",
  tag: "Leader",
  steps: [
    "On the Members list, use 'Make leader' on a member.",
    "Then change them back to a member.",
  ],
  expected:
    "The member's role updates immediately. Note: you cannot change your own role in a way that locks everyone out — self-promotion is guarded.",
})
test({
  title: "Open a member's detail page",
  tag: "Leader",
  steps: ["From the Members list, tap a member's name."],
  expected:
    "You see that member's submissions and can review them, including playing any private video they attached to a prayer request.",
})
test({
  title: "Approve a pending submission",
  tag: "Leader",
  steps: ["Find a pending submission (dashboard or member page).", "Approve it."],
  expected:
    "The submission is marked approved. Approved public testimonies and prayer requests then show in the community lists.",
})
test({
  title: "Play a submitted video",
  tag: "Leader · Video",
  steps: [
    "Open the member who submitted a prayer-request video.",
    "Play the attached video.",
  ],
  expected:
    "The private video plays for leadership only. It is never visible to other members.",
})
test({
  title: "Add a new activity",
  tag: "Leader",
  steps: [
    'Open "Activities" under Leadership.',
    'Tap "Add activity".',
    "Enter a name, description, growth area, frequency, and points, then save.",
  ],
  expected:
    "The new activity appears under its growth area and immediately becomes available to members. Invalid points (e.g. blanks, decimals, or huge numbers) are refused.",
})
test({
  title: "Edit an activity",
  tag: "Leader",
  steps: ['On the Activities page, tap "Edit" on an activity.', "Change its points or wording and save."],
  expected: "The form closes and the activity shows your updated values.",
})
test({
  title: "Retire an activity",
  tag: "Leader",
  steps: ['Tap "Retire" on an activity members no longer need.'],
  expected:
    "The activity moves to a 'Retired' section and disappears from members' lists — but any past submissions and points that referenced it are preserved.",
})
test({
  title: "Restore a retired activity",
  tag: "Leader",
  steps: ["In the Retired section, tap 'Restore'."],
  expected: "The activity becomes active again and returns to members' lists with its settings intact.",
})
test({
  title: "Create a lesson with a video and questions",
  tag: "Leader · Lessons",
  steps: [
    'Open "Lessons" under Leadership, then tap "Add lesson".',
    "Enter a title, summary, scripture reference, and reading instructions.",
    "Optionally upload a teaching video from your device.",
    'Add one or more questions using "Add question", then save.',
  ],
  expected:
    "The lesson is created and appears in the leader's lesson list, and immediately becomes available to members on the Lessons page. Note: creating lessons requires an admin/leader role, not just the Leadership password.",
})
test({
  title: "Edit a lesson",
  tag: "Leader · Lessons",
  steps: ['On the Lessons page, tap "Edit" on a lesson.', "Change its wording or questions and save."],
  expected:
    "The lesson shows your updated content. Members see the new version, and their existing answers are preserved.",
})
test({
  title: "Retire and restore a lesson",
  tag: "Leader · Lessons",
  steps: ['Tap "Retire" on a lesson, then later tap "Restore" on it.'],
  expected:
    "A retired lesson disappears from members' Lessons page but is never deleted — every member's answers stay intact. Restoring brings it back with its questions and answers unchanged.",
})
test({
  title: "Review and approve lesson answers",
  tag: "Leader · Lessons",
  steps: [
    'On the Lessons page, open "Review lesson responses".',
    "Find a member's pending response and read their answers beneath each question.",
    "Approve it (or reject it).",
  ],
  expected:
    "Each response shows the member's name, the questions, and their typed answers. Approving moves it out of 'Awaiting review' into a 'Reviewed' list with an Approved badge. When nothing is waiting, an 'All caught up' message is shown. The admin dashboard's Manage lessons card also shows a count of responses waiting.",
})
test({
  title: "Change the Leadership password",
  tag: "Leader",
  steps: ["In the Leadership area, open the password change control.", "Set a new password and save."],
  expected:
    "The new password takes effect. Signing out and unlocking again requires the new password; the old one no longer works.",
})
test({
  title: "Access is blocked without the password",
  tag: "Security",
  steps: [
    "Sign in as an ordinary member (do not enter the Leadership password).",
    "Type an admin web address directly, such as /admin/members or /admin/lessons.",
    "Then sign out completely and try the same address again.",
  ],
  expected:
    "While signed in but locked, you are sent to the Leadership sign-in screen instead of the page — no leadership data is shown. While signed out, you are sent to the member login first. No leadership tool can be reached or used without the Leadership password.",
})

// ---- Section 5: Devices --------------------------------------------------
h1("5", "Devices & accessibility")
test({
  title: "Use the app on a phone",
  tag: "Responsive",
  steps: ["Open the app on a phone.", "Open the menu and visit several member pages."],
  expected:
    "The layout adapts to the small screen and the mobile menu includes both member pages and, for leaders, the admin pages.",
})
test({
  title: "Upload a video from a phone",
  tag: "Responsive · Video",
  steps: ["On a phone, submit a prayer request and attach a video from the camera or gallery."],
  expected: "The video uploads and submits successfully from the phone.",
})

// ---- Section 6: Known limitations ---------------------------------------
h1("6", "Known limitations & notes")
calloutBox(
  "Password-reset emails",
  [
    "The reset flow is fully built. Emails send through Resend and require a verified sending domain.",
    "Until a domain shows 'Verified' in Resend and the sender address uses it, delivery is limited — a leader can reset a member's password manually in the meantime.",
  ],
  RED,
)
calloutBox("Video storage", [
  "Uploads are capped per video, and the free storage tier holds roughly 20–40 phone videos in total.",
  "Watch usage as the congregation grows; more storage can be added later.",
])
calloutBox("Optional: Google sign-in", [
  "A Google sign-in option is built but switched off until the provider is enabled with Google credentials.",
  "Email-and-password sign-in works fully without it.",
])

// ---- Footer / page numbers ----------------------------------------------
const range = doc.bufferedPageRange()
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i)
  if (i === range.start) continue // skip cover
  // Writing in the bottom margin makes pdfkit auto-append a blank page for
  // each footer. Zeroing the bottom margin for the write prevents that.
  doc.page.margins.bottom = 0
  const bottom = PAGE.height - 34
  doc
    .font(F)
    .fontSize(8)
    .fill(MUTE)
    .text("ROOTED Spiritual Growth Portal — Functional Testing Manual", PAGE.margin, bottom, {
      width: CONTENT_W - 40,
      align: "left",
      lineBreak: false,
    })
  doc
    .font(F)
    .fontSize(8)
    .fill(MUTE)
    .text(`Page ${i - range.start} of ${range.count - 1}`, PAGE.margin, bottom, {
      width: CONTENT_W,
      align: "right",
      lineBreak: false,
    })
}

doc.end()
console.log("[v0] Testing manual written to", OUT)
