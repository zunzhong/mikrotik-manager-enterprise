import { createHash } from 'node:crypto';

/**
 * Creates RouterOS legacy challenge response.
 *
 * Response format:
 * 00 + md5(0x00 + password + challenge)
 */
export function createChallengeResponse(password: string, challengeHex: string): string {
  const challenge = Buffer.from(challengeHex, 'hex');
  const passwordBuffer = Buffer.from(password, 'utf8');

  const digest = createHash('md5')
    .update(Buffer.concat([Buffer.from([0]), passwordBuffer, challenge]))
    .digest('hex');

  return `00${digest}`;
}
