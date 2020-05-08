import { Mesh, Vec3, Quat, GFXAttributeName } from 'cc';
import MeshVertex from './mesh-vertex';
import MeshUtility from './mesh-utility';

export default class SourceMesh {
    public static build (mesh: Mesh) {
        return new SourceMesh(mesh);
    }

    private translation = new Vec3;
    private rotation = new Quat;
    private scale = new Vec3;

    private _mesh: Mesh;
    get mesh () {
        return this._mesh;
    }

    private _vertices: MeshVertex[];
    get vertices () {
        if (!this._vertices == null) this.buildData();
        return this._vertices;
    }

    private _triangles: number[] = [];
    get triangles () {
        if (this._vertices == null) this.buildData();
        return this._triangles;
    }

    private _minX: number = 0;
    get minX () {
        if (this._vertices == null) this.buildData();
        return this._minX;
    }

    private _length: number = 0;
    get length () {
        if (this._vertices == null) this.buildData();
        return this._length;
    }

    /// <summary>
    /// constructor is private to enable fluent builder pattern.
    /// Use <see cref="Build(Mesh)"/> to obtain an instance.
    /// </summary>
    /// <param name="mesh"></param>
    constructor (mesh: Mesh | SourceMesh) {
        if (mesh instanceof Mesh) {
            this._mesh = mesh;
            this.translation = cc.v3();
            this.rotation = cc.quat();
            this.scale = cc.v3();
        }
        else {
            this._mesh = mesh._mesh;
            this.translation = mesh.translation.clone();
            this.rotation = mesh.rotation.clone();
            this.scale = mesh.scale.clone();
        }
    }

    public translate (translation: Vec3) {
        var res = new SourceMesh(this);
        res.translation.set(translation);
        return res;
    }

    public translate2 (x: number, y: number, z: number) {
        return this.translate(new Vec3(x, y, z));
    }

    public rotate (rotation: Quat) {
        var res = new SourceMesh(this);
        res.rotation.set(rotation);
        return res;
    }

    public scaleRes (scale: Vec3) {
        var res = new SourceMesh(this);
        res.scale.set(scale);
        return res;
    }

    public scaleRes2 (x: number, y: number, z: number) {
        return this.scaleRes(new Vec3(x, y, z));
    }

    private buildData () {
        // if the mesh is reversed by scale, we must change the culling of the faces by inversing all triangles.
        // the mesh is reverse only if the number of resersing axes is impair.
        let reversed = this.scale.x < 0;
        if (this.scale.y < 0) reversed = !reversed;
        if (this.scale.z < 0) reversed = !reversed;
        if (reversed) {
            this._triangles = MeshUtility.getReversedTriangles(this._mesh);
        }
        else {
            this._mesh.copyIndices(0, this._triangles);
        }

        // we transform the source mesh vertices according to rotation/translation/scale
        let i = 0;
        let vertices = this._vertices = [];
        let positions = this._mesh.readAttribute(0, GFXAttributeName.ATTR_POSITION);
        let normals = this._mesh.readAttribute(0, GFXAttributeName.ATTR_NORMAL);
        let vertCount = positions.length / 3;
        for (let i = 0; i < vertCount; i++) {
            let transformed = MeshVertex.create(
                cc.v3(positions[3 * i + 0], positions[3 * i + 1], positions[3 * i + 2]),
                cc.v3(normals[3 * i + 0], normals[3 * i + 1], normals[3 * i + 2]),
            );
            //  application of rotation
            if (!this.rotation.equals(Quat.IDENTITY)) {
                Vec3.transformQuat(transformed.position, transformed.position, this.rotation);
                Vec3.transformQuat(transformed.normal, transformed.normal, this.rotation);
            }
            if (!this.scale.equals(Vec3.ONE)) {
                Vec3.multiply(transformed.position, transformed.position, this.scale);
                Vec3.multiply(transformed.normal, transformed.normal, this.scale);
            }
            transformed.position.add(this.translation);
            vertices.push(transformed);
        }

        // find the bounds along x
        this._minX = Number.MAX_SAFE_INTEGER;
        let maxX = -Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < vertices.length; i++) {
            let vert = vertices[i];
            let p = vert.position;
            maxX = Math.max(maxX, p.x);
            this._minX = Math.min(this._minX, p.x);
        }
        this._length = Math.abs(maxX - this._minX);
    }

    // public equals (object obj) {
    //     if (obj == null || GetType() != obj.GetType()) {
    //         return false;
    //     }
    //     var other = (SourceMesh)obj;
    //     return Mesh == other.Mesh &&
    //         translation == other.translation &&
    //         rotation == other.rotation &&
    //         scale == other.scale;
    // }

    // public override int GetHashCode () {
    //     return base.GetHashCode();
    // }

    // public static bool operator == (SourceMesh sm1, SourceMesh sm2) {
    //     return sm1.Equals(sm2);
    // }
    // public static bool operator != (SourceMesh sm1, SourceMesh sm2) {
    //     return sm1.Equals(sm2);
    // }
}
