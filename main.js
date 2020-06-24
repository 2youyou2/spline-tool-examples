var settings = window._CCSettings;

function boot () {
    var onStart = function () {
        window._CCSettings = undefined;

        cc.loader.downloader._subpackages = settings.subpackages;
        cc.view.enableRetina(true);
        cc.view.resizeWithBrowserSize(true);
		
		if (cc.sys.isMobile) {
			if (settings.orientation === 'landscape') {
				cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
			} else if (settings.orientation === 'portrait') {
				cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
			}
			cc.view.enableAutoFullScreen(false);
		}
        
        var launchScene = settings.launchScene;
        // load scene
        cc.director.loadScene(launchScene, null,
            function () {
                cc.view.setDesignResolutionSize(960, 640, 4);
                cc.loader.onProgress = null;
                console.log('Success to load scene: ' + launchScene);
            }
        );
    };

    loadJsListModules(settings.jsList).then(function () {
        (boot.systemGlobal || System)['import']('virtual:///prerequisite-imports:main').then(function () {
            cc.game.run(onStart);
        }).catch(function (error) {
            console.error("Load project module error: \n" + error);
        });
    });
};
window.boot = boot;

// Generate options to init cc.game
function initOptions () {

    var uuids = settings.uuids;
    var rawAssets = settings.rawAssets;
    var assetTypes = settings.assetTypes;
    var realRawAssets = settings.rawAssets = {};
    for (var mount in rawAssets) {
        var entries = rawAssets[mount];
        var realEntries = realRawAssets[mount] = {};
        for (var id in entries) {
            var entry = entries[id];
            var type = entry[1];
            // retrieve minified raw asset
            if (typeof type === 'number') {
                entry[1] = assetTypes[type];
            }
            // retrieve uuid
            realEntries[uuids[id] || id] = entry;
        }
    }
    var scenes = settings.scenes;
    for (var i = 0; i < scenes.length; ++i) {
        var scene = scenes[i];
        if (typeof scene.uuid === 'number') {
            scene.uuid = uuids[scene.uuid];
        }
    }
    var packedAssets = settings.packedAssets;
    for (var packId in packedAssets) {
        var packedIds = packedAssets[packId];
        for (var j = 0; j < packedIds.length; ++j) {
            if (typeof packedIds[j] === 'number') {
                packedIds[j] = uuids[packedIds[j]];
            }
        }
    }
    var subpackages = settings.subpackages;
    for (var subId in subpackages) {
        var uuidArray = subpackages[subId].uuids;
        if (uuidArray) {
            for (var k = 0, l = uuidArray.length; k < l; k++) {
                if (typeof uuidArray[k] === 'number') {
                    uuidArray[k] = uuids[uuidArray[k]];
                }
            }
        }
    }

    // asset library options
    const assetOptions = {
        libraryPath: 'res/import',
        rawAssetsBase: 'res/raw-',
        rawAssets: settings.rawAssets,
        packedAssets: settings.packedAssets,
        md5AssetsMap: settings.md5AssetsMap,
        subPackages: settings.subpackages
    };
    const options = {
        scenes: settings.scenes,
        debugMode: settings.debug ? 1 : 3, // cc.debug.DebugMode.INFO : cc.debug.DebugMode.ERROR,
        showFPS: !false && settings.debug,
        frameRate: 60,
        groupList: settings.groupList,
        collisionMatrix: settings.collisionMatrix,
        renderPipeline: settings.renderPipeline,
        adapter: prepare.findCanvas('GameCanvas'),
        assetOptions,
        customJointTextureLayouts: settings.customJointTextureLayouts || [],
    };
    return options;
}

// Load all project scripts (built by creator)
function loadJsListModules(jsList) {
    // jsList
    var promise = Promise.resolve();
    if (jsList) {
        jsList.forEach(function (x) {
            promise = promise.then(function () {
                return prepare.loadIIFE(boot.jsListRoot + '/' + x);
            });
        });
    }
    return promise;
}

