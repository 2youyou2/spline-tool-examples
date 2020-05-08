import { Node } from 'cc'
import { callGizmoFunction } from '../utils';

export default class Controller {
    //#region extends from GizmoBase
    declare createShapeNode: (name: String) => void;
    declare initAxis: (node: Node, axisName: String) => void;
    declare updateController: () => void;
    declare show: () => void;
    declare hide: () => void;
    declare registerCameraMovedEvent: () => void;
    declare unregisterCameraMoveEvent: () => void;
    declare adjustControllerSize: () => void;
    declare shape;
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

callGizmoFunction(() => {
    Object.setPrototypeOf(Controller.prototype, window.cce.gizmos.ControllerBase.prototype);
})