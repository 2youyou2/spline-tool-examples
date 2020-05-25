import { Enum } from 'cc';

export enum ScatterType {
    Mesh,
    Instance,
}
Enum(ScatterType);

export class VolumeInfo {
    volume = 0;
    maxCount = 0;
    count = 0;
}

export enum VolumeType {
    Area,
    Line,
}
Enum(VolumeType);
