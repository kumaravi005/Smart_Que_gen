export function generateId(prefix = 'id'): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 9)
  return `${prefix}_${timestamp}_${randomStr}`
}
