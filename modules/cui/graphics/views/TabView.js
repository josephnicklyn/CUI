const Layout = require("../base/Layout")
const ButtonBar = require("./ButtonBar");
const termutils = require("../base/termutils");
const Node = require("../base/Node");
class TabView extends Layout {
    #tabBar = null;
    #currentTab = 0;
    
    constructor(options) {
        super(options);
        this.setAttribute('color', termutils.COLORS.editor.fill);
        this.#tabBar = new ButtonBar({color: termutils.COLORS.infobar.darker});
    }

    getMenuContext() {
        return {
            TABS: this.#tabBar.getChildren()
        }
    }

    addChild(node) {
        if (node instanceof Layout) {
            let index = this.getChildren().indexOf(node);
            if (index == -1) {
                super.addChild(node);
                let text = node.getAttribute("title", "...");
                let tnode = new Node({text, color: termutils.COLORS.BACKGROUND2});
                node.setAttribute('tabbutton', tnode);
                node.setTitleNode(tnode);
                this.#tabBar.addChild(tnode);
            }
            if (this.getStage()) {
                this.getStage().getRoot().update();
                index = this.getChildren().indexOf(node);
                this.selectTab(index, true);
                
            }
        }
        return node;
    }

    removeChild(node) {
        let index = this.getChildren().indexOf(node);
        if (index != -1) {
            this.#tabBar.removeChild(index);
            super.removeChild(index);
            node.destroy();
            let c = this.getChildren().length;
            if (index >= c) {
                index = c-1;
            }
            this.getStage().update(node);
            this.selectTab(index, false);
            this.render(true);
        }
    }

    selectTab(index, now=true) {
        
        if (index >= 0 && index < this.getChildren().length) {
            this.#currentTab = index;
            if (now) {
                this.render(true);
            } else {
                this.getStage().getRoot().update();
            }
            this.getChildren()[index].requestFocus();
        }
        
    }

    layout(rect) { 
        this.rect = rect;
        this.#tabBar.setRect(0, 0, 1, this.rect.width, rect.sceneY, rect.sceneX);
        this.#tabBar.layout(this.#tabBar.rect);
        this.layoutChildren();
    }

    layoutChildren() {
        for(let child of this.getChildren()) {
            if (child == this.#tabBar) {
                this.#tabBar.layout(this.rect);
                continue;
            }
            child.setRect( 
                1, 0, 
                this.rect.height-1,
                this.rect.width,
                this.rect.sceneY+1, 
                this.rect.sceneX
            )
            child.layout(child.rect);
        }
        
    }

    render(now=false) {
        // super.render();
        let target = null;
        this.getChildren().forEach((child, i) => {
            let tabbutton = child.getAttribute("tabbutton");
            if (i === this.#currentTab) {
                // child.setDisplay(true);
                child.show();
                if (child.constructor.name === 'Layout') {
                    // child.clearMe();
                } else {
                    child.render();
                    target = child;
                }
                if (tabbutton) {
                    tabbutton.setAttribute('color', termutils.COLORS.BACKGROUND2);
                }
            } else if (tabbutton) {
                // child.setDisplay(false);
                child.hide();
                tabbutton.setAttribute('color', termutils.COLORS.BACKGROUND);
                
            } 
        });
        if (now) {
        
            this.#tabBar.render();
            this.getStage().sceneRenderRect(this.rect);
        }

        if (target) {
            if (target.isFocusable && !this.getStage().activeFocus()) {
                target.requestFocus();
            }
        }
    }

    handleEvent(event) {
        if (event.type === "MouseEvent") {
            if (event.action === 'mouseup') {
                if (event.button === 'left') { 
                    let clicked = this.#tabBar.clickTest(event.relY, event.relX);
                    if (clicked) {
                        this.selectTab(clicked.index);
                    }
                }
            } else if (event.button == 'scroll') {
                this.#tabBar    .handleMouseEvent(event);
                return true;
            }    
        }
    }
}

module.exports = TabView;