import { describe, it, expect } from 'vitest'
import { formatTime, formatTimeMillis, parseTimeDuration } from '../../src/utils/format'

describe('formatTime', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('formats seconds correctly', () => {
    expect(formatTime(30)).toBe('00:30')
    expect(formatTime(59)).toBe('00:59')
  })

  it('formats minutes correctly', () => {
    expect(formatTime(60)).toBe('01:00')
    expect(formatTime(90)).toBe('01:30')
    expect(formatTime(120)).toBe('02:00')
  })

  it('formats larger times correctly', () => {
    expect(formatTime(600)).toBe('10:00')
    expect(formatTime(3600)).toBe('60:00')
    expect(formatTime(3661)).toBe('61:01')
  })

  it('pads single digits with zeros', () => {
    expect(formatTime(1)).toBe('00:01')
    expect(formatTime(61)).toBe('01:01')
  })
})

describe('formatTimeMillis', () => {
  it('formats 0 as 00:00.00', () => {
    expect(formatTimeMillis(0)).toBe('00:00.00')
  })

  it('formats fractional seconds correctly', () => {
    expect(formatTimeMillis(1.5)).toBe('00:01.50')
    expect(formatTimeMillis(30.25)).toBe('00:30.25')
  })

  it('formats minutes with milliseconds', () => {
    expect(formatTimeMillis(60.5)).toBe('01:00.50')
    // Note: floating point precision may cause slight differences
    const result = formatTimeMillis(90.33)
    expect(result).toMatch(/^01:30\.3[23]$/) // Accept 32 or 33 due to floating point
  })

  it('pads milliseconds with zeros', () => {
    expect(formatTimeMillis(1.05)).toBe('00:01.05')
  })
})

describe('parseTimeDuration', () => {
  it('parses MM:SS format', () => {
    expect(parseTimeDuration('1:30')).toBe(90)
    expect(parseTimeDuration('0:30')).toBe(30)
    expect(parseTimeDuration('10:00')).toBe(600)
  })

  it('parses minutes format', () => {
    expect(parseTimeDuration('1min')).toBe(60)
    expect(parseTimeDuration('2m')).toBe(120)
    expect(parseTimeDuration('5 min')).toBe(300)
  })

  it('parses seconds format', () => {
    expect(parseTimeDuration('30s')).toBe(30)
    expect(parseTimeDuration('45sec')).toBe(45)
    expect(parseTimeDuration('60')).toBe(60)
  })

  it('handles mixed case', () => {
    expect(parseTimeDuration('1MIN')).toBe(60)
    expect(parseTimeDuration('30S')).toBe(30)
  })

  it('returns 0 for invalid input', () => {
    expect(parseTimeDuration('')).toBe(0)
    expect(parseTimeDuration('abc')).toBe(0)
  })
})
