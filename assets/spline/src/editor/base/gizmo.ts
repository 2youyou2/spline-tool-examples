// @ts-nocheck
import { Node } from 'cc';
import { callGizmoFunction } from '../utils';

export default class Gizmo {
    static register (componentName, componentGizmo) {
        callGizmoFunction(() => {
            window.cce.gizmos.GizmoDefines.components[componentName] = componentGizmo;
        })
    }


    //#region extends from GizmoBase, TODO: change to declare
    // declare _target: any;
    // declare node: Node;
    // declare nodes: Node[];
    getGizmoRoot () { return window.cce.gizmos.Gizmo.prototype.getGizmoRoot.call(this) };
    recordChanges () { return window.cce.gizmos.Gizmo.prototype.recordChanges.call(this) };
    commitChanges () { return window.cce.gizmos.Gizmo.prototype.commitChanges.call(this) };
    onComponentChanged (node: Node) { return window.cce.gizmos.Gizmo.prototype.onComponentChanged.call(this) };
    registerCameraMovedEvent () { return window.cce.gizmos.Gizmo.prototype.registerCameraMovedEvent.call(this) };
    unregisterCameraMoveEvent () { return window.cce.gizmos.Gizmo.prototype.unregisterCameraMoveEvent.call(this) };
    //#endregion

    get target () {
        return this._target;
    }
    // component 的 gizmo 是1对1关系，transform gizmo 可以同时操作多个对像
    set target (value) {
        let nodes = this.nodes;
        if (nodes && nodes.length > 0) {
            // this.unRegisterTransformEvent(this.nodes);
            // this.unRegisterNodeEvents(this.nodes);
        }

        this._target = value;
        nodes = this.nodes;
        if (nodes && nodes.length > 0) {
            // this.registerTransformEvent(this.nodes);
            // this.registerNodeEvents(this.nodes);

            if (this.onTargetUpdate) {
                this.onTargetUpdate();
            }
        } else {
            this.hide();
        }
    }

    constructor (target) {
        cc.js.addon(this, new window.cce.gizmos.Gizmo(target));
    }

    layer () {
        return 'foreground';
    }

    updateController () {
        this.updateControllerData();
        this.updateControllerTransform();
    }

    updateControllerData () {

    }

    updateControllerTransform () {

    }

    onTargetUpdate () {
        this.updateController();
    }

    onNodeChanged () {
        this.updateController();
    }

    _showTransformGizmo = true;
    showTransformGizmo (show) {
        // if (!window.cce.gizmos.transformTool) return;

        // // TODO: remove hack
        // if (show) {
        //     window.cce.gizmos.transformTool.show();
        // }
        // else {
        //     window.cce.gizmos.transformTool.hide();
        // }

        this._showTransformGizmo = show;
    }

    getTransformGizmoNode (): Node {
        let transformTool = window.cce.gizmos.transformTool;
        return transformTool && transformTool.node;
    }

    show () {
        window.cce.gizmos.Gizmo.prototype.show.call(this);
    }

    onUpdate () {
        // TODO: show/hide transformTool in showTransformGizmo has no effect, should remove hack
        if (this._showTransformGizmo) {
            window.cce.gizmos.transformTool.show();
        }
        else {
            window.cce.gizmos.transformTool.hide();
        }
    }

    commitNodeChanged (node: any, ...param: any[]) {
        // @ts-ignore
        cce.gizmos.Utils.onNodeChanged(node, ...param);
    }
}

if (CC_EDITOR) {
    callGizmoFunction(() => {
        Object.setPrototypeOf(Gizmo.prototype, window.cce.gizmos.Gizmo.prototype)
    })
}