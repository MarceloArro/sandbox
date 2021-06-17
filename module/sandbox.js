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

/* -------------------------------------------- */
/*  Hooks                 */
/* -------------------------------------------- */

Hooks.once("init", async function() {
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

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("dnd5e", gActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("dnd5e", sItemSheet, {makeDefault: true});



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


    Combat.prototype.rollInitiative = async function(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {

        // Structure input data
        ids = typeof ids === "string" ? [ids] : ids;
        const currentId = this.combatant.id;
        const rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");

        // Iterate over Combatants, performing an initiative roll for each
        const updates = [];
        const messages = [];
        for ( let [i, id] of ids.entries() ) {

            // Get Combatant data (non-strictly)
            const combatant = this.combatants.get(id);
            if ( !combatant?.isOwner ) return results;

                // Produce an initiative roll for the Combatant
                const roll = await combatant.getInitiativeRoll(formula);
                console.log(roll);
                updates.push({_id: id, initiative: roll.total});

            // Construct chat message data
            let messageData = foundry.utils.mergeObject({
                speaker: {
                    scene: this.scene.id,
                    actor: combatant.actor?.id,
                    token: combatant.token?.id,
                    alias: combatant.name
                },
                flavor: game.i18n.format("COMBAT.RollsInitiative", {name: combatant.name}),
                flags: {"core.initiativeRoll": true}
            }, messageOptions);
            const chatData = await roll.toMessage(messageData, {
                create: false,
                rollMode: combatant.hidden && (rollMode === "roll") ? "gmroll" : rollMode
            });

            // Play 1 sound for the whole rolled set
            if ( i > 0 ) chatData.sound = null;
            messages.push(chatData);
        }
        if ( !updates.length ) return this;

        // Update multiple combatants
        await this.updateEmbeddedDocuments("Combatant", updates);

        // Ensure the turn order remains with the same combatant
        if ( updateTurn ) {
            await this.update({turn: this.turns.findIndex(t => t.id === currentId)});
        }

        // Create multiple chat messages
        await ChatMessage.implementation.create(messages);
        return this;

    };

    Combatant.prototype.getInitiativeRoll = async function(formula){

        formula = formula || await this._getInitiativeFormula();
        const rollData = await this.actor.getRollData() || {};
        const roll = Roll.create(formula, rollData);
        return roll.evaluate({async: false}); 
    };


    Combatant.prototype._getInitiativeFormula = async function() {

        let initF = await game.settings.get("sandbox", "initKey");
        let formula = "1d20";
        if(initF!=""){
            formula = "@{" + initF + "}"
        }

        formula = await auxMeth.autoParser(formula,this.actor.data.data.attributes,null,true,false);
        formula = await auxMeth.autoParser(formula,this.actor.data.data.attributes,null,true,false);

        console.log("aqui1");

        CONFIG.Combat.initiative.formula = formula;

        console.log(formula);

        return CONFIG.Combat.initiative.formula || game.system.data.initiative;

    };

    CONFIG.Combat.initiative = {
        formula: "1d20",
        decimals: 2
    };

    game.socket.on("system.sandbox", (data) => {
        if (data.op === 'target_edit'){
            gActor.handleTargetRequest(data); 
        } 
    });


});

Hooks.once('ready', async() => {
    //console.log("ready!");
    //Custom styling
    if(game.settings.get("sandbox", "customStyle")!=""){
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
    if(game.user.isGM){

        game.data.rolldc = 3;

        let basedoc = document.getElementsByClassName("vtt game system-sandbox");

        let hotbar = document.createElement("DIV");
        hotbar.className = "dcroll-bar";

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

            if(event.key=="Backspace" || event.key=="Delete"){
                sInput.value = 0;
            }

            else if(event.key=="Enter"){
                //SBOX.diff[game.data.world.name] = sInput.value;
                await game.settings.set("sandbox", "diff", sInput.value);
            }

            else if(event.key=="-"){
                //SBOX.diff[game.data.world.name] = sInput.value;
                sInput.value = "-";
            }

            else{
                if(!isNaN(event.key))
                    sInput.value += event.key;
            }

            if(!isNaN(sInput.value)){
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

        if(game.settings.get("sandbox", "showDC")){
            await hotbar.appendChild(backgr);
        }


        await auxMeth.rollToMenu();
        SBOX.showshield = false;

        if(game.settings.get("sandbox", "tokenOptions")){
            document.addEventListener("keydown", (event) => {
                if(event.key=="Control"){
                    SBOX.showshield = true;
                }

            });

            document.addEventListener("keyup", (event) => {
                SBOX.showshield = false;

            });
        }


    }

});

//COPIED FROM A MODULE. TO SHOW A SHIELD ON A TOKEN AND LINK THE ATTRIBUTE. TO REMOVE
Hooks.on("hoverToken", (token, hovered) => {

    if(!game.settings.get("sandbox", "tokenOptions"))
        return;

    if(token.actor==null)
        return;

    if(token.actor.data.data.tokenshield == null)
        return;

    let shieldprop = token.actor.data.data.tokenshield;
    //console.log(shieldprop);

    if(token.actor.data.data.attributes[shieldprop]==null)
        return;

    let ca = token.actor.data.data.attributes[shieldprop].value;

    let template = $(`
<div class="section">
<div class="value"><i class="fas fa-shield-alt"></i>${ca}</div>
</div>
`);

    if (hovered && SBOX.showshield) {
        let canvasToken = canvas.tokens.placeables.find((tok) => tok.id === token.data.id);
        let dmtktooltip = $(`<div class="dmtk-tooltip"></div>`);
        dmtktooltip.css('left', (canvasToken.worldTransform.tx + ((token.width) * canvas.scene._viewPosition.scale)) + 'px');
        dmtktooltip.css('top', (canvasToken.worldTransform.ty) + 'px');
        dmtktooltip.html(template);
        $('body.game').append(dmtktooltip);
    } else {
        $('.dmtk-tooltip').remove();
    }

});

Hooks.on("createToken", async (scene,token,options,userId) => {

    if(!hasProperty(token, "data"))
        setProperty(token,"data",{});

});

Hooks.on("deleteToken", (scene, token) => {
    $('.dmtk-tooltip').remove();
});

Hooks.on("preUpdateToken", async (scene, token, updatedData, options, userId) => {
    //console.log("updatingTokenActor");
    //console.log(token);
    //console.log(updatedData);
    if(!token.owner && !game.user.isGM){
        return;
    }
    //    let myToken = canvas.tokens.get(token.id);
    //    let myactor = game.actors.get(token.actorId);
    //    let actorData = false;
    //    if(updatedData.data!=null)
    //        if(updatedData.data.citems!=null || updatedData.data.rolls!=null)
    //            actorData = true;
    //
    //    if (updatedData["data.citems"] || actorData){
    //        if(!hasProperty(updatedData,"actorData"))
    //            setProperty(updatedData,"actorData",{});
    //        if(!hasProperty(updatedData.actorData,"data"))
    //            setProperty(updatedData.actorData,"data",{});
    //        setProperty(updatedData.actorData.data,"citems",[]);
    //        if(updatedData.data.rolls!=null){
    //            setProperty(updatedData.actorData.data,"rolls",updatedData.data.rolls);
    //        }
    //        if(updatedData["data.citems"])
    //            updatedData.actorData.data.citems = updatedData["data.citems"];
    //        if(actorData){
    //            updatedData.actorData.data.citems = updatedData.data.citems;
    //            await delete updatedData.data.citems;
    //        }
    //
    //    }
    //    //    
    //    if (updatedData["effects"]!=null)
    //        updatedData.actorData.effects = updatedData["effects"];

    //console.log(updatedData);

});

//Hooks.on("updateToken", async (scene, token, updatedData, options, userId) => {
//    //console.log("updatingTokenActor");
//    //console.log(token);
//    //console.log(updatedData.actorData);
//    if(!token.owner && !game.user.isGM){
//        return;
//    }
//    let myToken = canvas.tokens.get(token.id);
//    let myactor = game.actors.get(token.actorId);
//
//    //console.log(myToken.actor.data);
//    //    console.log(myactor.data);
//
//    let actorData = false;
//    if(updatedData.data!=null)
//        if(updatedData.data.citems!=null)
//            actorData = true;
//
//    if (updatedData["data.citems"] || actorData){
//        if(!hasProperty(updatedData,"actorData"))
//            setProperty(updatedData,"actorData",{});
//        if(!hasProperty(updatedData.actorData,"data"))
//            setProperty(updatedData.actorData,"data",{});
//        setProperty(updatedData.actorData.data,"citems",[]);
//        if(updatedData["data.citems"])
//            updatedData.actorData.data.citems = updatedData["data.citems"];
//        if(actorData){
//            updatedData.actorData.data.citems = updatedData.data.citems;
//            await delete updatedData.data.citems;
//        }
//
//    }
//
//    if(!options.stopit && (updatedData.actorData) && !hasProperty(updatedData.actorData,"effects")){
//        //console.log("Changing token");
//
//        //let myData = await myactor.actorUpdater(myToken.actor.data);
//
//        //await myToken.update(myData,{stopit:true});
//        //myToken.actor.sheet.render();
//
//        let mydata = await duplicate(myToken.actor.data);
//        let adata = await myactor.actorUpdater(myToken.actor.data);
//
//        let newattributes = await myactor.compareValues(mydata.data.attributes,adata.data.attributes);
//        let newcitems = await myactor.comparecItems(mydata.data.citems,adata.data.citems);
//        let newrolls = await myactor.compareValues(mydata.data.rolls,adata.data.rolls);
//
//        let newdata = {};
//        newdata.attributes = newattributes;
//        newdata.citems = newcitems;
//        newdata.rolls = newrolls;
//
//        await myToken.update({"actorData.data": newdata},{stopit:true});
//
//        myToken.actor.sheet.render();
//
//    }
//});


Hooks.on("preUpdateActor", async (actor,updateData,options,userId) => {
    //console.log(actor);
    //console.log(updateData);
    //console.log(data.data.istemplate);
    //console.log("preup");

    //await actor.sheet.setTokenOptions(actor.data);
    //    let newname = actor.data.name;
    //
    if(updateData.name){

        if(!actor.data.data.istemplate){
            if(!updateData.token)
                setProperty(updateData,"token",{});
            updateData.token.name = updateData.name;
        }

        else{
            delete updateData.name;
        }


    }


    if(updateData["data.rollmode"]){
        if(!hasProperty(updateData,"data"))
            setProperty(updateData,"data",{});
        updateData.data.rollmode = updateData["data.rollmode"];
    }

    //console.log(updateData);


});

Hooks.on("preCreateToken", async (scene, tokenData, options, userId) =>{

    if(game.settings.get("sandbox", "tokenOptions")){
        const sameTokens = game.scenes.get(scene.parent.id).data.tokens.filter(e => e.data.actorId === tokenData.actorId) || [];
        //console.log(sameTokens);
        let tokennumber = 0;
        if (sameTokens.length !== 0) { 
            tokennumber = sameTokens.length + 1;
        }

        if(tokennumber!=0){
            tokenData.name += " " + tokennumber;
        }


    }


});

Hooks.on('createCombatant', (combat, combatantId, options) => {
    combatantId.initiative=1;
});

Hooks.on("preCreateActor", (createData) =>{
    if(createData.token!=null)
        createData.token.name = createData.name;

//    if(createData.data.data.istemplate)
//        createData.data.data.istemplate = false;
//
//    console.log(createData.data.data.istemplate);

});

Hooks.on("deleteActor", (actor) =>{
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
    if(character.flags.ischeckingauto)
        character.flags.ischeckingauto=false;

    //entity.object.update({"token":entity.object.data.token},{diff:false});


});

Hooks.on("preCreateItem", (entity, options, userId) => {
    //    let image="";
    //    console.log(entity.img);
    //    if(entity.img == "icons/svg/item-bag.svg"){
    //        console.log("aqui");
    //        if(entity.type=="cItem"){
    //            image="systems/sandbox/docs/icons/sh_citem_icon.png";
    //
    //
    //        }
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
    let do_update=false;
    let image="";
    if(entity.type=="cItem"){
        //console.log(entity);
        for(let i=0;i<entity.data.data.mods.length;i++){
            const mymod=entity.data.data.mods[i];
            if(mymod.citem!=entity.data.id){
                mymod.citem = entity.data.id;
                do_update=true;
            }

        }
        //BEWARE OF THIS, THIS WAS NEEDED WHEN DUPLICATING CITEMS IN THE PAST!!
        if(do_update)
            await entity.update(entity.data,{diff:false});
    }

});

Hooks.on("rendersItemSheet", (app, html, data) => {
    //console.log(app);

    if(app.object.data.type == "cItem"){
        app.refreshCIAttributes(html);
    }

    app.scrollBarLoad(html);

    html.find('.window-resizable-handle').mouseup(ev => {
        event.preventDefault();
        app.scrollBarLoad(html);
    });

});

Hooks.on("rendergActorSheet", async (app, html, data) => {
    //console.log("rendering Hook");
    //console.log(app);
    //console.log(data);
    const actor = app.actor;


    if(actor.token==null)
        actor.listSheets();
    //if(!actor.data.data.istemplate && !actor.data.flags.ischeckingauto){
    if(!actor.data.data.istemplate){
        app.refreshCItems(html);
        app.handleGMinputs(html);
        app.refreshBadge(html);
        app.populateRadioInputs(html);
        app.setImages(html);
        await app.setSheetStyle(actor);
        app.scrollBarLoad(html);
        actor.setInputColor();

        html.find('.window-resizable-handle').mouseup(ev => {
            event.preventDefault();
            app.scrollBarLoad(html);
        });



    }

    app.displaceTabs();

});

Hooks.on("renderChatMessage", async (app, html, data) => {
    //console.log(app);
    //console.log(data);
    //console.log(html);
    let hide=false;
    let messageId = app.id;
    let msg = game.messages.get(messageId);
    //await console.log(app);
    let msgIndex = game.messages.contents.indexOf(msg);

    let _html = await html[0].outerHTML;
    let realuser = game.users.get(data.message.user);

    if(((data.cssClass == "whisper")||(data.message.type==1)) && game.user.id!=data.message.user && !game.user.isgM)
        hide=true;

    //console.log(hide);
    if(_html.includes("dice-roll") && !_html.includes("table-draw")){
        let rollData = {
            token:{
                img:"icons/svg/d20-black.svg",
                name:"Free Roll"
            },
            actor:realuser.data.name,
            flavor: "Roll",
            formula: app._roll.formula,
            mod: 0,
            result: app._roll.total,
            dice: app._roll.dice,
            user: realuser.data.name
        };


        await renderTemplate("systems/sandbox/templates/dice.html", rollData).then(async newhtml => {

            let container = html[0];

            let content = html.find('.dice-roll');
            content.replaceWith(newhtml);

            _html = await html[0].outerHTML;


        });

    }

    //console.log(html);

    if(!_html.includes("roll-template")){
        if(_html.includes("table-draw")){
            let mytableID = data.message.flags.core.RollTable;
            let mytable = game.tables.get(mytableID);
            //console.log(mytable.data.permission.default);
            if(mytable.data.permission.default==0)
                hide=true;
        }

        let containerDiv = document.createElement("DIV");

        let headerDiv = document.createElement("HEADER");
        let headertext = await fetch("systems/sandbox/templates/sbmessage.html").then(resp => resp.text());
        headerDiv.innerHTML = headertext;

        let msgcontent = html;
        let messageDiv = await document.createElement("DIV");
        messageDiv.innerHTML = _html;

        //containerDiv.appendChild(headerDiv);
        await containerDiv.appendChild(headerDiv);
        await containerDiv.appendChild(messageDiv);

        html = html[0].insertBefore(headerDiv,html[0].childNodes[0]);
        html = $(html);

    }



    if(!game.user.isGM && hide){
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

    if(detail == null){

        return;

    }

    if(result==null){
        return;
    }

    if(clickdetail==null){
        return;
    }

    if(clickmain==null){

        return;
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



    if(game.user.isGM){
        $(html).find(".roll-message-delete").click(async ev => {
            msg.delete(html);
        });
        auxMeth.rollToMenu();
    }

    else{
        if(game.user.id!=data.message.user)
            $(html).find(".roll-message-delete").hide();
    }


});

Hooks.on("renderDialog",(app,html,data)=>{
    const htmlDom = html[0];

    if (app.data.citemdialog){

        let checkbtns = htmlDom.getElementsByClassName("dialog-check");
        let dialogDiv = htmlDom.getElementsByClassName("item-dialog");
        let button = htmlDom.getElementsByClassName("dialog-button")[0];

        let actorId = dialogDiv[0].getAttribute("actorId");
        let selectnum = dialogDiv[0].getAttribute("selectnum");
        const actor = game.actors.get(actorId);
        setProperty(actor.data.flags,"selection",[]);
        button.disabled=true;

        for(let i=0;i<checkbtns.length;i++){
            let check = checkbtns[i];
            check.addEventListener("change", (event) => {

                let itemId = event.target.getAttribute("itemId");
                if(event.target.checked){
                    actor.data.flags.selection.push(itemId);
                }

                else{
                    actor.data.flags.selection.splice(actor.data.flags.selection.indexOf(itemId),1);
                }

                let selected = actor.data.flags.selection.length;

                if(selected!=selectnum){
                    button.disabled=true;
                }
                else{
                    button.disabled=false;
                }

            });
        }
    }

    if(app.data.citemText){

        htmlDom.addEventListener("keydown", function (event) {
            event.stopPropagation();
        }, true);

        let t_area = htmlDom.getElementsByClassName("texteditor-large");
        //console.log(t_area);
        t_area[0].addEventListener("change", (event) => {
            app.data.dialogValue = event.target.value;

        });
    }
});


