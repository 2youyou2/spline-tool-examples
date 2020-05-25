import { Vec3, Vec2 } from "cc";

export default class mathf {
    static lerp (a: number, b: number, t: number) : number {
        return a + (b - a) * t;
    }
}

export function pointInPolygonAreaXZ (point: Vec3, polygon: Vec3[]) {
    var inside = false;
    var x = point.x;
    var z = point.z;

    // use some raycasting to test hits
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    var length = polygon.length;

    for (var i = 0, j = length - 1; i < length; j = i++) {
        var xi = polygon[i].x, zi = polygon[i].z,
            xj = polygon[j].x, zj = polygon[j].z,
            intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

let tempLinePos = new Vec2();
export function pointLineDistanceXZ(point, start, end, isSegment) {
    var dx = end.x - start.x;
    var dz = end.z - start.z;
    var d = dx*dx + dz*dz;
    var t = ((point.x - start.x) * dx + (point.z - start.z) * dz) / d;
    var p;

    if (!isSegment) {
        p = tempLinePos.set(start.x + t * dx, start.z + t * dz);
    }
    else {
        if (d) {
            if (t < 0) p = start;
            else if (t > 1) p = end;
            else p = tempLinePos.set(start.x + t * dx, start.z + t * dz);
        }
        else {
            p = start;
        }
    }
        
    dx = point.x - p.x;
    dz = point.z - p.z;
    return Math.sqrt(dx*dx + dz*dz);
}

export function pointInPolygonLineXZ (point: Vec3, polygon: Vec3[], width) {
    for (let i = 1; i < polygon.length; i++) {
        if (pointLineDistanceXZ(point, polygon[i], polygon[i-1], true) < width) {
            return true;
        }
    }
    return false;
}

export function pointPolygonMinDistXZ (point: Vec3, polygon: Vec3[]) {
    let dist = Number.MAX_SAFE_INTEGER;
    for (let i = 1; i < polygon.length; i++) {
        dist = Math.min(pointLineDistanceXZ(point, polygon[i], polygon[i-1], true), dist);
    }
    return dist;
}
