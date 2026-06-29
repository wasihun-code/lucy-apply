import { ApiError, getErrorMessage } from '@/lib/api'

describe('ApiError', () => {
  it('creates error with message and status', () => {
    const err = new ApiError(403, 'Permission denied', { detail: 'No access' })
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(403)
    expect(err.message).toBe('Permission denied')
    expect(err.body).toEqual({ detail: 'No access' })
    expect(err.name).toBe('ApiError')
  })
})

describe('getErrorMessage', () => {
  it('returns ApiError message', () => {
    const err = new ApiError(400, 'Bad request')
    expect(getErrorMessage(err)).toBe('Bad request')
  })

  it('parses JSON error from plain Error', () => {
    const err = new Error('{"detail":"Invalid input","code":"INVALID"}')
    expect(getErrorMessage(err)).toBe('Invalid input')
  })

  it('parses nested error.message from plain Error', () => {
    const err = new Error('{"error":{"message":"Not found"}}')
    expect(getErrorMessage(err)).toBe('Not found')
  })

  it('parses nested error.code when no message', () => {
    const err = new Error('{"error":{"code":"RATE_LIMIT"}}')
    expect(getErrorMessage(err)).toBe('RATE_LIMIT')
  })

  it('falls back to raw message when JSON parsing fails', () => {
    const err = new Error('Simple error message')
    expect(getErrorMessage(err)).toBe('Simple error message')
  })

  it('falls back to default for non-Error', () => {
    expect(getErrorMessage('string error')).toBe('An unexpected error occurred')
  })

  it('returns null-message for nullish', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred')
  })
})
