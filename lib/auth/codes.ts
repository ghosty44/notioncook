/**
 * Alphabet sans caractères ambigus (0/O, 1/I/L) : le code est lu à voix haute
 * ou recopié depuis un téléphone.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateInviteCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

/** Le code saisi est comparé en majuscules, sans espaces ni tirets. */
export function canonicalInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
