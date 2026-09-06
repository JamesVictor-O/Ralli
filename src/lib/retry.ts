function isTransientNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return error instanceof TypeError || /failed to fetch|network|load failed|connection|timeout/i.test(message)
}

export async function withNetworkRetry<T>(operation: () => PromiseLike<T> | Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await operation()
      if (typeof result === 'object' && result !== null && 'error' in result && result.error && isTransientNetworkError(result.error)) {
        throw result.error
      }
      return result
    } catch (error) {
      lastError = error
      if (!isTransientNetworkError(error) || attempt === attempts - 1) throw error
      await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)))
    }
  }
  throw lastError
}

export function friendlyNetworkError(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : String(error)
  return isTransientNetworkError(error)
    ? `Ralli could not reach Supabase while ${action}. Check your connection and try again.`
    : message
}
