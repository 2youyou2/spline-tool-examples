import { Node, Mat4, Vec3, Color, ModelComponent } from 'cc';
import MeshUtility from '../utils/mesh-processing/mesh-utility';

let tempMat4 = new Mat4;
let tempVec3 = new Vec3;

export function createLineShape (name, color?: Color) {
    const { createMesh, addMeshToNode, setMeshColor, AttributeName, updateVBAttr, updateIBAttr } = window.cce.gizmos.EngineUtils;

    name = name || 'Line';
    color = color || cc.Color.WHITE;

    let mesh = MeshUtility.createMesh({
        positions: [
            cc.v3(0,0),
            cc.v3(0,1),
            cc.v3(1,0),
            cc.v3(1,1),
        ],
        indices: [ 0, 1, 1, 2, 2, 3],
        primitiveType: cc.GFXPrimitiveMode.LINE_LIST
    })

    let node: Node = create3DNode(name);
    addMeshToNode(node, mesh);
    setMeshColor(node, color);

    let model = node.getComponent(ModelComponent);

    let indices = [];
    //@ts-ignore
    node.updatePoints = function (points) {
        indices.length = 0;
        for (let i = 1; i < points.length; i++) {
            indices.push(i - 1, i);
        }

        MeshUtility.updateOrCreateModelMesh(model, {
            positions: points,
            indices,
            primitiveType: cc.GFXPrimitiveMode.LINE_LIST
        })
    }

    return node;
}

export function create3DNode(name: string) {
    const node = new cc.Node(name);
    node._layer = cc.Layers.Enum.GIZMOS;
    node.modelColor = cc.color();
    return node;
}

export function callGizmoFunction (cb) {
    if (!window.cce) return;
    if (window.cce.gizmos) {
        cb();
        return;
    }

    setTimeout(() => {
        callGizmoFunction(cb);
    }, 500);
}



export function getNodeLocalPostion (node: Node, position: Vec3, out?: Vec3, isNormal = false) {
    node.getWorldMatrix(tempMat4);
    Mat4.invert(tempMat4, tempMat4);
    if (isNormal) {
        return Vec3.transformMat4Normal(out || new Vec3, position, tempMat4);
    }
    else {
        return Vec3.transformMat4(out || new Vec3, position, tempMat4);
    }
}
export function getNodeWorldPostion (node: Node, position: Vec3, out?: Vec3, isNormal = false) {
    node.getWorldMatrix(tempMat4);
    if (isNormal) {
        return Vec3.transformMat4Normal(out || new Vec3, position, tempMat4);
    }
    else {
        return Vec3.transformMat4(out || new Vec3, position, tempMat4);
    }
}
export function node2nodePos (node1: Node, node2: Node, position: Vec3, out?: Vec3, isNormal = false) {
    getNodeWorldPostion(node1, position, out, isNormal);
    getNodeLocalPostion(node2, out, out, isNormal);
    return out;
}
export function node2nodeLength (node1: Node, node2: Node, length: number) {
    tempVec3.set(length, 0, 0);
    node2nodePos(node1, node2, tempVec3, tempVec3, true);
    return tempVec3.length();
}
