import { _decorator, Component, Node, CameraComponent, Vec3, tween } from 'cc';
const { ccclass, property, type } = _decorator;

let tempVec3 = new Vec3;

@ccclass('SplineExamplesUi')
export class SplineExamplesUi extends Component {
    @type(Node)
    examplesRoot: Node = null;

    @type(CameraComponent)
    camera: CameraComponent = null;

    index = 0;

    start () {
        // Your initialization goes here.
        this.gotoExample();
    }

    next () {
        this.index++;
        this.gotoExample();
    }

    prev () {
        this.index--;
        this.gotoExample();
    }

    gotoExample () {
        let examples = this.examplesRoot.children;
        if (this.index < 0) {
            this.index = examples.length - 1;
        }
        else if (this.index >= examples.length) {
            this.index = 0;
        }

        tempVec3.set(this.camera.node.position);
        tempVec3.x = examples[this.index].position.x;
        
        tween(this.camera.node)
            .to(0.5, { position: tempVec3 })
            .start()
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
