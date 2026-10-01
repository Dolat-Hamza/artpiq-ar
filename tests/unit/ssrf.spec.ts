import { expect, test } from '@playwright/test'
import { isPrivateAddress, isUpstreamSafe } from '@/lib/network/ssrf'

test.describe('isPrivateAddress', () => {
  const cases: [string, boolean][] = [
    ['0.0.0.0', true], ['0.255.255.255', true], ['1.0.0.0', false],
    ['9.255.255.255', false], ['10.0.0.0', true], ['10.255.255.255', true], ['11.0.0.0', false],
    ['100.63.255.255', false], ['100.64.0.0', true], ['100.127.255.255', true], ['100.128.0.0', false],
    ['126.255.255.255', false], ['127.0.0.1', true], ['127.255.255.255', true], ['128.0.0.0', false],
    ['169.253.255.255', false], ['169.254.169.254', true], ['169.255.0.0', false],
    ['172.15.255.255', false], ['172.16.0.0', true], ['172.31.255.255', true], ['172.32.0.0', false],
    ['192.0.0.255', true], ['192.0.1.0', false],
    ['192.167.255.255', false], ['192.168.1.1', true], ['192.169.0.0', false],
    ['198.17.255.255', false], ['198.18.0.0', true], ['198.19.255.255', true], ['198.20.0.0', false],
    ['223.255.255.255', false], ['224.0.0.0', true], ['255.255.255.255', true],
    ['8.8.8.8', false],
    ['::', true], ['::1', true], ['::2', false],
    ['fc00::1', true], ['fdff::1', true], ['fe00::1', false],
    ['fe80::1', true], ['febf::1', true], ['fec0::1', false],
    ['2001:4860:4860::8888', false],
    ['::ffff:127.0.0.1', true], ['::ffff:7f00:1', true], ['::ffff:a9fe:a9fe', true], ['::ffff:8.8.8.8', false],
    ['not-an-ip', false], ['', false],
  ]
  for (const [ip, expected] of cases) {
    test(`${ip || '(empty)'} → ${expected}`, () => {
      expect(isPrivateAddress(ip)).toBe(expected)
    })
  }
})

test.describe('isUpstreamSafe', () => {
  test('rejects non-http protocols', async () => {
    expect(await isUpstreamSafe(new URL('ftp://8.8.8.8/a'))).toEqual({ ok: false, reason: 'protocol not allowed' })
    expect(await isUpstreamSafe(new URL('file:///etc/passwd'))).toEqual({ ok: false, reason: 'protocol not allowed' })
  })

  test('rejects private IP literals, including bracketed IPv6', async () => {
    for (const u of ['http://127.0.0.1/', 'https://169.254.169.254/latest', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/']) {
      expect(await isUpstreamSafe(new URL(u)), u).toEqual({ ok: false, reason: 'private address' })
    }
  })

  test('accepts public IP literals without a DNS lookup', async () => {
    expect(await isUpstreamSafe(new URL('https://8.8.8.8/x.jpg'))).toEqual({ ok: true })
    expect(await isUpstreamSafe(new URL('http://[2001:4860:4860::8888]/'))).toEqual({ ok: true })
  })

  test('rejects hostnames that resolve to private addresses', async () => {
    expect(await isUpstreamSafe(new URL('http://localhost/'))).toEqual({ ok: false, reason: 'private address resolved' })
  })

  test('rejects a hostname when any resolved address is private', async () => {
    const lookup = async () => [{ address: '8.8.8.8', family: 4 }, { address: '::ffff:10.0.0.1', family: 6 }]
    expect(await isUpstreamSafe(new URL('https://mixed.test/'), lookup)).toEqual({ ok: false, reason: 'private address resolved' })
  })

  test('accepts a hostname whose addresses are all public', async () => {
    const lookup = async () => [{ address: '8.8.8.8', family: 4 }, { address: '2001:4860:4860::8888', family: 6 }]
    expect(await isUpstreamSafe(new URL('https://public.test/'), lookup)).toEqual({ ok: true })
  })

  test('rejects hostnames that do not resolve', async () => {
    expect(await isUpstreamSafe(new URL('http://does-not-exist.invalid/'))).toEqual({ ok: false, reason: 'dns lookup failed' })
  })
})
