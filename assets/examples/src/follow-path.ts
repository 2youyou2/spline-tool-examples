import { _decorator, Component, Node, Vec3, Mat4 } from 'cc';
import Spline from '../../spline/spline';
const { ccclass, property, type, executeInEditMode } = _decorator;

let tempPos = new Vec3();
let tempMat4 = new Mat4();

@ccclass('followPath')
@executeInEditMode
export class followPath extends Component {
    @type(Node)
    target: Node = null

    @property
    duration = 5;

    _time = 0;

    private _spline: Spline = null;
    public get spline () {
        if (!this._spline) {
            this._spline = this.getComponent(Spline);
        }
        return this._spline;
    }

    start () {
        // Your initialization goes here.
    }

    update (deltaTime: number) {
        if (!this.spline) return;

        let t = this._time / this.duration;
        t = t % (this.spline.nodes.length - 1);
        let sample = this.spline.getSample(t);
        let matrix = this.spline.node.worldMatrix;
        Vec3.transformMat4(tempPos, sample.location, matrix);

        let targetParentMatrix = this.target.parent.worldMatrix;
        Mat4.invert(tempMat4, targetParentMatrix)
        Vec3.transformMat4(tempPos, tempPos, tempMat4);

        this.target.position = tempPos;

        this._time += deltaTime;
    }
}
