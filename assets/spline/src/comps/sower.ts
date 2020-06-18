import { _decorator, Node, Prefab, isPropertyModifier, Vec4, Quat, Vec3 } from 'cc';
import SplineUtilRenderer from './spline-util-renderer';

const { ccclass, executeInEditMode, float, type, boolean, property } = _decorator;

let tempQuat = new Quat();

@ccclass
@executeInEditMode
export default class NewClass extends SplineUtilRenderer {
    @float
    _spacing = 10;
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
    @property
    _rotation = new Vec3();
    @type(Prefab)
    _prefab: Prefab = null;

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
    @property
    get rotation () { return this._rotation; }
    set rotation (value) { this._rotation = value; this.dirty = true; }
    @float
    get scaleRange () { return this._scaleRange; };
    set scaleRange (v) { this._scaleRange = v; this.dirty = true; };

    @type(Prefab)
    get prefab () { return this._prefab; };
    set prefab (v) { 
        this._prefab = v; 
        this.generated.removeAllChildren();
        this.dirty = true;
    };

    public compute () {
        let children = this.generated.children;

        if ((this.spacing + this.spacingRange) <= 0 ||
            this.prefab == null)
            return;

        let distance = 0;
        let splineCurve = this.splineCurve;
        let used = 0;
        while (distance <= splineCurve.length) {

            let sample = splineCurve.getSampleAtDistance(distance);

            let node = children[used];
            if (!node) {
                node = cc.instantiate(this.prefab);
                node.parent = this.generated;
            }

            // apply scale + random
            let rangedScale = this.scale + Math.random() * this.scaleRange;
            rangedScale *= Math.min(sample.scale.x, sample.scale.y);
            node.setScale(rangedScale, rangedScale, rangedScale);
            
            Quat.fromEuler(tempQuat, this.rotation.x, this.rotation.y, this.rotation.z);
            Quat.multiply(tempQuat, sample.rotation, tempQuat);
            node.setRotation(tempQuat);
            
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
