import { _decorator, Component, Node, Vec3, Mat4, cclegacy } from 'cc';
import Spline from '../../src/spline';
import SplineMeshTiling from '../../src/comps/mesh-tiling';
const { ccclass, property, type, executeInEditMode } = _decorator;

let tempPos = new Vec3();
let tempMat4 = new Mat4();

@ccclass('followPathMesh')
@executeInEditMode
export class followPathMesh extends Component {

    @property
    duration = 5;

    @property({
        serializable: false
    })
    _previewInEditor = false;
    @property
    get previewInEditor () {
        return this._previewInEditor;
    }
    set previewInEditor (value) {
        this._previewInEditor = value;
        //@ts-ignore
        cce.Engine.repaintInEditMode();
    }

    _offset = 0;

    private _spline: Spline = null;
    public get spline () {
        if (!this._spline) {
            this._spline = this.getComponent(Spline);
        }
        return this._spline;
    }

    private _meshTilling: SplineMeshTiling = null;
    public get meshTilling () {
        if (!this._meshTilling) {
            this._meshTilling = this.getComponent(SplineMeshTiling);
        }
        return this._meshTilling;
    }

    start () {
        // Your initialization goes here.
    }

    update (deltaTime: number) {
        if (!this.spline) return;
        if (CC_EDITOR) {
            if (!this.previewInEditor) {
                return;
            }
            //@ts-ignore
            cce.Engine.repaintInEditMode();
        }

        let step = this.spline.length / 5 / 60;
        this.meshTilling.offset = this._offset;
        this._offset += step;
        this._offset = this._offset % this.spline.length;
    }
}
