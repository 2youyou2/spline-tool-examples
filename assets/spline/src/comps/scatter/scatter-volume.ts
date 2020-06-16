
import { _decorator, Vec3, } from 'cc';
import SplineUtilBase from '../spline-util-base';
import { pointInPolygonAreaXZ, pointInPolygonLineXZ, pointPolygonMinDistXZ } from '../../utils/mathf';
import Event from '../../utils/event';
import { VolumeType } from '../type';
const { ccclass, property, type, executeInEditMode } = _decorator;

let tempPos = new Vec3;


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
    @type(VolumeType as any)
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

    @property
    _includeCap = true;
    @property
    get includeCap () {
        return this._includeCap;
    }
    set includeCap (value) {
        this._includeCap = value;
        this.volumeChanged.invoke();
    }

    volumeChanged: Event = new Event;

    includePos (pos: Vec3) {
        Vec3.subtract(tempPos, pos, this.spline.node.getWorldPosition(tempPos));
        if (this._type === VolumeType.Area) {
            return pointInPolygonAreaXZ(tempPos, this.splineCurve.getPoints());
        }
        else if (this._type === VolumeType.Line) {
            let points = this.splineCurve.getPoints();
            let res = pointPolygonMinDistXZ(tempPos, points);
            if (res.dist > this._lineWidth) {
                return false;
            }
            if (res.index === 1 || res.index === points.length - 1) {
                const EPSILON = 0.5;
                return res.t >= -EPSILON && res.t <= 1 + EPSILON;
            }
            return true;
        }
        return false;
    }

    onEnable () {
        this.spline.curveChanged.addListener(this.onCurveChanged, this);
    }
    onDisable () {
        this.spline.curveChanged.removeListener(this.onCurveChanged, this);
    }

    onCurveChanged () {
        this.volumeChanged.invoke();
    }
}
