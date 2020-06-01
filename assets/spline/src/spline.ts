import { Component, Node, _decorator, Vec3, find } from 'cc';

import SplineNode from './spline-node';
import CubicBezierCurve from './cubic-bezier-curve';
import CurveSample from './curve-sample';

import Event from './utils/event';

const { ccclass, type, boolean, integer, float, executeInEditMode } = _decorator;

enum ListChangeType {
    Add,
    Insert,
    Remove,
    clear,
}
interface ListChangedEventArgs {
    type: ListChangeType;
    newItems?: SplineNode[];
    removedItems?: SplineNode[];
    insertIndex?: Number;
    removeIndex?: Number;
}

const SplineRootNodeName = '__spline_node_root__';

/// <summary>
/// A curved line made of oriented nodes.
/// Each segment is a cubic Bézier curve connected to spline nodes.
/// It provides methods to get positions and tangent along the spline, specifying a distance or a ratio, plus the curve length.
/// The spline and the nodes raise events each time something is changed.
/// </summary>
@ccclass
@executeInEditMode
export default class Spline extends Component {
    currentSelection: SplineNode = null;

    @boolean
    public get addSplineNodeAtLast () {
        return false;
    }
    public set addSplineNodeAtLast (v) {
        if (!v) return;

        let index = this.nodes.length - 1;
        let lastNode = this.nodes[index];
        let sample = this.getSample(index);
        let offset = sample.tangent.clone().multiplyScalar(this.length / this.nodes.length / 2);
        this.addNode(offset.add(lastNode.position), lastNode.direction);
    }

    @boolean
    get addSplineNodeAfterSelection () {
        return false;
    }
    set addSplineNodeAfterSelection (v) {
        if (!v) return;
        if (!this.currentSelection) {
            cc.warn('No SpineNode selected.');
            return;
        }

        let index = this.nodes.indexOf(this.currentSelection);
        if (index === -1) return;
        let sample = this.getSample(index);
        let offset = sample.tangent.clone().multiplyScalar(this.length / this.nodes.length / 2);
        this.insertNode(offset.add(this.currentSelection.position), this.currentSelection.direction, index + 1);
    }

    @boolean
    get deleteSelectSplineNode () {
        return false;
    }
    set deleteSelectSplineNode (v) {
        if (!this.currentSelection) {
            cc.warn('No SpineNode selected.');
            return;
        }

        let index = this.nodes.indexOf(this.currentSelection);
        if (index === -1) return;
        this.removeNode(index);
    }

    /// <summary>
    /// The spline nodes.
    /// Warning, this collection shouldn't be changed manualy. Use specific methods to add and remove nodes.
    /// It is public only for the user to enter exact values of position and direction in the inspector (and serialization purposes).
    /// </summary>
    @type([SplineNode])
    public _nodes: SplineNode[] = [];

    @type([SplineNode])
    public get nodes () {
        return this._nodes;
    }

    /// <summary>
    /// The generated curves. Should not be changed in any way, use nodes instead.
    /// </summary>
    public curves: CubicBezierCurve[] = [];

    /// <summary>
    /// The spline length in world units.
    /// </summary>
    public length = 0;

    private _isLoop = false;
    @boolean
    public get isLoop () { return this._isLoop; }
    public set isLoop (v) {
        this._isLoop = v;
        this.updateLoopBinding();
    }

    public nodeListChanged: Event = new Event;
    public curveChanged: Event = new Event;

    onLoad () {
        this._updateNodes();
    }

    onEnable () {}
    onDisable () {}

    addNode (pos: Vec3, direction: Vec3) {
        let node = new Node('SplineNode');
        let splineNode = node.addComponent(SplineNode);
        splineNode.position = pos;
        splineNode.direction = direction;

        node.parent = this._nodeRoot;
        this._nodes.push(splineNode);

        if (!this._updatingNodes) {
            this.nodeListChanged.invoke();
            this._createCurves();
        }
        return splineNode;
    }

    insertNode (pos: Vec3, direction: Vec3, index: number) {
        let node = new Node('SplineNode');
        let splineNode = node.addComponent(SplineNode);
        splineNode.position = pos;
        splineNode.direction = direction;

        this._nodeRoot.insertChild(node, index);
        this._nodes.splice(index, 0, splineNode);
        
        if (!this._updatingNodes) {
            this.nodeListChanged.invoke();
            this._createCurves();
        }

        return splineNode;
    }

    removeNode (index: number) {
        let splineNode = this._nodes[index];
        this._nodeRoot.removeChild(splineNode.node);
        this._nodes.splice(index, 1);

        if (!this._updatingNodes) {
            this.nodeListChanged.invoke();
            this._createCurves();
        }

        return splineNode;
    }

