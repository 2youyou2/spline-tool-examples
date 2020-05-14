
const globby = require('globby')
const fs = require('fs');
const del = require('del')
const path = require('path');

let paths = globby.sync(['./**/*.meta', './**/*.prefab'])
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
    
