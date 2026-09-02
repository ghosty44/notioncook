/** Erreur métier attendue, dont le message est destiné à l'utilisateur. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * L'app tourne mais il lui manque une pièce d'infrastructure (base, secret).
 * Le détail part dans les logs serveur ; l'utilisateur reçoit un message neutre,
 * sans nom de variable d'environnement ni chemin interne.
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    readonly publicMessage = "L'app n'est pas encore reliée à sa base de données. Elle sera utilisable dès que la configuration sera terminée.",
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
