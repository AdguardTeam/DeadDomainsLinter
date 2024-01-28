const agtree = require('@adguard/agtree');
const urlfilter = require('./urlfilter');
const dnscheck = require('./dnscheck');
const utils = require('./utils');

/**
 * A list of network rule modifiers that are to be scanned for dead domains.
 */
const DOMAIN_MODIFIERS = ['domain', 'denyallow', 'from', 'to'];

/**
 * Attempts to extract the domain from the network rule pattern. If the pattern
 * does not contain a domain, returns null.
 *
 * @param {agtree.NetworkRule} ast - The rule AST.
 * @returns {String|null} The domain extracted from the AST.
 */
function extractDomainFromPattern(ast) {
    if (!ast.pattern) {
        return null;
    }

    const regex = /^\|\|([a-z0-9-.]+)\^/;
    const match = ast.pattern.value.match(regex);
    if (match) {
        const domain = match[1];

        return domain;
    }

    return null;
}

/**
 * Represents a domain that is used in the rule. It can be a negated domain.
 * @typedef {Object} RuleDomain
 *
 * @property {String} domain - The domain name.
 * @property {boolean} negated - True if the domain is negated.
 */

/**
 * Extracts an array of domains from the network rule modifier.
 *
 * @param {agtree.Modifier} modifier - The modifier that contains the domains.
 * @returns {Array<RuleDomain>} The list of domains extracted from the modifier.
 */
function extractModifierDomains(modifier) {
    if (!modifier.value.value) {
        return [];
    }

    const domainList = agtree.DomainListParser.parse(modifier.value.value, agtree.PIPE_MODIFIER_SEPARATOR);
    return domainList.children.map((domain) => {
        return {
            domain: domain.value,
            negated: domain.exception,
        };
    });
}

/**
 * Extracts domains from a network rule AST.
 *
 * @param {agtree.NetworkRule} ast - The AST of a network rule to extract
 * domains from.
 * @returns {Array<String>} The list of all domains that are used by this rule.
 */
function extractNetworkRuleDomains(ast) {
    const domains = [];

    if (ast.pattern) {
        const regex = /^\|\|([a-z0-9-.]+)\^/i;
        const match = ast.pattern.value.match(regex);
        if (match) {
            const domain = match[1];
            domains.push(domain);
        }
    }

    if (!ast.modifiers) {
        // No modifiers in the rule, return right away.
        return domains;
    }

    for (let i = 0; i < ast.modifiers.children.length; i += 1) {
        const modifier = ast.modifiers.children[i];

        if (DOMAIN_MODIFIERS.includes(modifier.modifier.value)) {
            const modifierDomains = extractModifierDomains(modifier)
                .map((domain) => domain.domain);

            domains.push(...modifierDomains);
        }
    }

    return utils.unique(domains).filter(utils.validDomain);
}

/**
 * Extracts domains from a cosmetic rule AST.
 *
 * @param {agtree.CosmeticRule} ast - The AST of a cosmetic rule to extract
 * domains from.
 * @returns {Array<String>} The list of all domains that are used by this rule.
 */
function extractCosmeticRuleDomains(ast) {
    // TODO(ameshkov): Extract and analyze cosmetic rules modifiers too.

    if (!ast.domains || ast.domains.length === 0) {
        return [];
    }

    const domains = ast.domains.children
        .map((domain) => domain.value)
        .filter(utils.validDomain);

    return utils.unique(domains);
}

/**
 * This function goes through the rule AST and extracts domains from it.
 *
 * @param {agtree.AnyRule} ast - The AST of the rule to extract domains from.
 * @returns {Array<String>} The list of all domains that are used by this rule.
 */
function extractRuleDomains(ast) {
    switch (ast.category) {
        case 'Network':
            return extractNetworkRuleDomains(ast);
        case 'Cosmetic':
            return extractCosmeticRuleDomains(ast);
        default:
            return [];
    }
}

