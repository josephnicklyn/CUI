const Dialog = require("./Dialog");
const InputForm = require("../views/InputForm");

class InputDialog extends Dialog {
    constructor(options = { title: "Input", fields: [] }) {
        const content = new InputForm({
            title: options.title,
            labelPosition: options.labelPosition || "left",
            fields: options.fields
        });
        super(options, content);

        content.generateFieldDefs();
        content.onSubmit = (data) => this.release(data);
        content.onCancel = () => this.release({ cancelled: true });

        this.handleEvent = content.handleEvent.bind(content);
        this.setOnActionListener(() => {
            content.release(); // Return result to .show()
        });
    }
}

module.exports = InputDialog;
