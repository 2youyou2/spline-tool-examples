import { _decorator, Node, Prefab, isPropertyModifier, Vec4, Quat, Vec3, geometry, randomRange, Mat4, Layers, Enum, ModelComponent, Vec2, Mat3, Terrain } from 'cc';
import BaseUtils from './spline-util-base';
import raycast from '../utils/raycast';
import pool from '../utils/pool';
import SourceMesh from '../utils/mesh-processing/source-mesh';
import FixedModelMesh from '../utils/mesh-processing/fixed-model-mesh';

const { ccclass, executeInEditMode, float, type, boolean, property } = _decorator;

let DOWN = new Vec3(0, -1, 0);

let tempPos = new Vec3();
let tempScale = new Vec3();
let tempEuler = new Vec3();
let tempRay = geometry.ray.create();
let tempMat4 = new Mat4();
let tempQuat = new Quat();
let invertParentMatrix = new Mat4();

let tempMeshPos = new Vec3();
let tempMeshNormal = new Vec3();
let tempMeshTangent = new Vec4();

function pointInPolygonXZ (point: Vec3, polygon: Vec3[]) {
    var inside = false;
    var x = point.x;
    var z = point.z;

    // use some raycasting to test hits
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    var length = polygon.length;

    for (var i = 0, j = length - 1; i < length; j = i++) {
        var xi = polygon[i].x, zi = polygon[i].z,
            xj = polygon[j].x, zj = polygon[j].z,
            intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

enum ScatterType {
    Mesh,
    Instance,
}
Enum(ScatterType);

@ccclass
@executeInEditMode
export default class Scatter extends BaseUtils {
    @property
    _scale = Vec3.ONE.clone();
    @property
    _scaleRange = new Vec3;
    @property
    _rotationY = 0;
    @property
    _rotationYRange = 360;
    @type(Prefab)
    _prefab: Prefab = null;
    @property
    _itemCount = 20;
    @property
    _generateCountPerFrame = 10;
    @type(Node)
    _raycastLayer: Node = null;
    @type(Terrain)
    _raycastTerrain: Terrain = null;

    @type(ScatterType)
    _type = ScatterType.Mesh;

    @property
    get scale () { return this._scale; };
    set scale (v) { this._scale = v; this.dirty = true; };
    @property
    get scaleRange () { return this._scaleRange; };
    set scaleRange (v) { this._scaleRange = v; this.dirty = true; };
    @property
    get rotationY () { return this._rotationY; }
    set rotationY (value) { this._rotationY = value; this.dirty = true; }
    @property
    get rotationYRange () { return this._rotationYRange; }
    set rotationYRange (value) { this._rotationYRange = value; this.dirty = true; }
    @property
    get itemCount () { return this._itemCount; }
    set itemCount (value) { 
        if (this._itemCount === value) return;
        this._itemCount = value;
        this.dirty = true; 
        this._updateMesh();
    }
    @property
    get generateCountPerFrame () { return this._generateCountPerFrame; }
    set generateCountPerFrame (value) { this._generateCountPerFrame = value; }

    @type(Prefab)
    get prefab () { return this._prefab; };
    set prefab (v) {
        this._prefab = v;
        this.node.removeAllChildren();
        this.dirty = true;

        this._sourceMesh = null;
        this._updateType();
    };

    @type(Node)
    set raycastLayer (l) {
        this._raycastLayer = l;
        if (this._raycastLayer) {
            this._raycastTerrain = this._raycastLayer.getComponent(Terrain);
        }
        else {
            this._raycastTerrain = null;
        }
    }
    get raycastLayer () {
        return this._raycastLayer;
    }

    @type(ScatterType)
    get type () {
        return this._type;
    }
    set type (value) {
        this._type = value;
        this._updateType();
        this.dirty = true;
    }

    private _dirty = true;
    get dirty () {
        return this._dirty;
    }
    set dirty (value) {
        if (value) {
            this._currentItemCount = 0;
            this._dirty = value;
        }
    }

    private _currentItemCount = 0;
    @property
    public get currentItemCount () {
        return this._currentItemCount;
    }

    private _points: Vec3[] = [];
    private _minPos = new Vec3;
    private _maxPos = new Vec3;

    public onLoad () {
        super.onLoad();
        this._updateType();
        this._updateMesh();
    }

    protected _onSplineChanged () {
        super._onSplineChanged();
        this._caclBoundingBox();
    }

    private _caclBoundingBox () {
        let curves = this.spline.curves;
        let points = this._points;

        let min = this._minPos.set(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
        let max = this._maxPos.set(-Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER);

        let index = 0;
        for (let i = 0; i < curves.length; i++) {
            let samples = curves[i].getSamples();
            for (let j = 0; j < samples.length; j++) {
                let position = samples[j].location;
                if (!points[index]) {
                    points[index] = pool.Vec3.get();
                }
                position = Vec3.transformMat4(points[index], position, this.spline.node.worldMatrix);

                min.x = Math.min(min.x, position.x);
                min.y = Math.min(min.y, position.y);
                min.z = Math.min(min.z, position.z);

                max.x = Math.max(max.x, position.x);
                max.y = Math.max(max.y, position.y);
                max.z = Math.max(max.z, position.z);

                index++;
            }
        }

        for (; index < points.length; index++) {
            pool.Vec3.put(points[index]);
        }
    }

    private _isPosValid (pos) {
        return pointInPolygonXZ(pos, this._points);
    }

    private _getNextPosition (): Vec3 | null {
        let min = this._minPos;
        let max = this._maxPos;

        let iterratorCount = 0;
        do {
            if (iterratorCount >= 10) {
                return null;
            }

            tempPos.x = randomRange(min.x, max.x);
            tempPos.y = randomRange(min.y, max.y);
            tempPos.z = randomRange(min.z, max.z);

            iterratorCount++;
        }
        while (!this._isPosValid(tempPos))

        tempRay.o.set(tempPos.x, tempPos.y + 1000, tempPos.z);
        tempRay.d.set(DOWN);

        // @ts-ignore
        if (this._raycastTerrain) {
            let res = this._raycastTerrain.rayCheck(tempRay.o, tempRay.d, 1, true);
            if (res) {
                Vec3.add(tempPos, res, this._raycastTerrain.node.getWorldPosition(tempPos));
            }
        }
        else {
            let layer = Layers.Enum.DEFAULT;
            if (this._raycastLayer) {
                layer = this._raycastLayer.layer;
            }
            let results = raycast.raycastAllModels(cc.director._scene._renderScene, tempRay, layer);
            if (results.length > 0) {
                tempPos = tempPos;
                Vec3.scaleAndAdd(tempPos, tempRay.o, tempRay.d, results[0].distance);
            }
        }

        Vec3.transformMat4(tempPos, tempPos, invertParentMatrix);

        return tempPos;
    }

    public compute () {
        if (this.prefab == null) return;

        let children = this.generated.children;

        Mat4.invert(invertParentMatrix, this.node.parent.worldMatrix);
        if (this._currentItemCount < this._itemCount) {
            for (let i = 0; i < this._generateCountPerFrame; i++) {
                if (this._currentItemCount >= this._itemCount) break;

                let validPos = this._getNextPosition();
                if (!validPos) {
                    continue;
                }

                tempScale.set(
                    this.scale.x + Math.random() * this.scaleRange.x,
                    this.scale.y + Math.random() * this.scaleRange.y,
                    this.scale.z + Math.random() * this.scaleRange.z,
                )
                let rotationY = Math.random() * (this.rotationY + this.rotationYRange);
                tempEuler.set(0, rotationY, 0);

                if (this._type === ScatterType.Mesh) {
                    this.updateMesh(validPos, tempScale, tempEuler);
                }
                else {
                    this.updateInstance(validPos, tempScale, tempEuler);
                }

                this._currentItemCount++;
            }

            if (this._type === ScatterType.Mesh) {
                this._fixedMesh.update(this._model);
            }

            //@ts-ignore
            if (CC_EDITOR) cce.Engine.repaintInEditMode();
        }
        else {
            this._dirty = false;
        }

        if (children.length > this.itemCount) {
            for (let i = children.length - 1; i >= this.itemCount; i--) {
                children[i].parent = null;
            }
        }
    }

    protected _fixedMesh: FixedModelMesh = null;
    protected _updateMesh () {
        if (this._type !== ScatterType.Mesh || !this._model || !this._sourceMesh) {
            this._updateType();
        }

        this._fixedMesh = FixedModelMesh.create(this._sourceMesh.vertices.length, this._sourceMesh.triangles.length, this._itemCount);
        this._model.mesh = this._fixedMesh.mesh;
    }

    protected _model: ModelComponent = null;
    protected _sourceMesh: SourceMesh = null;
    protected _updateType () {
        if (this._type === ScatterType.Mesh) {
            this.generated.removeAllChildren();
            this._model = this.generated.getComponent(ModelComponent)
            if (!this._model) {
                this._model = this.generated.addComponent(ModelComponent);
            }
            if (!this._sourceMesh) {
                let tempNode: Node = cc.instantiate(this.prefab);
                tempNode.setPosition(0,0,0);
                let model = tempNode.getComponent(ModelComponent) || tempNode.getComponentInChildren(ModelComponent);
                if (model && model.mesh) {
                    this._sourceMesh = SourceMesh.build(model.mesh);
                    model.node.getWorldRotation(this._sourceMesh.rotation)
                    model.node.getWorldPosition(this._sourceMesh.translation)
                    model.node.getWorldScale(this._sourceMesh.scale)
                    this._sourceMesh.reset();
                }
                this._model.material = model.material;
            }
        }
        else {
            this.generated.removeComponent(ModelComponent);
            this._model = null;

            if (this._sourceMesh) {
                this._sourceMesh = null;
            }
        }
    }

    protected updateMesh (position: Vec3, scale: Vec3, rotation: Vec3) {
        if (!this._sourceMesh) return;

        Quat.fromEuler(tempQuat, rotation.x, rotation.y, rotation.z);
        Mat4.fromRTS(tempMat4, tempQuat, position, scale);

        let sourceMesh = this._sourceMesh;
        let vertices = sourceMesh.vertices;
        let vertCount = vertices.length;
        let vertOffset = this._currentItemCount * vertCount;

        let fixedMesh = this._fixedMesh;

        for (let i = 0; i < vertCount; i++) {
            let vert = vertices[i];
            
            let offset = vertOffset + i;

            fixedMesh.writeVertex(offset, 'position', Vec3.toArray([], Vec3.transformMat4(tempMeshPos, vert.position, tempMat4)));
            fixedMesh.writeVertex(offset, 'normal', Vec3.toArray([], Vec3.transformMat4(tempMeshNormal, vert.position, tempMat4)));
            fixedMesh.writeVertex(offset, 'tangent', Vec4.toArray([], Vec4.transformMat4(tempMeshTangent, vert.tangent, tempMat4)));
            fixedMesh.writeVertex(offset, 'uv', Vec2.toArray([], vert.uv));
        }

        let triangles = sourceMesh.triangles;
        let triangleCount = triangles.length;
        let triangleOffset = this._currentItemCount * triangleCount;
        for (let i = 0; i < triangleCount; i++) {
            fixedMesh.writeIndex(triangleOffset + i,  vertOffset + triangles[i]);
        }
    }

    protected updateInstance (position: Vec3, scale: Vec3, rotation: Vec3) {
        let node = this.generated.children[this._currentItemCount];
        if (!node) {
            node = cc.instantiate(this.prefab);
            node.parent = this.generated;
        }
        node.position = position;
        node.scale = scale;
        node.eulerAngles = rotation;
    }
}
