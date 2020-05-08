import { _decorator, Node } from 'cc';
import BaseUtils from './spline-util-base';

const { ccclass, executeInEditMode, float, type, boolean } = _decorator;

const { Quat, Vec3 } = cc;

@ccclass
@executeInEditMode
export default class NewClass extends BaseUtils {
    @float
    _spacing = 1000;
    @float
    _spacingRange = 0;
    @float
    _offset = 1;
    @float
    _offsetRange = 0;
    @float
    _scale = 1;
    @float
    _scaleRange = 0;
    @type(Node)
    _prefab: Node = null;

    @float
    get spacing () { return this._spacing; };
    set spacing (v) { this._spacing = v; this.dirty = true; };
    @float
    get spacingRange () { return this._spacingRange; };
    set spacingRange (v) { this._spacingRange = v; this.dirty = true; };

    @float
    get offset () { return this._offset; };
    set offset (v) { this._offset = v; this.dirty = true; };
    @float
    get offsetRange () { return this._offsetRange; };
    set offsetRange (v) { this._offsetRange = v; this.dirty = true; };

    @float
    get scale () { return this._scale; };
    set scale (v) { this._scale = v; this.dirty = true; };
    @float
    get scaleRange () { return this._scaleRange; };
    set scaleRange (v) { this._scaleRange = v; this.dirty = true; };

    @type(Node)
    get prefab () { return this._prefab; };
    set prefab (v) { this._prefab = v; this.dirty = true; };

    isRandomYaw = false;
    public compute () {
        let children = this.generated.children;

        if ((this.spacing + this.spacingRange) <= 0 ||
            this.prefab == null)
            return;

        let distance = 0;
        let spline = this.spline;
        let used = 0;
        while (distance <= spline.length) {

            let sample = spline.getSampleAtDistance(distance);

            let node = children[used];
            if (!node) {
                node = cc.instantiate(this.prefab);
                node.parent = this.generated;
            }

            // apply scale + random
            let rangedScale = this.scale + Math.random() * this.scaleRange;
            node.setScale(rangedScale, rangedScale, rangedScale);

            // rotate with random yaw
            if (this.isRandomYaw) {
                node.eulerAngles = cc.v3(0, 0, (Math.random() - 0.5) * 360);
            } else {
                // if (node.is3DNode) {
                node.setRotation(sample.rotation);
                // }
                // else {
                //     let euler = sample.rotation.toEuler(cc.v3());
                //     node.angle = euler.x > 0 ? (90 - euler.x) : (90 + euler.x);
                // }
            }
            // move orthogonaly to the spline, according to offset + random
            let binormal = Vec3.transformQuat(cc.v3(), cc.Vec3.RIGHT, Quat.fromViewUp(cc.quat(), sample.tangent, sample.up)).normalize();
            let localOffset = this.offset + Math.random() * this.offsetRange * Math.sign(this.offset);
            localOffset *= sample.scale.x;
            binormal.multiplyScalar(localOffset);
            node.position = binormal.add(sample.location);

            distance += this.spacing + Math.random() * this.spacingRange;

            used++;
        }

        if (children.length > used) {
            for (let i = children.length - 1; i >= used; i--) {
                children[i].parent = null;
            }
        }
    }
}
