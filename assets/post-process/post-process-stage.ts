import { _decorator, Component, Node, RenderStage, RenderFlow, RenderView, renderer, UBOGlobal, GFXClearFlag, GFXPipelineState, GFXCommandBuffer, GFXTextureType, GFXTextureUsageBit, GFXTextureViewType, GFXFormat, Vec2 } from "cc";
const { ccclass, property } = _decorator;

const bufs: GFXCommandBuffer[] = [];

@ccclass("PostProcessStage")
export class PostProcessStage extends RenderStage {

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    _psos: GFXPipelineState[] = []

    public activate (flow: RenderFlow) {
        super.activate(flow);
        this.createCmdBuffer();
    }

    /**
     * @zh
     * 销毁函数。
     */
    public destroy () {
        if (this._cmdBuff) {
            this._cmdBuff.destroy();
            this._cmdBuff = null;
        }
    }

    render (view: RenderView) {
        // Your update function goes here.
        this.sortRenderQueue();
        this.executeCommandBuffer(view);

        this.renderEffects(view);
    }

    renderEffects (view: RenderView) {
        const camera = view.camera!;

        let cmdBuff = this._cmdBuff;
        let pipeline = this._pipeline!;
        let quadIA = pipeline.quadIA;

        let passes = this.passes;
        cmdBuff.begin();
        for (let i = 0; i < passes.length; i++) {
            this._renderArea!.width = camera.width;
            this._renderArea!.height = camera.height;
            const framebuffer = view.window!.framebuffer;

            cmdBuff.beginRenderPass(framebuffer, this._renderArea!,
                GFXClearFlag.ALL, [{ r: 0.0, g: 0.0, b: 0.0, a: 1.0 }], 1.0, 0);
            cmdBuff.bindPipelineState(this._psos[i]);
            cmdBuff.bindBindingLayout(this._psos[i].pipelineLayout.layouts[0]);
            cmdBuff.bindInputAssembler(quadIA);
            cmdBuff.draw(quadIA);
            cmdBuff.endRenderPass();
        }
        cmdBuff.end();

        bufs.length = 0;
        bufs[0] = cmdBuff;
        this._device!.queue.submit(bufs);
    }

    resize (width: number, height: number) { }

    _passes: renderer.Pass[] = [];
    get passes () {
        return this._passes;
    }
    set passes (value) {
        this._passes = value;
        this.rebuild();
    }


    createFrameBuffer () {
        // @ts-ignore
        let pipelineAny: any = this.pipeline;
        let format: GFXFormat = pipelineAny._getTextureFormat(GFXTextureType.TEX2D, GFXTextureUsageBit.COLOR_ATTACHMENT);
        let shadingWidth = pipelineAny._shadingWidth;
        let shadingHeight = pipelineAny._shadingHeight;

        let texture = this._device.createTexture({
            type: GFXTextureType.TEX2D,
            usage: GFXTextureUsageBit.COLOR_ATTACHMENT,
            format: format,
            width: shadingWidth,
            height: shadingHeight,
        })

        let textureView = this._device.createTextureView({
            texture: texture,
            type: GFXTextureViewType.TV2D,
            format: format,
        })

        let frameBuffer = this._device.createFramebuffer({
            renderPass: null,
            colorViews: [textureView],
            depthStencilView: null,
        })

        return frameBuffer;
    }

    rebuild () {
        let pipeline = this._pipeline!;

        this._framebuffer = this.flow.pipeline.getFrameBuffer('shading');
        let originTexture = this._framebuffer.colorViews[0];

        let passes = this.passes;
        for (let i = 0; i < passes.length; i++) {
            let pass = passes[i];

            const globalUBO = pipeline.globalBindings.get(UBOGlobal.BLOCK.name);
            pass.bindBuffer(UBOGlobal.BLOCK.binding, globalUBO!.buffer!);

            let originSampler = pass.getBinding('pe_origin_texture');
            if (originSampler) {
                pass.bindTextureView(originSampler, originTexture);
            }

            let inputSampler = pass.getBinding('pe_input_texture');
            if (inputSampler) {
                if (i === 0) {
                    pass.bindTextureView(inputSampler, originTexture);
                }
            }

            let pso = pass.createPipelineState();
            let bindingLayout = pso!.pipelineLayout.layouts[0];
            bindingLayout.update();

            pass.update();

            this._psos[i] = pso;
        }
        this._psos.length = passes.length;
    }
}
