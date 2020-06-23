// @ts-nocheck

import { Node } from 'cc';
import { callGizmoFunction } from '../utils';

let _Gizmo
if (CC_EDITOR) {

    _Gizmo = class Gizmo {
        static register (componentName, componentGizmo) {
            callGizmoFunction(() => {
                window.cce.gizmos.GizmoDefines.components[componentName] = componentGizmo;
            })
        }
    
    
        //#region extends from GizmoBase
        declare _target: any;
        declare node: Node;
        declare nodes: Node[];
        declare getGizmoRoot: () => void;
        declare recordChanges: () => void;
        declare commitChanges: () => void;
        declare onComponentChanged: (node: Node) => void;
        declare registerCameraMovedEvent: () => void;
        declare unregisterCameraMoveEvent: () => void;
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
                // @ts-ignore
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
    
    callGizmoFunction(() => {
        Object.setPrototypeOf(_Gizmo.prototype, window.cce.gizmos.Gizmo.prototype)
    })
    
}
export default _Gizmo
