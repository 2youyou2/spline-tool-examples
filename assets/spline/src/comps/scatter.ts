import { _decorator, Node, Prefab, isPropertyModifier, Vec4, Quat, Vec3, geometry, randomRange, Mat4, Layers, Enum } from 'cc';
import BaseUtils from './spline-util-base';
import raycast from '../utils/raycast';
import pool from '../utils/pool';

const { ccclass, executeInEditMode, float, type, boolean, property } = _decorator;

let DOWN = new Vec3(0, -1, 0);

let tempVec3 = new Vec3();
let tempRay = geometry.ray.create();
let invertParentMatrix = new Mat4();

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
    set itemCount (value) { this._itemCount = value; this.dirty = true; }
    @property
    get generateCountPerFrame () { return this._generateCountPerFrame; }
    set generateCountPerFrame (value) { this._generateCountPerFrame = value; }
    @type(Prefab)
    get prefab () { return this._prefab; };
    set prefab (v) {
        this._prefab = v;
        this.node.removeAllChildren();
        this.dirty = true;
    };
    @type(Node)
    set raycastLayer (l) {
        this._raycastLayer = l;
    }
    get raycastLayer () {
        return this._raycastLayer;
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

    private _points: Vec3[] = [];
    private _minPos = new Vec3;
    private _maxPos = new Vec3;

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

    private _getNextPosition () : Vec3 | null {
        let min = this._minPos;
        let max = this._maxPos;

        let iterratorCount = 0;
        do {
            if (iterratorCount >= 10) {
                return null;
            }

            tempVec3.x = randomRange(min.x, max.x);
            tempVec3.y = randomRange(min.y, max.y);
            tempVec3.z = randomRange(min.z, max.z);

            iterratorCount++;
        }
        while (!this._isPosValid(tempVec3))

        tempRay.o.set(tempVec3.x, tempVec3.y + 1000, tempVec3.z);
        tempRay.d.set(DOWN);

        // @ts-ignore
        let layer = Layers.Enum.DEFAULT;
        if (this._raycastLayer) {
            layer = this._raycastLayer.layer;
        }
        let results = raycast.raycastAllModels(cc.director._scene._renderScene, tempRay, layer);
        if (results.length > 0) {
            tempVec3 = tempVec3;
            Vec3.scaleAndAdd(tempVec3, tempRay.o, tempRay.d, results[0].distance);
        }

        Vec3.transformMat4(tempVec3, tempVec3, invertParentMatrix);

        return tempVec3;
    }

    public compute () {
        if (this.prefab == null) return;

        let children = this.generated.children;

        Mat4.invert(invertParentMatrix, this.node.parent.worldMatrix);
        if (this._currentItemCount < this._itemCount) {
            for (let i = 0; i < this._generateCountPerFrame; i++) {
                let validPos = this._getNextPosition();
                if (!validPos) {
                    continue;
                }

                let node = children[this._currentItemCount];
                if (!node) {
                    node = cc.instantiate(this.prefab);
                    node.parent = this.generated;
                }
                node.position = validPos;
                node.setScale(
                    this.scale.x + Math.random() * this.scaleRange.x,
                    this.scale.y + Math.random() * this.scaleRange.y,
                    this.scale.z + Math.random() * this.scaleRange.z,
                )
                let rotationY = Math.random() * (this.rotationY + this.rotationYRange);
                node.eulerAngles = tempVec3.set(0, rotationY, 0)
                this._currentItemCount++;
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
}
