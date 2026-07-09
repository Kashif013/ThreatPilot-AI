// ---------------------------------------------------------------------------
// IOC extraction engine -- 100% client-side, no network calls.
//
// Single source of truth for every regex pattern, validator, and metadata
// used by the IOC Extractor page. Keeping this isolated from the component
// makes the matching/validation logic independently testable and keeps the
// page focused on presentation.
// ---------------------------------------------------------------------------

export const IOC_TYPES = [
  "ipv4",
  "ipv6",
  "url",
  "domain",
  "email",
  "md5",
  "sha1",
  "sha256",
  "sha512",
  "cve",
] as const;

export type IocType = (typeof IOC_TYPES)[number];

export interface IocTypeMeta {
  label: string;
  shortLabel: string;
  /** Used to roll several types up into one summary card (e.g. all hashes). */
  group: "network" | "web" | "identity" | "hash" | "vuln";
  linkable: boolean;
  /** Builds an external lookup/browse URL for this value, if applicable. */
  buildLink?: (value: string) => string;
}

export const IOC_META: Record<IocType, IocTypeMeta> = {
  ipv4: {
    label: "IPv4 Addresses",
    shortLabel: "IPv4",
    group: "network",
    linkable: true,
    buildLink: (v) => `https://www.abuseipdb.com/check/${v}`,
  },
  ipv6: {
    label: "IPv6 Addresses",
    shortLabel: "IPv6",
    group: "network",
    linkable: true,
    buildLink: (v) => `https://www.abuseipdb.com/check/${v}`,
  },
  url: {
    label: "URLs",
    shortLabel: "URL",
    group: "web",
    linkable: true,
    buildLink: (v) => v,
  },
  domain: {
    label: "Domains",
    shortLabel: "Domain",
    group: "web",
    linkable: true,
    buildLink: (v) => `https://who.is/whois/${v}`,
  },
  email: {
    label: "Email Addresses",
    shortLabel: "Email",
    group: "identity",
    linkable: true,
    buildLink: (v) => `mailto:${v}`,
  },
  md5: { label: "MD5 Hashes", shortLabel: "MD5", group: "hash", linkable: false },
  sha1: { label: "SHA1 Hashes", shortLabel: "SHA1", group: "hash", linkable: false },
  sha256: { label: "SHA256 Hashes", shortLabel: "SHA256", group: "hash", linkable: false },
  sha512: { label: "SHA512 Hashes", shortLabel: "SHA512", group: "hash", linkable: false },
  cve: {
    label: "CVE IDs",
    shortLabel: "CVE",
    group: "vuln",
    linkable: true,
    buildLink: (v) => `https://nvd.nist.gov/vuln/detail/${v.toUpperCase()}`,
  },
};

// IPv6 candidates are matched loosely (any hex/colon run that contains at
// least one colon), then verified structurally by isValidIpv6 below. A
// hand-rolled alternation regex using \b breaks on ":" since \b relies on a
// word/non-word transition, and both "hex" and ":" sit on the "non-word"
// side inconsistently at string edges -- causing forms like "::1" to fail to
// match at all. Lookaround on the character class sidesteps that entirely.
const IPV6_CANDIDATE = /(?<![A-Za-z0-9:])(?=[A-Fa-f0-9:]*:)[A-Fa-f0-9:]{2,45}(?![A-Za-z0-9:])/g;

// Each pattern is intentionally scoped tightly to minimize false positives.
const PATTERNS: Record<IocType, RegExp> = {
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  ipv6: IPV6_CANDIDATE,
  url: /\b(?:https?|ftp):\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,10}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|edu|gov|mil|io|co|biz|info|ru|cn|uk|de|fr|jp|xyz|top|club|online|site|app|dev|ai|me|tv|cc|us|ca|au|link|click|shop|live)\b/gi,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
  md5: /\b[a-fA-F0-9]{32}\b/g,
  sha1: /\b[a-fA-F0-9]{40}\b/g,
  sha256: /\b[a-fA-F0-9]{64}\b/g,
  sha512: /\b[a-fA-F0-9]{128}\b/g,
  cve: /\bCVE-\d{4}-\d{4,7}\b/gi,
};

// Order in which types "claim" text -- most specific first, so a generic
// domain pattern never re-matches the hostname portion of a URL or email.
const EXTRACTION_PRIORITY: IocType[] = [
  "url",
  "email",
  "cve",
  "sha512",
  "sha256",
  "sha1",
  "md5",
  "ipv6",
  "ipv4",
  "domain",
];

