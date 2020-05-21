import { Node, Component, _decorator, PrivateNode } from 'cc';
import Spline from '../spline';

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

}