/**
 * Modifies the cosmetic rule AST and removes the rule elements that contain the
 * dead domains.
 *
 * @param {agtree.CosmeticRule} ast - The network rule AST to modify and remove
 * dead domains.
 * @param {Array<String>} deadDomains - A list of dead domains.
 *
 * @returns {String} The rule text with suggested modification. Can remove an
 * empty string if it's suggested to remove the whole rule.
 */
function modifyCosmeticRule(ast, deadDomains) {
    if (!ast.domains || ast.domains.children.length === 0) {
        // Do nothing if there are no domains in the rule. In theory, it
        // shouldn't happen, but check it just in case.
        return agtree.RuleParser.generate(ast);
    }

    const hasPermittedDomains = ast.domains.children.some((domain) => !domain.exception);

    // Go through ast.domains and remove those that contain dead domains.
    // Iterate in the reverse order to keep the indices correct.
    for (let i = ast.domains.children.length - 1; i >= 0; i -= 1) {
        const domain = ast.domains.children[i];

        if (deadDomains.includes(domain.value)) {
            ast.domains.children.splice(i, 1);
        }
    }

    const hasPermittedDomainsAfterFilter = ast.domains.children.some((domain) => !domain.exception);
    if (hasPermittedDomains && !hasPermittedDomainsAfterFilter) {
        // Suggest removing the whole rule if it had permitted domains before,
        // but does not have it anymore.
        //
        // Example:
        // example.org##banner -> ##banner
        //
        // The rule must be removed in this case as otherwise its
        // scope will change to global.
        return '';
    }

    if (ast.domains.children.length === 0 && ast.exception) {
        // Suggest removing the whole rule if this is an exception rule.
        //
        // Example:
        // example.org#@#banner -> #@#banner
        return '';
    }

    return agtree.RuleParser.generate(ast);
}

/**
 * Modifies the network rule AST and removes the rule elements that contain the
 * dead domains.
 *
 * @param {agtree.NetworkRule} ast - The network rule AST to modify and remove
 * dead domains.
 * @param {Array<String>} deadDomains - A list of dead domains.
 *
 * @returns {String} The rule text with suggested modification. Can remove an
 * empty string if it's suggested to remove the whole rule.
 */
function modifyNetworkRule(ast, deadDomains) {
    const patternDomain = extractDomainFromPattern(ast);
    if (deadDomains.includes(patternDomain)) {
        // Suggest completely removing the rule if it contains a dead domain in
        // the pattern.
        return '';
    }

    if (!ast.modifiers) {
        // No modifiers in the rule, nothing to do.
        return agtree.RuleParser.generate(ast);
    }

    const modifierIdxToRemove = [];

    // Go through the network rule modifiers and remove the dead domains from
    // them. Depending on the result, remove the whole modifier or even suggest
    // removing the whole rule.
    for (let i = 0; i < ast.modifiers.children.length; i += 1) {
        const modifier = ast.modifiers.children[i];

        if (DOMAIN_MODIFIERS.includes(modifier.modifier.value)) {
            const modifierDomains = extractModifierDomains(modifier);

            // Check if modifierDomains had at least one non-negated domain.
            const hasPermittedDomains = modifierDomains.some((domain) => !domain.negated);

            // Remove the dead domains from the modifier.
            const filteredDomains = modifierDomains.filter(
                (domain) => !deadDomains.includes(domain.domain),
            );

            // Check if filteredDomains now has at least one non-negated domain.
            const hasPermittedDomainsAfterFilter = filteredDomains.some((domain) => !domain.negated);

            if (hasPermittedDomains && !hasPermittedDomainsAfterFilter) {
                // Suggest completely removing the rule if there are no
                // permitted domains left now.
                //
                // Example:
                // ||example.org^$domain=example.org -> ||example.org^
                //
                // The rule must be removed in this case as otherwise its
                // scope will change to global.
                return '';
            }

            if (filteredDomains.length === 0) {
                modifierIdxToRemove.push(i);
            }

            modifier.value.value = filteredDomains.map((domain) => domain.domain).join(agtree.PIPE_MODIFIER_SEPARATOR);
        }
    }

    // If there were any modifiers that should be removed, remove them.
    if (modifierIdxToRemove.length > 0) {
        // Remove the modifiers in reverse order to keep the indices correct.
        for (let i = modifierIdxToRemove.length - 1; i >= 0; i -= 1) {
            ast.modifiers.children.splice(modifierIdxToRemove[i], 1);
        }
    }

    if (ast.modifiers.children.length === 0) {
        // No modifiers left in the rule, make the whole node undefined.
        // eslint-disable-next-line no-param-reassign
        ast.modifiers = undefined;
    }

    return agtree.RuleParser.generate(ast);
}

