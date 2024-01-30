/**
 * Helper function that takes an array and returns a new one without any
 * duplicate items.
 *
 * @param {Array<String>} arr - THe array to check for duplicates.
 */
function unique(arr) {
    return [...new Set([].concat(...arr))];
}

/**
 * Checks if the given domain is valid. This is a very simple check that only
 * checks of allowed characters, but it's enough to filter out domain patterns
 * and regexes that can be met in filtering rules.
 *
 * @param {String} domain - The domain name to check.
 * @returns {boolean} Returns true if the domain is valid, false otherwise.
 */
function validDomain(domain) {
    if (domain.endsWith('.onion')) {
        // Note, that we don't count .onion domains valid as their existence
        // cannot be verified with the urlfilter service.
        return false;
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
        // IPv4 addresses cannot be verified too so just ignore them too.
        // Don't check for IPv6 as they won't be matched by the domain regex.
        return false;
    }

    if (!domain.includes('.')) {
        // Ignore top-level domains to avoid false positives on things like:
        // https://github.com/AdguardTeam/DeadDomainsLinter/issues/6
        return false;
    }

    return domain.match(/^[a-z0-9.-]+$/i) !== null;
}

module.exports = {
    unique,
    validDomain,
};
