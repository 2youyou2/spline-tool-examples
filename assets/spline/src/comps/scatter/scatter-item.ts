import { _decorator, Node, Prefab, Vec4, Quat, Vec3, Mat4, ModelComponent, Vec2 } from 'cc';
import SourceMesh from '../../utils/mesh-processing/source-mesh';
import FixedModelMesh from '../../utils/mesh-processing/fixed-model-mesh';
import { ScatterType } from './type';

const { ccclass, type, property } = _decorator;

let tempMeshPos = new Vec3();
let tempMeshNormal = new Vec3();
let tempMeshTangent = new Vec4();

let tempArray2 = new Array(2).fill(0);
let tempArray3 = new Array(3).fill(0);
let tempArray4 = new Array(4).fill(0);

@ccclass('ScatterItem')
export default class ScatterItem {
    @type(Prefab)
    _prefab: Prefab = null;
    @type(ScatterType)
    _type = ScatterType.Mesh;
    @property
    _volume = 1;

    @type(Prefab)
    get prefab () {
        return this._prefab;
    }
    set prefab (value) {
        this._prefab = value;
    }
    @type(ScatterType)
    get type () {
        return this._type;
    }
    set type (value) {
        this._type = value;
    }
    @property
    get volume () {
        return this._volume;
    }
    set volume (value) {
        this._volume = value;
    }

    _maxCount = 0;
    @property
    get maxCount () {
        return this._maxCount;
    }

    protected _fixedMeshes: FixedModelMesh[] = [];
    protected _models: ModelComponent[] = [];
    protected _sourceMesh: SourceMesh = null;

    init (node, maxCount) {
        this.node = node;
        this._maxCount = maxCount;
        this.currentCount = 0;

        if (!this.prefab) return;

        if (this._type === ScatterType.Mesh) {
            this.node.removeAllChildren();

            let tempNode: Node = cc.instantiate(this.prefab);
            tempNode.setPosition(0, 0, 0);
            let tempModel = tempNode.getComponent(ModelComponent) || tempNode.getComponentInChildren(ModelComponent);
            if (tempModel && tempModel.mesh) {
                this._sourceMesh = SourceMesh.build(tempModel.mesh);
                tempModel.node.getWorldRotation(this._sourceMesh.rotation)
                tempModel.node.getWorldPosition(this._sourceMesh.translation)
                tempModel.node.getWorldScale(this._sourceMesh.scale)
                this._sourceMesh.reset();
            }

            let tempMaterials = tempModel && tempModel.sharedMaterials;
            let subMeshCount = this._sourceMesh.subCount();

            this._fixedMeshes.length = 0;
            this._models.length = 0;
            for (let i = 0; i < subMeshCount; i++) {
                this._fixedMeshes[i] = FixedModelMesh.create(this._sourceMesh.getVertices(i).length, this._sourceMesh.getTriangles(i).length, this.maxCount);
                let node = new Node('ScatterItemModel');
                let model = node.addComponent(ModelComponent);
                model.setMaterial(tempMaterials[i] || tempMaterials[0], 0);
                model.mesh = this._fixedMeshes[i].mesh;
                this._models[i] = model;

                node.parent = this.node;
            }
        }
        else {
            this.node.removeComponent(ModelComponent);

            this._models.length = 0;
            this._sourceMesh = null;
            this._fixedMeshes.length = 0;
        }
    }

    fill (position: Vec3, scale: Vec3, rotation: Quat, mat: Mat4) {
        if (this.currentCount >= this.maxCount || !this.prefab) return false;

        if (this._type === ScatterType.Mesh) {
            this.updateMesh(mat);
        }
        else {
            this.updateInstance(position, scale, rotation);
        }

        this.currentCount++;

        this._updated = true;
        return true;
    }

    endFill () {
        if (!this._updated || !this.prefab) return;

        if (this._type === ScatterType.Mesh) {
            let fixedMeshes = this._fixedMeshes;
            let models = this._models;
            for (let i = 0; i < fixedMeshes.length; i++) {
                fixedMeshes[i].update(models[i]);
            }
        }
        else if (this._type === ScatterType.Instance) {
            let children = this.node.children;
            if (children.length > this.maxCount) {
                for (let i = children.length - 1; i >= this.maxCount; i--) {
                    children[i].parent = null;
                }
            }
        }

        this._updated = false;
    }

    protected updateMesh (mat: Mat4) {
        let sourceMesh = this._sourceMesh;
        if (!sourceMesh) return;

        let subCount = sourceMesh.subCount();
        for (let si = 0; si < subCount; si++) {
            let fixedMesh = this._fixedMeshes[si];
            let vertices = sourceMesh.getVertices(si);
            let vertCount = vertices.length;
            let vertOffset = this.currentCount * vertCount

            for (let i = 0; i < vertCount; i++) {
                let vert = vertices[i];

                let offset = vertOffset + i;

                fixedMesh.writeVertex(offset, 'position', Vec3.toArray(tempArray3, Vec3.transformMat4(tempMeshPos, vert.position, mat)));
                fixedMesh.writeVertex(offset, 'normal', Vec3.toArray(tempArray3, Vec3.transformMat4(tempMeshNormal, vert.position, mat)));
                fixedMesh.writeVertex(offset, 'tangent', Vec4.toArray(tempArray4, Vec4.transformMat4(tempMeshTangent, vert.tangent, mat)));
                fixedMesh.writeVertex(offset, 'uv', Vec2.toArray(tempArray2, vert.uv));
            }

            let triangles = sourceMesh.triangles;
            let triangleCount = triangles.length;
            let triangleOffset = this.currentCount * triangleCount;
            for (let i = 0; i < triangleCount; i++) {
                fixedMesh.writeIndex(triangleOffset + i, vertOffset + triangles[i]);
            }
        }
    }

    protected updateInstance (position: Vec3, scale: Vec3, rotation: Quat) {
        let node = this.node.children[this.currentCount];
        if (!node) {
            node = cc.instantiate(this.prefab);
            node.parent = this.node;
        }
        node.position = position;
        node.scale = scale;
        node.rotation = rotation;
    }

    private _updated = false;

    private currentCount = 0;

    private node: Node = null;
}