const fileLinter = require('../src/filelinter');

// TODO(ameshkov): Write more tests for this module.

describe('File linter', () => {
    it('test a simple automatic run', async () => {
        const fileResult = await fileLinter.lintFile('test/resources/filter.txt', {
            auto: true,
        });

        expect(fileResult).toBeDefined();
        expect(fileResult.listAst).toBeDefined();
        expect(fileResult.results).toBeDefined();
        expect(fileResult.results).toHaveLength(3);
    });
});
