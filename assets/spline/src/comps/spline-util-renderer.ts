import SplineUtilBase from "./spline-util-base"
import { Node, _decorator, PrivateNode, Mat4 } from "cc";
import Event from "../utils/event";

const { ccclass, property } = _decorator;

const RebuildAfterTime = 0.2;

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


    protected _dirty = true;
    get dirty () {
        return this._dirty;
    }
    set dirty (value) {
        this._onDirtyChanged(value);
    }

    _dirtyTime = 0;
    protected _onDirtyChanged (value) {
        this._dirty = value;
        if (value) {
            this._dirtyTime = 0;
        } 
    }

    onLoad () {
        this.onCurveChanged();
    }

    onEnable () {
        if (this.spline) {
            if (this['onCurveChanged']) {
                this.spline.curveChanged.addListener(this['onCurveChanged'], this);
            }
            if (this['onNodeListChanged']) {
                this.spline.nodeListChanged.addListener(this['onNodeListChanged'], this);
            }
        }
        if (this.generated) {
            this.generated.active = true;
        }
    }

    onDisable () {
        if (this.spline) {
            if (this['onCurveChanged']) {
                this.spline.curveChanged.removeListener(this['onCurveChanged'], this);
            }
            if (this['onNodeListChanged']) {
                this.spline.curveChanged.removeListener(this['onNodeListChanged'], this);
            }
        }
        if (this.generated) {
            this.generated.active = false;
        }
    }

    protected onCurveChanged () {
        this.dirty = true;
    }

    protected dirtyWhenSplineMoved = false;
    protected splineMatrix: Mat4 = null;
    protected checkSplineMoved () {
        if (!this.dirtyWhenSplineMoved) return;
        let worldMatrix = this.spline.node.worldMatrix;
        if (!this.splineMatrix) {
            this.splineMatrix = new Mat4();
        }
        else if (!this.splineMatrix.equals(worldMatrix)) {
            this.dirty = true;
        }
        this.splineMatrix.set(worldMatrix);
    }

    reset () {
        if (this._generated) {
            this._generated.parent = null;
            this._generated = null;
        }
        this.onCurveChanged();
    }

    update (dt) {
        this.checkSplineMoved();
        
        if (this.dirty && this.spline) {
            this._dirtyTime += dt;

            if (this._dirtyTime >= RebuildAfterTime) {
                this.compute();
                this.dirty = false;
            }

            //@ts-ignore
            if (CC_EDITOR) cce.Engine.repaintInEditMode();
        }
    }

    compute () {

    }
}