/**
 * Modifies the rule AST and removes the rule elements that contain the dead
 * domains.
 *
 * @param {agtree.AnyRule} ast - The rule AST to modify and remove dead domains.
 * @param {Array<String>} deadDomains - A list of dead domains.
 *
 * @returns {String} The rule text with suggested modification. Can remove an
 * empty string if it's suggested to remove the whole rule.
 */
function modifyRule(ast, deadDomains) {
    switch (ast.category) {
        case 'Network':
            return modifyNetworkRule(ast, deadDomains);
        case 'Cosmetic':
            return modifyCosmeticRule(ast, deadDomains);
        default:
            throw new Error(`Unsupported rule category: ${ast.category}`);
    }
}

// Cache for the results of the domains check. The key is the domain name, the
// value is true for alive domains, false for dead.
const domainsCheckCache = {};

/**
 * Goes through the list of domains that needs to be checked and uses the
 * urlfilter web service to check which of them are dead.
 *
 * @param {Array<String>} domains - Parts of the rule with domains.
 * @param {boolean} useDNS - Double-check dead domains with a DNS query.
 * @returns {Array<String>} A list of dead domains.
 */
async function findDeadDomains(domains, useDNS) {
    const deadDomains = [];
    const domainsToCheck = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const domain of utils.unique(domains)) {
        if (Object.prototype.hasOwnProperty.call(domainsCheckCache, domain)) {
            if (domainsCheckCache[domain] === false) {
                deadDomains.push(domain);
            }
        } else {
            domainsToCheck.push(domain);
        }
    }

    const checkResult = await urlfilter.findDeadDomains(domainsToCheck);

    if (useDNS) {
        // eslint-disable-next-line no-restricted-syntax
        for (const domain of checkResult) {
            // eslint-disable-next-line no-await-in-loop
            const dnsRecordExists = await dnscheck.checkDomain(domain);

            if (!dnsRecordExists) {
                deadDomains.push(domain);
            }
        }
    } else {
        deadDomains.push(...checkResult);
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const domain of domainsToCheck) {
        if (deadDomains.includes(domain)) {
            domainsCheckCache[domain] = false;
        } else {
            domainsCheckCache[domain] = true;
        }
    }

    return deadDomains;
}

/**
 * Result of the dead domains check. Contains the list of dead domains found
 * in the rule and the suggested rule text after removing dead domains.
 * @typedef {Object} LinterResult
 *
 * @property {String} suggestedRuleText - The suggested rule text after removing
 * dead domains. If the whole rule should be removed, this field is an empty
 * string.
 * @property {Array<String>} deadDomains - A list of dead domains in the rule.
 */

/**
 * This function parses the input rule, extracts all domain names that can be
 * found there and checks if they are alive using the urlfilter web service.
 *
 * @param {String} ruleText - Text of the rule to check.
 * @param {boolean} useDNS - Double-check the dead domains with a DNS query.
 * @returns {Promise<LinterResult|null>} Result of the rule linting.
 */
async function lintRule(ruleText, useDNS = false) {
    const ast = agtree.RuleParser.parse(ruleText);

    const domains = extractRuleDomains(ast);
    if (!domains || domains.length === 0) {
        return null;
    }

    const deadDomains = await findDeadDomains(domains, useDNS);

    if (!deadDomains || deadDomains.length === 0) {
        return null;
    }

    const suggestedRuleText = modifyRule(ast, deadDomains);

    return {
        suggestedRuleText,
        deadDomains,
    };
}

module.exports = { lintRule };
