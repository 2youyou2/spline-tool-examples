import { Vec3, Vec2 } from 'cc'

import SplineNode from './spline-node';
import CurveSample from './curve-sample';

import Event from './utils/event';
import Mathf from './utils/mathf';
import pool from './utils/pool';

const STEP_COUNT = 30;
const T_STEP = 1.0 / STEP_COUNT;

function assertTimeInBounds (time: Number) {
    if (time < 0 || time > 1)
        throw new Error("Time must be between 0 and 1 (was " + time + ").");
}

export default class CubicBezierCurve {
    public n1: SplineNode;
    public n2: SplineNode;

    private samples: CurveSample[] = [];

    public changed: Event = new Event();

    public length: number = 0;

    private _gizmoEditing = false;
    get gizmoEditing () {
        return this._gizmoEditing;
    }
    set gizmoEditing (value) {
        this._gizmoEditing = value;
    }

    constructor (n1: SplineNode, n2: SplineNode) {
        this.n1 = n1;
        this.n2 = n2;
        this.computeSamples = this.computeSamples.bind(this);
        n1.changed.addListener(this.computeSamples);
        n2.changed.addListener(this.computeSamples);
        this.computeSamples();
    }

    /// <summary>
    /// Change the start node of the curve.
    /// </summary>
    /// <param name="n1"></param>
    public connectStart (n1: SplineNode) {
        this.n1.changed.removeListener(this.computeSamples);
        this.n1 = n1;
        n1.changed.addListener(this.computeSamples);
        this.computeSamples();
    }

    /// <summary>
    /// Change the end node of the curve.
    /// </summary>
    /// <param name="n2"></param>
    public connectEnd (n2: SplineNode) {
        this.n2.changed.removeListener(this.computeSamples);
        this.n2 = n2;
        n2.changed.addListener(this.computeSamples);
        this.computeSamples();
    }

    /// <summary>
    /// Convinent method to get the third control point of the curve, as the direction of the end spline node indicates the starting tangent of the next curve.
    /// </summary>
    /// <returns></returns>
    public getInverseDirection (out?: Vec3): Vec3 {
        out = out || new Vec3();
        return out.set(this.n2.position).multiplyScalar(2).subtract(this.n2.direction);
    }

    /// <summary>
    /// Returns point on curve at given time. Time must be between 0 and 1.
    /// </summary>
    /// <param name="t"></param>
    /// <returns></returns>
    private getLocation (t: number, out?: Vec3): Vec3 {
        out = out || new Vec3();

        let omt = 1 - t;
        let omt2 = omt * omt;
        let t2 = t * t;

        let tmpN1Direction = pool.Vec3.get();
        let tmpN2Position = pool.Vec3.get();
        let tmpInverseDirection = pool.Vec3.get();

        out.set(this.n1.position).multiplyScalar(omt2 * omt);
        out.add(tmpN1Direction.set(this.n1.direction).multiplyScalar(3 * omt2 * t));
        out.add(this.getInverseDirection(tmpInverseDirection).multiplyScalar(3 * omt * t2));
        out.add(tmpN2Position.set(this.n2.position).multiplyScalar(t2 * t));

        pool.Vec3.put(tmpN1Direction);
        pool.Vec3.put(tmpN2Position);
        pool.Vec3.put(tmpInverseDirection);

        return out;
    }

    /// <summary>
    /// Returns tangent of curve at given time. Time must be between 0 and 1.
    /// </summary>
    /// <param name="t"></param>
    /// <returns></returns>
    private getTangent (t: number, out?: Vec3): Vec3 {
        out = out || new Vec3();

        let omt = 1 - t;
        let omt2 = omt * omt;
        let t2 = t * t;
        let tangent = new Vec3(this.n1.position).multiplyScalar(-omt2).add(
            new Vec3(this.n1.direction).multiplyScalar(3 * omt2 - 2 * omt)
        ).add(
            this.getInverseDirection().multiplyScalar(-3 * t2 + 2 * t)
        ).add(
            new Vec3(this.n2.position).multiplyScalar(t2)
        )
        return tangent.normalize();
    }

