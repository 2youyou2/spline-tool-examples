import CurveSample from "./curve-sample";
import { Vec3 } from "cc";

export default interface ISplineCruve {
    length:number;

    getSample (t: number, out?: CurveSample): CurveSample;
    getSampleAtDistance (d: number, out?: CurveSample): CurveSample;
    getPoints () : Vec3[];
    getBounding (min: Vec3, max: Vec3);
}
