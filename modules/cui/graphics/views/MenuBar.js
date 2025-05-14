const Layout = require("../base/Layout");
const termutils = require("../base/termutils");
const Node = require("../base/Node");
const terminal = require("../base/terminal");
const BreakNode = require("../nodes/BreakNode");

let __POPUPS__ = [];
let MENU_CONTEXT = {};

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

const ACTION_NAME_KEY = 'action';

function applyContextToNode(node, value) {
    let ctx = MENU_CONTEXT[value];
    if (ctx && typeof ctx === 'object') {
        node.setAttribute('context', ctx);
        const active = ctx.active !== false; // default to true
        node.setAttribute('color', active ? termutils.COLORS.menu.menuitem : termutils.COLORS.menu.menuitem_dim);
    }
}

class PopupMenu extends Layout {
    #menu = null;
    #pref_rect = {};

    constructor(height, width, y, x, menu) {
        super({color: termutils.COLORS.menu.menuframe});
        this.#menu = menu;
     
        let nY = y + 1;
        this.selectedMenu = null;
        this.setRect(0, 0, height, width, y, x);
        this.#pref_rect = this.rect;
        
        for (let item of this.#menu.children) {
            let title = item.text.trim();
            let node = null;
            if (title !== '-') {
                let hasSub = (item.children instanceof Array && item.children.length);
                let padding = hasSub ? width - 5 : width - 3;
                let text = " " + title.padEnd(padding);
                if (hasSub) text += "▶";
                node = this.addChild(new Node({text, hoverable: true, menu: item, color: termutils.COLORS.menu.menuitem }));
                node.setRect(nY - 1, 1, 1, width - 2, nY, x + 1);
                if (item.attributes.name)
                    node.setAttribute('name', item.attributes.name);
                if (item.attributes[ACTION_NAME_KEY])
                    node.setAttribute(ACTION_NAME_KEY, item.attributes[ACTION_NAME_KEY]);
                item.node = node;
            } else {
                node = this.addChild(new BreakNode({ box: this.#border_box, color: termutils.COLORS.menu.menuframe }));
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
            this.#backBuffer = null;
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
        this.getStage().sceneDrawFrame(this.#border_box, rect, this.getAttribute("color"), termutils.COLORS.BORDER, false);
        for(let node of this.getChildren()) {
            let action_identifier = node.getAttribute(ACTION_NAME_KEY);
            if (action_identifier) {
                applyContextToNode(node, action_identifier);
            }
            node.render();
        }
        this.getStage().sceneRenderRect(this.rect);
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

    selectMenuItem(index) {
        if (index < 0 || index >= this.#menu.children.length) return null;
        
        const item = this.#menu.children[index];
        if (!item) return null;
    
        if (item.children?.length) {
            return {
                type: 'submenu',
                target: item,
                onAction: null
            };
        }
    
        const ctx = item.node?.getAttribute('context') || {};
        const isActive = ctx.active !== false;
        const actionFn = isActive ? ctx.onAction : null;
    
        return {
            type: isActive ? 'command' : 'inactive',
            target: item,
            onAction: actionFn
        };
    }

    handleEvent(event) {
        if (event.type === "MouseEvent" && event.action === "mouseup" && event.button === "left") {
            let clicked = this.clickTest(event.relY, event.relX);
            if (clicked) {
                let result = this.selectMenuItem(clicked.index);
                if (result) {
                    if (result.type === 'submenu') {
                        let {sceneX, sceneY, width} = this.rect;
                        let y = sceneY + clicked.index + 1;
                        let x = sceneX + width - 1;
                        let popup = getPopupMenu(result.target, y, x, this.getStage());
                        if (!__POPUPS__.includes(popup)) {
                            __POPUPS__.push(popup);
                        }
                        popup.render(true);
                        return null;
                    } else {
                        return result;
                    }
                }
            }
        }
        return null; // Indicate event was handled
    }

    containsPoint(x, y) {
        const {sceneX, sceneY, width, height} = this.rect;
        return x >= sceneX && x < sceneX + width && y >= sceneY && y < sceneY + height;
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

class MenuBar extends Layout {
    #menu = null;
    #active = null;

    constructor(options) {
        super(options);
        this.setAttribute('color', termutils.COLORS.APPBAR);
    }

    useStructure(menu) {
        if (menu instanceof Object) {
            this.#menu = menu;
            this.rebuildMenu();
        }
    }

    rebuildMenu() {
        this.clearChildren();
        for (let it of this.#menu) {
            let text = ` ${it.text} `;
            let isSpan = it.text == '-';
            let child = this.addChild(new Node({ menu: it, hoverable: !isSpan }));
                if (!isSpan) child.setText(text);
                it.node = child;
            child.setAttribute('color', termutils.COLORS.APPBAR);
            if (isSpan) {
                child.setAttribute("span", true);
                child.isActive = false;

            }
        }
    }

    layout(rect) {
        this.rect = rect;
        const {width, height} = rect;
        let remSize = width;
        let hasSpan = false;
        for (let child of this.getChildren()) {
            let text = child.getText();
            let textLength = text.length;
            if (child.getAttribute('span', false)) {
                hasSpan = true;
            } else {
                remSize -= textLength;
            }
        }
        let x = 0;
        let spanWidth = hasSpan ? remSize : 0;
        remSize = width - 1;
        hasSpan = false;
        for (let child of this.getChildren()) {
            let text = child.getText();
            let textLength = text.length;
            if (child.getAttribute('span', false)) {
                if (!hasSpan) {
                    textLength = spanWidth;
                    hasSpan = true;
                } else {
                    textLength = 0;
                }
            }
            child.setRect(0, x, 1, textLength, rect.sceneY, rect.sceneX + x);
            x += textLength;
            remSize -= textLength;
        }
    }

    render(now) {
        super.render(now);
        for (let child of this.getChildren()) {
            if (child.getAttribute('span', false)) 
                continue;
            let r = child.rect;
            this.getStage().sceneDrawText(child.getText(), child.rect, this.getAttribute('color'));
        }

        for(let p of __POPUPS__) {
            p.render(true);
        }
    }

    selectMenuItem(index) {
        if (index >= 0 && index < this.#menu.length) {
            this.closeAllPopups();
            let target = this.#menu[index];
            if (target.children instanceof Array && target.children.length) {
                let {x, y} = target.node.rect;
                let popup = getPopupMenu(target, y + 1, x, this.getStage());
                __POPUPS__ = [popup];
                popup.render(true);
                this.#active = popup;
            }
        }
    }

    closeAllPopups() {
        while(__POPUPS__.length) {
            __POPUPS__.pop().restore();
        }
        __POPUPS__ = [];
        this.#active = null;
        terminal.releaseHandler(this.eventBinder);
    }

    handleEvent(event) {
        this.getStage().relativePoint(event);
        this.updateMenuContext();
        if (event.type === "MouseEvent" && event.action === "mouseup" && event.button === "left") {
            // Check if click is within any open popup
            let results = null;
            if (this.#active) {
                for (let popup of __POPUPS__) {
                    if (popup.containsPoint(event.relX, event.relY)) {
                        let result = popup.handleEvent(event);
                        if (result && result.type === 'command') {
                            this.closeAllPopups();
                            if (typeof result.onAction === 'function') {
                                result.onAction(); // fire handler
                                
                            } else if (result.target.attributes?.action) {
                                const action = result.target.attributes.action;
                                this.getStage().dispatchAction({ type: action });
                                return terminal.executeCommand(action);
                            }
                            return true;
                        }
                        return true; // consumed
                    }
                }
            } else {
                // Check if click is within menubar
                let clicked = this.clickTest(event.relY, event.relX);
                if (clicked) {
                    this.selectMenuItem(clicked.index);
                    this.eventBinder = this.handleEvent.bind(this);
                    terminal.setTempHandler(this.eventBinder);
                    return true;
                }
            }

            // Click outside menu context, close all popups
            this.closeAllPopups();
            if (results != null) {
                this.getStage().dispatchAction({type:results.action})
                return terminal.executeCommand(results || "NO_ACTION_PROVIDED");
            }
            return false; // Allow main handler to take over
        }
        return true;
    }

    containsPoint(x, y) {
        const {sceneX, sceneY, width, height} = this.rect;
        return x >= sceneX && x < sceneX + width && y >= sceneY && y < sceneY + height;
    }

    updateMenuContext() {

        const active = this.getStage().activeFocus();
        const ctx = (active && typeof active.getMenuContext === "function") 
                    ? active.getMenuContext() 
                    : {};
        
        MENU_CONTEXT = ctx;
    }
}

module.exports = MenuBar;