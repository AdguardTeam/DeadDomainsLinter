#! /usr/bin/env node

const fs = require('fs');
const consola = require('consola');
// eslint-disable-next-line import/no-unresolved
const consolaUtils = require('consola/utils');
const glob = require('glob');
const agtree = require('@adguard/agtree');
const packageJson = require('../package.json');
const linter = require('./linter');

// Filter list lines are processing in parallel in chunks of this size. For
// now we chose 10 as the test run shows it to provide good enough results
// without overloading the web service.
//
// TODO(ameshkov): Consider making it configurable.
const PARALLEL_CHUNK_SIZE = 10;

// TODO(ameshkov): Consider splitting cli.js into the main file and other logic.

// eslint-disable-next-line import/order
const { argv } = require('yargs')
    .usage('Usage: $0 [options]')
    .example(
        '$0 -i **/*.txt',
        'scan all .txt files in the current directory and subdirectories in the interactive mode',
    )
    .example(
        '$0 -a -i filter.txt',
        'scan filter.txt and automatically apply suggested fixes',
    )
    .option('input', {
        alias: 'i',
        type: 'string',
        description: 'glob expression that selects files that the tool will scan.',
    })
    .option('dnscheck', {
        type: 'boolean',
        description: 'Double-check dead domains with a DNS query.',
    })
    .option('commentout', {
        type: 'boolean',
        description: 'Comment out rules instead of removing them.',
    })
    .option('auto', {
        alias: 'a',
        type: 'boolean',
        description: 'Automatically apply suggested fixes without asking the user.',
    })
    .option('show', {
        alias: 's',
        type: 'boolean',
        description: 'Show suggestions without applying them.',
    })
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging',
    })
    .default('input', '**/*.txt')
    .default('dnscheck', true)
    .default('commentout', false)
    .default('auto', false)
    .default('show', false)
    .default('verbose', false)
    .version()
    .help('h')
    .alias('h', 'help');

if (argv.verbose) {
    // trace level.
    consola.level = 5;
}

/**
 * Helper function that checks the "automatic" flag first before asking user.
 *
 * @param {string} message - Question to ask the user in the prompt.
 * @returns {Promise<boolean>} True if the user confirmed the action, false otherwise.
 */
async function confirm(message) {
    if (argv.show) {
        consola.info(`${message}: declined automatically`);

        return false;
    }

    if (argv.auto) {
        consola.info(`${message}: confirmed automatically`);

        return true;
    }

    const answer = await consola.prompt(message, {
        type: 'confirm',
    });

    return answer;
}

/**
 * Represents result of processing a rule AST.
 *
 * @typedef AstResult
 *
 * @property {string} line - Text of the rule that's was processed.
 * @property {number} lineNumber - Number of that line.
 * @property {import('./linter').LinterResult} linterResult - Result of linting
 * that line.
 */

/**
 * Process the rule AST from the specified file and returns the linting result
 * or null if nothing needs to be changed.
 *
 * @param {string} file - Path to the file that's being processed.
 * @param {agtree.AnyRule} ast - AST of the rule that's being processed.
 * @returns {Promise<AstResult|null>} Returns null if nothing needs to be changed or
 * AstResult if the linter found any issues.
 */
async function processRuleAst(file, ast) {
    const line = ast.raws.text;
    const lineNumber = ast.loc.start.line;

    try {
        consola.verbose(`Processing ${file}:${lineNumber}: ${line}`);

        const linterResult = await linter.lintRule(ast, argv.dnscheck);

        // If the result is empty, the line can be simply skipped.
        if (!linterResult) {
            return null;
        }

        if (linterResult.suggestedRule === null && argv.commentout) {
            const suggestedRuleText = `! commented out by dead-domains-linter: ${line}`;
            linterResult.suggestedRule = agtree.RuleParser.parse(suggestedRuleText);
        }

        return {
            line,
            lineNumber,
            linterResult,
        };
    } catch (ex) {
        consola.warn(`Failed to process line ${lineNumber} due to ${ex}, skipping it`);

        return null;
    }
}

/**
 * Process the filter list AST and returns a list of changes that are confirmed
 * by the user.
 *
 * @param {string} file - Path to the file that's being processed.
 * @param {agtree.FilterList} listAst - AST of the filter list to process.
 *
 * @returns {Promise<Array<AstResult>>} Returns the list of changes that are confirmed.
 */
