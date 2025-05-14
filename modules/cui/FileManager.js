const fs = require('fs/promises');

const path = require('path');
const {readDirAsTreeFormat} = require("./apputils");
class FileManager {
    constructor(root = "./") {
        if (FileManager.instance) return FileManager.instance;
        this.root = path.resolve(root);
        FileManager.instance = this;

        this.treeCache = [];
        this.listeners = [];//new Set();
        this.initializeTree(root);
    }


    resolve(p, { allowTrailingDots = false } = {}) {
        // Check for non-string or null byte
        if (typeof p !== 'string' || p.includes('\0')) {
            this.sendErrorMessage(p, "Invalid path: Must be a string without null bytes");
            return null;
        }
    
        // Normalize and clean the path
        const cleanedPath = path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, '');
        if (!cleanedPath || cleanedPath.trim() === '') {
            this.sendErrorMessage(p, "Invalid path: Empty or whitespace-only path");
            return null;
        }
    
        // Resolve the full path
        const resolved = path.resolve(this.root, cleanedPath);
        
        // Enforce sandbox
        // if (!resolved.startsWith(this.root)) {
        //     this.sendErrorMessage(p, "Access denied: Path outside root");
        //     return null;
        // }
    
        // Check for invalid characters
        const invalidChars = /[<>:"|?*]/;
        if (invalidChars.test(cleanedPath)) {
            this.sendErrorMessage(p, "Invalid path: Contains forbidden characters (<, >, :, \", |, ?, *)");
            return null;
        }
    
        // Check path components for validity, but allow . and .. for tree building
        const components = cleanedPath.split(path.sep);
        for (const component of components) {
            if (!component || component.trim() === '') {
                continue; // Skip empty components
            }
            if (component.length > 255) {
                this.sendErrorMessage(p, `Invalid path: Component "${component}" exceeds 255 characters`);
                return null;
            }
            const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
            if (reservedNames.test(component)) {
                this.sendErrorMessage(p, `Invalid path: Contains reserved name "${component}"`);
                return null;
            }
            if (component.startsWith(' ') || component.endsWith(' ')) {
                this.sendErrorMessage(p, `Invalid path: Component "${component}" has leading/trailing spaces`);
                return null;
            }

            if (!allowTrailingDots && component.endsWith('.')) {
                this.sendErrorMessage(p, `Invalid path: Component "${component}" has trailing dots`);
                return null;
            }
        }
    
        return resolved;
    }


    sendErrorMessage(path, message) {
        this.emitChange({ type: "error", path, message });
    }

    async read(filePath, relative = false) {
        const fullPath = relative ? filePath: this.resolve(filePath);
        if (!fullPath) return "";
        return await fs.readFile(fullPath, 'utf8');
    
    }

    getRoot() {
        return this.root;
    }

    toDirectory(pathString) {
        if (typeof pathString !== 'string' || !pathString.trim()) {
            return this.root;
        }
    
        pathString = pathString.trim().replace(/\/+/g, '/').replace(/\/$/, '');
    
        if (pathString === '' || pathString === '/') {
            return '/';
        }
    
        const lastSlash = pathString.lastIndexOf('/');
        if (lastSlash <= 0) return '/';
    
        return pathString.substring(0, lastSlash) || '/';
    }
    

    absoluteToRelative(absolutePath) {
        return path.relative(this.root, absolutePath);
    }

    async write(filePath, content, { overwrite = false } = {}) {
        const isAbsolute = path.isAbsolute(filePath);
        const fullPath = isAbsolute ? filePath : this.resolve(filePath);
        if (!fullPath) return;
        // this.emitChange({ type: "add", fullPath, resolved: this.absoluteToRelative(filePath) });
        const baseName = path.basename(fullPath);
        if (!baseName.includes('.')) {
            this.sendErrorMessage(filePath, "Filename must have an extension (e.g., .txt)");
            return;
        }
    
        const exists = await this.exists(filePath);
        if (!exists || overwrite === true) {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
            // Only update tree cache for files within project root
            if (fullPath.startsWith(this.root)) {
                const relativePath = path.relative(this.root, fullPath);
                const insertIndex = this.findInsertIndexForFile(relativePath);
                if (insertIndex !== null) {
                    const parentPath = path.dirname(relativePath); // use relativePath, not fullPath?

                    const parentNode = this.treeCache.find(n => n.attributes.path === parentPath);
                    const depth = parentNode ? parentNode.depth + 1 : 1;

                    const newNode = {
                        text: baseName,
                        attributes: {
                            path: relativePath,
                            isDirectory: false
                        },
                        depth
                    };
                    this.treeCache.splice(insertIndex, 0, newNode);
                }
    
                this.patchCreateDirPath(fullPath);
                this.emitChange({ type: exists?"update":"create", path: fullPath });
            }
    
            await fs.writeFile(fullPath, content, 'utf8');
        } else {
            this.sendErrorMessage(filePath, "Already exists and overwrite=false");
        }
    }
    

