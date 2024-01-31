const dnscheck = require('../src/dnscheck');

describe('dnscheck', () => {
    it('check a known existing domain', async () => {
        const result = await dnscheck.checkDomain('example.org');

        expect(result).toBe(true);
    });

    it('check a known non-existing domain', async () => {
        const result = await dnscheck.checkDomain('example.nonexistingdomain');

        expect(result).toBe(false);
    });

    it('check a domain that only has a www. record', async () => {
        const noWwwExists = await dnscheck.domainExists('city.kawasaki.jp');
        // Make sure that there's no A record for the domain.
        // If it appears, we'll need to change the domain for this test.
        expect(noWwwExists).toBe(false);

        const result = await dnscheck.checkDomain('city.kawasaki.jp');

        expect(result).toBe(true);
    });
});
