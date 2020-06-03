import { _decorator, Component, Node, RenderStage, RenderFlow, RenderView, renderer, GFXClearFlag, GFXPipelineState, GFXCommandBuffer, GFXTextureType, GFXTextureUsageBit, GFXTextureViewType, GFXFormat, Vec2, GFXFramebuffer, GFXTexture, GFXTextureView, pipeline, game, director, Director } from "cc";
import PostProcessCommand from "./post-process-command";
import PostProcessRenderer from "./post-process-renderer";

const { UBOGlobal } = pipeline;
const { ccclass, property } = _decorator;

const bufs: GFXCommandBuffer[] = [];

class PostEffectRenderCommand {
    pass: renderer.Pass = null;
    input: GFXFramebuffer = null;
    output: GFXFramebuffer = null;

    constructor (pass: renderer.Pass, input: GFXFramebuffer, output: GFXFramebuffer) {
        this.pass = pass;
        this.input = input;
        this.output = output;
    }
}

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

        if (this._renderCommands.length === 0) {
            this._framebuffer = null;
        }
        else {
            this._framebuffer = this.flow.pipeline.getFrameBuffer('shading');
        }

        this.sortRenderQueue();
        this.executeCommandBuffer(view);

        this.renderEffects(view);
    }

    renderEffects (view: RenderView) {
        let commands = this._renderCommands;
        if (commands.length === 0) return;

        const camera = view.camera!;

        let cmdBuff = this._cmdBuff;
        let pipeline = this._pipeline!;
        let quadIA = pipeline.quadIA;

        cmdBuff.begin();
        for (let i = 0; i < commands.length; i++) {
            this._renderArea!.width = camera.width;
            this._renderArea!.height = camera.height;
            let framebuffer = commands[i].output;

            if (!framebuffer) {
                framebuffer = view.window!.framebuffer;
            }

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

    _renderers: PostProcessRenderer[] = [];
    get renderers () {
        return this._renderers;
    }
    set renderers (value) {
        this._renderers = value;
        this.rebuild();
    }

    _renderCommands: PostEffectRenderCommand[] = [];

    createFrameBuffer () {
        // @ts-ignore
        let pipelineAny: any = this.pipeline;
        let format: GFXFormat = pipelineAny._getTextureFormat(GFXFormat.UNKNOWN, GFXTextureUsageBit.COLOR_ATTACHMENT);
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
            renderPass: pipelineAny._renderPasses.get(1),
            colorViews: [textureView],
            depthStencilView: null,
        })

        return frameBuffer;
    }

    rebuild () {
        let pipeline = this._pipeline!;

        let originFrameBuffer = this._framebuffer = this.flow.pipeline.getFrameBuffer('shading');

        let originTexture = originFrameBuffer.colorViews[0];

        let flip: GFXFramebuffer, flop: GFXFramebuffer, tmp: GFXFramebuffer;
        const globalUBO = pipeline.globalBindings.get(UBOGlobal.BLOCK.name);

        let renderCommands = this._renderCommands;
        renderCommands.length = 0;

        let framebufferMap: Map<string, GFXFramebuffer> = new Map();

        let renderers = this._renderers;
        this._psos.length = 0;
        for (let ri = 0; ri < renderers.length; ri++) {
            let renderer = this.renderers[ri];
            if (!renderer || !renderer.enabled) {
                continue;
            }

            let commands = renderer.commands;
            for (let ci = 0; ci < commands.length; ci++) {
                let command = commands[ci];
                let pass = command.pass;

                pass.bindBuffer(UBOGlobal.BLOCK.binding, globalUBO!.buffer!);

                let originSampler = pass.getBinding('pe_origin_texture');
                if (originSampler) {
                    pass.bindTextureView(originSampler, originTexture);
                }

                if (command.inputCommands) {
                    for (let ii = 0; ii < command.inputCommands.length; ii++) {
                        let inputName = command.inputCommands[ii].outputName;
                        let inputTexture = pass.getBinding(inputName);
                        if (!inputTexture) {
                            cc.warn(`Can not find input name [${inputName}] for post process renderer [${typeof renderer}]`);
                            continue;
                        }
                        
                        let framebuffer = framebufferMap.get(inputName);
                        if (!framebuffer) {
                            cc.warn(`Can not find input frame buffer for input name [${inputName}] in post process renderer [${typeof renderer}]`);
                            continue;
                        }
                        pass.bindTextureView(inputTexture, framebuffer.colorViews[0]);
                    }
                }

                let input = flip || originFrameBuffer;

                let inputSampler = pass.getBinding('pe_input_texture');
                if (inputSampler) {
                    pass.bindTextureView(inputSampler, input.colorViews[0]);
                }

                if (!flop) {
                    flop = this.createFrameBuffer();
                }

                renderCommands.push(new PostEffectRenderCommand(pass, input, flop));

                if (command.outputName) {
                    framebufferMap.set(command.outputName, flop);
                    flop = null;
                }

                tmp = flip;
                flip = flop;
                flop = tmp;

                let pso = pass.createPipelineState();
                let bindingLayout = pso!.pipelineLayout.layouts[0];
                bindingLayout.update();

                pass.update();
                this._psos.push(pso);
            }
        }

        // last command should output to screen
        if (renderCommands.length > 0) {
            renderCommands[renderCommands.length - 1].output = null;
        }
    }
}

director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, () => {
    let stage = director.root.pipeline.getFlow('PostProcessFlow').stages[0] as PostProcessStage;
    stage.renderers = [];
})