    getRelativeParentDepth(relativePath) {
        const parentPath = path.dirname(relativePath);
        const parentNode = this.treeCache.find(n => n.attributes.path === parentPath);
        return parentNode ? parentNode.depth + 1 : 1;
    }

    async mkdir(dirPath) {
        const fullPath = this.resolve(dirPath);
        if (!fullPath) return;
        const baseName = path.basename(dirPath);
        if (baseName.includes('.')) {
            this.sendErrorMessage(dirPath, "Directory names cannot contain dots (e.g., no extensions)");
            return;
        }
        await fs.mkdir(fullPath, { recursive: true });
        this.refreshTree();
    }
    
    async list(dirPath = ".", relative = true, options = {}) {
        const {
            directoriesOnly = false,
            excludeNames = [],
            excludeHidenFiles = true
        } = options;
    
        const fullPath = relative ? this.resolve(dirPath) : dirPath;
        if (!fullPath) return [];
    
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
        const items = entries.filter(item => {
            if (item.isSymbolicLink()) return false;
            if (excludeHidenFiles && item.name.startsWith(".")) return false;
            if (directoriesOnly && !item.isDirectory()) return false;
            if (excludeNames.includes(item.name)) return false;
            return true;
        });
        
        return items.map(entry => ({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file'
        }));
    }

    async exists(filePath) {
        try {
            await fs.access(this.resolve(filePath));
            return true;
        } catch {
            return false;
        }
    }

    async stat(filePath) {
        return await fs.stat(this.resolve(filePath));
    }

