/**
 * A system to create any RPG ruleset without needing to code
 * Author: Seregras
 * Software License: GNU GPLv3
 */

// Import Modules
import { gActorSheet } from "./gactorsheet.js";
import { sItemSheet } from "./sitemsheet.js";
import { gActor } from "./a-entity.js";
import { gItem } from "./i-entity.js";
import { SBOX } from "./config.js";
import { auxMeth } from "./auxmeth.js";
import { sToken } from "./sandboxtoken.js";

// ALONDAAR this function creates a macro when data is dragged to the macro hotbar
async function createSandboxMacro(data, slot) {
    if (data.type != "rollable") return;
    let rollData = data.data;

    // Add quotes to the strings if they are NOT null/true/false
    rollData.attrID = await placeholderParser(rollData.attrID);
    rollData.attKey = await placeholderParser(rollData.attKey);
    rollData.citemID = await placeholderParser(rollData.citemID);
    rollData.citemKey = await placeholderParser(rollData.citemKey);
    rollData.tableKey = await placeholderParser(rollData.tableKey);

    // Do not put whitespace above the start of the macro,
    // or else (command === m.data.command) is always false
    const command =
        `let rollData = {
    attrID: ${rollData.attrID},
    attKey: ${rollData.attKey},
    citemID: ${rollData.citemID},
    citemKey: ${rollData.citemKey},
    ciRoll: ${rollData.ciRoll},
    isFree: ${rollData.isFree},
    tableKey: ${rollData.tableKey},
    useData: ${rollData.useData}
};

// This is the ID the macro was dragged from
// For checking Free Table ID's
let originalActorId = "${data.actorId}";

const speaker = ChatMessage.getSpeaker();
let actor;
if (speaker.token) actor = game.actors.tokens[speaker.token];
if (!actor) actor = game.actors.get(speaker.actor);
if (actor) {
    let letsContinue = true;
    // Check if actor possess the citem
    if(rollData.citemKey != null)
        if(!actor.data.data.citems.find(ci => ci.ciKey === rollData.citemKey))
            return ui.notifications.warn("Current actor does not possess the required citem.");

    // Check if the free table item still exists
    if(rollData.isFree)
        if(!actor.data.data.attributes[rollData.tableKey].tableitems.find(ti => ti.id === rollData.citemID))
            return ui.notifications.warn("Current actor does not possess the referenced Free Table id.");
        // Check if the selected actor is the original
        else if (actor.data._id != originalActorId)
            await Dialog.confirm({
                title: "ARE YOU SURE ABOUT THAT?",
                content: "You are about to roll a Free Table id that isn't from the same actor you created the macro from.<br><br>This may have unintended results due to targetting a different id owned by that actor.",
                yes: () => {},
                no: () => {letsContinue = false;},
                defaultYes: true
            });

        if(letsContinue)
            actor.sheet._onRollCheck(${rollData.attrID}, ${rollData.attKey}, ${rollData.citemID}, ${rollData.citemKey}, ${rollData.ciRoll}, ${rollData.isFree}, ${rollData.tableKey}, ${rollData.useData});
    } else
    ui.notifications.warn("Couldn't find actor. Select a token.");`;

    let actorName = game.actors.get(data.actorId).name;
    if (game.user.isGM)
        actorName = "GM";
    let macroName = "[" + actorName + "] " + rollData.tag;

    let macro = game.macros.contents.find(m => (m.name === macroName) && (m.data.command === command));
    if (!macro) {
        macro = await Macro.create({
            name: macroName,
            type: "script",
            img: rollData.img,
            command: command,
            flags: {},
            permission: game.actors.get(data.actorId).data.permission
        });
        ui.notifications.warn('Macro created.');
    }

    await game.user.assignHotbarMacro(macro, slot);
    return false;
}

// ALONDAAR Add quotes to the strings if they are NOT null/true/false
async function placeholderParser(str) {
    if (str != null && str != true && str != false) {
        str = "\"" + str + "\"";
    }
    return str;
}

/* -------------------------------------------- */
/*  Hooks                 */
/* -------------------------------------------- */

