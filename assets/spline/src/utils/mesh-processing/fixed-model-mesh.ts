import FixedBuffer, { AttributesKey, builtinAttributes } from "./fixed-buffer";
import { Mesh, GFXFormatInfos, GFXPrimitiveMode, IGFXAttribute, utils, ModelComponent } from "cc";

const MAX_VERTICES_COUNT = 65535;

export default class FixedModelMesh {
    static create (verticesCount, indicesCount, modelCount, attributes: AttributesKey[] = ['position', 'normal', 'tangent', 'uv']) {
        let fixedModelMesh = new FixedModelMesh();
        
        let gfxAttrs: IGFXAttribute[] = [];
        let attrs: any = {};

        let stride = 0;
        for (let i = 0; i < attributes.length; i++) {
            let builtinAttribute = builtinAttributes[attributes[i]];
            let format = builtinAttribute.format;
            
            gfxAttrs.push({
                name: builtinAttribute.name,
                format,
            })
            attrs[attributes[i]] = {
                gfxIndex: i,
                offset: stride,
                format: format
            };

            let info = GFXFormatInfos[format];
            stride += info.size;
        }

        fixedModelMesh._attrs = attrs;
        fixedModelMesh._stride = stride;
        
        let buffers = fixedModelMesh._buffers;

        let totalVerticesBytes = modelCount * verticesCount * stride;
        let totalIndicesBytes = modelCount * indicesCount * 2;
        let totalBytes = totalVerticesBytes + totalIndicesBytes;
        let arrayBuffer = new ArrayBuffer(totalBytes);

        fixedModelMesh._dataView = new DataView(arrayBuffer, 0, totalVerticesBytes);
        fixedModelMesh._iView = new Uint16Array(arrayBuffer, totalVerticesBytes, modelCount * indicesCount);

        let maxModelCount = Math.floor(MAX_VERTICES_COUNT / verticesCount);
        let arrayBufferVerticesOffset = 0;
        let arrayBufferIndicesOffset = totalVerticesBytes;
        while (modelCount > 0) {
            let currCount = Math.min(maxModelCount, modelCount);
            let buffer = FixedBuffer.create(
                currCount * verticesCount,
                currCount * indicesCount,
                attributes, 
                {
                    arrayBuffer,
                    arrayBufferVerticesOffset,
                    arrayBufferIndicesOffset
                }
            );
            buffers.push(buffer);
            modelCount -= maxModelCount;
            arrayBufferVerticesOffset += buffer.verticesBytes;
            arrayBufferIndicesOffset += buffer.indicesBytes;
        }
        fixedModelMesh.maxBatchVerticesCount = maxModelCount * verticesCount;

        let meshStruct: Mesh.IStruct = {
            vertexBundles: [],
            primitives: [],
        };
        for (let i = 0; i < buffers.length; i++) {
            const vertexBundle: Mesh.IVertexBundle = {
                attributes: gfxAttrs,
                view: {
                    offset: buffers[i].verticesOffset,
                    length: buffers[i].verticesBytes,
                    count: buffers[i].verticesCount,
                    stride,
                },
            };
            meshStruct.vertexBundles.push(vertexBundle)
            
            const primitive: Mesh.ISubMesh = {
                primitiveMode: GFXPrimitiveMode.TRIANGLE_LIST,
                vertexBundelIndices: [i],
                indexView: {
                    offset: buffers[i].indicesOffset,
                    length: buffers[i].indicesBytes,
                    count: buffers[i].indicesCount,
                    stride: 2,
                }
            }
            meshStruct.primitives.push(primitive)
        }
        
        let mesh = new Mesh();
        mesh.reset({
            struct: meshStruct,
            data: new Uint8Array(arrayBuffer),
        });

        fixedModelMesh.mesh = mesh;

        return fixedModelMesh;
    }

    mesh: Mesh = null;

    maxBatchVerticesCount = 0;

    _buffers: FixedBuffer[] = [];

    _dataView: DataView = null;
    _iView: Uint16Array = null;

    _attrs: any = {};
    _stride = 0;

    writeVertex (vertOffset, attrName, value) {
        let attr = this._attrs[attrName];
        let offset = vertOffset * this._stride + attr.offset;
        utils.writeBuffer(this._dataView, value, attr.format, offset, this._stride);
    }
    writeIndex (indexOffset, value) {
        value = value % this.maxBatchVerticesCount;
        this._iView[indexOffset] = value;
    }
    update (modelComp: ModelComponent) {
        let subMeshes = this.mesh.renderingSubMeshes;
        for (let i = 0; i < subMeshes.length; i++) {
            let subMesh = subMeshes[i];
            let fixedBuffer = this._buffers[i];

            let vb = subMesh.vertexBuffers[0];
            vb.update(fixedBuffer._vbuffer);
            let ib = subMesh.indexBuffer;
            ib.update(fixedBuffer._ibuffer);

            let model = modelComp.model && modelComp.model.getSubModel(i);
            if (model) {
                let ia = model.inputAssembler;
                if (!ia) return;
                ia.vertexCount = fixedBuffer.verticesCount;
                ia.indexCount = fixedBuffer.indicesCount;
                model.updateCommandBuffer();
            }
        }
    }
}
