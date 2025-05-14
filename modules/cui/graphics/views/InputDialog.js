const Dialog = require("../scene/Dialog");
const InputForm = require("./InputForm");

class InputDialog extends Dialog {
    constructor(mainStage, options = { title: "Input", fields: [] }) {
        const content = new InputForm({
            title: options.title,
            labelPosition: options.labelPosition || "left",
            fields: options.fields
        });
        super(mainStage, options, content);

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
