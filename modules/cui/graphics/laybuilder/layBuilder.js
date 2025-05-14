let FlexView = require("../views/FlexView");
let InfoBar = require("../views/InfoBar");
let MenuBar = require("../views/MenuBar");
let SplitView = require("../views/SplitView");
let TabView = require("../views/TabView");
let GridView = require("../views/GridView");
let TableView = require("../views/TableView");
let FileExplorer = require("../views/FileExplorer");
let TextItem = require("../views/TextItem");
let TreeView = require("../views/TreeView");
let Layout = require("../base/Layout");
let OptionsBar = require("../views/OptionsBar");
let TextInput = require("../controls/TextInput");
let OptionsView = require("../views/OptionView");
let Button = require("../controls/Button");
let WebView = require("../views/WebView")

const {EditView} = require("../views/EditView");
// const Stage = require("../scene/Stage");

const VIEW_ROUTES = {
    "menubar": MenuBar,
    "infobar": InfoBar,
    "splitview": SplitView,
    "tabview": TabView,
    "flexview": FlexView,
    "layout": Layout,
    "gridview": GridView,
    "editview": EditView,
    "treeview": TreeView,
    "tableview": TableView,
    "fileexplorer": FileExplorer,
    "textitem": TextItem,
    "optionsbar": OptionsBar,
    "textinput": TextInput,
    "optionsview": OptionsView,
    "button": Button,
    "webview": WebView
}

const buildView = (view, structures) => {
    const IDS = {};
    const NAMES = {};
    if (view.length !== 1) {
        throw("A root view must contain 1 and only 1 child");
    }

    function buildRoots(view, lays) {
        for (let e of lays) {
            const {type: cls, attributes, children, value} = e;
            const type_class = VIEW_ROUTES[cls];
            if (!type_class) {
                console.warn(`Unknown view type "${cls}"`);
                continue;
            }
           
            if (cls === 'textitem') {
                attributes.text = value
            }

            const child = new type_class(attributes);
            if (attributes.id) {
                IDS[attributes.id] = child;
            }

            if (attributes.name) {
                let name = attributes.name;
                if (!NAMES[name]) {
                    NAMES[name] = [];
                }
                NAMES[name].push(child)
            }

            const xView = view.addChild(child);

            if (attributes.use && structures[attributes.use]) {
                xView.useStructure(structures[attributes.use]);
            }

            buildRoots(xView, children);
        }
    }

    const {type: cls, attributes, children} = view[0];
    const type_class = VIEW_ROUTES[cls];
    if (!type_class) {
        throw(`Unknown root view type "${cls}"`);
    }

    const ROOT_VIEW = new type_class(attributes);
    buildRoots(ROOT_VIEW, view[0].children);

    // let stage = new Stage(ROOT_VIEW);

    return {ROOT_VIEW, names:NAMES, ids:IDS};
};


module.exports = {
    buildView

}