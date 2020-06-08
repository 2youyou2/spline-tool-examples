
import SplineUtilRenderer from './spline-util-renderer';
import MeshBender, { FillingMode, AlignType, ValueType } from '../utils/mesh-processing/mesh-bender';
import SourceMesh from '../utils/mesh-processing/source-mesh';
import Spline from '../spline';
import UAnimationCurve from '../utils/animation-curve';
import { _decorator, Node, Vec3, Mesh, Quat, ModelComponent, Material, geometry, CurveRange, Vec2 } from 'cc';
import CubicBezierCurve from '../cubic-bezier-curve';
import ISplineCruve from '../spline-curve-interface';
const { ccclass, executeInEditMode, float, type, boolean, property } = _decorator;

let tempPos = new Vec3();
let tempRotation = new Vec3();

@ccclass
@executeInEditMode
export default class SplineMeshTiling extends SplineUtilRenderer {
    @type(Material)
    public _material: Material = null;

    @type(Material)
    get material () {
        return this._material;
    }
    set material (value) {
        this._material = value;
        this._updateMaterials();
    }

    @type(Mesh)
    public _mesh: Mesh = null;
    @type(Mesh)
    get mesh (): Mesh {
        return this._mesh;
    }
    set mesh (value) {
        this._mesh = value;
        this.reset();
    }


    // "Translation to apply on the mesh before bending it."
    @property
    public _translation = new Vec3;
    @type(Vec3)
    get translation () {
        return this._translation;
    }
    set translation (value) {
        this._translation = value;
        this.reset();
    }

    // "Rotation to apply on the mesh before bending it."
    @property
    public _rotation = new Vec3;
    @type(Vec3)
    get rotation () {
        return this._rotation;
    }
    set rotation (value) {
        this._rotation = value;
        this.reset();
    }

    // "Scale to apply on the mesh before bending it."
    @property
    public _scale = Vec3.ONE.clone();
    @type(Vec3)
    get scale () {
        return this._scale;
    }
    set scale (value) {
        this._scale = value;
        this.reset();
    }

    // "If true, the mesh will be bent on play mode. If false, the bent mesh will be kept from the editor mode, allowing lighting baking."
    // public bool updateInPlayMode;

    // "If true, a mesh will be placed on each curve of the spline. If false, a single mesh will be placed for the whole spline."
    @property
    private _curveSpace = false;
    @property
    public get curveSpace () {
        return this._curveSpace;
    }
    public set curveSpace (value) {
        this._curveSpace = value;
        this.onCurveChanged();
    }

    // "The mode to use to fill the choosen interval with the bent mesh."
    // public mode: FillingMode = FillingMode.StretchToInterval;
    @property
    private _mode: FillingMode = FillingMode.Repeat;
    /// <summary>
    /// The scaling mode along the spline
    /// </summary>
    @property({
        type: FillingMode,
    })
    get mode () { return this._mode; }
    set mode (value) {
        if (value == this._mode) return;
        this._mode = value;

        this._updateMode();
    }

    @property
    _offset = 0;
    @property
    get offset () {
        return this._offset;
    }
    set offset (value) {
        this._offset = value;
        this.onCurveChanged();
    }

    // @ts-ignore
    @type(ValueType)
    _offsetValueType = ValueType.Absolute;
    // @ts-ignore
    @type(ValueType)
    get offsetValueType () {
        return this._offsetValueType;
    }
    set offsetValueType (value) {
        this._offsetValueType = value;
        this.onCurveChanged();
    }

    @type(CurveRange)
    _heightCurve: CurveRange = UAnimationCurve.one();
    @type(CurveRange)
    get heightCurve () {
        return this._heightCurve;
    }
    set heightCurve (value) {
        this._heightCurve = value;
        this.dirty = true;
    }

    @type(Vec2)
    _heightRange = new Vec2(0, 1)
    @type(Vec2)
    get heightRange () {
        return this._heightRange;
    }
    set heightRange (value) {
        this._heightRange = value;
        this.dirty = true;
    }

    // @ts-ignore
    @type(AlignType)
    _alignType = AlignType.None;
    // @ts-ignore
    @type(AlignType)
    get alignType () {
        return this._alignType;
    }
    set alignType (value) {
        this._alignType = value;
        this.dirty = true;
    }

    @property
    _alignOffset = 0;
    @property
    get alignOffset () {
        return this._alignOffset;
    }
    set alignOffset (value) {
        this._alignOffset = value;
        this.dirty = true;
    }

    @property
    _mirror = false;
    @property
    get mirror () {
        return this._mirror;
    }
    set mirror (value) {
        this._mirror = value;
        this.dirty = true;
    }


    public compute () {
        if (!this.mesh) {
            return;
        }

        let children = this.generated.children;
        let used = 0;

        if (this.splineCurve instanceof Spline) {
            if (this.curveSpace) {
                let curves = this.spline.curves;
                for (let i = 0; i < curves.length; i++) {
                    this._getOrcreate(used++, curves[i]);
                    if (this.mirror) {
                        this._getOrcreate(used++, curves[i], true);
                    }
                }
            } else {
                this._getOrcreate(used++, this.spline);
                if (this.mirror) {
                    this._getOrcreate(used++, this.spline, true);
                }
            }
        }
        else {
            this._getOrcreate(used++, this.splineCurve);
            if (this.mirror) {
                this._getOrcreate(used++, this.splineCurve, true);
            }
        }


        if (children.length > used) {
            for (let i = children.length - 1; i >= used; i--) {
                children[i].parent = null;
            }
        }
    }

    private _updateMaterials () {
        let children = this.generated.children;
        for (let i = 0; i < children.length; i++) {
            let mc = children[i].getComponent(ModelComponent);
            mc.material = this.material;
        }
    }

    private _updateMode () {
        let children = this.generated.children;
        for (let i = 0; i < children.length; i++) {
            let mb = children[i].getComponent(MeshBender);
            mb.mode = this.mode;
        }
    }

    private _getOrcreate (childIdx, target: ISplineCruve, mirror = false) {
        let node: Node = this.generated.children[childIdx];
        if (!node) {
            node = new Node();
            node.parent = this.generated;
        }
        let mb = node.getComponent(MeshBender);
        if (!mb) {
            mb = node.addComponent(MeshBender);
        }
        if (target instanceof Spline) {
            mb.setInterval1(target, 0);
        }
        else {
            mb.setInterval(target as CubicBezierCurve);
        }

        let translation = this.translation;
        let rotation = this.rotation;
        if (mirror) {
            translation = tempPos.set(this.translation);
            translation.multiplyScalar(-1);

            rotation = tempRotation.set(this.rotation);
            rotation.multiplyScalar(-1);
        }

        mb.source = SourceMesh.build(this.mesh)
            .translate(translation)
            .rotate(Quat.fromEuler(new Quat(), rotation.x, rotation.y, rotation.z))
            .scaleRes(this.scale);
        mb.mode = this.mode;
        mb.offset = this.offset;
        mb.offsetValueType = this.offsetValueType;
        mb.heightCurve = this.heightCurve;
        mb.heightRange = this.heightRange;
        mb.alignType = this.alignType;
        mb.alignOffset = this.alignOffset;

        let mc = node.getComponent(ModelComponent);
        if (!mc) {
            mc = node.addComponent(ModelComponent);
            mc.material = this.material;
        }

        return node;
    }

}
