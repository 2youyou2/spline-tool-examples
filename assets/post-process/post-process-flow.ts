import { _decorator, Component, Node, RenderFlow, RenderView } from "cc";
const { ccclass, property } = _decorator;

@ccclass("PostProcessFlow")
export class PostProcessFlow extends RenderFlow {

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    public render (view: RenderView) {

        view.camera.update();

        this.pipeline.sceneCulling(view);

        this.pipeline.updateUBOs(view);

        super.render(view);
    }

    rebuild () {
        
    }

    destroy () {

    }
}
