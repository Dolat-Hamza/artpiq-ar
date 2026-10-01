import net from 'net'
import dns from 'dns/promises'

// Every server-side fetch of a user-influenced URL must pass isUpstreamSafe.
const blocked = new net.BlockList()
for (const [subnet, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
] as const) blocked.addSubnet(subnet, prefix, 'ipv4')
for (const [subnet, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10]] as const) {
  blocked.addSubnet(subnet, prefix, 'ipv6')
}

export type SafetyResult = { ok: true } | { ok: false; reason: string }
export type Lookup = (host: string, opts: { all: true }) => Promise<{ address: string; family: number }[]>

// BlockList also matches IPv4-mapped IPv6 (::ffff:a.b.c.d) against the IPv4 rules.
export function isPrivateAddress(ip: string): boolean {
  const family = net.isIP(ip)
  // Stryker disable next-line ConditionalExpression: BlockList.check is false for non-IPs too; the guard states intent
  return family !== 0 && blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6')
}

export async function isUpstreamSafe(url: URL, lookup: Lookup = dns.lookup): Promise<SafetyResult> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'protocol not allowed' }
  // Stryker disable next-line Regex: URL.hostname always wraps IPv6 in a full bracket pair
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1')
  if (net.isIP(host)) return isPrivateAddress(host) ? { ok: false, reason: 'private address' } : { ok: true }
  try {
    // Check every A/AAAA record so a mixed answer cannot slip a private address through.
    const addrs = await lookup(host, { all: true })
    return addrs.some(a => isPrivateAddress(a.address)) ? { ok: false, reason: 'private address resolved' } : { ok: true }
  } catch {
    return { ok: false, reason: 'dns lookup failed' }
  }
}
