import { Mesh, Vec3, Quat, GFXAttributeName, Vec4, Vec2 } from 'cc';
import MeshVertex from './mesh-vertex';
import MeshUtility from './mesh-utility';
import MeshTesselate from './mesh-tesselate';

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
        if (!this._vertices) this.buildData();
        return this._vertices;
    }

    private _triangles: number[] = [];
    get triangles () {
        if (!this._vertices) this.buildData();
        return this._triangles;
    }

    private _minX: number = 0;
    get minX () {
        if (!this._vertices) this.buildData();
        return this._minX;
    }

    private _length: number = 0;
    get length () {
        if (!this._vertices) this.buildData();
        return this._length;
    }

    private _divisions = 0;
    get divisions () {
        return this._divisions;
    }
    set divisions (value) {
        this._divisions = value;
        this.buildData();
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
        let vertices = this._vertices = this._vertices || [];
        let positions = this._mesh.readAttribute(0, GFXAttributeName.ATTR_POSITION);
        let normals = this._mesh.readAttribute(0, GFXAttributeName.ATTR_NORMAL);
        let tangents = this._mesh.readAttribute(0, GFXAttributeName.ATTR_TANGENT);
        let uvs = this._mesh.readAttribute(0, GFXAttributeName.ATTR_TEX_COORD);
        let hasTangents = tangents && tangents.length > 0;
        let vertCount = positions.length / 3;
        let i = 0;
        for (; i < vertCount; i++) {
            let transformed = vertices[i];
            if (!transformed) {
                transformed = vertices[i] = MeshVertex.pool.get();
            }
            transformed.position.set(positions[3 * i + 0], positions[3 * i + 1], positions[3 * i + 2]);
            transformed.normal.set(normals[3 * i + 0], normals[3 * i + 1], normals[3 * i + 2]);
            transformed.uv.set(uvs[2 * i + 0], uvs[2 * i + 1]);
            if (hasTangents) {
                transformed.tangent.set(tangents[4 * i + 0], tangents[4 * i + 1], tangents[4 * i + 2], tangents[4 * i + 3]);
            }
            //  application of rotation
            if (!this.rotation.equals(Quat.IDENTITY)) {
                Vec3.transformQuat(transformed.position, transformed.position, this.rotation);
                Vec3.transformQuat(transformed.normal, transformed.normal, this.rotation);
                if (hasTangents) {
                    Vec4.transformQuat(transformed.tangent, transformed.tangent, this.rotation);
                }
            }
            if (!this.scale.equals(Vec3.ONE)) {
                Vec3.multiply(transformed.position, transformed.position, this.scale);
                // Vec3.multiply(transformed.normal, transformed.normal, this.scale);
                // Vec4.multiply(transformed.tangent, transformed.tangent, this.scale);
            }
            transformed.position.add(this.translation);
            
        }

        for (; i < vertices.length; i++) {
            if (vertices[i]) {
                MeshVertex.pool.put(vertices[i]);
            }
        }
        vertices.length = vertCount;

        // tessellate mesh along x


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

        // this._triangles = MeshTesselate.tessellate(vertices, this._triangles, 5);
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
