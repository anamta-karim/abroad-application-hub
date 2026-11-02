import { describe, it, expect } from "vitest";
import {
  isPrivateOrReservedIPv4,
  isPrivateOrReservedIPv6,
  validateUrlForSSRF,
} from "../lib/ingestion/ssrf";

describe("SSRF Protection Engine", () => {
  it("blocks private IPv4 addresses (RFC 1918)", () => {
    expect(isPrivateOrReservedIPv4("10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIPv4("10.254.254.254")).toBe(true);
    expect(isPrivateOrReservedIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateOrReservedIPv4("172.31.255.255")).toBe(true);
    expect(isPrivateOrReservedIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateOrReservedIPv4("192.168.0.254")).toBe(true);
  });

  it("blocks loopback IPv4 addresses (127.0.0.0/8)", () => {
    expect(isPrivateOrReservedIPv4("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIPv4("127.127.127.127")).toBe(true);
  });

  it("blocks AWS/GCP/Azure cloud metadata address (169.254.169.254)", () => {
    expect(isPrivateOrReservedIPv4("169.254.169.254")).toBe(true);
    expect(isPrivateOrReservedIPv4("169.254.0.1")).toBe(true);
  });

  it("allows standard public IPv4 addresses", () => {
    expect(isPrivateOrReservedIPv4("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIPv4("1.1.1.1")).toBe(false);
    expect(isPrivateOrReservedIPv4("140.82.121.4")).toBe(false); // GitHub
  });

  it("blocks loopback and unique-local IPv6 addresses", () => {
    expect(isPrivateOrReservedIPv6("::1")).toBe(true);
    expect(isPrivateOrReservedIPv6("0:0:0:0:0:0:0:1")).toBe(true);
    expect(isPrivateOrReservedIPv6("fc00::1")).toBe(true);
    expect(isPrivateOrReservedIPv6("fd12:3456:789a:1::1")).toBe(true);
    expect(isPrivateOrReservedIPv6("fe80::1")).toBe(true); // Link local
  });

  it("rejects dangerous or non-http URI schemes", async () => {
    const fileScheme = await validateUrlForSSRF("file:///etc/passwd");
    expect(fileScheme.isAllowed).toBe(false);
    expect(fileScheme.reason).toContain("Only HTTP and HTTPS");

    const ftpScheme = await validateUrlForSSRF("ftp://internal.server/file");
    expect(ftpScheme.isAllowed).toBe(false);

    const gopherScheme = await validateUrlForSSRF("gopher://127.0.0.1:70/");
    expect(gopherScheme.isAllowed).toBe(false);
  });

  it("rejects non-standard ports", async () => {
    const sshPort = await validateUrlForSSRF("http://example.com:22/");
    expect(sshPort.isAllowed).toBe(false);
    expect(sshPort.reason).toContain("Port 22 is not allowed");

    const redisPort = await validateUrlForSSRF("http://example.com:6379/");
    expect(redisPort.isAllowed).toBe(false);
    expect(redisPort.reason).toContain("Port 6379 is not allowed");
  });

  it("rejects localhost and internal hostname targets", async () => {
    const localhostRes = await validateUrlForSSRF("http://localhost:8080/admin");
    expect(localhostRes.isAllowed).toBe(false);

    const internalRes = await validateUrlForSSRF("http://metadata.internal/");
    expect(internalRes.isAllowed).toBe(false);
  });

  it("rejects direct private IP literals in URL", async () => {
    const privateIp = await validateUrlForSSRF("http://192.168.1.100/");
    expect(privateIp.isAllowed).toBe(false);
    expect(privateIp.reason).toContain("private or reserved IP");

    const metadataIp = await validateUrlForSSRF("http://169.254.169.254/latest/meta-data/");
    expect(metadataIp.isAllowed).toBe(false);
    expect(metadataIp.reason).toContain("private or reserved IP");
  });
});
