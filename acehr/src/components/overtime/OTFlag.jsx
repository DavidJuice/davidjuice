import Badge from '../ui/Badge.jsx'

/**
 * Overtime severity at a glance:
 *   0h -> normal, <= 8h -> indigo "overtime", > 8h -> red "high overtime".
 */
export default function OTFlag({ overtimeHours }) {
  const hours = Number(overtimeHours ?? 0)
  if (hours <= 0) return <Badge tone="normal">normal</Badge>
  if (hours <= 8) return <Badge tone="overtime">overtime</Badge>
  return <Badge tone="flagged">high overtime</Badge>
}
