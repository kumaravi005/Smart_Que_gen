export function formatDate(isoString?: string): string {
  if (!isoString) return 'N/A'
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return isoString
  }
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Never'
  try {
    const d = new Date(isoString).getTime()
    const now = Date.now()
    const diffSec = Math.floor((now - d) / 1000)

    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(isoString)
  } catch {
    return 'Recently'
  }
}
