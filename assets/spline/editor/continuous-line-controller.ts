import Controller from './base/controller';
import { createLineShape } from './utils';

export default class ContinuousLineController extends Controller {
    _lineShape = null;
    
    constructor (rootNode) {
        super(rootNode);
        this.initShape();
    }

    initShape () {
        this.createShapeNode('ContinuousLineController');

        this._lineShape = createLineShape('Continuous Line');
        this._lineShape.parent = this.shape;
    }

    updatePoints (points) {
        this._lineShape.updatePoints(points);
    }
}