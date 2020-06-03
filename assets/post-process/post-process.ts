import { _decorator, Component, Node, director, Material, GFXRenderPass, renderer } from 'cc';
const { ccclass, property, type, executeInEditMode } = _decorator;

import { PostProcessStage } from './post-process-stage';
import PostProcessRenderer from './post-process-renderer';

@ccclass('PostProcess')
@executeInEditMode
export class PostProcess extends Component {
    _stage: PostProcessStage = null!;

    @type(PostProcessRenderer)
    _renderers: PostProcessRenderer[] = [];
    @type(PostProcessRenderer)
    get renderers () {
        return this._renderers;
    }
    set renderers (value) {
        this._renderers = value;
        this._updateStage();
    }

    start () {
        this._stage = director.root.pipeline.getFlow('PostProcessFlow').stages[0] as PostProcessStage;
        this._updateStage();
    }

    _updateStage () {
        this._stage.renderers = this._renderers;
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
