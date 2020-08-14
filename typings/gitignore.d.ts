declare module 'gitignore' {
    export  default {
        writeFile(options: { type: string, file: Stream }, callback: (err: ?Error) => any);
    }
}