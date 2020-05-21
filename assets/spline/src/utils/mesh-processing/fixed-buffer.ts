import { GFXAttributeName, GFXFormat, GFXFormatInfos, utils, IGFXAttribute } from "cc";

export const builtinAttributes = {
    position: { name: GFXAttributeName.ATTR_POSITION, format: GFXFormat.RGB32F },
    normal: { name: GFXAttributeName.ATTR_NORMAL, format: GFXFormat.RGB32F },
    uv: { name: GFXAttributeName.ATTR_TEX_COORD, format: GFXFormat.RG32F },
    color: { name: GFXAttributeName.ATTR_COLOR, format: GFXFormat.RGBA32F },
    tangent: { name: GFXAttributeName.ATTR_TANGENT, format: GFXFormat.RGBA32F },
}
export type AttributesKey = 'position' | 'normal' | 'uv' | 'tangent' | 'color';

export default class FixedBuffer {
    static create (verticesCount, indicesCount, attributes: AttributesKey[] = ['position', 'normal', 'tangent', 'uv'], { arrayBuffer, arrayBufferVerticesOffset = 0, arrayBufferIndicesOffset = 0}) {

        let attrs: any = {};

        let stride = 0;
        for (let i = 0; i < attributes.length; i++) {
            let builtinAttribute = builtinAttributes[attributes[i]];
            let format = builtinAttribute.format;
            let info = GFXFormatInfos[format];
            attrs[attributes[i]] = {
                gfxIndex: i,
                offset: stride,
                format: format
            };

            stride += info.size;
        }

        let fixedBuffer = new FixedBuffer;

        fixedBuffer.verticesCount = verticesCount;
        fixedBuffer.indicesCount = indicesCount;

        fixedBuffer.verticesBytes = verticesCount * stride;
        fixedBuffer.indicesBytes = indicesCount * 2;

        if (arrayBuffer) {
            fixedBuffer.verticesOffset = arrayBufferVerticesOffset;
            fixedBuffer.indicesOffset = arrayBufferIndicesOffset;

            fixedBuffer._buffer = arrayBuffer;
        }
        else {
            fixedBuffer.verticesOffset = 0;
            fixedBuffer.indicesOffset = fixedBuffer.verticesBytes;

            fixedBuffer._buffer = new ArrayBuffer(verticesCount * stride + indicesCount * 2);
        }

        fixedBuffer._dataView = new DataView(fixedBuffer._buffer, fixedBuffer.verticesOffset, fixedBuffer.verticesBytes);
        fixedBuffer._iView = new Uint16Array(fixedBuffer._buffer, fixedBuffer.indicesOffset, indicesCount);
        fixedBuffer._vbuffer = new Uint8Array(fixedBuffer._buffer, fixedBuffer.verticesOffset, fixedBuffer.verticesBytes);
        fixedBuffer._ibuffer = new Uint8Array(fixedBuffer._buffer, fixedBuffer.indicesOffset, fixedBuffer.indicesBytes);

        fixedBuffer.stride = stride;
        fixedBuffer._attrs = attrs;

        return fixedBuffer;
    }

    _buffer: ArrayBuffer = null;
    _ibuffer: Uint8Array = null;
    _vbuffer: Uint8Array = null;

    _dataView: DataView = null;
    
    _iView: Uint16Array = null;

    _attrs: any = {};

    verticesCount = 0;
    indicesCount = 0;

    verticesBytes = 0;
    indicesBytes = 0;

    verticesOffset = 0;
    indicesOffset = 0;

    stride = 0;

    writeVertex (vertOffset, attrName, value) {
        let attr = this._attrs[attrName];
        let offset = this.verticesOffset + vertOffset * this.stride + attr.offset;
        utils.writeBuffer(this._dataView, value, attr.format, offset, this.stride);
    }
    writeIndex (indexOffset, value) {
        let offset = this.indicesOffset + indexOffset;
        this._iView[offset] = value;
    }
}
