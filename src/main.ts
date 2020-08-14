import chalk from 'chalk';
import fs from 'fs';
import ncp from 'ncp';
import path from 'path';
import { promisify } from 'util';
import execa from 'execa';
import Listr from 'listr';
import { projectInstall } from 'pkg-install';
import gitignore from 'gitignore';
import hbs from "handlebars";
const license = require('spdx-license-list/licenses/MIT')



import { CreationOptions } from "./cli";

const access = promisify(fs.access);
const copy = promisify(ncp);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const writeGitignore = promisify(gitignore.writeFile);


type TemplateOptions = CreationOptions & {
    targetDirectory: string;
    templateDirectory: string;
}

async function copyTemplateFiles(options: TemplateOptions) {
    return copy(options.templateDirectory, options.targetDirectory, {
        clobber: false,
        filter: /^[^.]+$|\.(?!(hbs)$)([^.]+$)/
    });
}

async function templateFiles(options: TemplateOptions) {
    var isTemplate = /^[^.]+$|\.(?=(hbs)$)([^.]+$)/gm;
    var tmplPath = options.templateDirectory;
    // const dir = await fs.promises.opendir(tmplPath)
    const dir = await fs.promises.readdir(tmplPath);

    // Loop them all with the new for...of
    for (const file of dir) {
        var fileName = path.basename(file);
    // for await (const dirent of dir) {
        if (path.extname(fileName) == '.hbs') {
            var templateFile = await readFile(path.join(tmplPath, fileName), { encoding: 'utf8' });
            var template = hbs.compile(templateFile);
            var output = template({ packageId: options.id, author: options.userName || options.name });
            await writeFile(path.join(options.targetDirectory, fileName.replace(path.extname(fileName), '')), output, { encoding: 'utf8' });
        }
    }
}

async function createGitignore(options: TemplateOptions) {
    const file = fs.createWriteStream(
        path.join(options.targetDirectory, '.gitignore'),
        { flags: 'a' }
    );
    return writeGitignore({
        type: 'Node',
        file: file,
    });
}

async function createLicense(options: TemplateOptions) {
    const targetPath = path.join(options.targetDirectory, 'LICENSE');
    const licenseContent = license.licenseText
        .replace('<year>', new Date().getFullYear())
        .replace('<copyright holders>', `${options.name}`);
    return writeFile(targetPath, licenseContent, 'utf8');
}

async function initGit(options: TemplateOptions) {
    const result = await execa('git', ['init'], {
        cwd: options.targetDirectory,
    });
    if (result.failed) {
        return Promise.reject(new Error('Failed to initialize git'));
    }
    return;
}

export async function createProject(args: CreationOptions) {
    const currentFileUrl = import.meta.url;
    console.log(`url: ${new URL(currentFileUrl).pathname} / ${args.template}`);
    const templateDir = path.resolve(
        decodeURI(new URL(currentFileUrl).pathname),
        '../../templates',
        args.template.toLowerCase()
    ).replace(/^(\w:\\)(\w:\\)/, '$2');
    var options: TemplateOptions = {
        ...args,
        targetDirectory: args.targetDirectory || process.cwd(),
        templateDirectory: templateDir
    };

    try {
        await access(templateDir, fs.constants.R_OK);
    } catch (err) {
        console.error('%s Invalid template name', chalk.red.bold('ERROR'));
        process.exit(1);
    }

    const tasks = new Listr([
        {
            title: 'Copy project files',
            task: () => copyTemplateFiles(options),
        },
        {
            title: 'Generate project files',
            task: () => templateFiles(options)
        },
        {
            title: 'Create gitignore',
            task: () => createGitignore(options),
        },
        {
            title: 'Create License',
            task: () => createLicense(options),
            enabled: () => options.license
        },
        {
            title: 'Initialize git',
            task: () => initGit(options),
            enabled: () => options.git,
        },
        {
            title: 'Install dependencies',
            task: () =>
                projectInstall({
                    cwd: options.targetDirectory,
                }),
            skip: () =>
                !options.runInstall
                    ? 'Pass --install to automatically install dependencies'
                    : undefined,
        },
    ], {
        exitOnError: false
    });

    await tasks.run();

    console.log('%s Project ready', chalk.green.bold('DONE'));
    return true;
}