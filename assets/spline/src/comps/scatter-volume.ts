
import { _decorator, Component, Node, Vec3, Mat4, cclegacy, Enum } from 'cc';
import SplineUtilBase from './spline-util-base';
import { pointInPolygonAreaXZ, pointInPolygonLineXZ } from '../utils/mathf';
import Event from '../utils/event';
const { ccclass, property, type, executeInEditMode } = _decorator;

let tempPos = new Vec3;

enum VolumeType {
    Area,
    Line,
}
Enum(VolumeType);

@ccclass('ScatterVolume')
@executeInEditMode
export class ScatterVolume extends SplineUtilBase {
    @property
    _volume = 0.5
    @property
    get volume () {
        return this._volume;
    }
    set volume (value) {
        if (this._volume === value) return;
        this._volume = value;
        this.volumeChanged.invoke();
    }

    @property
    _type = VolumeType.Area;
    get type () {
        return this._type;
    }
    @type(VolumeType)
    set type (value) {
        if (this._type === value) return;
        this._type = value;
        this.volumeChanged.invoke();
    }

    @property
    _lineWidth = 1;
    @property
    get lineWidth () {
        return this._lineWidth;
    }
    set lineWidth (value) {
        if (this._lineWidth === value) return;
        this._lineWidth = value;
        this.volumeChanged.invoke();
    }
    
    volumeChanged: Event = new Event;

    includePos (pos: Vec3) {
        Vec3.subtract(tempPos, pos, this.spline.node.getWorldPosition(tempPos));
        if (this._type === VolumeType.Area) {
            return pointInPolygonAreaXZ(tempPos, this.spline.getPoints());
        }
        else if (this._type === VolumeType.Line) {
            return pointInPolygonLineXZ(tempPos, this.spline.getPoints(), this._lineWidth);
        }
        return false;
    }

    onEnable () {
        this.spline.curveChanged.addListener(this._onSplineChanged, this);
    }
    onDisable () {
        this.spline.curveChanged.removeListener(this._onSplineChanged, this);
    }

    _onSplineChanged () {
        this.volumeChanged.invoke();
    }
}