Hooks.once("init", async function () {
    console.log(`Initializing Sandbox System`);

    /**
     * Set an initiative formula for the system
     * @type {String}
     */

    CONFIG.debug.hooks = true;
    CONFIG.Actor.documentClass = gActor;
    CONFIG.Item.documentClass = gItem;
    CONFIG.Token.documentClass = sToken;

    auxMeth.buildSheetHML();
    auxMeth.registerIfHelper();
    auxMeth.registerIfNotHelper();
    auxMeth.registerIfGreaterHelper();
    auxMeth.registerIfLessHelper();
    auxMeth.registerIsGM();
    auxMeth.registerShowMod();
    auxMeth.registerShowSimpleRoll();
    auxMeth.registerShowRollMod();

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("dnd5e", gActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("dnd5e", sItemSheet, { makeDefault: true });

    game.settings.register("sandbox", "showADV", {
        name: "Show Roll with Advantage option",
        hint: "If checked, 1d20,ADV,DIS options will be displayed under the Actor's name",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("sandbox", "showSimpleRoller", {
        name: "Show d20 Roll icon option",
        hint: "If checked a d20 icon will be displayed under the Actor's name",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("sandbox", "consistencycheck", {
        name: "Check cItem Consistency",
        hint: "If checked, when rebuilding template, every cItem will be evaluated for consistency. WARNING: May take several minutes in big systems",
        scope: "world",
        config: false,
        default: false,
        type: Boolean,
    });

    game.settings.register("sandbox", "showDC", {
        name: "Show DC window",
        hint: "If checked a DC box will appear at the bottom of the screen",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("sandbox", "showLastRoll", {
        name: "Show Last Roll window",
        hint: "If checked a box displaying the results of the last Roll will appear at the bottom of the screen",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("sandbox", "diff", {
        name: "GM difficulty",
        hint: "This is linked to the DC Box at the bottom of the screen",
        scope: "world",
        config: false,
        default: 0,
        type: Number,
    });

    game.settings.register("sandbox", "rollmod", {
        name: "Show Roll Modifier",
        hint: "This number will be added to the total of all rolls",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.register("sandbox", "tokenOptions", {
        name: "Token Options",
        hint: "You can specify bar1 under token on the template Token tab",
        scope: "world",
        config: true,
        default: 0,
        type: Boolean,
    });

    game.settings.register("sandbox", "customStyle", {
        name: "CSS Style file",
        hint: "You can specify a custom styling file. If default wanted, leave blank",
        scope: "world",
        config: true,
        default: "",
        type: String,
    });

    game.settings.register("sandbox", "initKey", {
        name: "Initiative Attribute Key",
        hint: "After editing, please refresh instance",
        scope: "world",
        config: true,
        default: "",
        type: String,
    });

    game.settings.register("sandbox", "auxsettext1", {
        name: "Auxiliary settings text 1",
        hint: "After editing, please refresh instance",
        scope: "world",
        config: false,
        default: null,
        type: String,
    });

    game.settings.register("sandbox", "idDict", {
        name: "Dictionary IDs for importing cItems",
        hint: "As cItems dont have word keys, this ensures faster lokup",
        scope: "world",
        config: false,
        default: null,
        type: String,
    });

    Combat.prototype.rollInitiative = async function (ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {

        // Structure input data
        ids = typeof ids === "string" ? [ids] : ids;
        const currentId = this.combatant.id;
        const rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");

        // Iterate over Combatants, performing an initiative roll for each
        const updates = [];
        const messages = [];
        for (let [i, id] of ids.entries()) {

            // Get Combatant data (non-strictly)
            const combatant = this.combatants.get(id);
            if (!combatant?.isOwner) return results;

            // Produce an initiative roll for the Combatant
            const roll = await combatant.getInitiativeRoll(formula);
            console.log(roll);
            updates.push({ _id: id, initiative: roll.total });

            // Construct chat message data
            let messageData = foundry.utils.mergeObject({
                speaker: {
                    scene: this.scene.id,
                    actor: combatant.actor?.id,
                    token: combatant.token?.id,
                    alias: combatant.name
                },
                flavor: game.i18n.format("COMBAT.RollsInitiative", { name: combatant.name }),
                flags: { "core.initiativeRoll": true }
            }, messageOptions);
            const chatData = await roll.toMessage(messageData, {
                create: false,
                rollMode: combatant.hidden && (rollMode === "roll") ? "gmroll" : rollMode
            });

            // Play 1 sound for the whole rolled set
            if (i > 0) chatData.sound = null;
            messages.push(chatData);
        }
        if (!updates.length) return this;

        // Update multiple combatants
        await this.updateEmbeddedDocuments("Combatant", updates);

        // Ensure the turn order remains with the same combatant
        if (updateTurn) {
            await this.update({ turn: this.turns.findIndex(t => t.id === currentId) });
        }

        // Create multiple chat messages
        await ChatMessage.implementation.create(messages);
        return this;

    };

    Combatant.prototype.getInitiativeRoll = async function (formula) {

        formula = formula || await this._getInitiativeFormula();
        const rollData = await this.actor.getRollData() || {};
        const roll = Roll.create(formula, rollData);
        return roll.evaluate({ async: false });
    };


    Combatant.prototype._getInitiativeFormula = async function () {

        let initF = await game.settings.get("sandbox", "initKey");
        let formula = "1d20";
        if (initF != "") {
            formula = "@{" + initF + "}"
        }

        formula = await auxMeth.autoParser(formula, this.actor.data.data.attributes, null, true, false);
        formula = await auxMeth.autoParser(formula, this.actor.data.data.attributes, null, true, false);

        console.log("aqui1");

        CONFIG.Combat.initiative.formula = formula;

        console.log(formula);

        return CONFIG.Combat.initiative.formula || game.system.data.initiative;

    };

    CompendiumCollection.prototype.importAll = async function ({ folderId = null, folderName = "", options = {} } = {}) {

        // Optionally, create a folder
        if (CONST.FOLDER_ENTITY_TYPES.includes(this.documentName)) {
            const f = folderId ? game.folders.get(folderId, { strict: true }) : await Folder.create({
                name: folderName || this.title,
                type: this.documentName,
                parent: null
            });
            folderId = f.id;
            folderName = f.name;
        }

        // Load all content
        const documents = await this.getDocuments();
        ui.notifications.info(game.i18n.format("COMPENDIUM.ImportAllStart", {
            number: documents.length,
            type: this.documentName,
            folder: folderName
        }));

        // Prepare import data
        const collection = game.collections.get(this.documentName);
        const createData = documents.map(doc => {
            const data = collection.fromCompendium(doc);
            data.folder = folderId;
            return data;
        })

        // Create World Documents in batches
        const chunkSize = 100;
        const nBatches = Math.ceil(createData.length / chunkSize);
        let created = [];
        for (let n = 0; n < nBatches; n++) {
            const chunk = createData.slice(n * chunkSize, (n + 1) * chunkSize);
            const docs = await this.documentClass.createDocuments(chunk, options);
            let dictext = game.settings.get("sandbox", "idDict");
            let arrdisct = {};
            if (dictext != "")
                arrdisct = JSON.parse(dictext);
            else {
                arrdisct.ids = {};
            }
            let register = false;
            for (let i = 0; i < docs.length; i++) {
                let mydoc = docs[i];
                if (hasProperty(mydoc, "data"))
                    if (hasProperty(mydoc.data, "data"))
                        if (hasProperty(mydoc.data.data, "ciKey")) {
                            arrdisct.ids[mydoc.data.data.ciKey] = mydoc.id;
                            register = true;
                        }


            }

            const myJSON = JSON.stringify(arrdisct);
            if (register)
                await game.settings.set("sandbox", "idDict", myJSON);

            created = created.concat(docs);
        }

        // Notify of success
        ui.notifications.info(game.i18n.format("COMPENDIUM.ImportAllFinish", {
            number: created.length,
            type: this.documentName,
            folder: folderName
        }));
        return created;
    };

    WorldCollection.prototype.importFromCompendium = async function (pack, id, updateData = {}, options = {}) {
        //console.log("importing");
        const cls = this.documentClass;
        if (pack.metadata.entity !== cls.documentName) {
            throw new Error(`The ${pack.documentName} Document type provided by Compendium ${pack.collection} is incorrect for this Collection`);
        }

        // Prepare the source data from which to create the Entity
        const document = await pack.getDocument(id);
        const sourceData = this.fromCompendium(document);
        const createData = foundry.utils.mergeObject(sourceData, updateData);

        // Create the Entity
        console.log(`${vtt} | Importing ${cls.documentName} ${document.name} from ${pack.collection}`);
        this.directory.activate();
        let newObj = await this.documentClass.create(createData, options);
        await auxMeth.registerDicID(id, newObj.id, newObj.data.data.ciKey);
        return newObj;
    };

         JournalEntry.prototype.show = async function (mode = "text", force = false) {
        if (!this.isOwner) throw new Error("You may only request to show Journal Entries which you own.");
        return new Promise((resolve) => {
            game.socket.emit("showEntry", this.uuid, mode, force, entry => {
                Journal._showEntry(this.uuid, mode, true);
                // ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                //     mode: mode,
                //     title: this.name,
                //     which: force ? "all" : "authorized"
                // }));
                return resolve(this);
            });
        });
    }; 

    CONFIG.Combat.initiative = {
        formula: "1d20",
        decimals: 2
    };

    game.socket.on("system.sandbox", (data) => {
        if (data.op === 'target_edit') {
            let actorOwner = game.actors.get(data.actorId);
            actorOwner.handleTargetRequest(data);
        }
    });

    game.socket.on("system.sandbox", (data) => {
        if (data.op === 'transfer_edit') {
            let actorOwner = game.actors.get(data.ownerID);
            actorOwner.handleTransferEdit(data);
        }
    });


});

Hooks.once('ready', async () => {
    //console.log("ready!");
    Hooks.on("hotbarDrop", (bar, data, slot) => createSandboxMacro(data, slot)); // ALONDAAR

    //Custom styling

    if (game.settings.get("sandbox", "customStyle") != "") {
        const link = document.createElement('link');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = game.settings.get("sandbox", "customStyle");
        await document.getElementsByTagName('head')[0].appendChild(link);
    }


    //Gets current sheets
    await auxMeth.getSheets();

    //GM ROLL MENU TEMPLATE
    //Sets roll menu close to hotbar THIS IS SOMETHING FOR ME STREAMS, TO REMOVE IF YOU LIKE
    if (game.user.isGM) {

        game.data.rolldc = 3;

        let basedoc = document.getElementsByClassName("vtt game system-sandbox");

        let hotbar = document.createElement("DIV");
        hotbar.className = "dcroll-bar";
        hotbar.setAttribute("id", "dcroll-bar");

        basedoc[0].appendChild(hotbar);

        let backgr = document.createElement("DIV");
        backgr.className = "dc-input";

        let header = document.createElement("DIV");
        header.className = "dc-header";
        header.textContent = "DC";

        let form = document.createElement("FORM");
        let sInput = document.createElement("INPUT");
        sInput.className = "dcinput-box";
        sInput.setAttribute("type", "text");
        sInput.setAttribute("name", "dc");
        sInput.setAttribute("value", "");

        let initvalue = 0;
        //        if(!hasProperty(SBOX.diff,game.data.world.name)){
        //            setProperty(SBOX.diff,game.data.world.name,0);
        //        }

        sInput.value = game.settings.get("sandbox", "diff");

        sInput.addEventListener("keydown", async (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (event.key == "Backspace" || event.key == "Delete") {
                sInput.value = 0;
            }

            else if (event.key == "Enter") {
                //SBOX.diff[game.data.world.name] = sInput.value;
                await game.settings.set("sandbox", "diff", sInput.value);
            }

            else if (event.key == "-") {
                //SBOX.diff[game.data.world.name] = sInput.value;
                sInput.value = "-";
            }

            else {
                if (!isNaN(event.key))
                    sInput.value += event.key;
            }

            if (!isNaN(sInput.value)) {
                sInput.value = parseInt(sInput.value);
            }


        });

        sInput.addEventListener("focusout", async (event) => {
            event.preventDefault();
            event.stopPropagation();

            //SBOX.diff[game.data.world.name] = sInput.value;
            await game.settings.set("sandbox", "diff", sInput.value);

        });

        form.appendChild(sInput);
        backgr.appendChild(header);

        backgr.appendChild(form);

        if (game.settings.get("sandbox", "showDC")) {
            await hotbar.appendChild(backgr);
        }


        await auxMeth.rollToMenu();
        SBOX.showshield = false;

        if (game.settings.get("sandbox", "tokenOptions")) {
            document.addEventListener("keydown", (event) => {
                if (event.key == "Control") {
                    SBOX.showshield = true;
                }

            });

            document.addEventListener("keyup", (event) => {
                SBOX.showshield = false;

            });
        }

    }

});

Hooks.on("renderSidebarTab", createExportButtons);

function createExportButtons(sidebar, jq) {

    if (sidebar._element[0].id != "settings")
        return;

    if (!game.user.isGM)
        return;
    //NEW SETTINGS OPTIONS
    let settingstab = jq.get(0).querySelector('#settings-game');

    let exportButton = document.createElement("BUTTON");
    exportButton.textContent = "EXPORT SANDBOX JSON";

    exportButton.addEventListener("click", (event) => {
        auxMeth.exportBrowser();

    });

    let importButton = document.createElement("BUTTON");
    importButton.textContent = "IMPORT SANDBOX JSON";

    importButton.addEventListener("click", (event) => {
        auxMeth.getImportFile();

    });

    settingstab.appendChild(exportButton);
    settingstab.appendChild(importButton);
}

//COPIED FROM A MODULE. TO SHOW A SHIELD ON A TOKEN AND LINK THE ATTRIBUTE
Hooks.on("hoverToken", (token, hovered) => {

    if (!game.settings.get("sandbox", "tokenOptions"))
        return;

    if (token.actor == null)
        return;

    if (token.actor.data.data.tokenshield == null)
        return;

    let shieldprop = token.actor.data.data.tokenshield;
    //console.log(shieldprop);

    if (token.actor.data.data.attributes[shieldprop] == null)
        return;

    let ca = token.actor.data.data.attributes[shieldprop].value;

    let template = $(`
<div class="section">
<div class="value"><i class="fas fa-shield-alt"></i>${ca}</div>
</div>
`);

    if (hovered && SBOX.showshield) {
        let canvasToken = canvas.tokens.placeables.find((tok) => tok.id === token.id);

        let dmtktooltip = $(`<div class="dmtk-tooltip"></div>`);
        dmtktooltip.css('left', (canvasToken.worldTransform.tx + ((token.width) * canvas.scene._viewPosition.scale)) + 'px');
        dmtktooltip.css('top', (canvasToken.worldTransform.ty) + 'px');
        dmtktooltip.html(template);
        $('body.game').append(dmtktooltip);
    } else {
        $('.dmtk-tooltip').remove();
    }

});

Hooks.on("preUpdateActor", async (actor, updateData, options, userId) => {
    //console.log(actor);
    //console.log(updateData);
    //console.log(data.data.istemplate);
    //console.log("preup");

    //await actor.sheet.setTokenOptions(actor.data);
    //    let newname = actor.data.name;
    //
    if (updateData.name) {

        if (!actor.data.data.istemplate) {
            if (!updateData.token)
                setProperty(updateData, "token", {});
            updateData.token.name = updateData.name;
        }

        else {
            delete updateData.name;
        }


    }


    if (updateData["data.rollmode"]) {
        if (!hasProperty(updateData, "data"))
            setProperty(updateData, "data", {});
        updateData.data.rollmode = updateData["data.rollmode"];
    }

    //console.log(updateData);


});

Hooks.on("preUpdateItem", async (item, updateData, options, userId) => {
    //console.log(actor);
    //console.log(updateData);
    //console.log(data.data.istemplate);
    //console.log("preup");

    //await actor.sheet.setTokenOptions(actor.data);
    //    let newname = actor.data.name;
    //
    if (item.data.type == "cItem" && game.user.isGM) {

        if (item.data.data.ciKey == "") {
            if (!hasProperty(updateData, "data"))
                setProperty(updateData, "data", {});
            updateData.data.ciKey = item.id;
        }


    }


});

Hooks.on("createToken", async (token, options, userId) => {

    if (game.settings.get("sandbox", "tokenOptions")) {
        let tokenData = token.data;
        let sameTokens = canvas.tokens.placeables.filter((tok) => tok.data.actorId === tokenData.actorId);

        if (token.actor.isToken) {
            let tokennumber = 0;
            if (sameTokens.length > 0) {
                tokennumber = sameTokens.length;
            }
            let newname = token.name + " " + tokennumber.toString();

            if (tokennumber < 2)
                newname = token.name;

            token.update({ name: newname });
        }


    }

});

Hooks.on("deleteToken", (scene, token) => {
    $('.dmtk-tooltip').remove();
});

Hooks.on('createCombatant', (combat, combatantId, options) => {
    combatantId.initiative = 1;
});

Hooks.on("preCreateActor", (createData) => {
    if (createData.token != null)
        createData.token.name = createData.name;

    //    if(createData.data.data.istemplate)
    //        createData.data.data.istemplate = false;
    //
    //    console.log(createData.data.data.istemplate);

});

Hooks.on("deleteActor", (actor) => {
    //console.log(actor);

});

//Hooks.on("updateActor", async (actor, updateData,options,userId) => {
//
//    if(actor.data.permission.default >= CONST.ENTITY_PERMISSIONS.OBSERVER ||  actor.data.permission[game.user.id] >= CONST.ENTITY_PERMISSIONS.OBSERVER || game.user.isGM){
//        let myuser = userId;
//    }
//    else{
//        return;
//    }
//
//    if(updateData.data!=null){
//        if(!options.stopit && (updateData.data.attributes || updateData.data.citems)){
//
//            //let adata = await actor.actorUpdater(actor.data);
//            //THIS UPDATE BELOW IS THE CULPRIT
//            //await actor.update(actor.data,{stopit:true});
//        }
//    }
//
//});

Hooks.on("closegActorSheet", (entity, eventData) => {
    //console.log(entity);
    //console.log(eventData);
    //console.log("closing sheet");

    let character = entity.object.data;
    if (character.flags.ischeckingauto)
        character.flags.ischeckingauto = false;

    //entity.object.update({"token":entity.object.data.token},{diff:false});


});

Hooks.on("preCreateItem", (entity, options, userId) => {
    //    let image="";
    //    console.log(entity.img);
    //    if(entity.img == "icons/svg/item-bag.svg"){
    //        console.log("aqui");

    //
    //        if(entity.type=="sheettab"){
    //            image="systems/sandbox/docs/icons/sh_tab_icon.png";
    //        }
    //
    //        if(entity.type=="group"){
    //            image="systems/sandbox/docs/icons/sh_group_icon.png";
    //        }
    //
    //        if(entity.type=="panel"){
    //            image="systems/sandbox/docs/icons/sh_panel_icon.png";
    //        }
    //
    //        if(entity.type=="multipanel"){
    //            image="systems/sandbox/docs/icons/sh_panel_icon.png";
    //        }
    //
    //        if(entity.type=="property"){
    //            image="systems/sandbox/docs/icons/sh_prop_icon.png";
    //        }
    //
    //        if(image!="")
    //            entity.img = image;
    //    }
    //
    //    console.log(image);



});

Hooks.on("createItem", async (entity) => {
    //console.log(entity);
    let do_update = false;
    let image = "";
    if (entity.type == "cItem" && game.user.isGM) {
        //console.log(entity);

        if (entity.data.data.ciKey == "") {
            entity.data.data.ciKey = entity.id;
            //do_update = true;
        }
        // else {
        //     let is_here = game.items.filter(y => Boolean(y.data.data.ciKey)).find(y => y.data.data.ciKey == entity.data.data.ciKey && y.id != entity.id);
        //     if (is_here){
        //         entity.data.data.ciKey = entity.id;
        //         do_update = true;
        //     }

        // }

        for (let i = 0; i < entity.data.data.mods.length; i++) {
            const mymod = entity.data.data.mods[i];
            if (mymod.citem != entity.data.id) {
                mymod.citem = entity.data.id;
                do_update = true;
            }

        }
        //BEWARE OF THIS, THIS WAS NEEDED WHEN DUPLICATING CITEMS IN THE PAST!!
        if (do_update)
            await entity.update(entity.data, { diff: false });
    }

});

Hooks.on("rendersItemSheet", async (app, html, data) => {
    //console.log(app);

    app.customCallOverride(html,app.object.data);

    if (app.object.data.type == "cItem") {
        app.refreshCIAttributes(html);
    }

    if (app.object.data.type == "property") {
        app.listMacros(html);
    }

    await app.scrollBarTest(html);
    app._setScrollStates();


    html.find('.window-resizable-handle').mouseup(ev => {
        ev.preventDefault();
        app.scrollBarTest(html);
    });

});

Hooks.on("rendergActorSheet", async (app, html, data) => {
    //console.log("rendering Hook");
    //console.log(app);
    //console.log(data);
    const actor = app.actor;

    if (actor.token == null)
        actor.listSheets();
    //if(!actor.data.data.istemplate && !actor.data.flags.ischeckingauto){
    if (!actor.data.data.istemplate) {
        await app.refreshCItems(html);
        app.handleGMinputs(html);
        app.refreshBadge(html);
        app.populateRadioInputs(html);
        app.modifyLists(html);
        app.setImages(html);
        app.setCheckboxImages(html);
        app.addHeaderButtons(html);
        app.customCallOverride(html);
        await app.setSheetStyle(actor);
        //app.scrollBarLoad(html);

        actor.setInputColor();

        html.find('.window-resizable-handle').mouseup(ev => {
            ev.preventDefault();
            app.setSheetStyle(actor);
        });



    }

    app.displaceTabs2(null, html);
    await app._setScrollStates();

});

Hooks.on("renderChatMessage", async (app, html, data) => {
    //    console.log(app);
    //    console.log(data);
    //    console.log(html);
    let hide = false;
    let messageId = app.id;
    let msg = game.messages.get(messageId);

    let msgIndex = game.messages.contents.indexOf(msg);

    let _html = await html[0].outerHTML;
    let realuser = game.users.get(data.message.user);
    let alias = data.alias;
    //
    //    if(((data.cssClass == "whisper")||(data.message.type==1)) && game.user.id!=data.message.user && !game.user.isgM)
    //        hide=true;

    //console.log(hide);
    if (_html.includes("dice-roll") && !_html.includes("table-draw")) {
        let rollData = {
            token: {
                img: "icons/svg/d20-black.svg",
                name: "Free Roll"
            },
            actor: alias,
            flavor: "Roll",
            formula: app._roll.formula,
            mod: 0,
            result: app._roll.total,
            dice: app._roll.dice,
            user: realuser.data.name,
            showresult: true
        };


        await renderTemplate("systems/sandbox/templates/dice.html", rollData).then(async newhtml => {

            let container = html[0];

            let content = html.find('.dice-roll');
            content.replaceWith(newhtml);

            _html = await html[0].outerHTML;


        });

    }

    //console.log(html);

    if (!_html.includes("roll-template")) {
        //console.log(_html);
        if (_html.includes("table-draw")) {
            let mytableID = data.message.flags.core.RollTable;
            let mytable = game.tables.get(mytableID);
            let tableresult = mytable.getResultsForRoll(app._roll.total)[0].data.text;
            html.find('.dice-roll');
            if (mytable.data.permission.default == 0)
                hide = true;
        }

        let msgData = {
            message: data.message.content,
            user: alias,
            isWhisper: data.isWhisper,
            whisperTo: data.whisperTo
        };

        await renderTemplate("systems/sandbox/templates/sbmessage.html", msgData).then(async newhtml => {

            while (html.firstChild) {
                html.removeChild(html.lastChild);
            }

            html[0].innerHTML = newhtml;


        });

    }

    let deletebutton = $(html).find(".roll-message-delete")[0];
    //console.log(deletebutton);
    if (deletebutton != null) {
        if (game.user.isGM) {
            $(html).find(".roll-message-delete").click(async ev => {
                msg.delete(html);
            });
            auxMeth.rollToMenu();
        }

        else {
            deletebutton.style.display = "none";
        }
    }



    //console.log(html);

    //
    //
    let iamWhispered = data.message.whisper.find(y => y == game.user.id);
    if (iamWhispered == null && data.message.whisper.length>0) {
        hide = true;
    }

    if (!game.user.isGM && hide && (game.user.id != data.author.id )) {
        //console.log(html);
        //console.log(_html);
        html.hide();
    }

    //ROLL INSTRUCTIONS
    let header = $(html).find(".message-header");
    header.remove();
    //console.log("tirando");
    let detail = await $(html).find(".roll-detail")[0];
    let result = $(html).find(".roll-result")[0];
    let clickdetail = $(html).find(".roll-detail-button")[0];
    let clickmain = $(html).find(".roll-main-button")[0];
    let citemlink = $(html).find(".roll-citemlink")[0];

    if (detail == null) {

        return;

    }

    if (result == null) {
        return;
    }

    if (clickdetail == null) {
        return;
    }

    if (clickmain == null) {

        return;
    }

    if (!game.user.isGM && data.message.blind) {
        detail.style.display = "none";
        result.style.display = "none";
        clickdetail.style.display = "none";
        clickmain.style.display = "none";
    }

    let detaildisplay = detail.style.display;
    detail.style.display = "none";

    let resultdisplay = result.style.display;


    let clickdetaildisplay = clickdetail.style.display;

    let clickmaindisplay = clickmain.style.display;
    clickmain.style.display = "none";


    $(html).find(".roll-detail-button").click(ev => {
        detail.style.display = detaildisplay;
        result.style.display = "none";
        $(html).find(".roll-detail-button").hide();
        $(html).find(".roll-main-button").show();
    });

    $(html).find(".roll-main-button").click(ev => {
        result.style.display = resultdisplay;
        detail.style.display = "none";
        $(html).find(".roll-detail-button").show();
        $(html).find(".roll-main-button").hide();
    });

    if (citemlink) {
        $(html).find(".roll-citemlink").click(ev => {
            let mylinkId = ev.target.getAttribute("id");

            if (mylinkId) {
                const item = game.items.get(mylinkId);
                item.sheet.render(true);
            }

        });
    }


});

Hooks.on("renderDialog", async (app, html, data) => {
    const htmlDom = html[0];

    if (app.data.citemdialog) {

        let checkbtns = htmlDom.getElementsByClassName("dialog-check");
        let dialogDiv = htmlDom.getElementsByClassName("item-dialog");
        let button = htmlDom.getElementsByClassName("dialog-button")[0];
        let links = htmlDom.getElementsByClassName("linkable");

        let actorId = dialogDiv[0].getAttribute("actorId");
        let selectnum = dialogDiv[0].getAttribute("selectnum");
        const actor = game.actors.get(actorId);
        setProperty(actor.data.flags, "selection", []);
        button.disabled = true;

        for (let i = 0; i < checkbtns.length; i++) {
            let check = checkbtns[i];
            check.addEventListener("change", (event) => {

                let itemId = event.target.getAttribute("itemId");
                if (event.target.checked) {
                    actor.data.flags.selection.push(itemId);
                }

                else {
                    actor.data.flags.selection.splice(actor.data.flags.selection.indexOf(itemId), 1);
                }

                let selected = actor.data.flags.selection.length;

                if (selected != selectnum) {
                    button.disabled = true;
                }
                else {
                    button.disabled = false;
                }

            });
        }
        for (let j = 0; j < links.length; j++) {
            links[j].addEventListener("click", async (event) => {
                let itemId = event.target.getAttribute("itemId");
                let ciKey = event.target.getAttribute("ciKey");
                let citem = await auxMeth.getcItem(itemId, ciKey);
                citem.sheet.render(true);
            });
        }

    }

    if (app.data.citemText) {

        htmlDom.addEventListener("keydown", function (event) {
            event.stopPropagation();
        }, true);

        let t_area = htmlDom.getElementsByClassName("texteditor-large");
        //console.log(t_area);
        t_area[0].disabled = true;
        t_area[0].addEventListener("change", (event) => {
            app.data.dialogValue = event.target.value;

        });

        let lock_content = htmlDom.getElementsByClassName("lockcontent");
        let lock_button = htmlDom.getElementsByClassName("lock");
        let lock_open = htmlDom.getElementsByClassName("lockopen");

        let button = htmlDom.getElementsByClassName("dialog-button")[0];
        button.disabled = true;

        lock_open[0].style.display = "none";
        lock_button[0].addEventListener("click", function (event) {
            event.stopPropagation();
            //console.log("locking");
            lock_open[0].style.display = "block";
            lock_button[0].style.display = "none";
            t_area[0].disabled = false;
            button.disabled = true;
        }, true);

        lock_open[0].addEventListener("click", function (event) {
            event.stopPropagation();
            //console.log("unlocking");
            lock_button[0].style.display = "block";
            lock_open[0].style.display = "none";
            button.disabled = false;
            t_area[0].disabled = true;
        }, true);
    }

    if (app.data.exportDialog) {
        let checkbtns = htmlDom.getElementsByClassName("checkbox");
        for (let i = 0; i < checkbtns.length; i++) {
            let check = checkbtns[i];
            check.addEventListener("change", (event) => {

                let checkgroup = event.target.getAttribute("folderid");
                var newevent = new Event('change');

                if (checkgroup != null) {
                    for (let j = 0; j < checkbtns.length; j++) {
                        let othercheck = checkbtns[j];
                        if (othercheck.getAttribute("parentid") == checkgroup && othercheck != check) {
                            if (event.target.checked) {
                                if (!othercheck.checked) {
                                    othercheck.checked = true;
                                    othercheck.dispatchEvent(newevent);
                                }

                            }
                            else {
                                if (othercheck.checked) {
                                    othercheck.checked = false;
                                    othercheck.dispatchEvent(newevent);
                                }
                            }



                        }

                    }
                }

            });
        }
    }

    if (app.data.rollDialog) {

        let checkbtns = htmlDom.getElementsByClassName("checkbox");

        for (let i = 0; i < checkbtns.length; i++) {
            let check = checkbtns[i];
            check.addEventListener("change", (event) => {

                let checkgroup = event.target.getAttribute("checkGroup");

                if (event.target.checked && checkgroup != "") {
                    for (let j = 0; j < checkbtns.length; j++) {
                        let othercheck = checkbtns[j];
                        if (othercheck.getAttribute("checkGroup") == checkgroup && othercheck != check)
                            othercheck.checked = false;
                    }
                }

            });
        }

        let allfields = htmlDom.getElementsByClassName("rdialogInput");
        let dialogProps = {};

        for (let k = 0; k < allfields.length; k++) {
            let myKey = allfields[k].getAttribute("attKey");
            setProperty(dialogProps, myKey, {});
            if (allfields[k].type == "checkbox") {

                dialogProps[myKey].value = allfields[k].checked;
            }
            else {
                dialogProps[myKey].value = allfields[k].value;

                if (allfields[k].classList.contains("hasarrows")) {

                    let sInputArrows = document.createElement("SPAN");
                    let arrContainer = document.createElement("A");
                    arrContainer.className = "arrcontainer";
                    arrContainer.style.display = "inline-block";
                    arrContainer.setAttribute("attKey", allfields[k].getAttribute("attKey"));
                    let arrUp = document.createElement("I");
                    arrUp.className = "arrup";
                    let arrDown = document.createElement("I");
                    arrDown.className = "arrdown";

                    arrContainer.appendChild(arrUp);
                    arrContainer.appendChild(arrDown);
                    sInputArrows.appendChild(arrContainer);
                    allfields[k].parentElement.insertBefore(sInputArrows, allfields[k].nextSibling);

                    arrUp.addEventListener("click", async (event) => {
                        event.preventDefault();

                        let attKey = event.target.parentElement.getAttribute("attkey");

                        let currentValue = await auxMeth.autoParser(dialogProps[attKey].value, app.data.attributes, app.data.citemattributes, false, null, app.data.number);

                        dialogProps[attKey].value = parseInt(currentValue) + 1;

                        allfields[k].value = dialogProps[attKey].value;

                        var newevent = new Event('change');
                        allfields[k].dispatchEvent(newevent);
                    });

                    arrDown.addEventListener("click", async (event) => {
                        event.preventDefault();

                        let attKey = event.target.parentElement.getAttribute("attkey");

                        let currentValue = await auxMeth.autoParser(dialogProps[attKey].value, app.data.attributes, app.data.citemattributes, false, null, app.data.number);

                        dialogProps[attKey].value = parseInt(currentValue) - 1;

                        allfields[k].value = dialogProps[attKey].value;
                        var newevent = new Event('change');
                        allfields[k].dispatchEvent(newevent);
                    });
                }

                if (allfields[k].classList.contains("defvalue")) {
                    let deffield = allfields[k];
                    let propDef = game.items.find(y => y.data.data.attKey == myKey);
                    let defexpr = propDef.data.data.defvalue;
                    let finalvalue = defexpr;

                    if (isNaN(defexpr)) {
                        defexpr = await auxMeth.parseDialogProps(defexpr, dialogProps);
                        finalvalue = await auxMeth.autoParser(defexpr, app.data.attributes, app.data.citemattributes, false, null, app.data.number);
                    }

                    if (propDef.data.data.datatype == "checkbox") {
                        let checkfinal = false;
                        if (finalvalue === "true" || finalvalue)
                            checkfinal = true;

                        finalvalue = checkfinal;
                    }
                    else {
                        deffield.value = finalvalue;
                    }

                }
            }

        }

        let autofields = htmlDom.getElementsByClassName("isauto");

        for (let n = 0; n < autofields.length; n++) {
            let autofield = autofields[n];
            autofield.disabled = true;
        }

        for (let j = 0; j < allfields.length; j++) {
            let thisinput = allfields[j];
            //if (!thisinput.classList.contains("isauto")) {
            thisinput.addEventListener("change", async (event) => {
                for (let k = 0; k < autofields.length; k++) {
                    let changedvalue = event.target.value;
                    let changekey = event.target.getAttribute("attKey");

                    let changeProp = game.items.find(y => y.data.data.attKey == changekey);
                    if (changeProp == null)
                        return;

                    if (changeProp.data.data.datatype == "checkbox")
                        changedvalue = event.target.checked;

                    dialogProps[changekey].value = changedvalue;

                    let autofield = autofields[k];
                    let propKey = autofield.getAttribute("attKey");
                    let propObj = await game.items.find(y => y.data.data.attKey == propKey);

                    let autoexpr = propObj.data.data.auto;
                    autoexpr = await auxMeth.parseDialogProps(autoexpr, dialogProps);
                    //console.log(autoexpr);
                    let finalvalue = await auxMeth.autoParser(autoexpr, app.data.attributes, app.data.citemattributes, false, null, app.data.number);
                    //console.log(finalvalue);
                    autofield.value = finalvalue;
                }



            });
            //}

        }
    }


});