    _nodeRoot: Node;
    _updatingNodes = false;
    private _updateNodes () {
        this._updatingNodes = true;

        let nodeRoot = this._nodeRoot = find(SplineRootNodeName, this.node);
        if (!nodeRoot) {
            nodeRoot = this._nodeRoot = new Node(SplineRootNodeName);
            this.addNode(cc.v3(5, 0, 0), cc.v3(5, 0, -3));
            this.addNode(cc.v3(10, 0, 0), cc.v3(10, 0, 3));
            nodeRoot.parent = this.node;
        }
        else {
            this._nodes = nodeRoot.getComponentsInChildren(SplineNode);
        }
        
        this._createCurves();
        this.nodeListChanged.invoke();
    
        this._updatingNodes = false;
    }

    private _createCurves () {
        this.curves.length = 0;
        for (let i = 0; i < this.nodes.length - 1; i++) {
            let n: SplineNode = this.nodes[i];
            let next: SplineNode = this.nodes[i + 1];

            let curve: CubicBezierCurve = new CubicBezierCurve(n, next);
            curve.changed.addListener(this.updateAfterCurveChanged, this);
            this.curves.push(curve);
        }
        this.nodeListChanged.invoke();
        this.updateAfterCurveChanged();
    }

    public getCurves (): CubicBezierCurve[] {
        return this.curves;
    }

    private updateAfterCurveChanged () {
        this.length = 0;
        for (let i = 0; i < this.curves.length; i++) {
            let curve = this.curves[i];
            this.length += curve.length;
        }
        this.curveChanged.invoke();
        this._points.length = 0;
    }

    /// <summary>
    /// Returns an interpolated sample of the spline, containing all curve data at this time.
    /// Time must be between 0 and the number of nodes.
    /// </summary>
    public getSample (t: number, out?: CurveSample): CurveSample {
        let index = this.getNodeIndexForTime(t);
        return this.curves[index].getSample(t - index, out);
    }

    /// <summary>
    /// Returns the curve at the given time.
    /// Time must be between 0 and the number of nodes.
    /// </summary>
    /// <param name="t"></param>
    /// <returns></returns>
    public getCurve (t: number): CubicBezierCurve {
        return this.curves[this.getNodeIndexForTime(t)];
    }

    private getNodeIndexForTime (t: number): number {
        if (t < 0 || t > this.nodes.length - 1) {
            throw new Error(`Time must be between 0 and last node index (${this.nodes.length - 1}). Given time was {${t}}.`);
        }
        let res = Math.floor(t);
        if (res == this.nodes.length - 1)
            res--;
        return res;
    }

    /// <summary>
    /// Returns an interpolated sample of the spline, containing all curve data at this distance.
    /// Distance must be between 0 and the spline length.
    /// </summary>
    /// <param name="d"></param>
    /// <returns></returns>
    public getSampleAtDistance (d: number, out?: CurveSample): CurveSample {
        if (d < 0 || d > this.length)
            throw new Error(`Distance must be between 0 and spline length (${this.length}). Given distance was ${d}.`);
        for (let i = 0; i < this.curves.length; i++) {
            let curve = this.curves[i];
            // test if distance is approximatly equals to curve length, because spline
            // length may be greater than cumulated curve length due to float precision
            if (d > curve.length && d < curve.length + 0.0001) {
                d = curve.length;
            }
            if (d > curve.length) {
                d -= curve.length;
            } else {
                return curve.getSampleAtDistance(d, out);
            }
        }
        throw new Error("Something went wrong with GetSampleAtDistance.");
    }

    private startNode: SplineNode;
    private endNode: SplineNode;
    private updateLoopBinding () {
        if (this.startNode) {
            this.startNode.changed.removeListener(this.startNodeChanged);
        }
        if (this.endNode != null) {
            this.endNode.changed.removeListener(this.endNodeChanged);
        }
        if (this.isLoop) {
            this.startNode = this.nodes[0];
            this.endNode = this.nodes[this.nodes.length - 1];
            this.startNode.changed.addListener(this.startNodeChanged);
            this.endNode.changed.addListener(this.endNodeChanged);
            this.startNodeChanged();
        } else {
            this.startNode = null;
            this.endNode = null;
        }
    }

    private startNodeChanged () {
        let start = this.startNode, end = this.endNode;
        end.changed.removeListener(this.endNodeChanged);
        end.position = start.position;
        end.direction = start.direction;
        end.roll = start.roll;
        end.scale = start.scale;
        end.up = start.up;
        end.changed.addListener(this.endNodeChanged);
    }

    private endNodeChanged () {
        let start = this.startNode, end = this.endNode;
        start.changed.removeListener(this.startNodeChanged);
        start.position = end.position;
        start.direction = end.direction;
        start.roll = end.roll;
        start.scale = end.scale;
        start.up = end.up;
        start.changed.addListener(this.startNodeChanged);
    }

    _samples: CurveSample[] = [];
    getSamples (): CurveSample[] {
        if (this._samples.length === 0) {
            let samples = this._samples;
            let curves = this.curves;
            for (let i = 0; i < curves.length; i++) {
                let ss = curves[i].getSamples();
                for (let j = 0; j < ss.length; j++) {
                    samples.push(ss[j]);
                }
            }
        }
        return this._samples;
    }

    _points = [];
    getPoints () {
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
