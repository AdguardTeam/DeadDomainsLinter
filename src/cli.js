#! /usr/bin/env node

const fs = require('fs');
const consola = require('consola');
// eslint-disable-next-line import/no-unresolved
const consolaUtils = require('consola/utils');
const glob = require('glob');
const packageJson = require('../package.json');
const linter = require('./linter');

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
 * @param {String} message - Question to ask the user in the prompt.
 * @returns {boolean} True if the user confirmed the action, false otherwise.
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
 * Represents result of processing a line.
 * @typedef LineResult
 *
 * @property {Number} lineNumber - Number of the line that was processed.
 * @property {String|undefined} modifiedLine - The line that needs to be used to replace
 * the original line.
 * @property {boolean|undefined} skip - If true, the line will be skipped.
 * @property {boolean|undefined} remove - If true, the line will be removed.
 */

/**
 * Processes the specified line and returns the line contents that needs to be
 * used to replace the original line.
 *
 * @param {String} line - The line to check.
 * @param {String} file - Path to the file where the line is from.
 * @param {Number} lineNumber - Line number (line are counted starting at 1).
 * @returns {LineResult} Instructs what needs to be done with the line.
 */
async function processLine(line, file, lineNumber) {
    consola.verbose(`Processing ${file}:${lineNumber}: ${line}`);

    try {
        const result = await linter.lintRule(line, argv.dnscheck);

        // If the result is empty, the line can be simply skipped.
        if (!result) {
            return {
                lineNumber,
                skip: true,
            };
        }

        consola.info(`Found dead domains in a rule: ${result.deadDomains.join(', ')}`);
        consola.info(consolaUtils.colorize('red', `- ${lineNumber}: ${line}`));
        consola.info(consolaUtils.colorize('green', `+ ${lineNumber}: ${result.suggestedRuleText}`));

        const confirmed = await confirm('Apply suggested fix?');
        if (!confirmed) {
            // The fix was not confirmed, skipping the line.
            return {
                lineNumber,
                skip: true,
            };
        }

        if (result.suggestedRuleText === '') {
            return {
                lineNumber,
                remove: true,
            };
        }

        return {
            lineNumber,
            modifiedLine: result.suggestedRuleText,
        };
    } catch (ex) {
        consola.warn(`Failed to process line ${lineNumber} due to ${ex}, skipping it`);

        return {
            lineNumber,
            skip: true,
        };
    }
}

// isEOL checks that the character is a known end of line character.
function isEOL(c) {
    return c === '\r\n' || c === '\n';
}

/**
 * Processes the specified file.
 *
 * @param {String} file - Path to the file that the program should process.
 */
async function processFile(file) {
    consola.info(consolaUtils.colorize('bold', `Processing file ${file}`));

    const content = fs.readFileSync(file, 'utf8');

    // Split the file contents into lines preserving "new line" characters.
    const lines = content.split(/(\r?\n)/);

    const results = [];

    // TODO(ameshkov): Consider running several promises at once.
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Skip the new line characters, we'll only need them when we'll be
        // modifying the file.
        if (!isEOL(line)) {
            // eslint-disable-next-line no-await-in-loop
            const result = await processLine(line, file, lineNumber);
            if (!result.skip) {
                results.push(result);
            }
        }
    }

    if (results.length === 0) {
        consola.info(`No changes to ${file}`);

        return;
    }

    // Count the number of lines that are to be removed.
    const cntRemove = results.reduce((cnt, res) => { return res.remove ? cnt + 1 : cnt; }, 0);
    const cntModify = results.reduce((cnt, res) => { return res.modifiedLine ? cnt + 1 : cnt; }, 0);

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

            if (result.remove) {
                lines.splice(lineIdx, 1);
                if (isEOL(lines[lineIdx])) {
                    // If the next line is a new line character, we need to
                    // remove it as well.
                    lines.splice(lineIdx, 1);
                }
            } else if (result.modifiedLine) {
                lines[lineIdx] = result.modifiedLine;
            }
        }

        // Note, that we join the lines with empty string and not with a new
        // line because the new line characters were actually preserved when
        // we split the file contents.
        fs.writeFileSync(file, lines.join(''));
    } else {
        consola.info(`Skipping file ${file}`);
    }
}

/**
 * Entry point into the CLI program logic.
 */
async function main() {
    consola.info(`Starting ${packageJson.name} v${packageJson.version}`);

    const files = glob.globSync(argv.input);
    const plural = files.length > 1 || files.length === 0;

    consola.info(`Found ${files.length} file${plural ? 's' : ''} matching ${argv.input}`);

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
}

main();
