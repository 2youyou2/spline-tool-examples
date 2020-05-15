import { Vec3, Vec4, Vec2 } from "cc";
import MeshVertex from "./mesh-vertex";

// Perform an interpolation between two points
function interpolate (a: MeshVertex, b: MeshVertex, fraction = 0.5): MeshVertex {
    let result = MeshVertex.pool.get();

    Vec3.lerp(result.position, a.position, b.position, fraction);
    Vec3.lerp(result.normal, a.normal, b.normal, fraction);
    Vec4.lerp(result.tangent, a.tangent, b.tangent, fraction);
    Vec2.lerp(result.uv, a.uv, b.uv, fraction);

    // Round the values to 6dp
    return result;
}

// Add a value to a set once and return the index
function addOnce (value: MeshVertex, list: MeshVertex[]) {

    // Look through the array for the value
    for (let i = 0; i < list.length; i++) {

        // Check the values match
        if (list[i].position.equals(value.position)) {

            // Return the index
            return i;
        }
    }

    // Add the value to the array as it doesn't exist and return the index
    return (list.push(value) - 1);
}

export default {
    tessellate (vertices, faces, divisions = 0) {

        // Add one to the number of divisions (zero represents no divisions)
        divisions += 1;

        // Define the list of new faces
        const faces1 = [];

        // Add the new interpolated point to the vertices
        const addVertex = (i0, i1, factor) => addOnce(interpolate(vertices[i0], vertices[i1], factor), vertices);

        // Iterate through each of the faces
        for (let fi = 0, fl = faces.length; fi < fl; fi+= 3) {
            let ia = faces[fi], ib = faces[fi+1], ic = faces[fi+2];

            // Interpolate the new vertices and add them to the list returning their vertices
            const iab = addVertex(ia, ib, (1 / divisions));
            const iac = addVertex(ia, ic, (1 / divisions));

            // Add the new face to the faces
            faces1.push(ia, iab, iac);

            // Iterate for a number of times relative to divisions
            for (let i = 1; i < divisions; ++i) {

                // Interpolate the new vertices and add them to the list returning their vertices
                const iab1 = addVertex(ia, ib, ((i + 1) / divisions));
                const iac1 = addVertex(ia, ic, ((i + 1) / divisions));

                // Iterate for a number of times relative to number of subdivisions
                for (let j = 0; j <= i; ++j) {

                    // Add the face to the faces set
                    faces1.push(addVertex(iab, iac, (j / i)), addVertex(iab1, iac1, (j / (i + 1))), addVertex(iab1, iac1, ((j + 1) / (i + 1))));

                    // Add the new face to the faces set
                    if (j < i) faces1.push(addVertex(iab, iac, (j / i)), addVertex(iab1, iac1, ((j + 1) / (i + 1))), addVertex(iab, iac, ((j + 1) / i)));
                }
            }
        }

        // Return the list of faces and vertices
        return faces1;
    },

    // tessellateAlongXDist (vertices: MeshVertex[], faces: number[], space = 1) {
    //     for (let fi = 0; fi < faces.length; fi+=3) {
    //         let fa = faces[fi];
    //         let fb = faces[fi+1];
    //         let fc = faces[fi+2];

    //         let va = vertices[fa];
    //         let vb = vertices[fb];
    //         let vc = vertices[fc];

    //         // let minx = Math.min(va.position.x, vb.position.x, vc.position.x);
    //         // let maxx = Math.max(va.position.x, vb.position.x, vc.position.x);
    //         let minx = Number.MAX_SAFE_INTEGER;
    //         let maxx = -Number.MAX_SAFE_INTEGER;

    //         let points = [va, vb, vc];
    //         let minp, maxp, midp;
    //         for (let i = 0; i < points.length; i++) {
    //             let p = points[i]
    //             if (p.position.x > maxx) {
    //                 maxp = p
    //             }
    //             else if (p.position.x < minx) {
    //                 minp = p
    //             }    
    //         }
    //         for (let i = 0; i < points.length; i++) {
    //             let p = points[i]
    //             if (p !== minp && p !== maxp) {
    //                 midp = p
    //             }
    //         }

    //         let total = maxx - minx;
    //         let count = total / space;
    //         let lastX = minx;
    //         for (let i = 1; i < count; i++) {
    //             let x = minx + i * space;
    //             if (x < midp.position.x) {

    //             }
    //         }
    //     }
    // }
}