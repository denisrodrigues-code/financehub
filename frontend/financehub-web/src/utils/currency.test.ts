import { describe, expect, it } from 'vitest'
import { formatBrl } from './currency'

describe('formatBrl', () => {
  it('formats numbers as BRL currency', () => {
    expect(formatBrl(1234.56)).toBe('R$\u00a01.234,56')
  })
})
