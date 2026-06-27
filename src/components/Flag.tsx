/**
 * Maps FIFA 3-letter team codes to ISO 3166-1 alpha-2 country codes
 * used by flagcdn.com for flag images.
 */
const FIFA_TO_ISO2: Record<string, string> = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
  CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
  USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
  ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  FRA: 'fr', MLI: 'ml', ARG: 'ar', CHI: 'cl',
  POR: 'pt', POL: 'pl', ENG: 'gb-eng', SEN: 'sn',
  COL: 'co', CRC: 'cr', MOR: 'ma', GHA: 'gh',
  NGA: 'ng', CMR: 'cm', PAN: 'pa', BOL: 'bo',
  VEN: 've', HON: 'hn', GTM: 'gt', JAM: 'jm',
  TRI: 'tt', CUB: 'cu', ALB: 'al', SVK: 'sk',
  DEN: 'dk', NOR: 'no', WAL: 'gb-wls', IRL: 'ie',
  ISR: 'il', GRE: 'gr', ROU: 'ro', UKR: 'ua',
  HUN: 'hu', SRB: 'rs', CRO: 'hr', SVN: 'si',
  AUT: 'at', FIN: 'fi', ISL: 'is', AZE: 'az',
  GEO: 'ge', KOS: 'xk', MKD: 'mk', MNE: 'me',
  ARM: 'am', KAZ: 'kz', BLR: 'by', MDA: 'md',
  LTU: 'lt', LVA: 'lv', EST: 'ee', AND: 'ad',
  MLT: 'mt', SMR: 'sm', LIE: 'li', LUX: 'lu',
  CYP: 'cy', GIB: 'gi', FRO: 'fo',
  ANG: 'ao', TAN: 'tz', ZIM: 'zw', GAB: 'ga',
  MOZ: 'mz', UGA: 'ug', ZAM: 'zm', ETH: 'et',
  KEN: 'ke', GUI: 'gn', SLE: 'sl', LBR: 'lr',
  GAM: 'gm', MAD: 'mg', ALG: 'dz', TUN2: 'tn',
  CIV2: 'ci', BFA: 'bf', MLW: 'mw',
  KWA: 'kw', UAE: 'ae', JOR: 'jo', BHR: 'bh',
  OMA: 'om', LBN: 'lb', PAL: 'ps', YEM: 'ye',
  IND: 'in', PHI: 'ph', THA: 'th', VIE: 'vn',
  IDN: 'id', MYA: 'mm', SIN: 'sg', HKG: 'hk',
  CHN: 'cn', MNG: 'mn', KGZ: 'kg', TJK: 'tj',
  UZB: 'uz', TKM: 'tm', AFG: 'af', PAK: 'pk',
  BAN: 'bd', NEP: 'np', SRI: 'lk', MDV: 'mv', COD: 'cd',
  // Fallback
};

/**
 * Returns the URL of the flag image for a given FIFA team code.
 * Uses flagcdn.com with the ISO 3166-1 alpha-2 code.
 */
export function flagUrl(code: string, size: 'w20' | 'w40' | 'w80' = 'w20'): string {
  const iso2 = FIFA_TO_ISO2[code];
  if (!iso2) return '';
  return `https://flagcdn.com/${size}/${iso2}.png`;
}

/**
 * React img element props for a country flag.
 */
export function Flag({
  code,
  className = 'inline-block h-3.5 w-auto rounded-[1px] shadow-sm',
}: {
  code: string;
  className?: string;
}) {
  const url = flagUrl(code, 'w40');
  if (!url) return null;
  return (
    <img
      src={url}
      alt={code}
      className={className}
      loading="lazy"
      aria-hidden="true"
    />
  );
}
