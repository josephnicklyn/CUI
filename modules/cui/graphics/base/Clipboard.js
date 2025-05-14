const { copy, paste } = require('copy-paste');

class Clipboard {
    static #localClipboard = "";

    static async read() {
        try {
            const pastedText = paste();
            if (typeof pastedText === 'string') {
                this.#localClipboard = pastedText;
                return pastedText;
            }
        } catch (err) {
            console.error("Clipboard read failed:", err);
        }
        return this.#localClipboard;
    }

    static async write(text) {
        try {
            copy(text);
            this.#localClipboard = text;
        } catch (err) {
            console.error("Clipboard write failed:", err);
            this.#localClipboard = text;
        }
    }

    static getLocalClipboard() {
        return this.#localClipboard;
    }
}

module.exports = Clipboard;
