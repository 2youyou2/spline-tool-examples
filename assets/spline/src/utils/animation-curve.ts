import { geometry, CurveRange } from 'cc'

function createKeyframe(time, value, inTangent=0, outTangent=0) {
    let frame = new geometry.Keyframe();
    frame.time = time;
    frame.value = value;
    frame.inTangent = inTangent;
    frame.outTangent = outTangent;
    return frame;
}


// A collection of curves form an [[AnimationClip]].
export default class UAnimationCurve {
    

    // A constant line at /value/ starting at /timeStart/ and ending at /timeEnd/
    public static constant (timeStart, timeEnd, value): geometry.AnimationCurve {
        return this.linear(timeStart, value, timeEnd, value);
    }

    // A straight Line starting at /timeStart/, /valueStart/ and ending at /timeEnd/, /valueEnd/
    public static linear (timeStart, valueStart, timeEnd, valueEnd): geometry.AnimationCurve {
        if (timeStart == timeEnd) {
            let key = createKeyframe(timeStart, valueStart);
            return new geometry.AnimationCurve([key]);
        }

        let tangent = (valueEnd - valueStart) / (timeEnd - timeStart);
        let keys = [createKeyframe(timeStart, valueStart, 0.0, tangent), createKeyframe(timeEnd, valueEnd, tangent, 0.0)];
        return new geometry.AnimationCurve(keys);
    }

    // An ease-in and out curve starting at /timeStart/, /valueStart/ and ending at /timeEnd/, /valueEnd/.
    public static easeInOut (timeStart, valueStart, timeEnd, valueEnd): geometry.AnimationCurve {
        if (timeStart == timeEnd) {
            let key = createKeyframe(timeStart, valueStart);
            return new geometry.AnimationCurve([key]);
        }

        let keys = [createKeyframe(timeStart, valueStart, 0.0, 0.0), createKeyframe(timeEnd, valueEnd, 0.0, 0.0)];
        return new geometry.AnimationCurve(keys);
    }

    public static one () {
        let curve = new CurveRange;
        curve.constant = 1;
        return curve;
    }
}

