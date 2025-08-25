jest.mock('node-fetch');

const fetch = require('node-fetch');
const urlfilter = require('../src/urlfilter');

describe('urlfilter tests with mocked api calls', () => {
    beforeEach(() => {
        fetch.mockReset();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const createRateLimitedResponse = (retryAfterValue) => ({
        status: 429,
        ok: false,
        headers: {
            get: jest.fn((headerName) => {
                const headers = {
                    'retry-after': retryAfterValue,
                    'content-type': 'application/json',
                };
                return headers[headerName.toLowerCase()];
            }),
        },
        json: jest.fn().mockResolvedValue({
            error: 'Too many requests',
            message: 'Rate limit exceeded',
        }),
    });

    const createSuccessResponse = (domain = 'example.notexisting', isDead = true) => ({
        status: 200,
        ok: true,
        headers: {
            get: () => 'application/json',
        },
        json: jest.fn().mockResolvedValue({
            [domain]: {
                info: {
                    domain_name: domain,
                    registered_domain: domain,
                    registered_domain_used_last_24_hours: !isDead,
                    used_last_24_hours: !isDead,
                },
                matches: [],
            },
        }),
    });

    const testRetryAfter = async (retryAfterValue, domain = 'example.notexisting') => {
        fetch.mockResolvedValueOnce(createRateLimitedResponse(retryAfterValue));
        fetch.mockResolvedValueOnce(createSuccessResponse(domain, true));

        const promise = urlfilter.findDeadDomains([domain]);
        await jest.advanceTimersByTimeAsync(2000);
        const result = await promise;

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(result).toEqual([domain]);
    };

    it('should handle 429 with retry-after header with seconds', async () => {
        await testRetryAfter('2');
    });

    it('should handle 429 with retry-after header with Date', async () => {
        await testRetryAfter(new Date(Date.now() + 2000));
    });
});
