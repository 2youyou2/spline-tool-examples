// @ts-nocheck

import { ccenum, Material, AssetLibrary, game, Game } from "cc";

let postProcessMaterials: Map<string, Material> = new Map;

if (CC_EDITOR) {
    const globby = window.require('globby');
    const path = window.require('path');
    const fs = window.require('fs-extra');
    // const projectPath = window.require('editor').project;

    const electron = require('electron')
    const projectPath = electron.remote.getGlobal('Editor').Project.path;

    let postProcessMaterialPaths = globby.sync(path.join(projectPath, '**/post-process/**/*.mtl'));
    for (let i = 0; i < postProcessMaterialPaths.length; i++) {
        let mp = postProcessMaterialPaths[i];
        let name = path.basename(mp).replace(path.extname(mp), '');
        
        let metaPath = mp + '.meta';
        if (!fs.existsSync(metaPath)) {
            continue;
        }
        let json;
        try {
            json = fs.readJSONSync(metaPath);
        }
        catch (err) {
            cc.error(err);
        }
        if (!json) {
            continue;
        }
        postProcessMaterials.set(name, null);

        let uuid = json.uuid;
        game.on(Game.EVENT_ENGINE_INITED, () => {
            AssetLibrary.loadAsset(uuid, (err, asset) => {
                if (err) {
                    cc.error(err);
                    return;
                }
                postProcessMaterials.set(name, asset);
            })
        })
    }
}

export default postProcessMaterials;
