import { Component, Mesh, GFXAttributeName, Vec2, ModelComponent, _decorator, Enum, Vec3 } from 'cc';
import Spline from '../../spline';
import CubicBezierCurve from '../../cubic-bezier-curve';
import CurveSample from '../../curve-sample';
import MeshVertex from './mesh-vertex';
import SourceMesh from './source-mesh';
import MeshUtility from './mesh-utility';

const { ccclass, executeInEditMode } = _decorator;


/// <summary>
/// The mode used by <see cref="MeshBender"/> to bend meshes on the interval.
/// </summary>
export enum FillingMode {
    /// <summary>
    /// In this mode, source mesh will be placed on the interval by preserving mesh scale.
    /// Vertices that are beyond interval end will be placed on the interval end.
    /// </summary>
    Once,
    /// <summary>
    /// In this mode, the mesh will be repeated to fill the interval, preserving
    /// mesh scale.
    /// This filling process will stop when the remaining space is not enough to
    /// place a whole mesh, leading to an empty interval.
    /// </summary>
    Repeat,
    /// <summary>
    /// In this mode, the mesh is deformed along the X axis to fill exactly the interval.
    /// </summary>
    StretchToInterval
}

Enum(FillingMode)


@ccclass
@executeInEditMode
export default class MeshBender extends Component {
    private isDirty = false;
    private result: Mesh;
    private useSpline: boolean;
    private spline: Spline;
    private intervalStart
    private intervalEnd;
    private curve: CubicBezierCurve;
    private _sampleCache: Map<string, CurveSample> = new Map();

    private _source: SourceMesh;
    /// <summary>
    /// The source mesh to bend.
    /// </summary>
    get source () { return this._source; }
    set source (value) {
        if (value == this._source) return;
        this.setDirty();
        this._source = value;
    }

    private _mode: FillingMode = FillingMode.StretchToInterval;
    /// <summary>
    /// The scaling mode along the spline
    /// </summary>
    get mode () { return this._mode; }
    set mode (value) {
        if (value == this._mode) return;
        this.setDirty();
        this._mode = value;
    }

    _offset = 0;
    get offset () {
        return this._offset;
    }
    set offset (value) {
        this._offset = value;
        this.setDirty();
    }

    constructor () {
        super();
        this.setDirty = this.setDirty.bind(this);
    }

    /// <summary>
    /// Sets a curve along which the mesh will be bent.
    /// The mesh will be updated if the curve changes.
    /// </summary>
    /// <param name="curve">The <see cref="CubicBezierCurve"/> to bend the source mesh along.</param>
    public setInterval (curve: CubicBezierCurve) {
        if (this.curve == curve) return;
        if (curve == null) throw new Error("curve");
        if (this.curve != null) {
            this.curve.changed.removeListener(this.setDirty);
        }
        this.curve = curve;
        this.spline = null;
        curve.changed.addListener(this.setDirty);
        this.useSpline = false;
        this.setDirty();
    }

    /// <summary>
    /// Sets a spline's interval along which the mesh will be bent.
    /// If interval end is absent or set to 0, the interval goes from start to spline length.
    /// The mesh will be update if any of the curve changes on the spline, including curves
    /// outside the given interval.
    /// </summary>
    /// <param name="spline">The <see cref="SplineMesh"/> to bend the source mesh along.</param>
    /// <param name="intervalStart">Distance from the spline start to place the mesh minimum X.<param>
    /// <param name="intervalEnd">Distance from the spline start to stop deforming the source mesh.</param>
    public setInterval1 (spline: Spline, intervalStart: number, intervalEnd = 0) {
        if (this.spline == spline && this.intervalStart == intervalStart && this.intervalEnd == intervalEnd) return;
        if (spline == null) throw new Error("spline");
        if (intervalStart < 0 || intervalStart >= spline.length) {
            throw new Error("interval start must be 0 or greater and lesser than spline length (was " + intervalStart + ")");
        }
        if (intervalEnd != 0 && intervalEnd <= intervalStart || intervalEnd > spline.length) {
            throw new Error("interval end must be 0 or greater than interval start, and lesser than spline length (was " + intervalEnd + ")");
        }
        if (this.spline != null) {
            // unlistening previous spline
            this.spline.curveChanged.removeListener(this.setDirty);
        }
        this.spline = spline;
        // listening new spline
        spline.curveChanged.addListener(this.setDirty);

        this.curve = null;
        this.intervalStart = intervalStart;
        this.intervalEnd = intervalEnd;
        this.useSpline = true;
        this.setDirty();
    }

