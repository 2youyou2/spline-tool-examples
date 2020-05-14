import { Node, Component, _decorator } from 'cc';
import Spline from '../spline';

const { ccclass, executeInEditMode, type } = _decorator;

@ccclass
@executeInEditMode
export default class SplineUtilBase extends Component {
    @type(Spline)
    get splineComp () {
        return this. spline;
    }

    protected _generated: Node = null;
    protected get generated () {
        if (!this._generated) {
            let generatedName = 'generated ' + cc.js.getClassName(this);
            this._generated = cc.find(generatedName, this.node);
            if (!this._generated) {
                this._generated = new Node(generatedName);
                this._generated.parent = this.node;
            }
        }
        return this._generated;
    }

    protected spline: Spline = null;
    protected dirty = true;

    protected listenerEventName = 'curveChanged';

    // LIFE-CYCLE CALLBACKS:
    constructor () {
        super();
        this.setDirty = this.setDirty.bind(this);
    }

    onLoad () {
        let parent = this.node;
        while (parent) {
            this.spline = parent.getComponent(Spline);
            if (this.spline) break;

            parent = parent.parent;
        }
    }

    onEnable () {
        if (this.spline) {
            this.spline[this.listenerEventName].addListener(this.setDirty);
        }
    }

    onDisable () {
        if (this.spline) {
            this.spline[this.listenerEventName].removeListener(this.setDirty);
        }
    }

    setDirty () {
        this.dirty = true;
    }

    reset () {
        if (this._generated) {
            this._generated.parent = null;
            this._generated = null;
        }
        this.setDirty();
    }

    update (dt) {
        if (this.dirty && this.spline) {
            this.compute();
            this.dirty = false;
        }
    }

    compute () {

    }
}