
import BaseUtils from './spline-util-base';
import MeshBender, { FillingMode } from '../utils/mesh-processing/mesh-bender';
import SourceMesh from '../utils/mesh-processing/source-mesh';
import Spline from '../spline';

import { _decorator, Node, Vec3, Mesh, Quat, ModelComponent, Material } from 'cc';
import CubicBezierCurve from '../cubic-bezier-curve';
const { ccclass, executeInEditMode, float, type, boolean, property } = _decorator;

@ccclass
@executeInEditMode
export default class SplineMeshTiling extends BaseUtils {
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
    get mesh () : Mesh {
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
        this._onSplineChanged();
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
        this._onSplineChanged();
    }

    public compute () {
        if (!this.mesh) {
            return;
        }

        let children = this.generated.children;
        let used = 0;

        if (this.curveSpace) {
            let curves = this.spline.curves;
            for (let i = 0; i < curves.length; i++) {
                this._getOrcreate(i, curves[i]);
                used++;
            }
        } else {
            this._getOrcreate(0, this.spline);
            used++;
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

    private _getOrcreate (childIdx, target: Spline | CubicBezierCurve) {
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
            mb.setInterval(target);
        }

        mb.source = SourceMesh.build(this.mesh)
            .translate(this.translation)
            .rotate(Quat.fromEuler(new Quat(), this.rotation.x, this.rotation.y, this.rotation.z))
            .scaleRes(this.scale);
        mb.mode = this.mode;
        mb.offset = this.offset;

        let mc = node.getComponent(ModelComponent);
        if (!mc) {
            mc = node.addComponent(ModelComponent);
            mc.material = this.material;
        }

        return node;
    }

}
