import { _decorator, Node, Prefab, isPropertyModifier, Vec4, Quat, Vec3, geometry, randomRange, Mat4, Layers, Terrain } from 'cc';
import SplineUtilRenderer from './../spline-util-renderer';
import raycast from '../../utils/raycast';
import { ScatterVolume } from './scatter-volume';
import { pointInPolygonAreaXZ } from '../../utils/mathf';
import { VolumeInfo } from './type';
import ScatterItem from './scatter-item';

const { ccclass, executeInEditMode, float, type, boolean, property } = _decorator;

let DOWN = new Vec3(0, -1, 0);

let tempPos = new Vec3();
let tempScale = new Vec3();
let tempEuler = new Vec3();
let tempRay = geometry.ray.create();
let tempMat4 = new Mat4();
let tempQuat = new Quat();
let invertParentMatrix = new Mat4();


let tempMin = new Vec3;
let tempMax = new Vec3;



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
            // if (!this._generated) {
                this._generated = new Node(generatedName);
                this._generated.parent = this.node;
            // }
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
        let used = 0;
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
            // make sure item max count sum equls to total item count
            if (i === items.length - 1) {
                maxCount = this.itemCount - used;
            }

            item.init(node, maxCount);
            used += maxCount;
        }

        this.dirty = true;
    }
}
