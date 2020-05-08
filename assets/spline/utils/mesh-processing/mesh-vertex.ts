import { _decorator, Vec3, Vec2 } from 'cc';
const {ccclass, property} = _decorator;

@ccclass('MeshVertex')
export default class MeshVertex {
    @property
    public position: Vec3 = cc.v3();
    @property
    public normal: Vec3 = cc.v3();
    @property
    public uv: Vec2 = cc.v2();

    static create (position: Vec3, normal: Vec3, uv: Vec2 = cc.v2()): MeshVertex {
        let v = new MeshVertex();
        v.position.set(position);
        v.normal.set(normal);
        v.uv.set(uv);
        return v;
    }
}
