const Layout = require("../base/Layout")
const termutils = require("../base/termutils");
const ButtonBar = require("./ButtonBar");
const FlexView = require("./FlexView");

class OptionsBar extends FlexView   {
    constructor(options={}) {
        super(options);
    }

    render(now) {
        super.render(true);
    }
}

module.exports = OptionsBar;