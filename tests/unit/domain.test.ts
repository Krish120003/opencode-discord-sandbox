import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import { Session } from '../../src/domain/discord/types.js'

describe('Domain Types', () => {
  describe('Session Schema', () => {
    it('should validate a valid session', () => {
      const validSession = {
        threadId: 'thread-123',
        sessionId: 'session-456',
        sandboxId: 'sandbox-789',
        createdAt: new Date(),
        lastActivity: new Date()
      }

      const result = Schema.decode(Schema.Struct({
        threadId: Schema.String,
        sessionId: Schema.String,
        sandboxId: Schema.String,
        createdAt: Schema.Date,
        lastActivity: Schema.Date
      }))(validSession)

      expect(result._tag).toBe('Success')
      if (result._tag === 'Success') {
        expect(result.data.threadId).toBe('thread-123')
        expect(result.data.sessionId).toBe('session-456')
        expect(result.data.sandboxId).toBe('sandbox-789')
      }
    })

    it('should reject invalid session', () => {
      const invalidSession = {
        threadId: '',
        sessionId: 'session-456',
        sandboxId: 'sandbox-789',
        createdAt: new Date(),
        lastActivity: new Date()
      }

      const result = Schema.decode(Schema.Struct({
        threadId: Schema.String.pipe(Schema.minLength(1)),
        sessionId: Schema.String,
        sandboxId: Schema.String,
        createdAt: Schema.Date,
        lastActivity: Schema.Date
      }))(invalidSession)

      expect(result._tag).toBe('Failure')
    })
  })
})