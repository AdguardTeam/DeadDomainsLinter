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
});
