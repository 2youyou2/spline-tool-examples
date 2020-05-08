import { Vec3, Vec2 } from 'cc'

import SplineNode from './spline-node';
import CurveSample from './curve-sample';

import Event from './utils/event';
import Mathf from './utils/mathf';

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
    public getInverseDirection (): Vec3 {
        return new Vec3(this.n2.position).multiplyScalar(2).subtract(this.n2.direction);
    }

    /// <summary>
    /// Returns point on curve at given time. Time must be between 0 and 1.
    /// </summary>
    /// <param name="t"></param>
    /// <returns></returns>
    private getLocation (t: number): Vec3 {
        let omt = 1 - t;
        let omt2 = omt * omt;
        let t2 = t * t;

        // return n1.Position * (omt2 * omt) +
        //         n1.Direction * (3f * omt2 * t) +
        //         GetInverseDirection() * (3f * omt * t2) +
        //         n2.Position * (t2 * t);

        return new Vec3(this.n1.position).multiplyScalar(omt2 * omt).add(
            new Vec3(this.n1.direction).multiplyScalar(3 * omt2 * t)
        ).add(
            this.getInverseDirection().multiplyScalar(3 * omt * t2)
        ).add(
            new Vec3(this.n2.position).multiplyScalar(t2 * t)
        );
    }

    /// <summary>
    /// Returns tangent of curve at given time. Time must be between 0 and 1.
    /// </summary>
    /// <param name="t"></param>
    /// <returns></returns>
    private getTangent (t: number): Vec3 {
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
        samples.length = 0;
        this.length = 0;
        let previousPosition = this.getLocation(0);
        for (let t = 0; t < 1; t += T_STEP) {
            let position = this.getLocation(t);
            this.length += Vec3.distance(previousPosition, position);
            previousPosition = position;
            samples.push(this.createSample(this.length, t));
        }
        this.length += Vec3.distance(previousPosition, this.getLocation(1));
        samples.push(this.createSample(this.length, 1));

        this.changed.invoke();
    }

    private createSample (distance: number, time: number): CurveSample {
        return new CurveSample(
            this.getLocation(time),
            this.getTangent(time),
            this.getUp(time),
            this.getScale(time),
            this.getRoll(time),
            distance,
            time);
    }

    public getSample (time: number): CurveSample {
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

        return CurveSample.Lerp(previous, next, t);
    }

    public getSampleAtDistance (d: number): CurveSample {
        if (d < 0 || d > this.length)
            throw new Error("Distance must be positive and less than curve length. Length = " + this.length + ", given distance was " + d);

        if (d === 0) {
            d = 0.01;
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

        return CurveSample.Lerp(previous, next, t);
    }


}