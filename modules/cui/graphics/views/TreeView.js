const Layout = require("../base/Layout");
const termutils = require("../base/termutils");
const apputils = require("../../apputils");
const FILE_MANAGER = require("../../FileManager");

class TreeView extends Layout {
    #tree = null;    
    #selectedNodeIndex = -1;
    #selectedLeafIndex = -1;
    
    #visibleNodes = [];

    constructor(options) {
        super(options);
        this.setAttribute('color', termutils.COLORS.editor.fill);
        this.isFocusable = true;
        this.setAttribute('scrollable', true);
        this.#tree = FILE_MANAGER.getTreeCache();
            
        FILE_MANAGER.onChange(event => {
            let same = this.#tree === FILE_MANAGER.getTreeCache();
            this.drawTree();    
        });
    }

    useStructure(tree) {
        if (tree instanceof Object) {
            this.#tree = tree;
            for(let it of this.#tree || []) {
                it.attributes.expanded = it.attributes.expanded || false;
                this.nodeHasChildren(it);
            }
        }
    }

    layout(rect) {
        this.rect = rect;
    }

    render() {
        this.drawTree();
        
        this.getStage().sceneDrawFrame(0, this.rect, termutils.COLORS.BORDER);
        this.drawVScrollbar();
        this.drawHScrollbar();
    }

