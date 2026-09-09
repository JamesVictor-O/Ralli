export function actionableError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/abort|reject|declin|cancel|denied/i.test(message)) return 'Action cancelled. Nothing was changed.'
  if (/failed to fetch|network|load failed|connection|offline|timeout/i.test(message)) return 'Ralli could not reach the network. Check your connection and try again.'
  if (/jwt|session|refresh token|not authenticated|auth/i.test(message)) return 'Your session expired. Reconnect your wallet and try again.'
  if (/row-level security|permission|not allowed|forbidden/i.test(message)) return 'This action is not available for this account. Reconnect your wallet and try again.'
  if (/storage|upload|bucket|payload too large|413/i.test(message)) return 'The media upload did not finish. Choose a smaller file or try again on a stronger connection.'
  if (/rate limit|too many requests|429/i.test(message)) return 'Too many attempts were made. Wait a moment, then try again.'
  if (/insufficient|balance|not enough/i.test(message)) return 'There is not enough NIM in this account for that payment and its network fee.'
  if (/recipient.*not.*configured/i.test(message)) return 'Payments are temporarily unavailable because the reward account is not configured.'
  return message && message.length <= 180 ? message : fallback
}
