export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown; title?: unknown } } }).response
    if (typeof response?.data?.message === 'string' && response.data.message.trim()) {
      return response.data.message
    }
    if (typeof response?.data?.title === 'string' && response.data.title.trim()) {
      return response.data.title
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}