    public onEnable () {
        // if (GetComponent<MeshFilter>().sharedMesh != null) {
        //     result = GetComponent<MeshFilter>().sharedMesh;
        // } else {
        //     GetComponent<MeshFilter>().sharedMesh = result = new Mesh();
        //     result.name = "Generated by " + GetType().Name;
        // }
    }

    public update () {
        this.computeIfNeeded();
    }

    public computeIfNeeded () {
        if (this.isDirty) {
            this.compute();
        }
    }

    private setDirty () {
        this.isDirty = true;
    }

    /// <summary>
    /// Bend the mesh. This method may take time and should not be called more than necessary.
    /// Consider using <see cref="ComputeIfNeeded"/> for faster result.
    /// </summary>
    private compute () {
        this.isDirty = false;
        switch (this.mode) {
            case FillingMode.Once:
                this.fillOnce();
                break;
            case FillingMode.Repeat:
                this.fillRepeat();
                break;
            case FillingMode.StretchToInterval:
                this.fillStretch();
                break;
        }
    }

    public onDestroy () {
        if (this.curve != null) {
            this.curve.changed.removeListener(this.compute);
        }
    }

    private fillOnce () {
        let sampleCache = this._sampleCache;

        let source = this.source;
        let bentVertices: MeshVertex[] = [];
        let offset = this.offset;
        // for each mesh vertex, we found its projection on the curve
        for (let j = 0; j < source.vertices.length; j++) {
            let vert = source.vertices[j];
            let distance = vert.position.x - source.minX + offset;
            let cacheKey = '' + distance;
            let sample: CurveSample = sampleCache.get(cacheKey);
            if (!sample) {
                if (!this.useSpline) {
                    if (distance > this.curve.length) continue;
                    sample = this.curve.getSampleAtDistance(distance, CurveSample.pool.get());
                } else {
                    let distOnSpline = this.intervalStart + distance;
                    //if (true) { //spline.isLoop) {
                    while (distOnSpline > this.spline.length) {
                        distOnSpline -= this.spline.length;
                    }
                    //} else if (distOnSpline > spline.Length) {
                    //    continue;
                    //}
                    sample = this.spline.getSampleAtDistance(distOnSpline);
                }
                sampleCache.set(cacheKey, sample);
            }

            bentVertices.push(sample.getBent(vert, MeshVertex.pool.get()));
        }

        MeshUtility.updateOrCreateModelMesh(this.getComponent(ModelComponent), {
            positions: bentVertices.map(b => b.position),
            normals: bentVertices.map(b => b.normal),
            tangents: bentVertices.map(b => b.tangent),
            uvs: bentVertices.map(b => b.uv),
            indices: source.triangles
        });

        for (let i = 0; i < bentVertices.length; i++) {
            MeshVertex.pool.put(bentVertices[i]);
        }
        for (const iter of sampleCache) {
            CurveSample.pool.put(iter[1]);
        }
        sampleCache.clear();
    }

