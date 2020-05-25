import { _decorator, Node, Prefab, isPropertyModifier, Vec4, Quat, Vec3, geometry, randomRange, Mat4, Layers, Enum, ModelComponent, Vec2, Mat3, Terrain, CCClass } from 'cc';
import SplineUtilRenderer from './spline-util-renderer';
import raycast from '../utils/raycast';
import pool from '../utils/pool';
import SourceMesh from '../utils/mesh-processing/source-mesh';
import FixedModelMesh from '../utils/mesh-processing/fixed-model-mesh';
import { ScatterVolume } from './scatter-volume';
import { pointInPolygonAreaXZ } from '../utils/mathf';

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

let tempMin = new Vec3;
let tempMax = new Vec3;

let tempArray2 = new Array(2).fill(0);
let tempArray3 = new Array(3).fill(0);
let tempArray4 = new Array(4).fill(0);

enum ScatterType {
    Mesh,
    Instance,
}
Enum(ScatterType);

@ccclass('ScatterItem')
class ScatterItem {
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

class VolumeInfo {
    volume = 0;
    maxCount = 0;
    count = 0;
}

@ccclass('Scatter')
@executeInEditMode
export default class Scatter extends SplineUtilRenderer {
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
        this._updateVolume();
    }
    @property
    get generateCountPerFrame () { return this._generateCountPerFrame; }
    set generateCountPerFrame (value) { this._generateCountPerFrame = value; }

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

    _volumeInfos: VolumeInfo[] = [];
    _selfVolumeInfo = new VolumeInfo;

    @type(ScatterVolume)
    _volumes: ScatterVolume[] = []
    @type(ScatterVolume)
    get volumes () {
        return this._volumes;
    }
    set volumes (value) {
        let oldValue = this._volumes;
        for (let i = 0; i < oldValue.length; i++) {
            if (oldValue[i]) {
                oldValue[i].volumeChanged.removeListener(this._updateVolume, this);
            }
        }
        this._volumes = value;
        this._updateVolume();
    }

    @type(ScatterItem)
    _items: ScatterItem[] = [];
    @type(ScatterItem)
    get items () {
        return this._items;
    }
    set items (value) {
        this._items = value;
        this.node.removeAllChildren();
        this.dirty = true;

        this._updateVolume();
    }


    public onLoad () {
        super.onLoad();
        this._updateVolume();
    }

    private _isPosValid (pos) {
        if (!pointInPolygonAreaXZ(pos, this.spline.getPoints())) {
            return false;
        }

        Vec3.transformMat4(pos, pos, this.spline.node.worldMatrix);

        let volumes = this._volumes;
        let volumeInfos = this._volumeInfos;
        let valid = false;
        let includeByVolumes = 0;
        for (let i = 0; i < volumes.length; i++) {
            let volume = volumes[i];
            if (!volume) continue;

            let info = volumeInfos[i];
            if (volume.includePos(pos)) {
                includeByVolumes++;
                if (info.count >= info.maxCount) {
                    continue;
                }
                valid = true;
                info.count++;
                break;
            }
        }
        if (includeByVolumes === 0) {
            if (this._selfVolumeInfo.count < this._selfVolumeInfo.maxCount) {
                valid = true;
                this._selfVolumeInfo.count++;
            }
        }
        return valid;
    }

    private _getNextPosition (): Vec3 | null {
        let min = tempMin;
        let max = tempMax;
        this._spline.getBounding(min, max);

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
        if (this._items.length <= 0 || !this._hasValidItem) return;

        Mat4.invert(invertParentMatrix, this.node.parent.worldMatrix);
        if (this._currentItemCount < this._itemCount) {
            let items = this._items;

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

                Quat.fromEuler(tempQuat, tempEuler.x, tempEuler.y, tempEuler.z);
                Mat4.fromRTS(tempMat4, tempQuat, validPos, tempScale);

                for (let j = 0; j < items.length; j++) {
                    if (items[j].fill(validPos, tempScale, tempQuat, tempMat4)) {
                        this._currentItemCount++;
                        break;
                    }
                }
            }

            for (let i = 0; i < items.length; i++) {
                items[i].endFill();
            }

            //@ts-ignore
            if (CC_EDITOR) cce.Engine.repaintInEditMode();
        }
        else {
            this._dirty = false;
        }
    }

    protected _updateVolume () {
        let infos = this._volumeInfos;
        infos.length = 0;
        let totalVolume = 0;
        for (let i = 0; i < this._volumes.length; i++) {
            let volume = this._volumes[i];
            let info = new VolumeInfo;

            if (volume) {
                volume.volumeChanged.addListener(this._updateVolume, this);
                info.volume = volume.volume;
            }
            else {
                info.volume = 0;
            }

            infos[i] = info;
            totalVolume += info.volume;
        }

        for (let i = 0; i < infos.length; i++) {
            let info = infos[i];
            if (totalVolume) {
                if (totalVolume > 1) {
                    info.volume /= totalVolume;
                }
            }
            else {
                info.volume = 0;
            }
            info.maxCount = info.volume * this.itemCount;
        }

        this._selfVolumeInfo.count = 0;
        this._selfVolumeInfo.volume = Math.max(0, 1 - totalVolume);
        this._selfVolumeInfo.maxCount = this._selfVolumeInfo.volume * this.itemCount;

        this.dirty = true;

        this._updateItems();
    }

    protected get generated () {
        if (!this._generated || this._generated.parent !== this.node) {
            let generatedName = 'generated ' + cc.js.getClassName(this);
            // this._generated = cc.find(generatedName, this.node);
            if (!this._generated) {
                this._generated = new Node(generatedName);
                this._generated.parent = this.node;
            }
        }
        return this._generated;
    }

    _hasValidItem = false;
    _updateItems () {
        this._hasValidItem = false;

        let totalVolume = 0;
        let items = this._items;
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (!item.prefab) continue;
            totalVolume += items[i].volume;
            this._hasValidItem = true;
        }
        if (totalVolume === 0) {
            this._hasValidItem = false;
        }
        if (!this._hasValidItem) {
            return;
        }


        let children = this.generated.children;
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (!item.prefab) continue;

            let volume = item.volume;
            if (totalVolume) {
                volume /= totalVolume;
            }
            else {
                volume = 0;
            }

            let node = children[i];
            if (!node) {
                node = new Node('ScatterItem');
                node.parent = this.generated;
            }

            let maxCount = (volume * this.itemCount) | 0;

            item.init(node, maxCount);
        }

        this.dirty = true;
    }
}
