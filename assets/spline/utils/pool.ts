import { Vec3, Vec2, Quat, Mat4 } from 'cc';

export class Pool <T> {
    _pool = [];
    _ctor: new () => T = null;

    constructor (ctor: new () => T) {
        this._ctor = ctor;
    }

    get (): T {
        let instance = this._pool.pop();
        if (!instance) {
            instance = new this._ctor();
        }
        return instance;
    }

    put (instance: T) {
        this._pool.push(instance);
    }
}

export default {
    Vec2: new Pool(Vec2),
    Vec3: new Pool(Vec3),
    Quat: new Pool(Quat),
    Mat4: new Pool(Mat4),
}
