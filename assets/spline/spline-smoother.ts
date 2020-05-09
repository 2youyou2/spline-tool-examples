import { _decorator, Component, Node, Vec3 } from 'cc';
import Spline from './spline';
import SplineNode from './spline-node';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('splineSmoother')
@executeInEditMode
export class splineSmoother extends Component {
    private _smoothing = false;

    private _spline: Spline = null;
    public get spline () {
        if (!this._spline) {
            this._spline = this.getComponent(Spline);
        }
        return this._spline;
    }

    @property
    private _curvature = 0.3;
    @property({
        step: 0.1
    })
    public get curvature () {
        return this._curvature;
    }
    public set curvature (value) {
        this._curvature = value;
        this.smoothAll();
    }

    constructor () {
        super()

        this.splineNodeListChanged = this.splineNodeListChanged.bind(this);
        this.onNodeChanged = this.onNodeChanged.bind(this);
    }

    onEnable () {
        this.smoothAll();

        this.spline.nodeListChanged.addListener(this.splineNodeListChanged);
        for (let i = 0; i < this.spline.nodes.length; i++) {
            this.spline.nodes[i].changed.addListener(this.onNodeChanged);
        }
    }

    onDisable () {
        this.spline.nodeListChanged.removeListener(this.splineNodeListChanged);
        for (let i = 0; i < this.spline.nodes.length; i++) {
            this.spline.nodes[i].changed.removeListener(this.onNodeChanged);
        }
    }

    splineNodeListChanged (args) {
        if (args.newItems != null) {
            for (let i = 0; i < args.newItems.length; i++) {
                args.newItems[i].changed.addListener(this.onNodeChanged);
            }
        }
        if (args.removedItems != null) {
            for (let i = 0; i < args.removedItems.length; i++) {
                args.removedItems[i].changed.removeListener(this.onNodeChanged);
            }
        }
    }

    onNodeChanged (node: SplineNode) {
        this.smoothNode(node);
        let nodes = this.spline.nodes;
        var index = nodes.indexOf(node);
        if (index > 0) {
            this.smoothNode(nodes[index - 1]);
        }
        if (index < nodes.length - 1) {
            this.smoothNode(nodes[index + 1]);
        }
    }

    smoothNode (node: SplineNode) {
        if (this._smoothing) return;
        this._smoothing = true;
        
        let nodes = this.spline.nodes;
        var index = nodes.indexOf(node);
        var pos = node.position;
        // For the direction, we need to compute a smooth vector.
        // Orientation is obtained by substracting the vectors to the previous and next way points,
        // which give an acceptable tangent in most situations.
        // Then we apply a part of the average magnitude of these two vectors, according to the smoothness we want.
        let dir = new Vec3();
        let averageMagnitude = 0;
        if (index !== 0) {
            var previousPos = nodes[index - 1].position;
            var toPrevious = pos.clone().subtract(previousPos);
            averageMagnitude += toPrevious.length();
            dir.add(toPrevious.normalize());
        }
        if (index != nodes.length - 1) {
            var nextPos = nodes[index + 1].position;
            var toNext = pos.clone().subtract(nextPos);
            averageMagnitude += toNext.length();
            dir.subtract(toNext.normalize());
        }
        averageMagnitude *= 0.5;
        // This constant should vary between 0 and 0.5, and allows to add more or less smoothness.
        dir = dir.normalize().multiplyScalar(averageMagnitude * this.curvature);

        // In SplineMesh, the node direction is not relative to the node position. 
        var controlPoint = dir.add(pos);

        // We only set one direction at each spline node because SplineMesh only support mirrored direction between curves.
        node.direction = controlPoint;

        this._smoothing = false;
    }

    smoothAll () {
        let nodes = this.spline.nodes;
        for (let i = 0; i < nodes.length; i++) {
            this.smoothNode(nodes[i]);
        }
    }
}
