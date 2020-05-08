import { Node, Component, _decorator } from 'cc';
import Spline from '../spline';

const { ccclass, executeInEditMode } = _decorator;

@ccclass
@executeInEditMode
export default class SplineUtilBase extends Component {
    protected generated: Node = null;
    protected spline: Spline = null;
    protected dirty = true;

    protected listenerEventName = 'curveChanged';

    // LIFE-CYCLE CALLBACKS:
    constructor () {
        super();
        this.setDirty = this.setDirty.bind(this);
    }

    onLoad () {
        let generatedName = 'generated ' + cc.js.getClassName(this);
        this.generated = cc.find(generatedName, this.node);
        if (!this.generated) {
            this.generated = new Node(generatedName);
            this.generated.parent = this.node;
            // this.generated.is3DNode = true;
        }

        let parent = this.node;
        while (parent) {
            this.spline = parent.getComponent(Spline);
            if (this.spline) break;
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

    update (dt) {
        if (this.dirty && this.spline) {
            this.compute();
            this.dirty = false;
        }
    }

    compute () {

    }
}