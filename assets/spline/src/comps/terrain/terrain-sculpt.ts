import { _decorator, Terrain, CurveRange, clamp, TerrainBlock, Vec2, Vec3 } from "cc";
import SplineUtilRenderer from "../spline-util-renderer";
import { VolumeType } from "../type";
import CurveSample from "../../curve-sample";
import MeshVertex from "../../utils/mesh-processing/mesh-vertex";
import UAnimationCurve from '../../utils/animation-curve';
import { getNodeWorldPostion, getNodeLocalPostion, node2nodePos, node2nodeLength } from "../../editor/utils";
import pool from "../../utils/pool";
import { pointPolygonMinDistXZ } from "../../utils/mathf";
import Spline from "../../spline";
import { ScatterVolume } from "../scatter/scatter-volume";

const { ccclass, property, type } = _decorator;

let tempSample = new CurveSample();
let tempVert = new MeshVertex();

let tempVec2 = new Vec2;
let tempVec3 = new Vec3;

let tempMin = new Vec3;
let tempMax = new Vec3;

@ccclass('TerrainSculpt')
export class TerrainSculpt extends SplineUtilRenderer {

    @type(VolumeType as any)
    _volumeType: VolumeType = VolumeType.Line;
    @type(VolumeType as any)
    get volumeType () {
        return this._volumeType;
    }
    set volumeType (value) {
        this._volumeType = value;
        this.dirty = true;
    }

    @property
    _lineWidth = 2;
    @property
    get lineWidth () {
        return this._lineWidth;
    }
    set lineWidth (value) {
        this._lineWidth = value;
        this.dirty = true;
    }
    @property
    _lineSmoothWidth = 2;
    @property
    get lineSmoothWidth () {
        return this._lineSmoothWidth;
    }
    set lineSmoothWidth (value) {
        this._lineSmoothWidth = value;
        this.dirty = true;
    }
    @type(CurveRange)
    _lineSmootCurve = UAnimationCurve.easeInOut(0, 1, 1, 0);
    @type(CurveRange)
    get lineSmootCurve () {
        return this._lineSmootCurve;
    }
    set lineSmootCurve (value: CurveRange) {
        this._lineSmootCurve = value;
        if (value) {
            value.curve.postWrapMode = 1; // Once
        }

        this.dirty = true;
    }
    @property
    _heightOffset = 0;
    @property
    get heightOffset () {
        return this._heightOffset;
    }
    set heightOffset (value) {
        this._heightOffset = value;
        this.dirty = true;
    }

    @type(ScatterVolume)
    _volumes: ScatterVolume[] = [];
    @type(ScatterVolume)
    get volumes () {
        return this._volumes;
    }
    set volumes (value) {
        this._volumes = value;
        this.dirty = true;
    }


    @type(Terrain)
    _terrain: Terrain = null;
    @type(Terrain)
    get terrain () {
        return this._terrain;
    }
    set terrain (value) {
        this._terrain = value;
        this._originTerrainData = {};
        this.dirty = true;
    }

    protected dirtyWhenSplineMoved = true;


    testBlocks (x: number, y: number, changelist: Array<TerrainBlock>) {
        for (const i of this._terrain.getBlocks()) {
            const rect = i.getRect();

            tempVec2.set(x, y);
            if (!rect.contains(tempVec2)) {
                continue;
            }

            if (!changelist.includes(i)) {
                changelist.push(i);
            }
        }
    }

    @property({
        editorOnly: true
    })
    _originTerrainData: Record<string, [number, Vec3]> = {};
    
    // TODO: Should add a button
    _clearCacheOldTerrainData = false;
    @property
    get clearCacheOldTerrainData () {
        return this._clearCacheOldTerrainData;
    }
    set clearCacheOldTerrainData (value) {
        this._originTerrainData = {};
        this.terrain._asset = this.terrain._asset;
        this._clearCacheOldTerrainData = value;
        this.dirty = true;
    }


    calcVolumeHeight (pos, h) {
        let volumes = this.volumes;
        for (let i = 0; i < volumes.length; i++) {
            if (!volumes[i]) continue;
            if (volumes[i].includePos(pos)) {
                h *= volumes[i].volume;
            }
        }
        return h;
    }

