const Layout = require("../base/Layout");
const utils = require("../base/termutils");
const Node = require("../base/Node");
const BreakNode = require("../nodes/BreakNode");

function measureMenu(menu) {
    let max_width = 0;
    let max_height = 0;
    let has_submenu = 0;
    
    if (menu.children instanceof Array) {
        for(let item of menu.children) {
            let title = item.text;
            if (item.children instanceof Array && item.children.length) {
                has_submenu = 2;
            } 
            if (max_width < title.length)
                max_width = title.length;
            max_height++;
        }
    }

    const width = max_width + (2 + 4) + has_submenu;
    const height = max_height + 2;
    
    return {width, height};
}

class PopupMenu extends Layout {
    #menu = null;
    #pref_rect = {};
    #subPopup = null;

    constructor(height, width, y, x, menu, buffer) {
        super({color: utils.COLORS.MENU});
        this.#menu = menu;
     
        let nY = y + 1;
        this.selectedMenu = null;
        this.setStage(buffer);
        this.setRect(0, 0, height, width, y, x);
        this.#pref_rect = this.rect;
        
        for (let item of this.#menu.children) {
            let title = item.text.trim();
            if (title !== '-') {
                let hasSub = (item.children instanceof Array && item.children.length);
                let padding = hasSub ? width - 5 : width - 3;
                let text = " " + title.padEnd(padding);
                if (hasSub) text += "▶";
                let node = this.addChild(new Node({text, hoverable: true, menu: item, color: utils.COLORS.MENU }));
                node.setStage(buffer);
                node.setRect(nY - 1, 1, 1, width - 2, nY, x + 1);
                item.node = node;
            } else {
                let node = this.addChild(new BreakNode({ box: this.#border_box, color: utils.COLORS.MENU }));
                node.setStage(buffer);
                node.setRect(nY - 1, 0, 1, width, nY, x);
                item.node = node;
            }
            nY++;
        }
    }

    redraw() {
        this.render(true);
    }

    activate() {
        this.redraw(true);
    }

    restore() {
        if (this.#backBuffer) {
            this.getStage().restoreRegion(this.#backBuffer);
            this.getStage().render(true);
        }
        if (this.#subPopup) {
            this.#subPopup.restore();
            this.#subPopup = null;
        }
    }

    #backBuffer = null;
    #border_box = 4;
    render() {
        let rect = this.keepRectInBuffer();
        
        if (!this.#backBuffer) {
            this.#backBuffer = this.getStage().sceneCopyRegion(rect);
        }
        super.render(true);

        this.getStage().sceneDrawFrame(this.#border_box, rect, this.getAttribute("color"));
        
        for(let node of this.getChildren()) {
            node.render();
        }
        this.getStage().sceneRenderRect(this.rect);

        if (this.#subPopup) {
            this.#subPopup.render(true);
        }
    }

    keepRectInBuffer() {
        this.rect = this.#pref_rect;
        let {x, y, sceneX, sceneY, width, height} = this.rect;
        
        let bWidth = this.getStage().width;
        let bHeight = this.getStage().height;
        let adjusted = false;
        if ((sceneX + width) >= bWidth) {
            adjusted = true;
            sceneX = bWidth - width;
        }
        if ((sceneY + height) >= bHeight) {
            adjusted = true;
            sceneY = bHeight - height;
        }

        if (adjusted) {
            for(let child of this.getChildren()) {
                child.sceneX = sceneX + child.x;
                child.sceneY = sceneY + child.y;
            }
        }
        this.setRect(y, x, height, width, sceneY, sceneX);
        return this.rect;
    }

    getMenuItem(index) {
        return this.#menu.children[index];
    }

    handleEvent(event) {
        if (event.type === "MouseEvent" && event.action === "mouseup" && event.button === "left") {
            let clicked = this.clickTest(event.relY, event.relX);
       
            if (clicked && clicked.menu && clicked.menu.children instanceof Array && clicked.menu.children.length) {
                if (this.#subPopup) {
                    this.#subPopup.restore();
                    this.#subPopup = null;
                }
                const target = clicked.menu;
                this.#subPopup = getPopupMenu(target, clicked.sceneY, clicked.sceneX + clicked.width, this.getStage());
                this.#subPopup.render(true);
            }
        }
    }
}

function getPopupMenu(menu, y, x, buffer)  {
    if (menu) { 
        if (!(menu.children instanceof Array))
            return menu;
        if (!menu.popup) {
            let {width, height} = measureMenu(menu);
            menu.popup = new PopupMenu(height, width, y, x, menu, buffer);
        }
        return menu.popup;
    }
    return null;
}

module.exports = {
    PopupMenu,
    getPopupMenu
};