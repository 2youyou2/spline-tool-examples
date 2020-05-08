import { _decorator, Vec3, Vec2 } from 'cc';
import Event from './utils/event';

const { ccclass, property } = _decorator;

@ccclass('SplineNode')
export default class SplineNode {
    /// <summary>
    /// Spline node storing a position and a direction (tangent).
    /// Note : you shouldn't modify position and direction manualy but use dedicated methods instead, to insure event raising.
    /// </summary>
    public changed: Event = new Event();

    /// <summary>
    /// Node position
    /// </summary>
    @property
    _position: Vec3 = cc.v3();

    @property
    public get position () { return this._position; }
    public set position (v) {
        if (!CC_EDITOR && this._position.equals(v)) return;
        this._position.set(v);
        this.changed.invoke();
    }

    /// <summary>
    /// Node direction
    /// </summary>
    @property
    _direction: Vec3 = cc.v3();

    @property
    public get direction () { return this._direction; }
    public set direction (v) {
        if (!CC_EDITOR && this._direction.equals(v)) return;
        this._direction.set(v);
        this.changed.invoke();
    }

    get invDirection () {
        return this.position.clone().multiplyScalar(2).subtract(this.direction);
    }
    set invDirection (v) {
        this.direction = this.position.clone().multiplyScalar(2).subtract(v);
    }

    /// <summary>
    /// Up vector to apply at this node.
    /// Usefull to specify the orientation when the tangent blend with the world UP (gimball lock)
    /// This value is not used on the spline itself but is commonly used on bended content.
    /// </summary>
    @property
    _up: Vec3 = Vec3.UP.clone();

    @property
    public get up () { return this._up; }
    public set up (v) {
        if (!CC_EDITOR && this._up.equals(v)) return;
        this._up.set(v);
        this.changed.invoke();
    }

    /// <summary>
    /// Scale to apply at this node.
    /// This value is not used on the spline itself but is commonly used on bended content.
    /// </summary>
    @property
    _scale: Vec2 = Vec2.ONE.clone();

    @property
    public get scale () { return this._scale; }
    public set scale (v) {
        if (!CC_EDITOR && this._scale.equals(v)) return;
        this._scale.set(v);
        this.changed.invoke();
    }

    /// <summary>
    /// Roll to apply at this node.
    /// This value is not used on the spline itself but is commonly used on bended content.
    /// </summary>
    @property
    _roll: number = 0;

    @property
    public get roll () { return this._roll; }
    public set roll (v) {
        if (!CC_EDITOR && this._roll === v) return;
        this._roll = v;
        this.changed.invoke();
    }

    static create (position: Vec3, direction: Vec3) : SplineNode {
        let node = new SplineNode();
        node.position = position;
        node.direction = direction;
        return node;
    }
};
