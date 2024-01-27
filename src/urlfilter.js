/**
 * This function uses urlfilter.adtidy.org to check if domains are alive or not.
 *
 * @param {Array<String>} domains an array of domains to be analyzed.
 */
const URLFILTER_URL = 'https://urlfilter.adtidy.org/v2/checkDomains';
const CHUNK_SIZE = 50;

/**
 * This function looks for dead domains among the specified ones. It uses a web
 * service to do that.
 *
 * @param {Array<String>} domains domains to check.
 * @param {Number} chunkSize configures the size of chunks for checking large arrays.
 * @returns {Array<String>} returns the list of dead domains.
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
        const url = `${URLFILTER_URL}?${chunk.map((domain) => `domain=${encodeURIComponent(domain)}`).join('&')}`;
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(url);
        // eslint-disable-next-line no-await-in-loop
        const data = await response.json();

        // Iterate over the domains in the chunk
        // eslint-disable-next-line no-restricted-syntax
        for (const domain of chunk) {
            const domainData = data[domain];
            if (domainData && domainData.info.registered_domain_used_last_24_hours === false) {
                result.push(domain);
            }
        }
    }

    return result;
}

module.exports = {
    findDeadDomains,
};
