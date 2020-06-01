import SplineUtilBase from "./spline-util-base"
import { Node, _decorator, PrivateNode } from "cc";

const { ccclass, property } = _decorator;

@ccclass(SplineUtilRenderer)
export default class SplineUtilRenderer extends SplineUtilBase {
    @property
    _showGenerated = false;
    @property
    get showGenerated () {
        return this._showGenerated;
    }
    set showGenerated (value) {
        this._showGenerated = value;
        this.reset();
    }

    protected _generated: Node = null;
    protected get generated () {
        if (!this._generated || this._generated.parent !== this.node) {
            if (this._generated) {
                this._generated.parent = null;
            }
            let generatedName = 'generated ' + cc.js.getClassName(this);
            this._generated = cc.find(generatedName, this.node);
            if (!this._generated) {
                if (this._showGenerated) {
                    this._generated = new Node(generatedName);

                }
                else {
                    this._generated = new PrivateNode(generatedName);
                }
                this._generated.parent = this.node;
            }
        }
        return this._generated;
    }

    protected dirty = true;

    protected listenerEventName = 'curveChanged';

    // LIFE-CYCLE CALLBACKS:
    constructor () {
        super();
        this._onSplineChanged = this._onSplineChanged.bind(this);
    }

    onLoad () {
        this._onSplineChanged();
    }

    onEnable () {
        if (this.spline) {
            this.spline[this.listenerEventName].addListener(this._onSplineChanged);
        }
    }

    onDisable () {
        if (this.spline) {
            this.spline[this.listenerEventName].removeListener(this._onSplineChanged);
        }
    }

    protected _onSplineChanged () {
        this.dirty = true;
    }

    reset () {
        if (this._generated) {
            this._generated.parent = null;
            this._generated = null;
        }
        this._onSplineChanged();
    }

    update (dt) {
        if (this.dirty && this.spline) {
            this.compute();
            this.dirty = false;
        }
    }

    compute () {

    }
}
