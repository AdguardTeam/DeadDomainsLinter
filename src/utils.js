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
    // Note, that we don't count .onion domains valid as their existence
    // cannot be verified with the urlfilter service.
    return domain.match(/^[a-z0-9.-]+$/i)
        && !domain.endsWith('.onion');
}

module.exports = {
    unique,
    validDomain,
};
