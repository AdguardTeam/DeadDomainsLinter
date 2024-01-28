const dns = require('dns');
const { promisify } = require('util');

const resolver = new dns.Resolver();

// Note, that we don't use AdGuard DNS servers here in order to not add checked
// domains to the next domains snapshot.
//
// TODO(ameshkov): Consider making the DNS server configurable.
resolver.setServers([
    '8.8.8.8',
]);

const resolveAsync = promisify(resolver.resolve).bind(resolver);

/**
 * Checks if the domain has an A record.
 *
 * @param {String} domain - Domain name to check with a DNS query.
 * @returns {boolean} Returns true if the domain has an A record.
 */
async function checkDomain(domain) {
    try {
        const addresses = await resolveAsync(domain, 'A');

        return addresses.length > 0;
    } catch {
        return false;
    }
}

module.exports = {
    checkDomain,
};
