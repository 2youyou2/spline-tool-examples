import { Mesh, Vec3, ValueType, utils, GFXFormat, GFXFormatInfos, GFXAttributeName, ModelComponent } from 'cc';

let primitiveAttr = {
    positions: {
        size: 3,
        gfxName: GFXAttributeName.ATTR_POSITION
    },
    normals: {
        size: 3,
        gfxName: GFXAttributeName.ATTR_NORMAL
    },
    uvs: {
        size: 2,
        gfxName: GFXAttributeName.ATTR_TEX_COORD
    },
    tangent: {
        size: 3,
        gfxName: GFXAttributeName.ATTR_TANGENT
    }
}

function flat (arr: any) {
    if (arr && arr[0] !== undefined && arr[0] instanceof ValueType) {
        let ret = [];
        for (let i = 0, l = arr.length; i < l; i++) {
            let val = arr[i];
            val.constructor.toArray(ret, val, ret.length);
        }
        return ret;
    }
    return arr;
};

function getVerticesCount (primitive) {
    let count = Number.MAX_SAFE_INTEGER;
    for (let name in primitiveAttr) {
        if (primitive[name]) {
            count = Math.min(primitive[name].length / primitiveAttr[name].size, count);
        }
    }

    return count;
}

function getIndicesCount (primitive) {
    if (!primitive.indices) {
        return 0;
    }
    return primitive.indices.length;
}


function updateMeshVB (mesh: Mesh, attr: string, newValues: [], buffer: ArrayBuffer, stride: number) {
    let attributes = mesh.struct.vertexBundles[0].attributes;
    let offset = 0;
    let format = GFXFormat.UNKNOWN;
    for (const a of attributes) {
        if (a.name === attr) { format = a.format; break; }
        offset += GFXFormatInfos[a.format].size;
    }

    utils.writeBuffer(new DataView(buffer), newValues, format, offset, stride);
}


export default {
    getReversedTriangles (mesh: Mesh) {
        let res: number[] = [];
        mesh.copyIndices(0, res);
        var triangleCount = res.length / 3;
        for (var i = 0; i < triangleCount; i++) {
            var tmp = res[i * 3];
            res[i * 3] = res[i * 3 + 1];
            res[i * 3 + 1] = tmp;
        }
        return res;
    },

    createMesh (primitive: any) {
        primitive = Object.assign({}, primitive);

        // prepare data
        primitive.primitiveMode = primitive.primitiveType;

        for (let name in primitiveAttr) {
            if (primitive[name]) {
                primitive[name] = flat(primitive[name]);
            }
        }

        return cc.utils.createMesh(primitive);
    },

    updateMesh (modelComp: ModelComponent, primitive: any) {
        let mesh = modelComp.mesh;
        primitive = Object.assign({}, primitive);

        // prepare data
        primitive.primitiveMode = primitive.primitiveType;

        for (let name in primitiveAttr) {
            if (primitive[name]) {
                primitive[name] = flat(primitive[name]);
            }
        }


        // update vb 
        let subMesh = mesh.renderingSubMeshes[0];
        let vb = subMesh.vertexBuffers[0];

        let vertCount = getVerticesCount(primitive);
        let newVBSize = vb.stride * vertCount;

        //@ts-ignore
        let vbuffer: Uint8Array = vb.vbuffer;
        if (!vbuffer || vbuffer.length !== newVBSize) {
            //@ts-ignore
            vbuffer = vb.vbuffer = new Uint8Array(newVBSize);

            for (let name in primitiveAttr) {
                if (primitive[name]) {
                    updateMeshVB(mesh, primitiveAttr[name].gfxName, primitive[name], vbuffer.buffer, vb.stride);
                }
            }

            vb.resize(newVBSize);
        }
        else {
            for (let name in primitiveAttr) {
                if (primitive[name]) {
                    updateMeshVB(mesh, primitiveAttr[name].gfxName, primitive[name], vbuffer.buffer, vb.stride);
                }
            }
        }
        vb.update(vbuffer.buffer);

        // update ib
        if (!primitive.indices) return;
        let ib = subMesh.indexBuffer;
        let newIBSize = getIndicesCount(primitive);

        //@ts-ignore
        let ibuffer = ib.ibuffer;
        if (!ibuffer || ibuffer.length !== newIBSize) {
            const ctor = ib.stride === 1 ? Uint8Array : (ib.stride === 2 ? Uint16Array : Uint32Array);
            //@ts-ignore
            ibuffer = ib.ibuffer = new ctor(newIBSize);
            ib.resize(newIBSize * ib.stride);
        }
        ibuffer.set(primitive.indices);
        ib.update(ibuffer.buffer);

        // update ia
        let model = modelComp.model && modelComp.model.getSubModel(0);
        if (!model) return;
        let ia = model.inputAssembler;
        if (!ia) return;
        ia.vertexCount = vertCount;
        ia.indexCount = newIBSize;
        model.updateCommandBuffer();
    },

    updateModelMesh (model: ModelComponent, primitive) {
        if (!model.mesh) {
            model.mesh = this.createMesh(primitive);
        }
        else {
            this.updateMesh(model, primitive);
        }
    }
}