import { _decorator, Component, Node, director, Material, GFXRenderPass, renderer } from 'cc';
const { ccclass, property, type, executeInEditMode } = _decorator;

import { PostProcessStage } from './post-process-stage';

@ccclass('PostProcess')
@executeInEditMode
export class PostProcess extends Component {
    /* class member could be defined like this */
    // dummy = '';

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    _stage: PostProcessStage = null!;

    _passes: renderer.Pass[] = [];

    @type(Material)
    _materials: Material[] = [];

    @type(Material)
    get materials () {
        return this._materials
    }
    set materials (value) {
        this._materials = value;
        this._updatePasses();
    }

    start () {
        this._stage = director.root.pipeline.getFlow('PostProcessFlow').stages[0] as PostProcessStage;
        this._updatePasses();
    }

    _updatePasses () {
        this._passes.length = 0;
        let materials = this._materials;
        for (let i = 0; i < materials.length; i++) {
            let m = materials[i];
            if (!m) continue;
            for (let j = 0; j < m.passes.length; j++) {
                this._passes.push(m.passes[j]);
            }
        }

        this._stage.passes = this._passes;
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
