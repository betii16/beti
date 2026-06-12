// lib/countryCodes.ts — indicatifs pays partagés (login + signup)
// Tous les pays reçoivent le code OTP via WhatsApp (channel: 'whatsapp').

export type Country = { c: string; iso: string; n: string; local?: boolean }

export const COUNTRY_CODES: Country[] = [
  { c: '+213', iso: 'dz', n: 'Algérie',        local: true },
  { c: '+33',  iso: 'fr', n: 'France'                      },
  { c: '+212', iso: 'ma', n: 'Maroc'                       },
  { c: '+216', iso: 'tn', n: 'Tunisie'                     },
  { c: '+218', iso: 'ly', n: 'Libye'                       },
  { c: '+20',  iso: 'eg', n: 'Égypte'                      },
  { c: '+966', iso: 'sa', n: 'Arabie Saoudite'             },
  { c: '+971', iso: 'ae', n: 'Émirats Arabes Unis'         },
  { c: '+90',  iso: 'tr', n: 'Turquie'                     },
  { c: '+49',  iso: 'de', n: 'Allemagne'                   },
  { c: '+44',  iso: 'gb', n: 'Royaume-Uni'                 },
  { c: '+1',   iso: 'us', n: 'États-Unis'                  },
  { c: '+39',  iso: 'it', n: 'Italie'                      },
  { c: '+34',  iso: 'es', n: 'Espagne'                     },
  { c: '+32',  iso: 'be', n: 'Belgique'                    },
  { c: '+41',  iso: 'ch', n: 'Suisse'                      },
  { c: '+31',  iso: 'nl', n: 'Pays-Bas'                    },
  { c: '+351', iso: 'pt', n: 'Portugal'                    },
  { c: '+7',   iso: 'ru', n: 'Russie'                      },
  { c: '+86',  iso: 'cn', n: 'Chine'                       },
  { c: '+81',  iso: 'jp', n: 'Japon'                       },
  { c: '+82',  iso: 'kr', n: 'Corée du Sud'                },
  { c: '+91',  iso: 'in', n: 'Inde'                        },
  { c: '+55',  iso: 'br', n: 'Brésil'                      },
  { c: '+52',  iso: 'mx', n: 'Mexique'                     },
  { c: '+61',  iso: 'au', n: 'Australie'                   },
  { c: '+27',  iso: 'za', n: 'Afrique du Sud'              },
  { c: '+234', iso: 'ng', n: 'Nigeria'                     },
  { c: '+249', iso: 'sd', n: 'Soudan'                      },
  { c: '+222', iso: 'mr', n: 'Mauritanie'                  },
]

// Construit le numéro E.164 (ex : +213555123456) à partir d'un indicatif + saisie.
export const toE164 = (cc: string, raw: string) => `${cc}${raw.replace(/[\s\-().]/g, '').replace(/^0+/, '')}`
