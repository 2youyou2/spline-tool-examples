import { Component, Node, _decorator } from 'cc';

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
        let newNode = SplineNode.create(offset.add(lastNode.position), lastNode.direction);
        this.addNode(newNode);
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
        let newNode = SplineNode.create(offset.add(this.currentSelection.position), this.currentSelection.direction);
        this.nodes.splice(index + 1, 0, newNode);
        this.nodes = this.nodes;
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
        this.nodes.splice(index, 1);
        this.nodes = this.nodes;
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
    public set nodes (v) {
        this._nodes = v;
        this.createCurves();
        this.nodeListChanged.invoke({});
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

    public resetInEditor () {
        this.reset();
    }

    /// <summary>
    /// Clear the nodes and curves, then add two default nodes for the reset spline to be visible in editor.
    /// </summary>
    private reset () {
        this.nodes.length = 0;
        this.curves.length = 0;
        this.addNode(SplineNode.create(cc.v3(5, 0, 0), cc.v3(5, 0, -3)));
        this.addNode(SplineNode.create(cc.v3(10, 0, 0), cc.v3(10, 0, 3)));
        this.raiseNodeListChanged({
            type: ListChangeType.clear
        });
        this.updateAfterCurveChanged();
    }

    onLoad () {
        this.updateAfterCurveChanged = this.updateAfterCurveChanged.bind(this);
        this.createCurves();
    }

    onEnable () {

    }

    onDisable () {

    }

    createCurves () {
        this.curves.length = 0;
        for (let i = 0; i < this.nodes.length - 1; i++) {
            let n: SplineNode = this.nodes[i];
            let next: SplineNode = this.nodes[i + 1];

            let curve: CubicBezierCurve = new CubicBezierCurve(n, next);
            curve.changed.addListener(this.updateAfterCurveChanged);
            this.curves.push(curve);
        }
        this.raiseNodeListChanged({
            type: ListChangeType.clear
        });
        this.updateAfterCurveChanged();
    }

    public getCurves (): CubicBezierCurve[] {
        return this.curves;
    }

    private raiseNodeListChanged (args: ListChangedEventArgs) {
        this.nodeListChanged.invoke(args);
    }

    private updateAfterCurveChanged () {
        this.length = 0;
        for (let i = 0; i < this.curves.length; i++) {
            let curve = this.curves[i];
            this.length += curve.length;
        }
        this.curveChanged.invoke();
    }

    /// <summary>
    /// Returns an interpolated sample of the spline, containing all curve data at this time.
    /// Time must be between 0 and the number of nodes.
    /// </summary>
    public getSample (t: number): CurveSample {
        let index = this.getNodeIndexForTime(t);
        return this.curves[index].getSample(t - index);
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
        let res = t;
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
    public getSampleAtDistance (d: number): CurveSample {
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
                return curve.getSampleAtDistance(d);
            }
        }
        throw new Error("Something went wrong with GetSampleAtDistance.");
    }

    /// <summary>
    /// Adds a node at the end of the spline.
    /// </summary>
    /// <param name="node"></param>
    public addNode (node: SplineNode) {
        this.nodes.push(node);
        if (this.nodes.length != 1) {
            let previousNode = this.nodes[this.nodes.indexOf(node) - 1];
            let curve = new CubicBezierCurve(previousNode, node);
            curve.changed.addListener(this.updateAfterCurveChanged);
            this.curves.push(curve);
        }
        this.raiseNodeListChanged({
            type: ListChangeType.Add,
            newItems: [node]
        });

        this.updateAfterCurveChanged();
        this.updateLoopBinding();
    }

    /// <summary>
    /// Insert the given node in the spline at index. Index must be greater than 0 and less than node count.
    /// </summary>
    /// <param name="index"></param>
    /// <param name="node"></param>
    public insertNode (index: number, node: SplineNode) {
        if (index == 0)
            throw new Error("Can't insert a node at index 0");

        let nodes = this.nodes;
        let curves = this.curves;

        let previousNode = nodes[index - 1];
        let nextNode = nodes[index];

        nodes.splice(index, 0, node);

        curves[index - 1].connectEnd(node);

        let curve = new CubicBezierCurve(node, nextNode);
        curve.changed.addListener(this.updateAfterCurveChanged);
        curves.splice(index, 0, curve);
        this.raiseNodeListChanged({
            type: ListChangeType.Insert,
            newItems: [node],
            insertIndex: index
        });
        this.updateAfterCurveChanged();
        this.updateLoopBinding();
    }

    /// <summary>
    /// Remove the given node from the spline. The given node must exist and the spline must have more than 2 nodes.
    /// </summary>
    /// <param name="node"></param>
    public removeNode (node: SplineNode) {
        let nodes = this.nodes;
        let curves = this.curves;
        let index = nodes.indexOf(node);

        if (nodes.length <= 2) {
            throw new Error("Can't remove the node because a spline needs at least 2 nodes.");
        }

        let toRemove = index == nodes.length - 1 ? curves[index - 1] : curves[index];
        if (index != 0 && index != nodes.length - 1) {
            let nextNode = nodes[index + 1];
            curves[index - 1].connectEnd(nextNode);
        }

        nodes.splice(index, 1);
        toRemove.changed.removeListener(this.updateAfterCurveChanged);
        curves.splice(curves.indexOf(toRemove), 1);

        this.raiseNodeListChanged({
            type: ListChangeType.Remove,
            removedItems: [node],
            removeIndex: index
        });
        this.updateAfterCurveChanged();
        this.updateLoopBinding();
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

    // editor

}
