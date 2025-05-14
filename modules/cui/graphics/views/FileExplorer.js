const termutils = require("../base/termutils");
const ListBox = require("../controls/ListBox");
const FlexView = require("./FlexView");
const CrumbBar = require("./CrumbBar");
const FILE_MANAGER = require("../../FileManager")

let PREV_PATH_RECALL = null;

class FileExplorer extends FlexView {
    constructor(options = {padding: 1, color: termutils.COLORS.WINDOW, childColor: termutils.COLORS.BACKGROUND, border: 0}) {
        super({...options, flow: "column", padding: 0});
        if (!options.path && PREV_PATH_RECALL) options.path = PREV_PATH_RECALL;
        
        this.startPath = FILE_MANAGER.toDirectory(options.path) || FILE_MANAGER.getRoot();//os.homedir()
        this.setAttribute("color", options.color);
        this.crumbBar = this.addChild(new CrumbBar({padding:options.padding, color: options.color}));
        this.listBox = this.addChild(new ListBox({flex:1, border: options.border, color: options.childColor}));
        this.crumbBar.setOnActionListener((data) => {
            this.listBox.clear();
            let dirs = [];
            let files = [];
            let {path, dirList} = data;
            for (let item of dirList) {
                let {name, type} = item;
                let cPath = path + "/" + name;
                let icon = type === 'directory' ? "□" : "◇";
                let obj = {
                    text: `${icon} ${name}`,
                    options: {path: cPath, type}
                };
                if (type === 'directory') dirs.push(obj);
                else files.push(obj);
            }
            this.listBox.addItems(...dirs, ...files);
            this.listBox.render(true);
        });

        this.listBox.setOnActionListener((data, details) => {
            let options = data.options;
            if (options.type === 'directory') {
                if (details === true || details === 'enter')
                    this.crumbBar.setPath(options.path, true);
            }
            PREV_PATH_RECALL = options.path;
            this.sendAction({options}, details);
            
        });
        this.crumbBar.setPath(this.startPath, false);  // hard coded for now
        this.isFocusable = true;
    }

    getPath() { return this.crumbBar.getPath(); }

    render(now) {
        if (!this.isShowing())
            return;
        this.clearMe(false);
        for (let child of this.getChildren()) {
            child.render(now);
        }
    }

    layout() {
        super.layout();
    }

    handleEvent(event) {
        if (event.type === 'KeyEvent' && (event.name === 'left' || event.name === 'right')) {
            let delta = event.name === 'left' ? -1 : 1;
            this.crumbBar.selectCrumb(delta);
            return;
        }
        if (!this.crumbBar.handleEvent(event))
            this.listBox.handleEvent(event);

    }


    #initFocus = false;
    onFocus() {
        if (!this.isShowing())
            return;
        this.listBox.hFocus = true;
        if (!this.#initFocus) {
            this.#initFocus = true;
            this.crumbBar.refresh();
            return;
        }
        this.listBox.render(true, true);
        termutils.QCODES.CURSOR_HIDE();    
    }
    
    onBlur() {
        if (!this.isShowing())
            return;
        this.listBox.hFocus = false;
        this.listBox.render(true, false);
    }

}

module.exports = FileExplorer;
