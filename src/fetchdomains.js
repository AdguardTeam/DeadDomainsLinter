const dns = require('dns');
const consola = require('consola');
const https = require('https');
const fetch = require('node-fetch');
const punycode = require('node:punycode');

/**
 * 503 - Service Unavailable
 * 429 - Too Many Requests
 */
const CODES_TO_RETRY = new Set([503, 429]);

const DECIMAL_BASE = 10;
const ONE_SECOND_MS = 1000;

/**
 * 2 retries for the first request and request after receiving retry-after header.
 */
const DEFAULT_MAX_ATTEMPTS = 2;
const URLFILTER_URL = 'https://urlfilter.adtidy.org/v2/checkDomains';

/**
 * Default agent for requests to adtidy API
 */
const httpAgent = new https.Agent({
    keepAlive: true,
    // eslint-disable-next-line no-use-before-define
    lookup: dnsLookup,
});

/**
 * When using native node fetch it is easy to run into ENOTFOUND errors when
 * there are many parallel requests. In order to avoid that, we use node-fetch
 * with a custom DNS lookup function that caches resolution result permanently.
 * In addition to that, we use a semaphore-like approach to forbid parallel
 * DNS queries.
 */
const dnsProcessing = {};
const dnsCache = {};

/**
 * Custom DNS lookup function that caches resolution result permanently.
 *
 * @param {string} hostname - The hostname to resolve.
 * @param {object} options - The options object.
 * @param {boolean} options.all - If true, return all resolved addresses.
 * @param {Function} cb - The callback function.
 */
function dnsLookup(hostname, options, cb) {
    const cached = dnsCache[hostname];
    if (cached) {
        if (options.all) {
            cb(null, cached);
        } else {
            const addr = cached[0];
            cb(null, addr.address, addr.family);
        }

        return;
    }

    if (dnsProcessing[hostname]) {
        // If a query for this hostname is already processing, wait until it's
        // finished.
        setTimeout(() => {
            dnsLookup(hostname, options, cb);
        }, 10);

        return;
    }

    dnsProcessing[hostname] = true;
    dns.lookup(hostname, { all: true, family: 4 }, (err, addresses) => {
        delete dnsProcessing[hostname];

        if (err === null) {
            dnsCache[hostname] = addresses;
        }

        if (options.all) {
            cb(err, addresses);
        } else {
            if (addresses.length === 0) {
                cb(err, addresses);
            }
            const addr = addresses[0];
            cb(err, addr.address, addr.family);
        }
    });
}

/**
 * Removes trailing dot from an fully qualified domain name. The reason for
 * that is that urlfilter service does not know how to work with FQDN.
 *
 * @param {string} domain - The domain name to trim.
 * @returns {string} The domain name without trailing dot.
 */
function trimFqdn(domain) {
    return domain.endsWith('.') ? domain.slice(0, -1) : domain;
}

/**
 * Parses `Retry-After` header (seconds or HTTP date).
 *
 * @param {string} retryAfter - Header value.
 * @returns {number} Delay in milliseconds.
 */
function parseRetryAfter(retryAfter) {
    if (/^\d+$/.test(retryAfter)) {
        return parseInt(retryAfter, DECIMAL_BASE) * ONE_SECOND_MS; // Seconds to ms
    }
    const date = new Date(retryAfter);
    return !Number.isNaN(date.getTime()) ? date - Date.now() : null;
}

/**
 * Fetches a URL with retries respecting `Retry-After` headers.
 *
 * @param {string[]} domains - List of domains to fetch.
 * @param {number} [maxAttempts] - Maximum retry attempts
 * @throws {Error} If all attempts fail or fetch encounters network errors.
 * @returns {Promise<Response>} Fetch response.
 */
async function fetchWithRetry(domains, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
    const url = new URL(`${URLFILTER_URL}`);
    url.searchParams.append('filter', 'none');

    domains.forEach((domain) => {
        const asciiDomain = punycode.toASCII(domain);
        url.searchParams.append('domain', encodeURIComponent(trimFqdn(asciiDomain)));
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(url, {
            agent: httpAgent,
        });

        if (response.ok) {
            return response;
        }

        const retryAfter = response.headers.get('Retry-After');
        if (!CODES_TO_RETRY.has(response.status)) {
            throw new Error(`Failed to fetch domains response code - ${response.status}`);
        }
        if (!retryAfter) {
            throw new Error(`Fetch status - ${response.status}, but no retry-after received for ${url}`);
        }

        const delayMs = parseRetryAfter(retryAfter);
        if (delayMs) {
            consola.info(`Retry required (attempt ${attempt}): Waiting ${delayMs}ms`);
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => {
                setTimeout(resolve, delayMs);
            });
        } else {
            throw new Error(`Unable to parse retry-after header -${retryAfter}`);
        }
    }
    throw Error(`Fetch domains failed: ${url}, tried ${maxAttempts} times`);
}

module.exports = {
    fetchWithRetry,
    trimFqdn,
};
