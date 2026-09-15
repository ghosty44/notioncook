/**
 * Alphabet sans caractères ambigus (0/O, 1/I/L) : le code est lu à voix haute
 * ou recopié depuis un téléphone.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Le code est le seul secret du foyer : il ouvre l'accès complet à la base et
 * permet de générer un jeton MCP. Dix caractères donnent une cinquantaine de
 * bits, ce qui met hors de portée une attaque en ligne, tout en restant
 * dictable en deux groupes de cinq.
 */
export function generateInviteCode(length = 10): string {
  // Tirage par rejet : un simple modulo favoriserait les huit premiers
  // symboles, 256 n'étant pas un multiple de 31.
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let code = '';

  while (code.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte >= limit) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === length) break;
    }
  }

  return code;
}

/** Le code saisi est comparé en majuscules, sans espaces ni tirets. */
export function canonicalInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Affiché par groupes de cinq, plus facile à lire et à dicter. */
export function formatInviteCode(code: string): string {
  return code.replace(/(.{5})(?=.)/g, '$1 ');
}
