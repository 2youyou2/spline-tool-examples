import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
const { ccclass, property } = _decorator;

export const sceneArray: string[] = [];

@ccclass('SceneManager')
export class SceneManager extends Component {

    @property ({ type: Prefab })
    public itemPrefab: Prefab | null  = null;

    public onLoad () {
        if (this.itemPrefab){
            sceneArray.sort((a, b) => {
                if (a.indexOf('test')) {
                    return -1;
                }
                else if (b.indexOf('test')) {
                    return 1;
                }

                return 0;
            })

            for (let i = 0; i < sceneArray.length; i++ ) {
                const item = instantiate(this.itemPrefab);
                this.node.addChild(item);
            }
        }
    }

    public start () {
    }
}
