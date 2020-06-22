import { _decorator, Vec3, Vec2 } from "cc";
import SplineNode from "./spline-node";

const { ccclass, property, type } = _decorator;
@ccclass('SplineNodeWrapper')
export default class SplineNodeWrapper {
    static create (node) {
        let wrapper = new SplineNodeWrapper();
        wrapper.node = node;
        return wrapper;
    }

    node: SplineNode = null;

    @type(SplineNode)
    get splineNode () {
        return this.node;
    }

    @type(Vec3)
    get position () {
        return this.node.position;
    }
    set position (value) {
        this.node.position = value;
    }

    @type(Vec3)
    get direction () {
        return this.node.direction;
    }
    set direction (value) {
        this.node.direction = value;
    }

    @type(Vec2)
    get scale () {
        return this.node.scale;
    }
    set scale (value) {
        this.node.scale = value;
    }

    @property
    get roll () {
        return this.node.roll;
    }
    set roll (value) {
        this.node.roll = value;
    }
} 