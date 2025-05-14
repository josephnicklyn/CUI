const fs = require('fs');
const path = require('path');

function recursiveReadDir(dirPath = './', fileList = [], dirList = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      dirList.push(filePath);
      recursiveReadDir(filePath, fileList, dirList); // Recursive call for subdirectories
    } else {
      fileList.push(filePath);
    }
  });
  return { files: fileList, directories: dirList };
}

function workerDirAsTreeFormat(dirPath = './', orgPathLen, baseDepth = 1) {
    let treeNodes = [];
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const fullPath = path.join(dirPath, entry.name);
        
        let node = {
            text: entry.name,
            attributes: {
                //name: entry.name,
                expanded: false,
                path: fullPath.substring(orgPathLen+1) 
            },
            depth: baseDepth
        };
        
        if (entry.isDirectory()) {
            node.attributes.isDirectory = true;
            treeNodes.push(node);
            const subNodes = workerDirAsTreeFormat(fullPath, orgPathLen, baseDepth + 1);
            treeNodes.push(...subNodes);
        }
    }

    for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const fullPath = path.join(dirPath, entry.name);
        
        let node = {
            text: entry.name,
            attributes: {
                //name: entry.name,
                expanded: false,
                path: fullPath.substring(orgPathLen+1) 
            },
            depth: baseDepth
        };
        
        if (!entry.isDirectory()) {
            node.attributes.isDirectory = false;
            treeNodes.push(node);
        }
    }
    
    return treeNodes;
}

function readDirAsTreeFormat(dirPath = './') {
    let listing = [];
    if (fs.existsSync(dirPath)) {
        const fullPath = path.resolve(dirPath);
        const dirName = path.basename(fullPath); // Use basename of fullPath, not its parent
        let node = {
            text: dirName,
            attributes: {
                expanded: false,
                isDirectory: true,
                path: ""
            },
            depth: 0
        };

        listing = workerDirAsTreeFormat(dirPath, dirPath.length);
        listing.unshift(node);
    }
    return listing;
}


module.exports = {
    recursiveReadDir,
    readDirAsTreeFormat
}