import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildInviteUrl, generateInviteQrSvg, getInviteState, isInviteExpired } from './inviteQr.ts'

describe('inviteQr', () => {
  it('builds /invite/:eventId/:token URLs cleanly', () => {
    assert.equal(
      buildInviteUrl('https://tanys.example.org/', 'evt-1', 'abc123'),
      'https://tanys.example.org/invite/evt-1/abc123',
    )
  })

  it('detects active, revoked, and expired invites', () => {
    const now = Date.parse('2027-02-01T10:00:00Z')
    assert.equal(getInviteState({ expiresAt: '2027-02-01T12:00:00Z' }, now), 'active')
    assert.equal(getInviteState({ expiresAt: '2027-02-01T09:00:00Z' }, now), 'expired')
    assert.equal(getInviteState({ revoked: true, expiresAt: '2027-02-01T12:00:00Z' }, now), 'revoked')
    assert.equal(isInviteExpired('2027-02-01T10:00:00Z', now), true)
  })

  it('generates an inline SVG QR code locally without any network calls', async () => {
    const url = buildInviteUrl('https://tanys.example.org', '550e8400-e29b-41d4-a716-446655440000', 'a'.repeat(64))
    const svg = await generateInviteQrSvg(url)
    assert.match(svg, /^<svg\b/)
    assert.match(svg, /<\/svg>\s*$/)
    assert.match(svg, /<path\b/)
  })
})
