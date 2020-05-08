import { Node, Mat4, Vec3, Color } from 'cc';



export function createLineShape (name, color?: Color) {
    const { createMesh, addMeshToNode, setMeshColor, AttributeName, updateVBAttr, updateIBAttr } = window.cce.gizmos.EngineUtils;

    name = name || 'Line';
    color = color || cc.Color.WHITE;

    let mesh = createMesh({
        positions: [
            cc.v3(0,0),
            cc.v3(0,1),
            cc.v3(1,0),
            cc.v3(1,1),
        ],
        primitiveType: cc.GFXPrimitiveMode.LINE_LIST
    })

    let node = create3DNode(name);
    addMeshToNode(node, mesh);
    setMeshColor(node, color);


    node.updatePoints = function (points) {
        let indices = [];
        for (let i = 1; i < points.length; i++) {
            indices.push(i - 1, i);
        }

        // updateVBAttr(node.modelComp, AttributeName.POSITION, points);
        // updateIBAttr(node.modelComp, indices);

        let mesh = createMesh({
            positions: points,
            indices,
            primitiveType: cc.GFXPrimitiveMode.LINE_LIST
        })

        node.modelComp.mesh = mesh;
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
    if (window.cce.gizmos) {
        cb();
        return;
    }

    setTimeout(() => {
        callGizmoFunction(cb);
    }, 500);
}



let tempMat4 = new Mat4;
export function getNodeLocalPostion (node: Node, position: Vec3, out?: Vec3) {
    node.getWorldMatrix(tempMat4);
    Mat4.invert(tempMat4, tempMat4);
    return Vec3.transformMat4(out || new Vec3, position, tempMat4);
}
export function getNodeWorldPostion (node: Node, position: Vec3, out?: Vec3) {
    node.getWorldMatrix(tempMat4);
    return Vec3.transformMat4(out || new Vec3, position, tempMat4);
}
