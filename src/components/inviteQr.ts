import QRCode from 'qrcode'

export type InviteState = 'active' | 'revoked' | 'expired'

export function buildInviteUrl(origin: string, eventId: string, token: string): string {
  const cleanOrigin = origin.replace(/\/$/, '')
  return `${cleanOrigin}/invite/${encodeURIComponent(eventId)}/${encodeURIComponent(token)}`
}

export function isInviteExpired(expiresAt: string | undefined, nowMs = Date.now()): boolean {
  if (!expiresAt) return false
  const parsed = Date.parse(expiresAt)
  return Number.isFinite(parsed) && parsed <= nowMs
}

export function getInviteState(
  invite: { revoked?: boolean; expiresAt?: string },
  nowMs = Date.now(),
): InviteState {
  if (invite.revoked) return 'revoked'
  if (isInviteExpired(invite.expiresAt, nowMs)) return 'expired'
  return 'active'
}

/**
 * Generates an ISO/IEC 18004 QR code SVG completely locally in memory.
 * Invite tokens are never sent to any third-party QR generator service.
 */
export async function generateInviteQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#13243f',
      light: '#ffffff',
    },
  })
}
