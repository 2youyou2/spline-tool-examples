import { Vec3, Vec2, Quat, ToneMapFlow } from 'cc';

import mathf from './utils/mathf';
import MeshVertex from './utils/mesh-processing/mesh-vertex';

const rotation_identity = cc.quat();
const front = cc.v3(0,0,1);

const RAD = Math.PI / 180;

export default class CurveSample {
    public location: Vec3;
    public tangent: Vec3;
    public up: Vec3;
    public scale: Vec2;
    public roll: number;
    public distanceInCurve: number;
    public timeInCurve: number;

    private _transformedUp: Vec3;
    get transformedUp () {
        if (!this._transformedUp) {
            let axisQuat = Quat.fromAxisAngle(cc.quat(), front, this.roll * RAD);
            let upVector = Vec3.transformQuat(cc.v3(), this.up, axisQuat);
            this._transformedUp = Vec3.cross(cc.v3(), this.tangent, Vec3.cross(cc.v3(), upVector, this.tangent).normalize());
        }
        return this._transformedUp;
    }


    /// <summary>
    /// Rotation is a look-at quaternion calculated from the tangent, roll and up vector. Mixing non zero roll and custom up vector is not advised.
    /// </summary>
    private _rotation: Quat;
    get rotation () {
        if (!this._rotation) {
            this._rotation = Quat.fromViewUp(new Quat(), this.tangent, this.transformedUp);
        }
        return this._rotation;
    }

    public constructor(location: Vec3, tangent: Vec3, up: Vec3, scale: Vec2, roll: number, distanceInCurve: number, timeInCurve: number) {
        this.location = location;
        this.tangent = tangent;
        this.up = up;
        this.roll = roll;
        this.scale = scale;
        this.distanceInCurve = distanceInCurve;
        this.timeInCurve = timeInCurve;
    }

    /// <summary>
    /// Linearly interpolates between two curve samples.
    /// </summary>
    /// <param name="a"></param>
    /// <param name="b"></param>
    /// <param name="t"></param>
    /// <returns></returns>
    public static Lerp(a: CurveSample, b: CurveSample, t: number) : CurveSample{
        return new CurveSample(
            Vec3.lerp(cc.v3(), a.location, b.location, t),
            Vec3.lerp(cc.v3(), a.tangent, b.tangent, t).normalize(),
            Vec3.lerp(cc.v3(), a.up, b.up, t),
            Vec2.lerp(cc.v3(), a.scale, b.scale, t),
            mathf.lerp(a.roll, b.roll, t),
            mathf.lerp(a.distanceInCurve, b.distanceInCurve, t),
            mathf.lerp(a.timeInCurve, b.timeInCurve, t));
    }

    public getBent(vert: MeshVertex): MeshVertex {
        var res = MeshVertex.create(vert.position, vert.normal, vert.uv);

        // application of scale
        Vec3.multiply(res.position, res.position, new Vec3(0, this.scale.y, this.scale.x));

        // application of roll
        let q = Quat.fromAxisAngle(cc.quat(), Vec3.RIGHT, this.roll * RAD);
        
        Vec3.transformQuat(res.position, res.position, q);
        Vec3.transformQuat(res.normal, res.normal, q);

        // reset X value
        res.position.x = 0;

        // application of the rotation + location
        q = Quat.fromEuler(cc.quat(), 0, -90, 0);

        let axisQuat = Quat.fromAxisAngle(cc.quat(), front, 0);
        let upVector = Vec3.transformQuat(cc.v3(), this.up, axisQuat);
        upVector = Vec3.cross(cc.v3(), this.tangent, Vec3.cross(cc.v3(), upVector, this.tangent).normalize());
        let rotation = Quat.fromViewUp(new Quat(), this.tangent, upVector)

        Quat.multiply(q, rotation, q);
        
        Vec3.transformQuat(res.position, res.position, q);

        res.position.add(this.location);
        Vec3.transformQuat(res.normal, res.normal, q);

        return res;
    }
};
