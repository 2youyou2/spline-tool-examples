
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
    public mesh: Mesh = null;
    // "Translation to apply on the mesh before bending it."
    public translation = cc.v3();
    // "Rotation to apply on the mesh before bending it."
    public rotation = cc.v3();
    // "Scale to apply on the mesh before bending it."
    public scale = Vec3.ONE.clone();

    // "If true, the mesh will be bent on play mode. If false, the bent mesh will be kept from the editor mode, allowing lighting baking."
    // public bool updateInPlayMode;

    // "If true, a mesh will be placed on each curve of the spline. If false, a single mesh will be placed for the whole spline."
    public curveSpace = false;

    // "The mode to use to fill the choosen interval with the bent mesh."
    // public mode: FillingMode = FillingMode.StretchToInterval;
    public mode: FillingMode = FillingMode.Repeat;

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

        let mc = node.getComponent(ModelComponent);
        if (!mc) {
            mc = node.addComponent(ModelComponent);
            mc.material = this.material;
        }

        return node;
    }

}
