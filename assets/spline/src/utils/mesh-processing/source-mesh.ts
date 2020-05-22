import { Mesh, Vec3, Quat, GFXAttributeName, Vec4, Vec2 } from 'cc';
import MeshVertex from './mesh-vertex';
import MeshUtility from './mesh-utility';
import MeshTesselate from './mesh-tesselate';

export default class SourceMesh {
    public static build (mesh: Mesh) {
        return new SourceMesh(mesh);
    }

    public translation = new Vec3;
    public rotation = new Quat;
    public scale = new Vec3;

    private _mesh: Mesh;
    get mesh () {
        return this._mesh;
    }

    private _vertices: MeshVertex[][] = [];
    get vertices () {
        if (!this._vertices[0]) this.buildData();
        return this._vertices[0];
    }

    private _triangles: number[][] = [];
    get triangles () {
        if (!this._vertices[0]) this.buildData();
        return this._triangles[0];
    }

    private _minX: number[] = [0];
    get minX () {
        if (!this._vertices[0]) this.buildData();
        return this._minX[0];
    }

    private _length: number[] = [0];
    get length () {
        if (!this._vertices[0]) this.buildData();
        return this._length[0];
    }

    getVertices (subMeshIndex = 0) {
        if (!this._vertices[subMeshIndex]) this.buildData();
        return this._vertices[subMeshIndex];
    }
    getTriangles (subMeshIndex = 0) {
        if (!this._vertices[subMeshIndex]) this.buildData();
        return this._triangles[subMeshIndex];
    }
    getMinX (subMeshIndex = 0) {
        if (!this._vertices[subMeshIndex]) this.buildData();
        return this._minX[subMeshIndex];
    }
    getLength (subMeshIndex = 0) {
        if (!this._vertices[subMeshIndex]) this.buildData();
        return this._length[subMeshIndex];
    }
    subCount () {
        return this.mesh ? this.mesh.subMeshCount : 0;
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

    public translate (x: number | Vec3, y: number, z: number) {
        this.reset();
        if (typeof x === 'number') {
            this.translation.set(x, y, z);
        }
        else {
            this.translation.set(x);
        }
        return this;
    }

    public rotate (rotation: Quat) {
        this.reset();
        this.rotation.set(rotation);
        return this;
    }

    public scaleRes (x: number | Vec3, y: number, z: number) {
        this.reset();
        if (typeof x === 'number') {
            this.scale.set(x, y, z);
        }
        else {
            this.scale.set(x);
        }
        return this;
    }

    public reset () {
        if (this._vertices.length > 0) {
            this._vertices.forEach(vs => {
                vs.forEach(v => {
                    MeshVertex.pool.put(v);
                })
            })
            this._vertices.length = 0;
        }

        this._triangles.length = 0;
    }

    private buildData () {

        let subMeshCount = this.mesh.subMeshCount;
        for (let si = 0; si < subMeshCount; si++) {
            // if the mesh is reversed by scale, we must change the culling of the faces by inversing all triangles.
            // the mesh is reverse only if the number of resersing axes is impair.
            let reversed = this.scale.x < 0;
            if (this.scale.y < 0) reversed = !reversed;
            if (this.scale.z < 0) reversed = !reversed;
            if (reversed) {
                this._triangles[si] = MeshUtility.getReversedTriangles(this._mesh, si);
            }
            else {
                if (!this._triangles[si]) this._triangles[si] = [];
                this._mesh.copyIndices(si, this._triangles[si]);
            }


            // we transform the source mesh vertices according to rotation/translation/scale
            let vertices = this._vertices[si] = this._vertices[si] || [];
            let positions = this._mesh.readAttribute(si, GFXAttributeName.ATTR_POSITION);
            let normals = this._mesh.readAttribute(si, GFXAttributeName.ATTR_NORMAL);

            let tangents = this._mesh.readAttribute(si, GFXAttributeName.ATTR_TANGENT);
            let hasTangents = tangents && tangents.length > 0;

            let uvs = this._mesh.readAttribute(si, GFXAttributeName.ATTR_TEX_COORD);
            let hasUvs = uvs && uvs.length > 0;

            let vertCount = positions.length / 3;
            let i = 0;
            for (; i < vertCount; i++) {
                let transformed = vertices[i];
                if (!transformed) {
                    transformed = vertices[i] = MeshVertex.pool.get();
                }
                transformed.position.set(positions[3 * i + 0], positions[3 * i + 1], positions[3 * i + 2]);
                transformed.normal.set(normals[3 * i + 0], normals[3 * i + 1], normals[3 * i + 2]);
                if (hasUvs) {
                    transformed.uv.set(uvs[2 * i + 0], uvs[2 * i + 1]);
                }
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

            // find the bounds along x
            this._minX[si] = Number.MAX_SAFE_INTEGER;
            let maxX = -Number.MAX_SAFE_INTEGER;
            for (let i = 0; i < vertices.length; i++) {
                let vert = vertices[i];
                let p = vert.position;
                maxX = Math.max(maxX, p.x);
                this._minX[si] = Math.min(this._minX[si], p.x);
            }
            this._length[si] = Math.abs(maxX - this._minX[si]);
        }
    }

}
