import hbs from "handlebars";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
import { TemplateOptions } from "./main";

export async function renderTemplates(options: TemplateOptions, relativeSourcePath: string = '.', forceTargetPath?: string) {
    var tmplPath = path.join(options.templateDirectory, relativeSourcePath);
    var targetPath = path.join(options.targetDirectory, forceTargetPath ?? relativeSourcePath);
    if (!fs.existsSync(targetPath)){
        fs.mkdirSync(targetPath);
    }
    const dir = await fs.promises.readdir(tmplPath);
    for (const file of dir) {
        var fileName = path.basename(file);
        if (path.extname(fileName) == '.hbs') {
            var templateFile = await readFile(path.join(tmplPath, fileName), { encoding: 'utf8' });
            var template = hbs.compile(templateFile);
            var output = template({ packageId: options.id, author: options.userName || options.name });
            await writeFile(path.join(targetPath, fileName.replace(path.extname(fileName), '')), output, { encoding: 'utf8' });
        }
    }
}