/** Extra structural validation beyond the matching regex, to reject edge-case false positives. */
const VALIDATORS: Partial<Record<IocType, (value: string) => boolean>> = {
  ipv4: (value) => value.split(".").every((octet) => Number(octet) <= 255),
  ipv6: (value) => isValidIpv6(value),
  domain: (value) => value.length <= 253 && !value.startsWith("-") && !value.endsWith("-"),
  url: (value) => {
    try {
      // eslint-disable-next-line no-new
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  email: (value) => {
    const [local, domain] = value.split("@");
    return Boolean(local && domain && domain.includes("."));
  },
};

/**
 * Structural validation for an IPv6 candidate string (RFC 4291 grouping
 * rules): at most one "::" compression, no bare "::" on its own, no triple
 * colons, at most 7 groups when compressed or exactly 8 when not, and every
 * group is 1-4 hex digits.
 */
function isValidIpv6(value: string): boolean {
  if (value === "::") return false;
  if (!value.includes(":")) return false;
  if (/:::/.test(value)) return false;
  if ((value.match(/::/g) ?? []).length > 1) return false;

  let groups: string[];
  if (value.includes("::")) {
    const [head, tail] = value.split("::");
    const headGroups = head ? head.split(":") : [];
    const tailGroups = tail ? tail.split(":") : [];
    groups = [...headGroups, ...tailGroups];
    if (groups.length > 7) return false;
  } else {
    groups = value.split(":");
    if (groups.length !== 8) return false;
  }

  return groups.length > 0 && groups.every((g) => /^[A-Fa-f0-9]{1,4}$/.test(g));
}

function isValid(type: IocType, value: string): boolean {
  const validator = VALIDATORS[type];
  return validator ? validator(value) : true;
}

/**
 * Canonical form used both as the de-dup key and (for most types) the
 * displayed value, so "Example.com" and "example.com" collapse to a single
 * entry instead of appearing as two separate indicators.
 */
const CANONICALIZERS: Partial<Record<IocType, (value: string) => string>> = {
  ipv6: (value) => value.toLowerCase(),
  domain: (value) => value.toLowerCase(),
  email: (value) => value.toLowerCase(),
  md5: (value) => value.toLowerCase(),
  sha1: (value) => value.toLowerCase(),
  sha256: (value) => value.toLowerCase(),
  sha512: (value) => value.toLowerCase(),
  cve: (value) => value.toUpperCase(),
};

function canonicalize(type: IocType, value: string): string {
  const fn = CANONICALIZERS[type];
  return fn ? fn(value) : value;
}

export type IocResults = Record<IocType, string[]>;

function emptyResults(): IocResults {
  return IOC_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {} as IocResults);
}

/**
 * Extracts, validates, and de-duplicates every known IOC type from raw text.
 * Runs entirely synchronously and client-side.
 */
export function extractIocs(text: string): IocResults {
  const results = emptyResults();
  if (!text.trim()) return results;

  // Hostnames already captured by a URL or email are excluded from the
  // looser "domain" bucket so the same indicator isn't double-counted.
  const consumedHosts = new Set<string>();

  for (const type of EXTRACTION_PRIORITY) {
    const regex = PATTERNS[type];
    const rawMatches = text.match(regex) ?? [];

    // De-dup by canonical form (case-insensitive for most types) while
    // keeping the first-seen canonical value as the displayed one.
    const seen = new Map<string, string>();
    for (const raw of rawMatches) {
      const trimmed = raw.trim();
      if (!isValid(type, trimmed)) continue;
      const canonical = canonicalize(type, trimmed);
      if (!seen.has(canonical)) seen.set(canonical, canonical);
    }
    const valid = Array.from(seen.values());

    if (type === "domain") {
      results[type] = valid.filter((d) => !consumedHosts.has(d));
      continue;
    }

    results[type] = valid;

    if (type === "url") {
      valid.forEach((u) => {
        try {
          consumedHosts.add(new URL(u).hostname.toLowerCase());
        } catch {
          // unreachable given the url validator, kept for safety
        }
      });
    }
    if (type === "email") {
      valid.forEach((e) => {
        const host = e.split("@")[1];
        if (host) consumedHosts.add(host);
      });
    }
  }

  return results;
}

export function countTotal(results: IocResults): number {
  return IOC_TYPES.reduce((acc, type) => acc + results[type].length, 0);
}

export function toCsv(rows: { type: string; value: string }[]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = "type,value";
  const body = rows.map((r) => `${escape(r.type)},${escape(r.value)}`).join("\n");
  return rows.length ? `${header}\n${body}` : header;
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const ACCEPTED_FILE_EXTENSIONS = [".txt", ".log", ".csv", ".json"];

export const SAMPLE_LOG_DATA = `[2026-07-09 14:02:11] ALERT src=203.0.113.42 dst=198.51.100.7 proto=TCP flagged connection to known C2 endpoint
[2026-07-09 14:02:13] DNS query for malicious-update-server.xyz resolved to 203.0.113.42
[2026-07-09 14:03:02] Outbound request to http://phish-portal.click/login?token=abc123 blocked by proxy
[2026-07-09 14:03:47] Suspicious attachment invoice.exe hash MD5=44d88612fea8a8f36de82e1278abb02f
[2026-07-09 14:04:10] File dropper.bin flagged SHA1=da39a3ee5e6b4b0d3255bfef95601890afd80709
[2026-07-09 14:04:55] Payload stage2.dll flagged SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85
[2026-07-09 14:05:20] Full memory dump hash SHA512=cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3
[2026-07-09 14:06:03] Phishing email received from attacker@phish-portal.click targeting finance@company.com
[2026-07-09 14:06:44] IPv6 beacon detected from 2001:0db8:85a3:0000:0000:8a2e:0370:7334
[2026-07-09 14:07:12] Exploit attempt matches CVE-2024-3400 against edge firewall
[2026-07-09 14:07:55] Secondary exploit attempt matches CVE-2023-44487 (HTTP/2 rapid reset)
`;
