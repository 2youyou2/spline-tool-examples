import { Node, Component, _decorator, PrivateNode } from 'cc';
import Spline from '../spline';
import ISplineCruve from '../spline-curve-interface';
import CubicBezierCurve from '../cubic-bezier-curve';
import SplineNode from '../spline-node';

const { ccclass, executeInEditMode, type } = _decorator;

@ccclass
@executeInEditMode
export default class SplineUtilBase extends Component {

    protected _spline: Spline = null;
    @type(Spline)
    get spline () {
        if (!this._spline) {
            let parent = this.node;
            while (parent) {
                this._spline = parent.getComponent(Spline);
                if (this._spline) break;
    
                parent = parent.parent;
            }
        }
        return this._spline;
    };

    protected _splineNode: SplineNode = null;
    get splineNode () {
        if (!this._splineNode) {
            let parent = this.node;
            while (parent) {
                this._splineNode = parent.getComponent(SplineNode);
                if (this._splineNode) break;
    
                parent = parent.parent;
            }
        }
        return this._splineNode;
    };

    protected _splineCurve: ISplineCruve = null;
    get splineCurve () {
        if (!this._splineCurve) {
            let splineNode = this.splineNode;
            if (splineNode) {
                let index = splineNode.node.getSiblingIndex();
                this._splineCurve = this.spline.getCurve(index);
            }
            else {
                this._splineCurve = this.spline;
            }
        }
        return this._splineCurve;
    };

}