async function processListAst(file, listAst) {
    consola.start(`Analyzing ${listAst.children.length} rules`);

    let processing = 0;
    let analyzedRules = 0;
    let issuesCount = 0;

    // eslint-disable-next-line no-await-in-loop
    const processingResults = await Promise.all(listAst.children.map((ast) => {
        return (async () => {
            // Using a simple semaphore-like construction to limit the number of
            // parallel processing tasks.
            while (processing >= PARALLEL_CHUNK_SIZE) {
                // Waiting for 10ms until the next check. 10ms is an arbitrarily
                // chosen value, there's no big difference between 100-10-1.

                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => { setTimeout(resolve, 10); });
            }

            processing += 1;
            try {
                const result = await processRuleAst(file, ast);
                if (result !== null) {
                    issuesCount += 1;
                }

                return result;
            } finally {
                analyzedRules += 1;
                processing -= 1;

                if (analyzedRules % 100 === 0) {
                    consola.info(`Analyzed ${analyzedRules} rules, found ${issuesCount} issues`);
                }
            }
        })();
    }));

    const results = processingResults.filter((res) => res !== null);

    consola.success(`Found ${results.length} issues`);

    // Sort the results by line number in ascending order.
    results.sort((a, b) => a.lineNumber - b.lineNumber);

    // Now ask the user whether the changes are allowed.
    const allowedResults = [];
    for (let i = 0; i < results.length; i += 1) {
        const result = results[i];
        const { suggestedRule, deadDomains } = result.linterResult;
        const suggestedRuleText = suggestedRule === null ? '' : suggestedRule.raws.text;

        consola.info(`Found dead domains in a rule: ${deadDomains.join(', ')}`);
        consola.info(consolaUtils.colorize('red', `- ${result.lineNumber}: ${result.line}`));
        consola.info(consolaUtils.colorize('green', `+ ${result.lineNumber}: ${suggestedRuleText}`));

        // eslint-disable-next-line no-await-in-loop
        const confirmed = await confirm('Apply suggested fix?');
        if (confirmed) {
            allowedResults.push(result);
        }
    }

    return allowedResults;
}

/**
 * Processes the specified file.
 *
 * @param {string} file - Path to the file that the program should process.
 */
async function processFile(file) {
    consola.info(consolaUtils.colorize('bold', `Processing file ${file}`));

    const content = fs.readFileSync(file, 'utf8');

    // Parsing the whole filter list.
    const listAst = agtree.FilterListParser.parse(content);

    if (!listAst.children || listAst.children.length === 0) {
        consola.info(`No rules found in ${file}`);

        return;
    }

    const results = await processListAst(file, listAst);

    if (results.length === 0) {
        consola.info(`No changes to ${file}`);

        return;
    }

    // Count the number of lines that are to be removed.
    const cntRemove = results.reduce((cnt, res) => {
        return res.linterResult.suggestedRule === null ? cnt + 1 : cnt;
    }, 0);
    const cntModify = results.reduce((cnt, res) => {
        return res.linterResult.suggestedRule !== null ? cnt + 1 : cnt;
    }, 0);

    const summaryMsg = `${consolaUtils.colorize('bold', `Summary for ${file}:`)}\n`
        + `${cntRemove} line${cntRemove.length > 1 || cntRemove.length === 0 ? 's' : ''} will be removed.\n`
        + `${cntModify} line${cntModify.length > 1 || cntModify.length === 0 ? 's' : ''} will be modified.`;
    consola.box(summaryMsg);

    const confirmed = await confirm('Apply modifications to the file?');

    if (confirmed) {
        consola.info(`Applying modifications to ${file}`);

        // Sort result by lineNumber descending so that we could use it for the
        // original array modification.
        results.sort((a, b) => b.lineNumber - a.lineNumber);

        // Go through the results array in and either remove or modify the
        // lines.
        for (let i = 0; i < results.length; i += 1) {
            const result = results[i];
            const lineIdx = result.lineNumber - 1;

            if (result.linterResult.suggestedRule === null) {
                listAst.children.splice(lineIdx, 1);
            } else {
                listAst.children[lineIdx] = result.linterResult.suggestedRule;
            }
        }

        // Generate a new filter list contents, use raw text when it's
        // available in a rule AST.
        const newContents = agtree.FilterListParser.generate(listAst, true);

        // Update the filter list file.
        fs.writeFileSync(file, newContents);
    } else {
        consola.info(`Skipping file ${file}`);
    }
}

/**
 * Entry point into the CLI program logic.
 */
async function main() {
    consola.info(`Starting ${packageJson.name} v${packageJson.version}`);

    const globExpression = argv.input;
    const files = glob.globSync(globExpression);
    const plural = files.length > 1 || files.length === 0;

    consola.info(`Found ${files.length} file${plural ? 's' : ''} matching ${globExpression}`);

    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];

        try {
            // eslint-disable-next-line no-await-in-loop
            await processFile(file);
        } catch (ex) {
            consola.error(`Failed to process ${file} due to ${ex}`);

            return;
        }
    }

    consola.success('Finished successfully');
}

main();
