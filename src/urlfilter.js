const punycode = require('node:punycode');
const { fetchWithRetry, trimFqdn } = require('./fetchdomains');

const CHUNK_SIZE = 25;

/**
 * This function looks for dead domains among the specified ones. It uses a web
 * service to do that.
 *
 * @param {Array<string>} domains domains to check.
 * @param {number} chunkSize configures the size of chunks for checking large
 * arrays.
 * @returns {Promise<Array<string>>} returns the list of dead domains.
 */
async function findDeadDomains(domains, chunkSize = CHUNK_SIZE) {
    const result = [];

    // Split the domains array into chunks
    const chunks = [];
    for (let i = 0; i < domains.length; i += chunkSize) {
        chunks.push(domains.slice(i, i + chunkSize));
    }

    // Compose and send requests for each chunk
    // eslint-disable-next-line no-restricted-syntax
    for (const chunk of chunks) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const response = await fetchWithRetry(chunk);
            // eslint-disable-next-line no-await-in-loop
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Iterate over the domains in the chunk
            // eslint-disable-next-line no-restricted-syntax
            for (const domain of chunk) {
                const domainData = data[punycode.toASCII(trimFqdn(domain))];
                if (domainData && domainData.info.registered_domain_used_last_24_hours === false) {
                    result.push(domain);
                }
            }
        } catch (ex) {
            // Re-throw to add information about the URL.
            throw new Error(`Failed to fetch domains ${ex}`);
        }
    }

    return result;
}

module.exports = {
    findDeadDomains,
};