    async delete(filePath) {
        const fullPath = this.resolve(filePath);
        if (!fullPath) return;
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
        } else {
            await fs.unlink(fullPath);
        }
        this.refreshTree(); // Rebuild after delete
    }

    isValidFilename(name) {
        return (
            typeof name === "string" &&
            !name.includes("..") &&
            !/[<>:"|?*]/.test(name) &&
            name.trim() !== ""
        );
    }

    // TREE CASHE MANAGEMENT


    patchCreateDirPath(fullPath) {
        if (!fullPath.startsWith(this.root)) return; // don't patch tree for out-of-project files
        const relative = path.relative(this.root, fullPath);
        const parts = relative.split(path.sep);
        let currentPath = '';
        let depth = 0;
    
        for (let part of parts.slice(0, -1)) {
            currentPath = path.join(currentPath, part);
            const existing = this.treeCache.find(n => n.attributes.path === currentPath);
            if (!existing) {
                const parentPath = path.dirname(currentPath);
                const insertIndex = this.treeCache.findIndex(n => n.attributes.path === parentPath);
                const node = {
                    text: part,
                    attributes: {
                        path: currentPath,
                        isDirectory: true
                    },
                    depth: insertIndex >= 0 ? this.treeCache[insertIndex].depth + 1 : depth
                };
                
                this.treeCache.splice(insertIndex + 1, 0, node);
            }
            
            depth++;
        }
    }

    patchAddNode(node) {
        const parentPath = path.dirname(node.attributes.path);
        const index = this.treeCache.findIndex(n => n.attributes.path === parentPath);
        if (index >= 0) {
            const insertAfter = this._findLastChildIndex(index, this.treeCache[index].depth);
            this.treeCache.splice(insertAfter + 1, 0, node);
            this.emitChange({ type: "add", path: node.attributes.path });
        }
    }

    patchUpdateNode(path, newAttrs) {
        const fullPath = this.resolve(path);
        if (!fullPath) return;
        const index = this.treeCache.findIndex(node => node.attributes.path === fullPath);
        
        if (index >= 0) {
            // Update node attributes while preserving existing ones
            this.treeCache[index].attributes = {
                ...this.treeCache[index].attributes,
                ...newAttrs
            };
            
            this.emitChange({
                type: "update",
                path: fullPath,
                attributes: this.treeCache[index].attributes
            });
        }
    }

    async patchRenameNode(oldPath, newPath) {
        const oldFullPath = this.resolve(oldPath);
        const newFullPath = this.resolve(newPath);
        if (!oldFullPath || !newFullPath) return;
        
        // Validate new filename
        const newName = path.basename(newPath);
        if (!this.isValidFilename(newName)) {
            this.sendErrorMessage(newPath, "Invalid filename");
            return null;
        }
        
        // Find the node to rename
        const index = this.treeCache.findIndex(node => node.attributes.path === oldFullPath);
        if (index < 0) {
            this.sendErrorMessage(oldFullPath, "Path not found");
            return;
        }
        
        const node = this.treeCache[index];
        const isDir = node.attributes.isDirectory;
        
        // Perform actual filesystem rename
        await fs.rename(oldFullPath, newFullPath);

        
        // Update the node and its children
        const updateNodeAndChildren = (node, oldBase, newBase) => {
            if (node.attributes.path.startsWith(oldBase)) {
                node.attributes.path = node.attributes.path.replace(oldBase, newBase);
                if (node.attributes.path === newFullPath) {
                    node.attributes.name = newName;
                    node.text = newName;
                }
            }
        };
        
        // Update all affected nodes
        this.treeCache.forEach(node => updateNodeAndChildren(node, oldFullPath, newFullPath));
        
        this.emitChange({
            type: "rename",
            oldPath: oldFullPath,
            newPath: newFullPath,
            isDirectory: isDir
        });
    }
    
    _findLastChildIndex(startIndex, parentDepth) {
        for (let i = startIndex + 1; i < this.treeCache.length; i++) {
            if (this.treeCache[i].depth <= parentDepth) return i - 1;
        }
        return this.treeCache.length - 1;
    }
    
    async initializeTree(path = ".") {
        const absPath = this.resolve(path, { allowTrailingDots: true });
        if (!absPath) return;
        this.treeCache = readDirAsTreeFormat(absPath);
        this.emitChange({ type: "initialized", path: absPath });
        return this.treeCache;
    }
    
    refreshTree(path = "") {
        const absPath = this.resolve(path, { allowTrailingDots: true });
        if (!absPath) return;
        // 1. Build a lookup table from existing treeCache
        const previous = new Map();
        for (let node of this.treeCache) {
            previous.set(node.attributes.path, node);
        }
    
        // 2. Get the fresh list
        const newTree = readDirAsTreeFormat(absPath);
    
        // 3. Merge old state into new nodes
        for (let node of newTree) {
            const oldNode = previous.get(node.attributes.path);
            if (oldNode) {
                // Merge selected properties
                node.expanded = oldNode.expanded ?? false;
                node.selected = oldNode.selected ?? false;
                node.x = oldNode.x ?? 0;
                node.y = oldNode.y ?? 0;
                // Add more if needed
            }
        }
    
        this.treeCache = newTree;
    
        this.emitChange({ type: "refresh", path: absPath });
        return this.treeCache;
    }

    getTreeCache() {
        return this.treeCache;
    }

    // LISTENERS
    onChange(listener) {
        if (this.listeners.indexOf(listener) === -1)
            this.listeners.push(listener);
    }

    offChange(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) this.listeners.splice(index, 1);
    }

    emitChange(event) {
        setTimeout(() => {
            for (let fn of this.listeners) if (fn(event)) break;
        }, 100);
    }

    findIndexInTreeCache(searchString) {
        return getSortedIndex(this.treeCache, searchString);
    }

    findInsertIndexForFile(fullPath) {
        let dirPath = path.dirname(fullPath);
        if (dirPath === '.') dirPath = '';
    
        fullPath = fullPath.toLowerCase();
        let potential = -1;
    
        for (let index = 0; index < this.treeCache.length; index++) {
            const { attributes } = this.treeCache[index];
            if (attributes.isDirectory) continue;
    
            const tPath = attributes.path.toLowerCase();
    
            const isSameLevel =
                (dirPath === '' && !tPath.includes('/')) ||
                (dirPath !== '' && tPath.startsWith(dirPath + '/'));
    
            if (isSameLevel) {
                potential = index;
                const comparison = tPath.localeCompare(fullPath);
                if (comparison === 0) {
                    return null; // File already exists
                }
                if (comparison === 1) {
                    return index; // Insert before this
                }
            }
        }
    
        return potential >= 0 ? potential + 1 : this.treeCache.length;
    }
    
    findInsertIndexForDirectory(fullPath) {
        let dirPath = path.dirname(fullPath);
        if (dirPath === '.') dirPath = '';
    
        fullPath = fullPath.toLowerCase();
        let potential = -1;
    
        for (let index = 0; index < this.treeCache.length; index++) {
            const { attributes } = this.treeCache[index];
            if (!attributes.isDirectory) continue;
    
            const tPath = attributes.path.toLowerCase();
    
            const isSameLevel =
                (dirPath === '' && !tPath.includes('/')) ||
                (dirPath !== '' && tPath.startsWith(dirPath + '/'));
    
            if (isSameLevel) {
                potential = index;
                const comparison = tPath.localeCompare(fullPath);
                if (comparison === 0) {
                    return null; // Already exists
                }
                if (comparison === 1) {
                    return index;
                }
            }
        }
    
        return potential >= 0 ? potential + 1 : this.treeCache.length;
    }


    printIt() {
        for(let index = 0; index < this.treeCache.length; index++) {
            let {text, depth, attributes} = this.treeCache[index];
            console.log({index, depth, attributes});// path:attributes.path});
        }
    }
   
}

const FILE_MANAGER = new FileManager();
module.exports = FILE_MANAGER;

