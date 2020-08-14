import { log } from "vortex-api";
import { IExtensionContext } from 'vortex-api/lib/types/api';

//This is the main function Vortex will run when detecting the game extension. 
function main(context: IExtensionContext) {
    context.once(() => {
        log('debug', 'initialising your new extension!')
    });
    return true;
}

module.exports = {
    default: main,
};