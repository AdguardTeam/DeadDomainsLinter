const urlfilter = require('../src/urlfilter');

describe('urlfilter', () => {
    it('check a domain that we know does exist', async () => {
        const result = await urlfilter.findDeadDomains(['example.org']);

        expect(result).toEqual([]);
    });

    it('check a domain that we know does NOT exist', async () => {
        const result = await urlfilter.findDeadDomains(['example.atatatata.baababbaba']);

        expect(result).toEqual(['example.atatatata.baababbaba']);
    });

    it('check two domains, one exists, one not', async () => {
        const result = await urlfilter.findDeadDomains(['example.org', 'example.atatatata.baababbaba']);

        expect(result).toEqual(['example.atatatata.baababbaba']);
    });

    it('checks lots of domains using two chunks', async () => {
        const domains = [];
        for (let i = 0; i < 10; i += 1) {
            domains.push(`example${i}.notexistingtld`);
        }

        const result = await urlfilter.findDeadDomains(domains, 5);

        expect(result).toEqual(domains);
    }, 30000);
});
