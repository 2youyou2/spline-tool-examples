import { Vec3, Vec2, Quat, ToneMapFlow } from 'cc';

import mathf from './utils/mathf';
import MeshVertex from './utils/mesh-processing/mesh-vertex';
import pool, { Pool } from './utils/pool';

const front = cc.v3(0, 0, 1);
const RAD = Math.PI / 180;

const RESET_QUAT = Quat.fromEuler(new Quat, 0, -90, 0);

export default class CurveSample {
    private static _pool: Pool<CurveSample>;
    static get pool () {
        if (!this._pool) {
            this._pool = new Pool(CurveSample);
        }
        return this._pool;
    }

    public location: Vec3 = new Vec3;
    public tangent: Vec3 = new Vec3;
    public up: Vec3 = new Vec3;
    public scale: Vec2 = new Vec2;
    public roll: number;
    public distanceInCurve: number;
    public timeInCurve: number;

    private _transformedUp: Vec3;
    get transformedUp () {
        if (!this._transformedUp) {
            let axisQuat = pool.Quat.get();
            let upVector = pool.Vec3.get();

            Quat.fromAxisAngle(axisQuat, front, this.roll * RAD);
            Vec3.transformQuat(upVector, this.up, axisQuat);
            this._transformedUp = Vec3.cross(new Vec3(), this.tangent, Vec3.cross(upVector, upVector, this.tangent).normalize());

            pool.Quat.put(axisQuat);
            pool.Vec3.put(upVector);
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

    private _bentRotation: Quat;
    get bentRotation () {
        if (!this._bentRotation) {
            let tangent = pool.Vec3.get();
            let upVector = pool.Vec3.get();

            tangent.set(this.tangent);
            upVector.set(this.up);

            // tangent is the same with up
            // excursion tangent a little
            if (Math.abs(Vec3.dot(tangent, this.up) - 1) < 0.01) {
                tangent.x += 0.01;
                tangent.normalize();
            }

            Vec3.cross(upVector, tangent, upVector).normalize();
            Vec3.cross(upVector, upVector, tangent);

            let rotation = new Quat();
            Quat.fromViewUp(rotation, tangent, upVector)

            this._bentRotation = Quat.multiply(rotation, rotation, RESET_QUAT);

            pool.Vec3.put(tangent);
            pool.Vec3.put(upVector);
        }

        return this._bentRotation;
    }

    public static create (location: Vec3, tangent: Vec3, up: Vec3, scale: Vec2, roll: number, distanceInCurve: number, timeInCurve: number): CurveSample {
        return new CurveSample().set(location, tangent, up, scale, roll, distanceInCurve, timeInCurve);
    }

    public set (location: Vec3, tangent: Vec3, up: Vec3, scale: Vec2, roll: number, distanceInCurve: number, timeInCurve: number): CurveSample {
        this.location.set(location);
        this.tangent.set(tangent);
        this.up.set(up);
        this.scale.set(scale);
        this.roll = roll;
        this.distanceInCurve = distanceInCurve;
        this.timeInCurve = timeInCurve;

        if (this._transformedUp) {
            pool.Vec3.put(this._transformedUp);
            this._transformedUp = null;
        }

        if (this._rotation) {
            pool.Quat.put(this._rotation);
            this._rotation = null;
        }

        if (this._bentRotation) {
            pool.Quat.put(this._bentRotation);
            this._bentRotation = null;
        }

        return this;
    }


    /// <summary>
    /// Linearly interpolates between two curve samples.
    /// </summary>
    /// <param name="a"></param>
    /// <param name="b"></param>
    /// <param name="t"></param>
    /// <returns></returns>
    public static lerp (a: CurveSample, b: CurveSample, t: number, out?: CurveSample): CurveSample {
        let tmp_location = pool.Vec3.get();
        let tmp_tangent = pool.Vec3.get();
        let tmp_up = pool.Vec3.get();
        let tmp_scale = pool.Vec2.get();

        out = out || new CurveSample();
        out.set(
            Vec3.lerp(tmp_location, a.location, b.location, t),
            Vec3.lerp(tmp_tangent, a.tangent, b.tangent, t).normalize(),
            Vec3.lerp(tmp_up, a.up, b.up, t),
            Vec2.lerp(tmp_scale, a.scale, b.scale, t),
            mathf.lerp(a.roll, b.roll, t),
            mathf.lerp(a.distanceInCurve, b.distanceInCurve, t),
            mathf.lerp(a.timeInCurve, b.timeInCurve, t)
        )

        pool.Vec3.put(tmp_location)
        pool.Vec3.put(tmp_tangent)
        pool.Vec3.put(tmp_up)
        pool.Vec2.put(tmp_scale);

        return out;
    }

    public getBent (vert: MeshVertex, out?: MeshVertex): MeshVertex {
        if (!out) {
            out = MeshVertex.create(vert.position, vert.normal, vert.uv, vert.tangent);
        }
        else if (out !== vert) {
            out.set(vert);
        }

        // application of scale
        let tempVec3 = pool.Vec3.get();
        Vec3.multiply(out.position, out.position, tempVec3.set(0, this.scale.y, this.scale.x));
        pool.Vec3.put(tempVec3);

        // application of roll
        let q = pool.Quat.get();
        Quat.fromAxisAngle(q, Vec3.RIGHT, this.roll * RAD);

        Vec3.transformQuat(out.position, out.position, q);
        Vec3.transformQuat(out.normal, out.normal, q);
        Vec3.transformQuat(out.tangent, out.tangent, q);

        pool.Quat.put(q);

        // reset X value
        out.position.x = 0;

        // application of the rotation + location
        q = this.bentRotation;

        Vec3.transformQuat(out.position, out.position, q);
        out.position.add(this.location);

        Vec3.transformQuat(out.normal, out.normal, q);
        Vec3.transformQuat(out.tangent, out.tangent, q);

        return out;
    }
};
