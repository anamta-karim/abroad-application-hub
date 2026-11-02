import dns from "dns/promises";
import net from "net";

export interface SSRFValidationResult {
  isAllowed: boolean;
  reason?: string;
  normalizedUrl?: string;
}

/**
 * Checks if an IPv4 address is in a private, loopback, or cloud-metadata range.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed = reject
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private Class A)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata: AWS, Azure, GCP 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private Class B: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private Class C)
  if (a === 192 && b === 168) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation/TEST-NET)
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast) and 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, or link-local range.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1)
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;

  // Unspecified (::)
  if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") return true;

  // IPv6 mapped IPv4 (::ffff:x.x.x.x)
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.slice(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateOrReservedIPv4(ipv4Part);
    }
  }

  // Unique local addresses fc00::/7 (fc... or fd...)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // Link-local unicast fe80::/10 (fe8..., fe9..., fea..., feb...)
  if (/^fe[89ab]/i.test(normalized)) return true;

  return false;
}

/**
 * Validates a target URL against SSRF attack vectors:
 * 1. Allowed protocols (http:, https:)
 * 2. Allowed ports (80, 443, 8080)
 * 3. Non-empty hostname
 * 4. Resolves DNS and checks that NO resolved IP is private/loopback/metadata.
 */
export async function validateUrlForSSRF(rawUrl: string): Promise<SSRFValidationResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { isAllowed: false, reason: "Invalid URL syntax." };
  }

  // 1. Protocol allowlist
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      isAllowed: false,
      reason: `Disallowed scheme "${parsedUrl.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  // 2. Port check (allow default or standard web ports)
  const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : parsedUrl.protocol === "https:" ? 443 : 80;
  if (![80, 443, 8080, 8443].includes(port)) {
    return {
      isAllowed: false,
      reason: `Port ${port} is not allowed. Only standard web ports (80, 443) are supported.`,
    };
  }

  const hostname = parsedUrl.hostname.trim().toLowerCase();

  if (!hostname) {
    return { isAllowed: false, reason: "URL missing hostname." };
  }

  // Direct localhost or loopback name check
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { isAllowed: false, reason: "Local or internal domains are not permitted." };
  }

  // 3. If hostname is a literal IP address
  if (net.isIPv4(hostname)) {
    if (isPrivateOrReservedIPv4(hostname)) {
      return { isAllowed: false, reason: "Access to private or reserved IP ranges is prohibited." };
    }
    return { isAllowed: true, normalizedUrl: parsedUrl.toString() };
  }

  if (net.isIPv6(hostname)) {
    if (isPrivateOrReservedIPv6(hostname)) {
      return { isAllowed: false, reason: "Access to private or reserved IPv6 ranges is prohibited." };
    }
    return { isAllowed: true, normalizedUrl: parsedUrl.toString() };
  }

  // 4. DNS resolution check (resolve all addresses for hostname)
  try {
    const addresses = await dns.lookup(hostname, { all: true });

    if (!addresses || addresses.length === 0) {
      return { isAllowed: false, reason: "Host resolution returned no IP addresses." };
    }

    for (const record of addresses) {
      if (record.family === 4 && isPrivateOrReservedIPv4(record.address)) {
        return {
          isAllowed: false,
          reason: `Host resolves to private or reserved address (${record.address}).`,
        };
      }
      if (record.family === 6 && isPrivateOrReservedIPv6(record.address)) {
        return {
          isAllowed: false,
          reason: `Host resolves to private or reserved IPv6 address (${record.address}).`,
        };
      }
    }
  } catch (dnsErr: any) {
    return {
      isAllowed: false,
      reason: `DNS resolution failed: ${dnsErr?.message || "domain does not exist"}.`,
    };
  }

  return { isAllowed: true, normalizedUrl: parsedUrl.toString() };
}

/**
 * Safe fetch wrapper that enforces:
 * - SSRF pre-flight validation
 * - Max response size (default 5MB)
 * - Request timeout (default 10s)
 * - Content-Type validation
 * - Redirect revalidation
 */
export async function safeFetchHtml(
  targetUrl: string,
  options: {
    maxSizeBytes?: number;
    timeoutMs?: number;
    maxRedirects?: number;
  } = {}
): Promise<{ text: string; finalUrl: string; contentType: string }> {
  const maxSizeBytes = options.maxSizeBytes || 5 * 1024 * 1024; // 5MB
  const timeoutMs = options.timeoutMs || 10000; // 10s
  const maxRedirects = options.maxRedirects ?? 3;

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    // 1. SSRF validate current URL before dispatching request
    const validation = await validateUrlForSSRF(currentUrl);
    if (!validation.isAllowed) {
      throw new Error(`SSRF blocked: ${validation.reason}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "manual", // Handle redirects manually so every redirect URL is SSRF validated
        headers: {
          "User-Agent": "AbroadApplicationHub/1.0 (Official Prospectus Ingestion Bot; info@abroadhub.local)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        },
      });

      clearTimeout(timeoutId);

      // 2. Handle HTTP Redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get("location");
        if (!locationHeader) {
          throw new Error(`Received HTTP ${response.status} redirect without a Location header.`);
        }

        // Resolve relative redirects
        const nextUrl = new URL(locationHeader, currentUrl).toString();
        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          throw new Error("Too many redirects (exceeded max limit of 3).");
        }
        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Target returned HTTP error ${response.status} (${response.statusText}).`);
      }

      // 3. Content-Type check
      const contentType = response.headers.get("content-type") || "";
      const isHtmlOrText =
        contentType.includes("text/html") ||
        contentType.includes("application/xhtml+xml") ||
        contentType.includes("text/plain");

      if (!isHtmlOrText) {
        throw new Error(
          `Invalid content type "${contentType}". Only HTML and plain text web pages are supported.`
        );
      }

      // 4. Stream response with size limit
      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        return { text, finalUrl: currentUrl, contentType };
      }

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedBytes += value.length;
        if (receivedBytes > maxSizeBytes) {
          reader.cancel();
          throw new Error(`Page size exceeds maximum allowed limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`);
        }
        chunks.push(value);
      }

      const totalBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const text = new TextDecoder("utf-8").decode(totalBuffer);
      return { text, finalUrl: currentUrl, contentType };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs / 1000} seconds.`);
      }
      throw err;
    }
  }

  throw new Error("Redirect chain limit exceeded.");
}
