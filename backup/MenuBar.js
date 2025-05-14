const Layout = require("../base/Layout")
const termutils = require("../base/termutils");
const Node = require("../base/Node")
const {PopupMenu, getPopupMenu} = require("../views/PopupMenu");

class MenuBar extends Layout {
    #menu = null;
    #popups = [];

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
                child.setText(text);
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
        const {width, height } = rect;
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
            let r = child.rect;//this.toLayoutRect(child.rect);
            this.getStage().sceneDrawText(child.getText(), child.rect, this.getAttribute('color'));
        }

        for(let p of this.#popups) {
            p.render(true);
        }
    }

    selectMenuItem(index) {
        if (index >= 0 && index < this.#menu.length) {
            let target = this.#menu[index];
            let {x, y} = target.node.rect;
            let it = this.#addPopup(getPopupMenu(target, y+1, x, this.getStage()));
            let target2 = it.getMenuItem(4);
            let it2 = this.#addPopup(getPopupMenu(
                target2, 
                target2.node.sceneY, 
                target2.node.sceneX+target2.node.width, this.getStage()));
            
            it.render();
            
            // setTimeout(() => {
            //     it2.render();
            // }, 5000);

            // setTimeout(() => {
            //     it2.restore();
            
            // }, 10000);

            // setTimeout(() => {
            //     it.restore();
            //   }, 15000);
        }
    }

    #addPopup(layout) {
        if (!this.#popups.includes(layout)) {
            this.#popups.push(layout);
        }
        return layout;
    }


    handleEvent(event) {
        if (event.type === "MouseEvent") {
                if (event.action === 'mouseup') {
                if (event.button === 'left') { 
                    let clicked = this.clickTest(event.relY, event.relX);
                    if (clicked) {
                        this.selectMenuItem(clicked.index);
                    }
                }
            }
        }
    }
}

module.exports = MenuBar;