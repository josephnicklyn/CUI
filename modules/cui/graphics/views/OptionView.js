const Button = require("../controls/Button");

class OptionsView extends Button   {
    constructor(options) {
        const defaultOptions = { text: "Options...", fixed: 12 };
        const mergedOptions = { ...defaultOptions, ...options }; // Merge provided options with defaults
        super(mergedOptions);
    }
}

module.exports = OptionsView;