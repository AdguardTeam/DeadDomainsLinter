const agtree = require('@adguard/agtree');
const checker = require('../src/linter');

const testLintRule = (rule, expected, useDNS = false) => {
    return async () => {
        const ast = agtree.RuleParser.parse(rule);
        const result = await checker.lintRule(ast, useDNS);

        if (expected === null) {
            expect(result).toEqual(null);

            return;
        }

        if (expected.remove) {
            expect(result.suggestedRule).toEqual(null);
        } else {
            const ruleText = agtree.RuleParser.generate(result.suggestedRule);
            expect(ruleText).toEqual(expected.suggestedRuleText);
        }

        expect(result.deadDomains).toEqual(expected.deadDomains);
    };
};

describe('Linter', () => {
    describe('Lint with DNS double-check', () => {
        it(
            'suggest removing rule with a dead (with DNS double-check) domain in the pattern',
            testLintRule('||example.notexistingdomain^', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }, true),
        );
    });

    describe('Network rules', () => {
        it(
            'suggest removing rule with a dead domain in the pattern',
            testLintRule('||example.notexistingdomain^', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing rule with a dead domain in the pattern URL',
            testLintRule('||example.notexistingdomain/thisissomepath/tosomewhere', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing rule with a dead domain in the pattern from exception rule',
            testLintRule('@@||example.notexistingdomain/thisissomepath/tosomewhere', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing rule with a dead FQDN in the pattern',
            testLintRule('||example.notexistingdomain.^', {
                remove: true,
                deadDomains: ['example.notexistingdomain.'],
            }),
        );

        it(
            'suggest removing rule with a dead domain in the pattern with ://',
            testLintRule('://example.notexistingdomain/thisissomepath/tosomewhere', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing rule with a dead domain with an WebSocket URL pattern',
            testLintRule('wss://example.notexistingdomain/thisissomepath/tosomewhere', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing rule with a dead domain with an URL pattern',
            testLintRule('|https://example.notexistingdomain/thisissomepath/tosomewhere', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'do not suggest removing IP addresses',
            testLintRule('||1.2.3.4^', null),
        );

        it(
            'do not suggest removing IP ranges',
            testLintRule('||203.195.121.$popup', null),
        );

        it(
            'do not suggest removing .onion domains',
            testLintRule('||example.onion^', null),
        );

        it(
            'do not suggest removing .lib domains',
            testLintRule('||example.lib^', null),
        );

        it(
            'do not suggest removing rules that target browser extensions',
            testLintRule('@@||evernote.com^$domain=pioclpoplcdbaefihamjohnefbikjilc', null),
        );

        it(
            'do nothing with a simple rule with existing domain',
            testLintRule('||example.org^$third-party', null),
        );

        it(
            'do not break $domain with TLD patterns',
            testLintRule('||example.org^$domain=google.*', null),
        );

        it(
            'do not break $domain with regexes',
            testLintRule('||example.org^$domain=/some.randomstring/', null),
        );

        it(
            'do not break $domain with regexes with pipes',
            testLintRule('||example.org^$domain=/(^\\|.+\\.)c\\.(com\\|org)\\$/|example.notexistingdomain', {
                suggestedRuleText: '||example.org^$domain=/(^\\|.+\\.)c\\.(com\\|org)\\$/',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'do nothing check rules without domains',
            testLintRule('$script,third-party', null),
        );

        it(
            'do not break on comments',
            testLintRule('! this is a comment', null),
        );

        it(
            'do not break on empty lines',
            testLintRule('', null),
        );

        it(
            'suggest removing negated domain from $domain',
            testLintRule('||example.org^$domain=example.org|example.notexistingdomain', {
                suggestedRuleText: '||example.org^$domain=example.org',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing negated domain from $domain and keep TLD pattern',
            testLintRule('||example.org^$domain=example.*|example.notexistingdomain', {
                suggestedRuleText: '||example.org^$domain=example.*',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing negated domain from $domain and keep regex pattern',
            testLintRule('||example.org^$domain=/example.test/|example.notexistingdomain', {
                suggestedRuleText: '||example.org^$domain=/example.test/',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing the whole rule when all permitted domains are dead',
            testLintRule('||example.org^$domain=example.notexisting1|example.notexisting2', {
                remove: true,
                deadDomains: ['example.notexisting1', 'example.notexisting2'],
            }),
        );

        it(
            'suggest removing the whole $domain modifier when it had only dead negated domains',
            testLintRule('||example.org^$domain=~example.notexisting1|~example.notexisting2', {
                suggestedRuleText: '||example.org^',
                deadDomains: ['example.notexisting1', 'example.notexisting2'],
            }),
        );

        it(
            'suggest keeping $domain modifier when a permitted domain is alive',
            testLintRule('||example.org^$domain=example.org|~example.notexisting1|~example.notexisting2,third-party', {
                suggestedRuleText: '||example.org^$domain=example.org,third-party',
                deadDomains: ['example.notexisting1', 'example.notexisting2'],
            }),
        );

        it(
            'suggest removing the whole rule when domains in $denyallow are dead',
            testLintRule('||example.org^$denyallow=example.notexisting1', {
                remove: true,
                deadDomains: ['example.notexisting1'],
            }),
        );
    });

    describe('Cosmetic rules', () => {
        it(
            'do not break rules without domains',
            testLintRule('##banner', null),
        );

        it(
            'do not break domains with TLD pattern',
            testLintRule('google.*##banner', null),
        );

        it(
            'suggest removing an element hiding rule which was only for dead domains',
            testLintRule('example.notexistingdomain##banner', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'keep the rule if there are permitted domains left',
            testLintRule('example.org,example.notexistingdomain##banner', {
                suggestedRuleText: 'example.org##banner',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'keep the rule if all dead domains were negated',
            testLintRule('~example.notexistingdomain##banner', {
                suggestedRuleText: '##banner',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing the whole rule if it was an exception rule',
            testLintRule('~example.notexistingdomain#@#banner', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing a CSS injection rule',
            testLintRule('example.notexistingdomain#$#banner { height: 0px; }', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing a CSS injection exception rule',
            testLintRule('example.notexistingdomain#@$#banner { height: 0px; }', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest modifying a CSS injection rule',
            testLintRule('example.org,example.notexistingdomain#$#banner { height: 0px; }', {
                suggestedRuleText: 'example.org#$#banner { height: 0px; }',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing an extended CSS rule',
            testLintRule('example.notexistingdomain#?#banner', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing an extended CSS exception rule',
            testLintRule('example.notexistingdomain#@?#banner', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest modifying an extended CSS rule',
            testLintRule('example.org,example.notexistingdomain#?#banner', {
                suggestedRuleText: 'example.org#?#banner',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing a scriptlet rule',
            testLintRule('example.notexistingdomain#%#//scriptlet("set-constant", "a", "1")', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing a scriptlet exception rule',
            testLintRule('example.notexistingdomain#@%#//scriptlet("set-constant", "a", "1")', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest modifying a scriptlet rule',
            testLintRule('example.org,example.notexistingdomain#%#//scriptlet("set-constant", "a", "1")', {
                suggestedRuleText: 'example.org#%#//scriptlet("set-constant", "a", "1")',
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing an HTML filtering rule',
            testLintRule('example.notexistingdomain$$banner', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest removing an HTML filtering exception rule',
            testLintRule('example.notexistingdomain$@$banner', {
                remove: true,
                deadDomains: ['example.notexistingdomain'],
            }),
        );

        it(
            'suggest modifying an HTML filtering rule',
            testLintRule('example.org,example.notexistingdomain$$banner', {
                suggestedRuleText: 'example.org$$banner',
                deadDomains: ['example.notexistingdomain'],
            }),
        );
    });
});