// Load all custom script bundles. Every bundle may contain one or more named registered SystemJS modules, with no module.
function loadScriptPackages(scriptPackages) {
    var loadBundlePromises = [];
    if (scriptPackages) {
        for (var iScriptPackage = 0; iScriptPackage < scriptPackages.length; ++iScriptPackage) {
            loadBundlePromises.push(prepare.loadIIFE(scriptPackages[iScriptPackage]));
        }
    }
    return Promise.all(loadBundlePromises);
}

var prepare = function() {
    settings = window._CCSettings;
    return Promise.resolve(prepare.engine ? prepare.engine() : void 0).then(function() {
            return (boot.systemGlobal || System).import('cc');
        }).then(function() {
            var options = initOptions();
            return new Promise(function (resolve, reject) {
                let inited = cc.game.init(options);
                inited ? resolve() : reject();
            });
        }).then(function() {
            return loadScriptPackages(settings.scriptPackages);
        });
};

// Define how to prepare engine so that 'cc' is valid to import.
prepare.engine = void 0;
// Define how to prepare IIFE modules.
prepare.loadIIFE = void 0;
// Adapter: find canvas
prepare.findCanvas = void 0;
// The root url from which we can load js list.
boot.jsListRoot = 'src';
// System JS global. Default to `globalThis.System`.
boot.systemGlobal = undefined;
boot.prepare = prepare;

function addClass (element, name) {
    const hasClass = (' ' + element.className + ' ').indexOf(' ' + name + ' ') > -1;
    if (!hasClass) {
        if (element.className) {
            element.className += ' ';
        }
        element.className += name;
    }
}
const canvas = document.getElementById('GameCanvas');
const $p = canvas.parentElement;
const bcr = $p.getBoundingClientRect();
canvas.width = bcr.width;
canvas.height = bcr.height;

var boot = window.boot;
boot.prepare.engine = function() {
    var importMap = { imports: { }, };
    importMap.imports['cc'] = './cocos3d-js.min.js';
    var importMapElement = document.createElement('script');
    importMapElement.type = 'systemjs-importmap';
    importMapElement.text = JSON.stringify(importMap, undefined, 2);
    document.body.appendChild(importMapElement);
};
boot.prepare.loadIIFE = function (url) {
    return new Promise(function (resolve, reject) {
        var err;
        function windowErrorListener(evt) {
            if (evt.filename === url) {
                err = evt.error;
            }
        }
        window.addEventListener('error', windowErrorListener);
        var script = document.createElement('script');
        script.charset = 'utf-8';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.addEventListener('error', function () {
            window.removeEventListener('error', windowErrorListener);
            reject(Error('Error loading ' + url));
        });
        script.addEventListener('load', function () {
            window.removeEventListener('error', windowErrorListener);
            document.head.removeChild(script);
            // Note that if an error occurs that isn't caught by this if statement,
            // that getRegister will return null and a "did not instantiate" error will be thrown.
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
        script.src = url;
        document.head.appendChild(script);
    });
};
boot.prepare.findCanvas = function () {
    // Use canvas in outer context
    if (!canvas || canvas.tagName !== 'CANVAS') {
        console.error("unknown canvas id:", el);
    }
    var width = canvas.width;
    var height = canvas.height;
    var container = document.createElement('div');
    if (canvas && canvas.parentNode) {
        canvas.parentNode.insertBefore(container, canvas);
    }
    container.setAttribute('id', 'Cocos3dGameContainer');
    container.appendChild(canvas);
    var frame = (container.parentNode === document.body) ? document.documentElement : container.parentNode;
    addClass(canvas, 'gameCanvas');
    canvas.setAttribute('width', width || '480');
    canvas.setAttribute('height', height || '320');
    canvas.setAttribute('tabindex', '99');
    return { frame, canvas, container };
};
boot.prepare().then(boot);
