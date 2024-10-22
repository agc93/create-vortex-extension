import arg from 'arg';
import inquirer, { Question, ListQuestion, InputQuestion } from 'inquirer';
import { createProject } from './main';
import username from "git-user-name";

export type CreationArgs = {
    skipPrompts: boolean;
    git: boolean;
    template: string;
    runInstall: boolean;
    license: boolean;
    actions: boolean;
}

export type CreationOptions = CreationArgs & {
    targetDirectory?: string;
    name?: string;
    userName?: string;
    id?: string;
}

export const Templates: {[key: string]: {metaFile: string, message?: string}} = {
    ["TypeScript"]: {metaFile: "package.json"},
    ["JavaScript"]: {metaFile: "info.json", message: "You will need to set your extension's metadata yourself!"}
}

function parseArgumentsIntoOptions(rawArgs: string[]) : CreationArgs {
    const args = arg(
        {
            '--git': Boolean,
            '--defaults': Boolean,
            '--install': Boolean,
            '--license': Boolean,
            '--actions': Boolean,
            '-g': '--git',
            '-d': '--defaults',
            '-i': '--install',
            '-l': '--license'
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        skipPrompts: args['--defaults'] || false,
        git: args['--git'] || false,
        template: args._[0],
        runInstall: args['--install'] || false,
        license: args['--license'] || false,
        actions: args['--actions'] || false
    };
}

async function promptForMissingOptions(options: CreationArgs): Promise<CreationOptions> {
    const defaultTemplate = Object.keys(Templates)[0];
    if (options.skipPrompts) {
        return {
            ...options,
            template: options.template || defaultTemplate,
        };
    }

    const questions: Question[] = [];
    if (!options.template) {
        questions.push({
            type: 'list',
            name: 'template',
            message: 'Please choose which project template to use',
            choices: Object.keys(Templates),
            default: defaultTemplate,
        } as ListQuestion);
    }

    if (!options.git) {
        questions.push({
            type: 'confirm',
            name: 'git',
            message: 'Initialize a git repository?',
            default: false,
        });
    }

    if (!options.license) {
        questions.push({
            type: 'confirm',
            name: 'license',
            message: 'Install MIT license files?',
            default: false
        });
    }

    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        template: options.template || answers.template,
        git: options.git || answers.git,
        license: options.license || answers.license
    };
}

async function promptForUserDetails(options: CreationArgs): Promise<CreationOptions> {
    const questions: Question[] = [];
        questions.push({
            type: 'input',
            message: 'Please enter your name: ',
            validate: async (input) => {
                return input ? true : false;
            },
            name: 'name',
            default: username()
        } as InputQuestion);
    questions.push({
        type: 'input',
        name: 'username',
        message: '[Optional] Enter your username: '
    });
    questions.push({
        type: 'input',
        name: 'extId',
        message: 'Enter an ID for your extension: ',
        validate: async (input) => {
            return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(input) || 'Must be a valid package ID!'
        }
    });
    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        name: answers.name,
        userName: answers.username || answers.name,
        id: answers.extId
    };
}

export async function cli(args: string[]) {
    let parsed = parseArgumentsIntoOptions(args);
    let options = await promptForMissingOptions(parsed);
    options = await promptForUserDetails(options);
    // console.log(options);
    await createProject(options);
}