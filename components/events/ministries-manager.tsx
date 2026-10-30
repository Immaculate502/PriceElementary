"use client"

import { useActionState } from "react"
import { Crown, Trash2 } from "lucide-react"
import {
  addMinistryMember,
  createMinistry,
  deleteMinistry,
  updateMinistryMember,
  type EventActionResult,
} from "@/app/events-actions"
import { Card, EmptyState } from "@/components/ui-kit"
import type { Ministry } from "@/lib/event-types"
import { ActionMessage, SubmitButton, inputClass } from "./form-bits"

export function MinistriesManager({
  ministries,
  members,
}: {
  ministries: Ministry[]
  members: { id: string; name: string }[]
}) {
  const [state, action] = useActionState<EventActionResult | null, FormData>(createMinistry, null)
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form action={action} className="flex flex-col gap-2">
          <label htmlFor="new-ministry" className="text-sm font-medium">Add a ministry</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="new-ministry" name="name" required maxLength={80} placeholder="e.g. Youth Ministry" className={inputClass} />
            <SubmitButton label="Add ministry" pendingLabel="Adding..." />
          </div>
          <ActionMessage state={state} />
        </form>
      </Card>

      {ministries.length === 0 ? (
        <EmptyState title="No ministries yet" description="Create ministries, then assign leaders who can run their own events." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ministries.map((m) => (
            <MinistryCard key={m.id} ministry={m} members={members} />
          ))}
        </div>
      )}
    </div>
  )
}

function MinistryCard({ ministry, members }: { ministry: Ministry; members: { id: string; name: string }[] }) {
  const [state, action] = useActionState<EventActionResult | null, FormData>(addMinistryMember, null)
  const memberIds = new Set(ministry.members.map((m) => m.userId))
  const available = members.filter((m) => !memberIds.has(m.id))
  const sorted = [...ministry.members].sort((a, b) => Number(b.isLeader) - Number(a.isLeader) || a.name.localeCompare(b.name))

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold">{ministry.name}</h3>
          <p className="text-xs text-muted-foreground">
            {ministry.members.length} {ministry.members.length === 1 ? "member" : "members"} ·{" "}
            {ministry.members.filter((m) => m.isLeader).length} leaders
          </p>
        </div>
        <form
          action={deleteMinistry}
          onSubmit={(e) => {
            if (!confirm(`Delete ${ministry.name}? Its events stay but lose their ministry.`)) e.preventDefault()
          }}
        >
          <input type="hidden" name="ministryId" value={ministry.id} />
          <button type="submit" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${ministry.name}`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>

      {sorted.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((mm) => (
            <li key={mm.userId} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="flex items-center gap-1.5">
                {mm.isLeader && <Crown className="h-3.5 w-3.5 text-gold" aria-label="Leader" />}
                {mm.name}
              </span>
              <span className="flex items-center gap-2">
                <form action={updateMinistryMember}>
                  <input type="hidden" name="ministryId" value={ministry.id} />
                  <input type="hidden" name="userId" value={mm.userId} />
                  <input type="hidden" name="op" value={mm.isLeader ? "makeMember" : "makeLeader"} />
                  <button type="submit" className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                    {mm.isLeader ? "Remove leader" : "Make leader"}
                  </button>
                </form>
                <form action={updateMinistryMember}>
                  <input type="hidden" name="ministryId" value={ministry.id} />
                  <input type="hidden" name="userId" value={mm.userId} />
                  <input type="hidden" name="op" value="remove" />
                  <button type="submit" className="text-xs font-medium text-destructive underline-offset-2 hover:underline">
                    Remove
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="flex flex-col gap-2 border-t border-border pt-3">
        <input type="hidden" name="ministryId" value={ministry.id} />
        <label htmlFor={`add-${ministry.id}`} className="sr-only">Add member to {ministry.name}</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select id={`add-${ministry.id}`} name="userId" required defaultValue="" className={inputClass} disabled={!available.length}>
            <option value="" disabled>{available.length ? "Choose a member" : "Everyone is already in this ministry"}</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <label className="flex shrink-0 items-center gap-1.5 text-sm">
            <input type="checkbox" name="isLeader" className="h-4 w-4" />
            Leader
          </label>
          <SubmitButton label="Add" pendingLabel="Adding..." variant="outline" />
        </div>
        <ActionMessage state={state} />
      </form>
    </Card>
  )
}
