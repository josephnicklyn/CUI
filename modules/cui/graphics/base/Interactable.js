function Interactable(BaseClass) {
    return class extends BaseClass {
        constructor(...args) {
            super(...args);
            this.setAttribute("hoverable", true);
            this.setAttribute("activatable", true);
            this._hovered = false;
        }

        hoverIn() {
            if (!this._hovered) {
                this._hovered = true;
                this.render?.(true);
            }
        }

        hoverOut() {
            if (this._hovered) {
                this._hovered = false;
                this.render?.(true);
            }
        }

        isHovered() {
            return this._hovered;
        }

        onActivate() {
            return super.onActivate?.() ?? false;
        }
    };
}

module.exports = Interactable;