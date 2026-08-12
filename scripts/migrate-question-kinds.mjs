/**
 * Adds multiple-choice support to lesson questions.
 *
 * Idempotent: every statement is guarded, so running it twice is safe.
 * Run with:
 *   node --env-file-if-exists=.env.development.local scripts/migrate-question-kinds.mjs
 */
import pg from "pg"

const SQL = `
alter table public.lesson_questions
  add column if not exists kind text not null default 'open';
alter table public.lesson_questions
  add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.lesson_questions
  add column if not exists correct_option integer;

alter table public.lesson_questions drop constraint if exists lesson_questions_kind_check;
alter table public.lesson_questions
  add constraint lesson_questions_kind_check check (kind in ('open', 'choice'));

alter table public.lesson_questions drop constraint if exists lesson_questions_shape_check;
alter table public.lesson_questions
  add constraint lesson_questions_shape_check check (
    (kind = 'open' and correct_option is null)
    or (
      kind = 'choice'
      and jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) between 2 and 8
      and correct_option >= 0
      and correct_option < jsonb_array_length(options)
    )
  );

alter table public.lesson_answers
  add column if not exists selected_option integer;
`

const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
if (!raw) {
  console.error("[v0] No POSTGRES_URL available.")
  process.exit(1)
}

// Supabase terminates TLS with a self-signed chain. A `sslmode` in the URL wins
// over the client `ssl` option, so drop it and configure TLS explicitly.
const url = new URL(raw)
url.searchParams.delete("sslmode")
url.searchParams.delete("ssl")

const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query("begin")
  await client.query(SQL)
  await client.query("commit")
  console.log("[v0] Migration applied.")

  const { rows } = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('lesson_questions', 'lesson_answers')
      and column_name in ('kind', 'options', 'correct_option', 'selected_option')
    order by table_name, column_name
  `)
  console.log("[v0] New columns:", rows.map((r) => `${r.column_name}:${r.data_type}`).join(", "))
} catch (err) {
  await client.query("rollback").catch(() => {})
  console.error("[v0] Migration failed:", err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