    private fillRepeat () {
        let source = this.source;
        let intervalLength = this.useSpline ?
            (this.intervalEnd == 0 ? this.spline.length : this.intervalEnd) - this.intervalStart :
            this.curve.length;
        let repetitionCount = Math.floor(intervalLength / source.length);
        let sampleCache = this._sampleCache;
        
        let sourceVertices = source.vertices;

        // building triangles and UVs for the repeated mesh
        let triangles: number[] = [];
        for (let i = 0; i < repetitionCount+1; i++) {
            for (let j = 0; j < source.triangles.length; j++) {
                triangles.push(source.triangles[j] + sourceVertices.length * i);
            }
        }

        // computing vertices and normals
        let bentVertices: MeshVertex[] = [];
        let offset = this.offset;
        for (let i = 0; i < repetitionCount; i++) {
            // for each mesh vertex, we found its projection on the curve
            for (let j = 0; j < sourceVertices.length; j++) {
                let vert = sourceVertices[j];
                let distance = vert.position.x - source.minX + offset;
                let cacheKey = `${i}_${distance}`;
                let sample: CurveSample = sampleCache.get(cacheKey);
                if (!sample) {
                    if (!this.useSpline) {
                        if (distance > this.curve.length) continue;
                        sample = this.curve.getSampleAtDistance(distance, CurveSample.pool.get());
                    } else {
                        let distOnSpline = this.intervalStart + distance;
                        //if (true) { //spline.isLoop) {
                        while (distOnSpline > this.spline.length) {
                            distOnSpline -= this.spline.length;
                        }
                        //} else if (distOnSpline > spline.Length) {
                        //    continue;
                        //}
                        sample = this.spline.getSampleAtDistance(distOnSpline);
                    }
                    sampleCache.set(cacheKey, sample);
                }

                bentVertices.push(sample.getBent(vert, MeshVertex.pool.get()));
            }
            offset += source.length;
        }

        // fill remaining length
        let remainingLength = this.spline.length - offset;
        for (let i = 0; i < sourceVertices.length; i++) {
            let vert = sourceVertices[i];
            let distanceRate = source.length == 0 ? 0 : Math.abs(vert.position.x - source.minX) / source.length;
            let distance = offset + distanceRate * remainingLength;
            let cacheKey = '' + distance;
            let sample: CurveSample = sampleCache.get(cacheKey);
            if (!sample) {
                if (!this.useSpline) {
                    if (distance > this.curve.length) continue;
                    sample = this.curve.getSampleAtDistance(distance, CurveSample.pool.get());
                } else {
                    let distOnSpline = this.intervalStart + distance;
                    //if (true) { //spline.isLoop) {
                    while (distOnSpline > this.spline.length) {
                        distOnSpline -= this.spline.length;
                    }
                    //} else if (distOnSpline > spline.Length) {
                    //    continue;
                    //}
                    sample = this.spline.getSampleAtDistance(distOnSpline);
                }
                sampleCache.set(cacheKey, sample);
            }

            bentVertices.push(sample.getBent(vert, MeshVertex.pool.get()));
        }

        MeshUtility.updateOrCreateModelMesh(this.getComponent(ModelComponent), {
            positions: bentVertices.map(b => b.position),
            normals: bentVertices.map(b => b.normal),
            tangents: bentVertices.map(b => b.tangent),
            uvs: bentVertices.map(b => b.uv),
            indices: triangles
        });

        for (let i = 0; i < bentVertices.length; i++) {
            MeshVertex.pool.put(bentVertices[i]);
        }
        for (const iter of sampleCache) {
            CurveSample.pool.put(iter[1]);
        }
        sampleCache.clear();
    }

    private fillStretch () {
        let bentVertices: MeshVertex[] = [];
        let source = this.source;
        let sampleCache = this._sampleCache;
        // for each mesh vertex, we found its projection on the curve
        for (let i = 0; i < source.vertices.length; i++) {
            let vert = source.vertices[i];
            let distanceRate = source.length == 0 ? 0 : Math.abs(vert.position.x - source.minX) / source.length;
            let cacheKey = '' + distanceRate;
            let sample: CurveSample = sampleCache.get(cacheKey);
            if (!sample) {
                if (!this.useSpline) {
                    sample = this.curve.getSampleAtDistance(this.curve.length * distanceRate, CurveSample.pool.get());
                } else {
                    let intervalLength = this.intervalEnd == 0 ? this.spline.length - this.intervalStart : this.intervalEnd - this.intervalStart;
                    let distOnSpline = this.intervalStart + intervalLength * distanceRate;
                    if (distOnSpline > this.spline.length) {
                        distOnSpline = this.spline.length;
                        cc.log("dist " + distOnSpline + " spline length " + this.spline.length + " start " + this.intervalStart);
                    }

                    sample = this.spline.getSampleAtDistance(distOnSpline);
                }
                sampleCache.set(cacheKey, sample);
            }

            bentVertices.push(sample.getBent(vert, MeshVertex.pool.get()));
        }

        MeshUtility.updateOrCreateModelMesh(this.getComponent(ModelComponent), {
            positions: bentVertices.map(b => b.position),
            normals: bentVertices.map(b => b.normal),
            tangents: bentVertices.map(b => b.tangent),
            uvs: bentVertices.map(b => b.uv),
            indices: source.triangles
        });

        for (let i = 0; i < bentVertices.length; i++) {
            MeshVertex.pool.put(bentVertices[i]);
        }
        for (const iter of sampleCache) {
            CurveSample.pool.put(iter[1]);
        }
        sampleCache.clear();
    }
}
