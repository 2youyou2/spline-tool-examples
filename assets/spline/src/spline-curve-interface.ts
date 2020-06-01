import CurveSample from "./curve-sample";

export default interface ISplineCruve {
    length:number;

    getSample (t: number, out?: CurveSample): CurveSample;
    getSampleAtDistance (d: number, out?: CurveSample): CurveSample;
}
