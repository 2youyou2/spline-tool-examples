import Gizmo from './base/gizmo';
import { getNodeLocalPostion, getNodeWorldPostion } from './utils';

import SplineNodeController from './spline-node-controller';
import ContinuousLineController from './continuous-line-controller';
import pool from '../utils/pool';

class SplineGizmo extends Gizmo {
    moveTarget = null;
    moveType = '';

    splineNodeControllers = [];
    moveController = null;
    splineLineController = null;

    currentSplineNodeController = null;

    init () {
        this.moveController = this.createMoveController();
        this.splineLineController = this.createSplineLineController();

        this.onSplineNodesUpdate = this.onSplineNodesUpdate.bind(this);
        this.onSplineCurvesUpdate = this.onSplineCurvesUpdate.bind(this);
    }

    // 由于inspect之类的地方也会修改位置旋转等，所以暂时在update里调用可以确保位置一直是正确的，更好的
    // 作法应该是在各种引起Node的Transform的变化的地方发送一个消息来通知Gizmo的Trasform更新。
    updateControllerTransform () {
        let node = this.node;

        let splineNodes = this.splineNodes;
        let splineNodeControllers = this.splineNodeControllers;
        for (let i = 0; i < splineNodes.length; i++) {
            let splineNode = splineNodes[i];
            if (!splineNodeControllers[i]) {
                splineNodeControllers[i] = this.createSplineNodeController(i);
            }
            splineNodeControllers[i].setSplineNode(node, splineNode);
        }

        // if (this.moveType) {
        //     this.moveController.setPosition(this.moveController.getPosition());
        // }
    }

    get splineNodes () {
        return this.target.nodes;
    }

    get splineCurves () {
        return this.target.curves;
    }

    // onTargetUpdate () {
    //     this.onSplineNodesUpdate();
    //     this.onSplineCurvesUpdate();
    // }

    onSplineNodesUpdate () {
        let splineNodes = this.splineNodes;
        let splineNodeControllers = this.splineNodeControllers;
        for (let i = 0; i < splineNodes.length; i++) {
            if (!splineNodeControllers[i]) {
                splineNodeControllers[i] = this.createSplineNodeController(i);
            }
            splineNodeControllers[i].show();
        }
        for (let i = splineNodes.length; i < splineNodeControllers.length; i++) {
            splineNodeControllers[i].hide();
        }
    }

    onSplineCurvesUpdate () {
        let curves = this.splineCurves;
        let positions = [];
        let node = this.node;
        for (let i = 0; i < curves.length; i++) {
            let curve = curves[i];
            let samples = curve.getSamples();
            for (let j = 0; j < samples.length; j++) {
                let sample = samples[j];
                positions.push(getNodeWorldPostion(node, sample.location, pool.Vec3.get()));
            }
        }

        this.splineLineController.updatePoints(positions);

        for (let i  = 0; i < positions.length; i++) {
            pool.Vec3.put(positions[i]);
        }
    }

    onShow () {
        this.currentSplineNodeController = null;

        let node = this.node;
        let splineNodes = this.splineNodes;
        let splineNodeControllers = this.splineNodeControllers;
        for (let i = 0; i < splineNodeControllers.length; i++) {
            if (i < splineNodes.length) {
                splineNodeControllers[i].show();
                splineNodeControllers[i].setSplineNode(node, splineNodes[i]);
            }
            else {
                splineNodeControllers[i].hide();
            }
        }

        this.splineLineController.show();
        this.moveController.hide();
        this.updateControllerTransform();

        this.target.nodeListChanged.addListener(this.onSplineNodesUpdate);
        this.target.curveChanged.addListener(this.onSplineCurvesUpdate);

        this.onSplineNodesUpdate();
        this.onSplineCurvesUpdate();

        this.target.currentSelection = null;

        this.registerCameraMovedEvent();
    }

    onHide () {
        let splineNodeControllers = this.splineNodeControllers;
        for (let i = 0; i < splineNodeControllers.length; i++) {
            splineNodeControllers[i].hide();
        }

        this.moveController.hide();
        this.splineLineController.hide();

        this.showTransformGizmo(true);

        this.target.nodeListChanged.removeListener(this.onSplineNodesUpdate);
        this.target.curveChanged.removeListener(this.onSplineCurvesUpdate);

        this.target.currentSelection = null;

        this.unregisterCameraMoveEvent();
    }

    onEditorCameraMoved () {
        this.updateMoveControllderPos();
    }

    updateMoveControllderPos () {
        if (!this.currentSplineNodeController) return;

        if (this.moveType === 'position') {
            this.moveController.setPosition(this.currentSplineNodeController.getSplineNodeWorldPosition());
        }
        else if (this.moveType === 'direction') {
            this.moveController.setPosition(this.currentSplineNodeController.getSplineNodeWorldDirection());
        }
        else if (this.moveType === 'invDirection') {
            this.moveController.setPosition(this.currentSplineNodeController.getSplineNodeWorldInvDirection());
        }
    }

    createSplineNodeController (index) {
        let controller = new SplineNodeController(this.getGizmoRoot());

        controller.onControllerMouseDown = (event) => {
            if (this.currentSplineNodeController) {
                this.currentSplineNodeController.hideDirection();
            }
            this.currentSplineNodeController = controller;
            this.moveTarget = this.splineNodes[index];
            this.moveType = event.axisName;
            this.target.currentSelection = this.moveTarget;

            controller.showDirection();

            this.showTransformGizmo(false);

            this.moveController.show();

            this.updateMoveControllderPos();
        };
        controller.onControllerMouseMove = () => {

        };
        controller.onControllerMouseUp = () => {

        };

        return controller;
    }

    createMoveController () {
        let controller = new window.cce.gizmos.PositionController(this.getGizmoRoot());
        let startPos = cc.v3();
        controller.onControllerMouseDown = () => {
            startPos.set(controller.getPosition());
        };
        controller.onControllerMouseMove = () => {
            if (controller.updated) {
                this.recordChanges();

                let curNodePos = controller.getPosition();

                let node = this.node;
                let splineNode = this.moveTarget;
                let newPos = getNodeLocalPostion(node, curNodePos);

                if (this.moveType === 'position') {
                    splineNode.direction = splineNode.direction.clone().add(newPos).subtract(splineNode.position);
                    splineNode.position = newPos;
                }
                else if (this.moveType === 'direction') {
                    splineNode.direction = newPos;
                }
                else if (this.moveType === 'invDirection') {
                    splineNode.invDirection = newPos;
                }

                // 发送节点修改消息
                this.onComponentChanged(node);
            }
        };
        controller.onControllerMouseUp = () => {
            if (controller.updated) {
                this.commitChanges();
            }
        };
        return controller;
    }

    createSplineLineController () {
        return new ContinuousLineController(this.getGizmoRoot());
    }
}

Gizmo.register('spline', SplineGizmo);
