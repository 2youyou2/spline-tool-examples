import PostProcessCommand from "./post-process-command";
import { _decorator, Material, ccenum, Enum } from "cc";
import postProcessMaterials from './editor/post-process-renderer-materials';

const { property, type, ccclass } = _decorator;


class PassDefine {

    outputName = '';
    inputNames: string[] = []

    constructor(outputName?: string, inputNames?: string[]) {
        if (outputName !== undefined) {
            this.outputName = outputName;
        }
        if (inputNames !== undefined) {
            this.inputNames = inputNames;
        }
    }
}

let materialEnum = {}
let materialEnumIndex = 0;
for (const iter of postProcessMaterials) {
    materialEnum[iter[0]] = materialEnumIndex++;
}
Enum(materialEnum);


// 
let bloomDefines = new Map()
bloomDefines.set(1, new PassDefine('bloom_texture'))
bloomDefines.set(2, new PassDefine('', ['bloom_texture']))

let rendererPassDefines: Map<string, Map<number, PassDefine>> = new Map;
rendererPassDefines.set('bloom', bloomDefines);

@ccclass('PostProcessRenderer')
export default class PostProcessRenderer {
    _passDefines: Map<number, PassDefine> = new Map;
    _commandMap: Map<string, PostProcessCommand> = new Map;
    _commands: PostProcessCommand[] = [];
    get commands () {
        this.init();
        return this._commands;
    }

    @property
    _enabled = true;
    @property
    get enabled () {
        return this._enabled;
    }
    set enabled (v) {
        this._enabled = v;
    }

    @type(Material)
    _material: Material = null;
    @type(Material)
    get material () {
        return this._material;
    }

    // @ts-ignore
    @type(materialEnum)
    _type = 0;
    // @ts-ignore
    @type(materialEnum)
    get type () {
        return this._type;
    }
    set type (value) {
        this._type = value;
        this._updateType();
    }

    @property
    _typeName = '';

    _inited = false;
    init () {
        if (this._inited) return;
        this._inited = true;
        this._updateType();
    }

    _updateType () {
        if (CC_EDITOR) {
            let materialName = materialEnum[this._type];
            this._material = postProcessMaterials.get(materialName);
            this._typeName = materialName;
        }
        this._passDefines = rendererPassDefines.get(this._typeName);
        this._updateCommands();
    }

    _updateMaterial (m) {
        this._material = m;
        this._updateCommands();
    }

    _updateCommands () {
        let commandMap = this._commandMap;
        let commands = this._commands;
        commands.length = 0;
        commandMap.clear();

        let material = this._material;
        if (!material) return;
        for (let i = 0; i < material.passes.length; i++) {
            let pass = material.passes[i];
            let cmd = new PostProcessCommand(pass);

            let define = this._passDefines && this._passDefines.get(i);
            if (define) {
                if (define.outputName) {
                    cmd.outputName = define.outputName;
                    commandMap.set(cmd.outputName, cmd);
                }
                if (define.inputNames && define.inputNames.length > 0) {
                    for (let j = 0; j < define.inputNames.length; j++) {
                        let name = define.inputNames[j];
                        let inputCmd = commandMap.get(name);
                        if (!inputCmd) {
                            cc.warn(`Can not find input command with name ${name}`);
                            continue;
                        }
                        cmd.inputCommands.push(inputCmd);
                    }
                }
            }

            commands.push(cmd);
        }
    }
}
