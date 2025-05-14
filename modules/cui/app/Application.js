const dsl = require("../graphics/laybuilder/lay_parser");
const Stage = require("../graphics/scene/Stage");
const termutils = require("../graphics/base/termutils");
const terminal = require("../graphics/base/terminal");

class Application {
    #stages = {};
    #structures = {};
    #activeStage = null;
    constructor(main, structures) {

        if (Application.instance) {
            return Application.instance;
        }
        Application.instance = this;

        if (!termutils.isPrototypeByName(main, "Stage")) {
            throw "'main' must be a Stage"
        }    

        this.#stages.main = main;
        this.#structures = structures;
        this.#activeStage = main;
    }

    addStage(name, stage) {
        if (!termutils.isPrototypeByName(stage, "Stage")) {
            throw "'main' must be a Stage"
        }    
        if (termutils.isPrototypeByName(stage, "Stage")) {
            this.#stages[name] = stage;
        }
    }

    getMainStage() {
        return this.#stages.main;
    }

    getStructs() {
        return this.#structures;
    }

    centerStage() {
    }

    renderMainStage() {
        this.centerStage();
    }

    #tracking = false;
    track() {
        if (!this.#tracking) {
            this.handleBinder = this.mainEventHandler.bind(this); 
            terminal.begin(this.handleBinder);
            this.#tracking = true;
            this.renderMainStage();
        }
    }
    mainEventHandler(event) {
        if (event.type === 'CommandEvent') {
            if (event.command.action === 'EXIT') {
                terminal.exitApplication();
                return;
            }
        } else {
            this.#activeStage.handleEvent(event);
        }
        return true;
    }
}

let __APPLICATION = null;
const createApplication = (dslPath) => {
    if (__APPLICATION === null) {
    const {scenes, structures} = dsl.parseDSL(dsl.load(dslPath));
        if (!scenes.main) {
            throw "There must be a 'main' stage defined.";
        }
        const mainStage = new Stage(
            scenes.main.ROOT_VIEW,
            scenes.main.ids,
            scenes.main.names
        );
        __APPLICATION = new Application(mainStage, structures);

        Object.entries(scenes).forEach(([key, scene]) => {
            if (key != 'main') {
                let oStage = new Stage(
                    scene.ROOT_VIEW,
                    scene.ids,
                    scene.names
                );
                __APPLICATION.addStage(key, oStage)
            }
        });
    }
    return __APPLICATION;
}




const xcreateApplication = (dslPath) => {
    if (__APPLICATION === null) {
    const {scenes, structures} = dsl.parseDSL(dsl.load(dslPath));
        if (!scenes.main) {
            throw "There must be a 'main' stage defined.";
        }
        const mainStage = new Stage(
            scenes.main.ROOT_VIEW,
            scenes.main.ids,
            scenes.main.names
        );
        __APPLICATION = new Application(mainStage, structures);

        Object.entries(scenes).forEach(([key, scene]) => {
            if (key != 'main') {
                let oStage = new Stage(
                    scene.ROOT_VIEW,
                    scene.ids,
                    scene.names
                );
                __APPLICATION.addStage(key, oStage)
            }
        });
    }
    return __APPLICATION;
}

module.exports = {
    Application,
    createApplication
};