    drawTree() {
        if (this.width < 4) return;
        const sy = this.rect.sceneY;
        const width = this.rect.width - 3;
        const maxY = this.height - 1;
        let maxX = 0;
        let y = 1;
        let offsetLeft = Math.floor(this.scrollLeft/2) * 2;
        const links = {
            middle: "├",
            vertical: "│",
            last: "└",
            space: " ",
            horiz: "─"
        };
    
        this.#visibleNodes = [];
        const visibleNodes = this.#visibleNodes;
        let depthStack = [];
        
        // First, build list of visible nodes
        for (let i = 0; i < this.#tree.length; i++) {
            const node = this.#tree[i];
    
            // Skip if inside collapsed parent
            if (depthStack.length && node.depth > depthStack[depthStack.length - 1]) {
                continue;
            } else {
                depthStack = depthStack.filter(d => d < node.depth);
            }
    
            visibleNodes.push({ node, index: i });
    
            if (node.attributes['expanded'] === false) {
                depthStack.push(node.depth);
            }
        }
    
        this.scrollHeight = Math.floor(visibleNodes.length - (this.height-3));
        
        const stage = this.getStage();
        stage.sceneDrawFrame(0, this.rect, termutils.COLORS.BORDER, this.getAttribute("color"));

        for (let v = this.scrollTop; v < visibleNodes.length; v++) {
            if (y >= maxY) break;
    
            const { node, index } = visibleNodes[v];
    
            // Figure out if it's the last sibling
            let isLast = true;
            for (let k = index + 1; k < this.#tree.length; k++) {
                if (this.#tree[k].depth < node.depth) break;
                if (this.#tree[k].depth === node.depth) {
                    isLast = false;
                    break;
                }
            }
    
            // Prefix builder
            let linePrefix = "";
            for (let p = 0; p < node.depth; p++) {
                // Are there vertical lines at previous levels?
                const parent = this.findParentAtDepth(index, p);
                if (parent && parent.isLast === false) {
                    linePrefix += links.vertical + "  ";
                } else {
                    linePrefix += "   ";
                }
            }
    
            const connector = isLast ? links.last : links.middle;
            let lChar = connector + links.horiz + " ";
            let expandIndicator = "◇"; // default to file

            if (node.attributes.isDirectory) {
                expandIndicator = (node.attributes.expanded === false) ? "▶" : "▼";
            }
            
            let color = (index===this.#selectedLeafIndex?termutils.COLORS.editor.darkfill:this.getAttribute('color'));


            if (index===this.#selectedNodeIndex) {
                color = termutils.COLORS.control.bold;
            }
            
            const text = " " + (node.depth > 0 ? linePrefix + lChar : "") + (expandIndicator ? expandIndicator + " " : "") + (node.text || "");
            const fullLine = text.substring(offsetLeft).padEnd(width);
            let flLen = text.length;
            if (flLen > maxX) 
                maxX = flLen;
            stage.sceneDrawText(
                fullLine, {
                    x: 1, y, width, heigh: 1,
                    sceneX: 1,
                    sceneY: y + sy
                },
                color
            );
            y++;
        }
    
        let w = Math.floor(maxX - (this.width * 0.825));
        if (w < 0 && this.scrollLeft > 0) {
            this.scrollLeft = 0;
            this.drawEditor()
            return;
        }
        this.scrollWidth = w;
        // this.scrollWidth = (maxX);
        this.drawHScrollbar();

        stage.sceneRenderRect(this.rect);
    }

    findParentAtDepth(index, depth) {
        for (let i = index - 1; i >= 0; i--) {
            if (this.#tree[i].depth === depth) {
                // Same level
                // figure out if it's last
                let isLast = true;
                for (let k = i + 1; k < this.#tree.length; k++) {
                    if (this.#tree[k].depth < this.#tree[i].depth) break;
                    if (this.#tree[k].depth === this.#tree[i].depth) {
                        isLast = false;
                        break;
                    }
                }
                return { isLast };
            }
        }
        return null;
    }

    onFocus() {
        this.setAttribute('color', termutils.COLORS.editor.fill);
        this.drawTree();
    }

    onBlur() {
        this.setAttribute('color', termutils.COLORS.editor.fill);
        this.drawTree();
    }


    nodeHasChildren(node) {
        let myDepth = node.depth;
        let idx = this.#tree.indexOf(node);
    
        for (let i = idx + 1; i < this.#tree.length; i++) {
            if (this.#tree[i].depth <= myDepth) break;
            if (this.#tree[i].depth === myDepth + 1) {
                node.attributes.hasChildren = true;
                return true;
            }
        }
        return false;
    }
    
    handleEvent(event) {
        switch (event.type) {
            case 'MouseEvent':
                this.handleMouseEvent(event);
                break;
            case 'KeyEvent':
                this.handleKeyEvent(event);
                break;
        }   
    }

    getSelectedVisibleIndex() {
        for (let i = 0; i < this.#visibleNodes.length; i++) {
            if (this.#visibleNodes[i].index === this.#selectedNodeIndex) return i;
            if (this.#visibleNodes[i].index === this.#selectedLeafIndex) return i;
        }
        return 0;
    }
    
    selectVisibleNode(vindex) {
        if (vindex >= 0 && vindex < this.#visibleNodes.length) {
            const { node, index } = this.#visibleNodes[vindex];
            if (this.nodeHasChildren(node)) {
                this.#selectedNodeIndex = index;
                this.#selectedLeafIndex = -1;
            } else {
                this.#selectedLeafIndex = index;
                this.#selectedNodeIndex = -1;
            }
            this.drawTree();
        }
    }

    handleMouseEvent(event) {

        if (this.forScroll(event)) {
            return;
        }
        // if (event.button === 'scroll') {
        //     let delta = event.delta;
        //     if (delta < 0 && this.scrollTop === 0)
        //         return;
        //     let oldTop = this.scrollTop;
        //     this.scrollTop = this.scrollTop - delta;
        //     if (oldTop !== this.scrollTop) {
        //         this.update();
        //     }    
        // } else 
        
        {

            if (event.button === 'left' && event.action === 'mousedown' || event.action === 'dblclick')
                this.requestFocus();
            
            if (event.button === 'left' && event.action === 'mousedown') {
                
                const clickedY = event.relY - this.sceneY;
                const visibleIndex = clickedY - 1 + this.scrollTop; // Assuming y=1 is first row
        
                if (visibleIndex >= 0 && visibleIndex < this.#visibleNodes.length) {
                    const { node, index } = this.#visibleNodes[visibleIndex];
        
                    
                    if (this.nodeHasChildren(node)) {
                        if (event.dbl)
                            node.attributes['expanded'] = !node.attributes['expanded'];
                        this.#selectedNodeIndex = index; // real index inside #tree
                    } else {
                        this.#selectedLeafIndex = index;

                        if (event.dbl) {
                            this.openFileEvent(node);
                        }
                    }
                    this.drawTree();
                }
            }
        }
    }


    handleKeyEvent(event) {
        if (this.#visibleNodes.length === 0) return;
    
        let currentIndex = this.getSelectedVisibleIndex();
        let { node } = this.#visibleNodes[currentIndex] || {};
    
        if (event.name === 'down') {
            let next = Math.min(this.#visibleNodes.length - 1, currentIndex + 1);
            this.selectVisibleNode(next);
        } else if (event.name === 'up') {
            let prev = Math.max(0, currentIndex - 1);
            this.selectVisibleNode(prev);
        } else if (event.name === 'left') {
            if (node?.attributes?.expanded) {
                node.attributes.expanded = false;
                this.drawTree();
            } else if (node.depth > 0) {
                // Collapse or move to parent
                for (let i = currentIndex - 1; i >= 0; i--) {
                    if (this.#visibleNodes[i].node.depth < node.depth) {
                        this.selectVisibleNode(i);
                        break;
                    }
                }
            }
        } else if (event.name === 'right') {
            if (node?.attributes?.hasChildren) {
                if (node.attributes.expanded === false) {
                    node.attributes.expanded = true;
                    this.drawTree();
                } else {
                    // already expanded, move to first child
                    for (let i = currentIndex + 1; i < this.#visibleNodes.length; i++) {
                        if (this.#visibleNodes[i].node.depth === node.depth + 1) {
                            this.selectVisibleNode(i);
                            break;
                        }
                        if (this.#visibleNodes[i].node.depth <= node.depth) break;
                    }
                }
            }
        } else if (event.name === 'enter' || event.name === 'return') {
            if (node) {
                if (this.nodeHasChildren(node)) {
                    node.attributes['expanded'] = !node.attributes['expanded'];
                    this.drawTree();   
                } else {
                    this.openFileEvent(node);
                }
            }
        }
    }
    
    openFileEvent(node) {
        this.getStage().dispatchAction({
            type: 'OPEN_FILE',
            attributes: node.attributes
        });
    }

}

module.exports = TreeView;