    compute () {
        let splineCurve = this.splineCurve;
        let terrain = this.terrain;
        if (!splineCurve || !terrain) return;

        let changelist = new Array<TerrainBlock>();
        let originTerrainData = this._originTerrainData;
        let sculptPositionMap = {};

        if (this._volumeType === VolumeType.Line) {
            let lineSmoothWidth = this.lineSmoothWidth;
            let lineWidth = this.lineWidth;
            let maxDist = lineWidth + lineSmoothWidth;

            let vertexCount = terrain.vertexCount;
            let smoothCurve = this.lineSmootCurve;
            let tileSize = terrain.tileSize;

            splineCurve.getBounding(tempMin, tempMax);

            tempMin.x -= maxDist;
            tempMin.z -= maxDist;
            tempMax.x += maxDist;
            tempMax.z += maxDist;

            node2nodePos(this.spline.node, this.terrain.node, tempMin, tempMin);
            node2nodePos(this.spline.node, this.terrain.node, tempMax, tempMax);

            let x1 = tempMin.x;
            let y1 = tempMin.z;
            let x2 = tempMax.x;
            let y2 = tempMax.z;

            x1 = Math.floor(x1 / tileSize);
            y1 = Math.floor(y1 / tileSize);
            x2 = Math.floor(x2 / tileSize);
            y2 = Math.floor(y2 / tileSize);

            if (x1 > vertexCount[0] - 1 || x2 < 0) {
                return;
            }
            if (y1 > vertexCount[1] - 1 || y2 < 0) {
                return;
            }

            x1 = clamp(x1, 0, vertexCount[0] - 1);
            y1 = clamp(y1, 0, vertexCount[1] - 1);
            x2 = clamp(x2, 0, vertexCount[0] - 1);
            y2 = clamp(y2, 0, vertexCount[1] - 1);

            let linePoints = splineCurve.getPoints();
            let heightOffset = this.heightOffset;

            for (let j = y1; j <= y2; j++) {
                for (let i = x1; i <= x2; i++) {
                    tempVec3.set(i * tileSize, 0, j * tileSize);
                    node2nodePos(this.terrain.node, this.spline.node, tempVec3, tempVec3);
                    let res = pointPolygonMinDistXZ(tempVec3, linePoints);
                    let dist = res.dist;
                    if (dist > maxDist) continue;

                    let t = clamp((res.index - 1 + res.t) / (linePoints.length - 1), 0, 1) * (this.splineCurve instanceof Spline ? this.spline.curves.length : 1);
                    splineCurve.getSample(t, tempSample);
                    tempVert.position.set(0, 0, dist);
                    tempSample.getBent(tempVert, tempVert);
                    node2nodePos(this.spline.node, this.terrain.node, tempVert.position, tempVert.position);


                    let h = tempVert.position.y;
                    if (dist > lineWidth) {
                        let t = (dist - lineWidth) / lineSmoothWidth;
                        h *= smoothCurve.evaluate(t, 0.5);
                    }
                    getNodeWorldPostion(this.terrain.node, tempVert.position, tempVert.position)
                    h = this.calcVolumeHeight(tempVert.position, h);
                    h += heightOffset;

                    let key = `${i}_${j}`;
                    if (sculptPositionMap[key]) continue;

                    if (!originTerrainData[key]) {
                        let normal = terrain.getNormal(i, j);
                        originTerrainData[key] = [terrain.getHeight(i, j), normal];
                    }

                    sculptPositionMap[key] = true;

                    terrain.setHeight(i, j, h);

                    this.testBlocks(i, j, changelist);
                }
            }
        }
        else {
            
        }

        for (const key in sculptPositionMap) {
            let pos = key.split('_');
            let i = Number(pos[0]);
            let j = Number(pos[1]);
            let n = terrain._calcNormal(i, j);
            terrain._setNormal(i, j, n);
        }

        for (const key in originTerrainData) {
            if (sculptPositionMap[key]) continue;
            let pos = key.split('_');
            let i = Number(pos[0]);
            let j = Number(pos[1]);
            let value = originTerrainData[key];
            terrain.setHeight(i, j, value[0]);
            terrain._setNormal(i, j, value[1]);

            this.testBlocks(i, j, changelist);
            delete originTerrainData[key];
        }

        for (const i of changelist) {
            i._updateHeight();
        }

    }
}
