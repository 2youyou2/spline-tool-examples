
const globby = require('globby')
const fs = require('fs');
const del = require('del')
const path = require('path');

let paths = globby.sync([
    'assets/road-tool/res/materials/FedSigns/**/*.meta', 'assets/road-tool/res/materials/FedSigns/**/*.mat',
    'assets/road-tool/res/materials/Markers/**/*.meta', 'assets/road-tool/res/materials/Markers/**/*.mat',
    'assets/road-tool/res/materials/Signs/**/*.meta', 'assets/road-tool/res/materials/Signs/**/*.mat',
])
console.log(paths);

paths.forEach(path => {
    del.sync(path, {force: true})
})

// let paths = globby.sync(['./**/*.FBX'])
// console.log(paths);

// paths.forEach(p => {
//     if (p.endsWith('.FBX')) {
//         let renameP = p.replace('.FBX', '.fbx');
//         console.log(renameP);
//         fs.renameSync(p, renameP)
//     }
// })
    
