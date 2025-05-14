const ButtonBar = require("./ButtonBar");
const FILE_MANAGER = require("../../FileManager");
const Button = require("../controls/Button");
const termutils = require("../base/termutils");

class CrumbBar extends ButtonBar {
    constructor(options= {padding: 1}) {
        super(options);
    }
    
    pathToArray(p = "") {
        p = (p + "").trim();
        
        p = p.replace(/\/+/g, "/").replace(/\/$/, "");
        if (p === "/") return [""];
    
        let parts = p.split("/");
    
        if (p.startsWith("/")) {
            parts.unshift("");
        }
    
        return parts.filter((part, index) => {
            if (index === 0 && part === "") return true; // keep leading root
            return part && part.trim() !== "";
        });
    }

    setPath(p = "", notify = true) {
        const pathArray = this.pathToArray(p);
        const children = this.getChildren();
        let remIndex = -1;
        let tPath = "";
    
        for (let i = 0; i < pathArray.length; i++) {
            const segment = pathArray[i];
            const isRoot = (segment === "");
            tPath = isRoot ? "/" : `${tPath}/${segment}`;
            tPath = tPath.replace(/\/+/g, "/"); // normalize
    
            if (i < children.length) {
                const child = children[i];
                if (child.getAttribute("path") !== tPath) {
                    remIndex = i;
                    break;
                }
            } else {
                remIndex = i;
                break;
            }
        }
    
        // Remove outdated buttons
        if (remIndex !== -1) {
            this.removeAllAfter(remIndex);
        } else {
            remIndex = children.length;
        }
    
        // Add missing buttons
        tPath = pathArray.slice(0, remIndex).join("/");
        if (!tPath.startsWith("/")) tPath = "/" + tPath;
    
        for (let i = remIndex; i < pathArray.length; i++) {
            const segment = pathArray[i];
            tPath = (tPath === "/" ? "" : tPath) + "/" + segment;
            tPath = tPath.replace(/\/+/g, "/");
    
            const btn = new Button({
                text: segment === "" ? "⌂" : "/" + segment  ,
                path: tPath,
                color: termutils.COLORS.GREEN,
                hColor: termutils.COLORS.BACKGROUND_DK
            });
            this.addChild(btn);
        }

        if (notify) {
            this.shareSelectedDetails(p, notify);
        }

        
        this.targetPath = p;
        this.render(this.isShowing());
    }
        
    select(target) {
        for(let child of this.getChildren()) {
            child.setAttribute('selected', (child === target))
        }
    }

    selectCrumb(delta) {
        this.clampInView(delta);
    }

    clampInView(delta) {
        let currentIndex = super.clampInViewWithDelta(delta);

        let target = this.getChildren()[currentIndex];
        this.shareSelectedDetails(target);
        this.render(true);
    }

    handleEvent(event) {
        switch (event.type) {
            case 'MouseEvent':
                return this.handleMouseEvent(event);
            case 'KeyEvent':
                return this.handleKeyEvent(event);
        }
    }

    handleMouseEvent(event) {
        if (event.button == 'scroll') {
            super.handleMouseEvent(event);
            return true;
        }
        if (event.type === "MouseEvent") {
            if (event.action === 'mouseup') {
                if (event.button === 'left') { 
                    let clicked = this.clickTest(event.relY, event.relX);
                    if (clicked) {
                        let child = clicked.child;
                        this.shareSelectedDetails(child);
                        this.render(true);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getButtonByPath(path) {
        for(let btn of this.getChildren()) {
            if (btn.getAttribute('path') === path) {
                return btn;
            }
        }
        return null;
    }

    selectButton(path) {
        let btn = this.getButtonByPath(path);
        this.select(btn);

    }

    getPath() {
        return this?.targetPath || "/";
    }
    refresh() {
        if (this.targetPath) {
            let btn = this.selectButton(this.targetPath);
            this.shareSelectedDetails(btn, true);
            this.render(true);
            this.shareSelectedDetails(this.targetPath, true);
        }
    }

    async shareSelectedDetails(target) {
        if (typeof(target) === 'string') {
            target = this.getButtonByPath(target);
        }
        
        if (target) {
            this.select(target);
            let path = target.getAttribute('path');
            
            if (!target.getAttribute("dirList")) {
                let list = await FILE_MANAGER.list(path, false);
                target.setAttribute('dirList', list);
            }
            
            let obj = {dirList:target.getAttribute('dirList'), path:target.getAttribute('path'), text:target.getAttribute('text')};
            this.sendAction(obj);
        }
    }

    handleKeyEvent(event) {
        return false;
    }

}

module.exports = CrumbBar;