    private getUp (t: number): Vec3 {
        return this.n1.up.clone().lerp(this.n2.up, t);
    }

    private getScale (t: number): Vec2 {
        return this.n1.scale.clone().lerp(this.n2.scale, t);
    }

    private getRoll (t: number): number {
        return Mathf.lerp(this.n1.roll, this.n2.roll, t);
    }

    getSamples (): CurveSample[] {
        return this.samples;
    }

    public computeSamples () {
        let samples = this.samples;
        samples.length = STEP_COUNT + 1;
        this.length = 0;
        let previousPosition = this.getLocation(0);
        for (let i = 0; i <= STEP_COUNT; i++) {
            let t = i * T_STEP;
            let position = this.getLocation(t);
            this.length += Vec3.distance(previousPosition, position);
            previousPosition = position;

            if (!samples[i]) {
                samples[i] = new CurveSample();
            }
            this.updateSample(samples[i], this.length, t);
        }
        // this.length += Vec3.distance(previousPosition, this.getLocation(1));
        // samples.push(this.createSample(this.length, 1));

        this._points.length = 0;

        if (!CC_EDITOR || !this._gizmoEditing) {
            this.changed.invoke();
        }
    }

    private updateSample (sample: CurveSample, distance: number, time: number): CurveSample {
        return sample.set(
            this.getLocation(time),
            this.getTangent(time),
            this.getUp(time),
            this.getScale(time),
            this.getRoll(time),
            distance,
            time
        );
    }

    public getSample (time: number, out?: CurveSample): CurveSample {
        assertTimeInBounds(time);
        let samples = this.samples;
        let previous = samples[0];
        let next = null;
        for (let i = 0; i < samples.length; i++) {
            let cp = samples[i];
            if (cp.timeInCurve >= time) {
                next = cp;
                break;
            }
            previous = cp;
        }
        if (next == null) {
            throw new Error("Can't find curve samples.");
        }
        let t = next == previous ? 0 : (time - previous.timeInCurve) / (next.timeInCurve - previous.timeInCurve);

        return CurveSample.lerp(previous, next, t, out);
    }

    public getSampleAtDistance (d: number, out?: CurveSample): CurveSample {
        if (d < 0 || d > this.length)
            throw new Error("Distance must be positive and less than curve length. Length = " + this.length + ", given distance was " + d);

        if (d === 0) {
            d = 0.001;
        }
        else if (d === this.length) {
            d = this.length - 0.001;
        }

        let samples = this.samples;
        let previous = samples[0];
        let next = null;
        for (let i = 0; i < samples.length; i++) {
            let cp = samples[i];
            if (cp.distanceInCurve >= d) {
                next = cp;
                break;
            }
            previous = cp;
        }
        if (next == null) {
            throw new Error("Can't find curve samples.");
        }
        let t = next == previous ? 0 : (d - previous.distanceInCurve) / (next.distanceInCurve - previous.distanceInCurve);

        return CurveSample.lerp(previous, next, t, out);
    }


    _points: Vec3[] = [];
    getPoints () : Vec3[] {
        if (this._points.length === 0) {
            this._caclBoundingBox();
        }
        return this._points;
    }

    _minPos = new Vec3();
    _maxPos = new Vec3();
    getBounding (min: Vec3, max: Vec3) {
        if (this._points.length === 0) {
            this._caclBoundingBox();
        }
        min.set(this._minPos);
        max.set(this._maxPos);
    }
    private _caclBoundingBox () {
        let points = this._points;

        let min = this._minPos.set(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
        let max = this._maxPos.set(-Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER);

        let samples = this.getSamples();
        for (let i = 0; i < samples.length; i++) {
            let position = points[i] = samples[i].location;

            min.x = Math.min(min.x, position.x);
            min.y = Math.min(min.y, position.y);
            min.z = Math.min(min.z, position.z);

            max.x = Math.max(max.x, position.x);
            max.y = Math.max(max.y, position.y);
            max.z = Math.max(max.z, position.z);
        }
        points.length = samples.length;
    }
}