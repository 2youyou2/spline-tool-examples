import { Node } from 'cc'
import { callGizmoFunction } from '../utils';
import _Gizmo from './gizmo';


export default class Controller {
    //#region  TODO: change to declare 
    public shape: Node|null = null;
    createShapeNode (name: String) { return window.cce.gizmos.ControllerBase.prototype.createShapeNode.call(this, name); }
    initAxis (node: Node, axisName: String | Number) { return window.cce.gizmos.ControllerBase.prototype.initAxis.call(this, node, axisName); }
    updateController () { return window.cce.gizmos.ControllerBase.prototype.updateController.call(this); }
    show () { return window.cce.gizmos.ControllerBase.prototype.show.call(this); }
    hide () { return window.cce.gizmos.ControllerBase.prototype.hide.call(this); }
    registerCameraMovedEvent () { return window.cce.gizmos.ControllerBase.prototype.registerCameraMovedEvent.call(this); }
    unregisterCameraMoveEvent () { return window.cce.gizmos.ControllerBase.prototype.unregisterCameraMoveEvent.call(this); }
    adjustControllerSize () { return window.cce.gizmos.ControllerBase.prototype.adjustControllerSize.call(this); }
    //#endregion

    constructor (rootNode) {
        cc.js.addon(this, new window.cce.gizmos.ControllerBase(rootNode));
    }

    onControllerMouseDown (event) { }
    onControllerMouseMove (event) { }
    onControllerMouseUp (event) { }

    onMouseDown (event) {
        this.onControllerMouseDown(event);
    }
    onMouseMove (event) {
        this.onControllerMouseMove(event);
    }
    onMouseUp (event) {
        this.onControllerMouseUp(event);
    }
    onMouseLeave (event) {
        this.onMouseUp(event);
    }
}

if (CC_EDITOR) {
    callGizmoFunction(() => {
        Object.setPrototypeOf(Controller.prototype, window.cce.gizmos.ControllerBase.prototype);
    })
}
