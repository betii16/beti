// Période de lancement gratuit (app_config.launch_free_until) : jusqu'à cette date,
// tous les artisans publiés sont visibles, abonnés ou non.

/** Le lancement gratuit court-il encore ? Reflet de private.launch_free(). */
export const launchActive = (until: string | null, now = Date.now()): boolean => until !== null && Date.parse(until) > now
