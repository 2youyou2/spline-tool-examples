import { _decorator, Terrain, CurveRange, clamp, TerrainBlock, Vec2, Vec3 } from "cc";
import SplineUtilRenderer from "../spline-util-renderer";
import { VolumeType } from "../type";
import CurveSample from "../../curve-sample";
import MeshVertex from "../../utils/mesh-processing/mesh-vertex";
import UAnimationCurve from '../../utils/animation-curve';
import { getNodeWorldPostion, getNodeLocalPostion } from "../../editor/utils";
import pool from "../../utils/pool";

const { ccclass, property, type } = _decorator;

let tempSample = new CurveSample();
let tempVert = new MeshVertex();

let tempVec2 = new Vec2;

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
    set lineSmootCurve (value) {
        this._lineSmootCurve = value;
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

            changelist.push(i);
        }
    }

    // @property({
    //     type: Map,
    //     editorOnly: true
    // })
    _originTerrainData: Map<string, [number, Vec3]> = new Map;

    compute () {
        let splineCurve = this.splineCurve;
        let terrain = this.terrain;
        if (!splineCurve || !terrain) return;

        let changelist = new Array<TerrainBlock>();
        let originTerrainData = this._originTerrainData;
        let sculptPositionMap = {};

        if (this._volumeType === VolumeType.Line) {
            let end = splineCurve.length;
            let start = 0;
            let tileSize = terrain.tileSize;
            let vertexCount = terrain.vertexCount;
            let lineSmoothWidth = this.lineSmoothWidth;
            let lineWidth = this.lineWidth;
            let width = lineWidth + lineSmoothWidth;


            for (let d = start; d < end; d += tileSize) {
                splineCurve.getSampleAtDistance(d, tempSample);

                for (let z = -width; z <= width; z += tileSize) {
                    tempVert.position.set(d, 0, z);
                    tempSample.getBent(tempVert, tempVert);

                    getNodeWorldPostion(this.spline.node, tempVert.position, tempVert.position);
                    getNodeLocalPostion(this.terrain.node, tempVert.position, tempVert.position);

                    let x = tempVert.position.x;
                    let y = tempVert.position.z;
                    let h = tempVert.position.y;

                    x /= terrain.info.tileSize;
                    y /= terrain.info.tileSize;

                    x = Math.floor(x);
                    y = Math.floor(y);

                    if (x > vertexCount[0] - 1 || x < 0) {
                        continue;
                    }
                    if (y > vertexCount[1] - 1 || y < 0) {
                        continue;
                    }

                    x = clamp(x, 0, vertexCount[0] - 1);
                    y = clamp(y, 0, vertexCount[1] - 1);

                    let key = `${x}_${y}`;
                    if (!originTerrainData.get(key)) {
                        let normal = terrain.getNormal(x, y);
                        originTerrainData.set(key, [terrain.getHeight(x, y), normal]);
                    }

                    sculptPositionMap[key] = true;

                    terrain.setHeight(x, y, h);

                    let n = terrain._calcNormal(x, y);
                    terrain._setNormal(x, y, n);

                    this.testBlocks(x, y, changelist);
                }
            }
        }
        else {

        }

        for (const i of originTerrainData) {
            let key = i[0];
            if (sculptPositionMap[key]) continue;
            let pos = key.split('_');
            let x = Number(pos[0]);
            let y = Number(pos[1]);
            let value = i[1];
            terrain.setHeight(x, y, value[0]);
            terrain._setNormal(x, y, value[1]);

            originTerrainData.delete(key);
        }
        
        for (const i of changelist) {
            i._updateHeight();
        }

    }
}
