import { SBOX } from "./config.js";
import { auxMeth } from "./auxmeth.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class gActorSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["sandbox", "sheet", "actor"],
            scrollY: [".sheet-body", ".scrollable", ".tab"],
            width: 650,
            height: 600,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
        });
    }

    /* -------------------------------------------- */

    /** @override */
    async getData() {
        const actor = this.actor;
        const data = super.getData();
        const flags = actor.data.flags;

        //console.log(data);

        return data;
    }

    /* -------------------------------------------- */

    /** @override */
    //    get template() {
    //        return this.getHTMLPath();
    //    }

    async maximize() {
        let _mytemplate = await game.actors.find(y => y.data.data.istemplate && y.data.data.gtemplate == this.actor.data.data.gtemplate);
        if (_mytemplate != null)
            this.position.height = _mytemplate.data.data.setheight;
        super.maximize();
    }

    async _renderInner(data, options) {
        let templateHTML = await auxMeth.getTempHTML(this.actor.data.data.gtemplate, this.actor.data.data.istemplate);

        //IMPORTANT!! ANY CHECKBOX IN TEMPLATE NEEDS THIS!!!
        templateHTML = templateHTML.replace('{{checked="" actor.data.biovisible}}=""', '{{checked actor.data.biovisible}}');
        templateHTML = templateHTML.replace('{{checked="" actor.data.resizable}}=""', '{{checked actor.data.resizable}}');
        templateHTML = templateHTML.replace('{{checked="" actor.data.istemplate}}=""', '{{checked actor.data.istemplate}}');

        const template = await Handlebars.compile(templateHTML);

        const html = template(duplicate(data));
        this.form = $(html)[0];

        if (html === "") throw new Error(`No data was returned from template`);
        return $(html);
    }

    async getTemplateHTML(_html) {
        if (this.actor.data.data.istemplate && this.actor.data.data.gtemplate != "Default") {
            let _template = game.actors.find(y => y.data.data.istemplate && y.data.data.gtemplate == this.actor.data.data.gtemplate);
            let html = _template.data.data._html;
            return html;
        }

        else {
            return _html;
        }

    }


    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        //console.log(html);
        super.activateListeners(html);

        const actor = this.actor;

        // Activate tabs
        let tabs = html.find('.tabs');
        let initial = this._sheetTab;

        new TabsV2(tabs, {
            initial: initial,
            callback: clicked => {
                this._sheetTab = clicked.data("tab");
                let li = clicked.parents(".tabs");
                let alltabs = li.children();
                //                for(let i=0;i<alltabs.length;i++){
                //                    let tab = alltabs[i];
                //                    let datatab = tab.getAttribute("data-tab");
                //                    if(datatab==clicked.data("tab")){
                //                        actor.data.flags.selectedtab = i;
                //                    }
                //
                //                }

            }
        });

        html.find('.tab-button').click(ev => {
            ev.preventDefault();

            const tabs = $(this._element)[0].getElementsByClassName("tab-button");
            let firstpassed = false;

            for (let x = 0; x < tabs.length; x++) {
                if (tabs[x].classList.contains("underlined"))
                    tabs[x].className = tabs[x].className.replace("underlined", "");

                if (tabs[x].classList.contains("visible-tab") && !firstpassed) {
                    firstpassed = true;
                    this._tabs[0].firstvisible = tabs[x].dataset.tab;
                }

            }

            let thistab = $(ev.currentTarget);
            //console.log(thistab);
            thistab[0].className += " underlined";

        });

        html.find('.macrobutton').click(ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget);
            let macroId = $(ev.currentTarget).attr("macroid");
            let macro = game.macros.get(macroId);
            macro.execute();
        });

        html.find('.badge-click').click(async (ev) => {
            ev.preventDefault();
            const attributes = this.actor.data.data.attributes;

            let attKey = $(ev.currentTarget).attr("attKey");
            let attId = $(ev.currentTarget).attr("attId");
            //let property = game.items.get(attId);
            let property = await auxMeth.getTElement(attId, "property", attKey);

            let oldvalue = parseInt(attributes[attKey].value);

            if (oldvalue < 1)
                return;

            let newvalue = oldvalue - 1;

            if (newvalue < 0)
                newvalue = 0;

            if (newvalue > attributes[attKey].max) {
                newvalue = attributes[attKey].max;
            }

            let stringvalue = "";
            stringvalue = newvalue.toString();

            await this.actor.update({ [`data.attributes.${attKey}.value`]: stringvalue });

            this.actor.sendMsgChat("USES 1 ", property.data.data.tag, "TOTAL: " + newvalue);
            if (property.data.data.rollexp != "")
                this._onRollCheck(attId, attKey, null, null, false);
            //this.actor.sendMsgChat("Utiliza 1",property.data.data.tag, "Le quedan " + newvalue); to  this.actor.sendMsgChat("Uses 1",property.data.data.tag, "Remains " + newvalue);

        });

        html.find('.badge-clickgm').click(async (ev) => {
            ev.preventDefault();
            const attributes = this.actor.data.data.attributes;

            let attKey = $(ev.currentTarget).attr("attKey");

            let newvalue = await parseInt(attributes[attKey].value) + 1;

            if (newvalue > attributes[attKey].max) {
                newvalue = attributes[attKey].max;
            }

            let stringvalue = "";
            stringvalue = newvalue.toString();

            await this.actor.update({ [`data.attributes.${attKey}.value`]: stringvalue });

        });

        html.find('.arrup').click(async (ev) => {
            ev.preventDefault();
            const attributes = this.actor.data.data.attributes;

            let attKey = ev.target.parentElement.getAttribute("attKey");

            let arrlock = ev.target.parentElement.getAttribute("arrlock");

            if (arrlock != null && !game.user.isGM)
                return;

            let newvalue = parseInt(attributes[attKey].value) + 1;

            let stringvalue = "";
            stringvalue = newvalue.toString();

            await this.actor.update({ [`data.attributes.${attKey}.value`]: stringvalue });

        });

        html.find('.arrdown').click(async (ev) => {
            ev.preventDefault();
            const attributes = this.actor.data.data.attributes;

            let attKey = ev.target.parentElement.getAttribute("attKey");

            let arrlock = ev.target.parentElement.getAttribute("arrlock");

            if (arrlock != null && !game.user.isGM)
                return;

            let newvalue = parseInt(attributes[attKey].value) - 1;

            let stringvalue = "";
            stringvalue = newvalue.toString();

            await this.actor.update({ [`data.attributes.${attKey}.value`]: stringvalue });

        });

        html.find('.propheader').click(ev => {
            event.preventDefault();

            let attKey = $(ev.currentTarget).attr("attKey");
            let tableKey = ev.target.parentElement.getAttribute("tableKey");
            if (this.sortOption == null)
                this.sortOption = {}
            this.sortOption[tableKey] = attKey;
            this.render(true);

        });

        html.find('.nameheader').click(ev => {
            event.preventDefault();

            let attKey = $(ev.currentTarget).attr("attKey");
            let tableKey = ev.target.parentElement.getAttribute("tableKey");
            if (this.sortOption == null)
                this.sortOption = {}
            this.sortOption[tableKey] = "name";
            this.render(true);

        });

        html.find('.rollable').click(ev => {
            ev.preventDefault();
            //console.log("Aqui");
            let attId = $(ev.currentTarget).attr("attid");
            let citemId;
            citemId = $(ev.currentTarget).attr("item_id");
            let attKey = $(ev.currentTarget).attr("id");
            this._onRollCheck(attId, attKey, citemId, null, false);

        });

        // Alondaar Drag events for macros.
        if (this.actor.isOwner) {
            let handler = ev => this._onDragStart(ev);
            // Find all items on the character sheet.
            html.find('.rollable').each((i, rollable) => {
                // Add draggable attribute and dragstart listener.
                rollable.setAttribute("draggable", true);
                rollable.addEventListener("dragstart", handler, false);
            });
        }

        html.find('.customcheck').click(ev => {
            ev.preventDefault();
            //console.log("Aqui");
            let attKey = $(ev.currentTarget).attr("attKey");

            if (this.actor.data.data.attributes[attKey] == null) {
                return;
            }

            let currentvalue = this.actor.data.data.attributes[attKey].value;
            let finalvalue = true;
            if (currentvalue)
                finalvalue = false;

            this.actor.update({ [`data.attributes.${attKey}.value`]: finalvalue, [`data.attributes.${attKey}.modified`]: true });

        });

        html.find('.roll-mode').click(ev => {
            event.preventDefault();
            const elemCode = $(ev.currentTarget)[0].children[0];

            const actorData = this.actor.data.data;

            if (elemCode.textContent == "1d20") {
                actorData.rollmode = "ADV";
            }

            else if (elemCode.textContent == "ADV") {
                actorData.rollmode = "DIS";
            }
            else {
                actorData.rollmode = "1d20";
            }

            this.actor.update({ "data.rollmode": actorData.rollmode }, { diff: false });

        });


        html.find('.tab-prev').click(ev => {
            event.preventDefault();
            //this.displaceTabs(true,html);
            this.displaceTabs2("prev", html);
        });

        html.find('.tab-next').click(ev => {
            event.preventDefault();
            //this.displaceTabs(false,html);
            this.displaceTabs2("next", html);
        });
        html.find('.roll-free').click(ev => {
            event.preventDefault();
            let d = new Dialog({
                title: "Select Items",
                content: '<input class="dialog-dice" type=text id="dialog-dice" value=1d6>',
                buttons: {
                    one: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "OK",
                        callback: async (html) => {
                            let diceexpr = html[0].getElementsByClassName("dialog-dice");
                            //console.log(diceexpr[0]);
                            let finalroll = this.actor.rollSheetDice(diceexpr[0].value, "Free Roll", "", this.actor.data.data.attributes, null);

                        }
                    },
                    two: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => { console.log("canceling dice"); }
                    }
                },
                default: "one",
                close: () => console.log("Item roll dialog was shown to player.")
            });
            d.render(true);

        });

        html.find('.mod-selector').click(async (ev) => {
            event.preventDefault();

            //Get items
            const citems = this.actor.data.data.citems;
            let allselitems = citems.filter(y => y.selection != null);
            let selectcitems = allselitems.find(y => y.selection.find(x => !x.selected));
            if (selectcitems == null)
                return;

            //let citemplate = game.items.get(selectcitems.id);
            let citemplate = await auxMeth.getcItem(selectcitems.id, selectcitems.ciKey);
            let acitem = selectcitems.selection.find(y => !y.selected);

            let modindex = acitem.index;
            let mod = citemplate.data.data.mods.find(y => y.index == modindex);

            //Right Content
            let newList = document.createElement("DIV");
            newList.className = "item-dialog";
            newList.setAttribute("actorId", this.actor.id);

            //Fill options
            if (mod.type == "ITEM") {
                let finalnum = await auxMeth.autoParser(mod.selectnum, this.actor.data.data.attributes, acitem.attributes, false);
                newList.setAttribute("selectnum", finalnum);
                let text = document.createElement("DIV");

                text.className = "centertext";
                text.textContent = "Please select " + finalnum + " items:";
                newList.appendChild(text);

                for (let n = 0; n < mod.items.length; n++) {

                    let ispresent = citems.some(y => y.id == mod.items[n].id);

                    if (!ispresent) {
                        let newItem = document.createElement("DIV");
                        newItem.className = "flexblock-center-nopad";

                        let newcheckBox = document.createElement("INPUT");
                        newcheckBox.className = "dialog-check";
                        newcheckBox.setAttribute("type", "checkbox");
                        newcheckBox.setAttribute("itemId", mod.items[n].id);
                        newcheckBox.setAttribute("ciKey", mod.items[n].ciKey);

                        let itemDescription = document.createElement("LABEL");
                        itemDescription.textContent = mod.items[n].name;
                        itemDescription.className = "linkable";
                        itemDescription.setAttribute("itemId", mod.items[n].id);
                        itemDescription.setAttribute("ciKey", mod.items[n].ciKey);

                        newItem.appendChild(newcheckBox);
                        newItem.appendChild(itemDescription);
                        newList.appendChild(newItem);
                    }

                }
            }



            let d = new Dialog({
                title: mod.name,
                content: newList.outerHTML,
                buttons: {
                    one: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "OK",
                        callback: async (html) => {
                            const flags = this.actor.data.flags;
                            let subitems;
                            var checkedBoxes = html.find('.dialog-check');

                            for (let i = 0; i < checkedBoxes.length; i++) {
                                if (!checkedBoxes[i].checked)
                                    continue;
                                let citemId = checkedBoxes[i].getAttribute("itemid");
                                let citemIkey = checkedBoxes[i].getAttribute("cikey");
                                acitem.selected = true;
                                //let selcitem = game.items.get(citemId);
                                let selcitem = await auxMeth.getcItem(citemId, citemIkey);
                                subitems = await this.actor.addcItem(selcitem, selectcitems.id);
                            }
                            if (subitems)
                                await this.updateSubItems(false, subitems);
                        }
                    },
                    two: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => { console.log("canceling selection"); }
                    }
                },
                default: "one",
                close: () => console.log("cItem selection dialog was shown to player."),
                citemdialog: true
            });
            d.render(true);
        });

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        //Drop Event TEST
        this.form.ondrop = ev => this._onDrop(ev);

        let stabs = duplicate(actor.data.data.tabs);
        let citems = actor.data.data.citems;
        let istemplate = actor.data.data.istemplate;

        // Edit Tab item
        html.find('.item-edit').click(async (ev) => {
            const li = $(ev.currentTarget).parents(".property");
            const tab = stabs[li.data("itemId")];
            //const item = game.items.get(tab.id);
            const item = await auxMeth.getTElement(tab.id, "sheettab", tab.ikey);
            item.sheet.render(true);
        });

        // Delete tab Item
        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            let todelete = li.data("itemId");
            const prop = stabs.splice(todelete, 1);

            this.actor.update({ "data.tabs": stabs });
            li.slideUp(200, () => this.render(false));
        });

        // Edit citem
        html.find('.citem-edit').click(async (ev) => {
            const li = $(ev.currentTarget).parents(".property");
            const tab = citems[li.data("itemId")];
            //const item = game.items.get(tab.id);
            const item = await auxMeth.getcItem(tab.id, tab.ciKey);
            item.sheet.render(true);
        });

        // Delete cItem
        html.find('.citem-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            let itemid = ev.target.parentElement.getAttribute("citemid");
            this.deleteCItem(itemid);
            li.slideUp(200, () => this.render(false));
        });

        // Top Item
        html.find('.item-top').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            let itemindex = li.data("itemId");
            if (itemindex > 0)
                stabs.splice(itemindex - 1, 0, stabs.splice(itemindex, 1)[0]);
            this.updateSubItems(true, stabs);
        });

        // Bottom Item
        html.find('.item-bottom').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            let itemindex = li.data("itemId");
            if (itemindex < stabs.length - 1)
                stabs.splice(itemindex + 1, 0, stabs.splice(itemindex, 1)[0]);
            this.updateSubItems(true, stabs);
        });

        //Rebuild Sheet
        html.find('.item-refresh').click(ev => {
            this.buildSheet();
        });

        //Change sheet and set attribute ids
        html.find('.selectsheet').change(ev => {
            event.preventDefault();
            const li = $(ev.currentTarget);

            let actorData = duplicate(this.actor.data);
            this.setTemplate(li[0].value, actorData);

            //this.refreshSheet(li[0].value);
            //this.actor.update({"data.gtemplate": li[0].value});

        });

        html.find('.sheet-reload').click(ev => {
            event.preventDefault();
            this.setTemplate(this.actor.data.data.gtemplate, null);

        });

    }

    /* ALONDAAR
    * Sets up the data transfer within a drag event. This function is triggered
    * when the user starts dragging any rollable element, and dataTransfer is set to the 
    * relevant data needed by the _onDrop function.
    */
    _onDragStart(event, attrID = null, attKey = null, citemID = null, citemKey = null, ciRoll = false, isFree = false, tableKey = null, useData = null) {
        // If lazily calling _onDragStart(event) with no other parameters
        // then assume you want a standard actor property (ID, Key)
        if (!attrID)
            attrID = event.currentTarget.getAttribute("attid");
        if (!attKey)
            attKey = event.currentTarget.getAttribute("id");

        let propertyItem = game.items.get(attrID);
        let tag = propertyItem.data.data.tag;
        // If tag is blank, use the property key instead? could also use the item's name.
        if (tag == "")
            tag = propertyItem.data.data.attKey
        let img = propertyItem.img;

        // Use cItem image and name + property tag
        if (citemID != null && !isFree) {
            let cItem = game.items.get(citemID);
            tag = cItem.name + " " + tag;
            img = cItem.img;
        }

        // Use Group or Table img & name?
        if (isFree) {
            let tableItem = game.items.contents.find(i => i.data.data.attKey === tableKey);
            let groupItem = game.items.get(tableItem.data.data.group.id);
            tag = groupItem.name + " " + tag + " (" + citemID + ")";
            img = groupItem.img;
        }

        event.dataTransfer.setData("text/plain", JSON.stringify({
            type: "rollable",
            actorId: this.actor.data._id,
            data: {
                attrID: attrID,
                attKey: attKey,
                citemID: citemID,
                citemKey: citemKey,
                ciRoll: ciRoll,
                isFree: isFree,
                tableKey: tableKey,
                useData: useData,
                tag: tag,
                img: img
            }
        }));
    }

    async generateRollDialog(dialogID, dialogName, rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, rollcitemID, targets, useData) {

        //let dialogPanel = await game.items.get(dialogID);
        let dialogPanel = await auxMeth.getTElement(dialogID, "panel", dialogName);

        if (dialogPanel == null || dialogPanel == undefined) {
            console.log(dialogName + " not found by ID");
            ui.notifications.warn("Please readd dialog panel to roll " + rollname);
        }

        let finalContent = "";

        if (dialogPanel.data.type == "multipanel") {

            let multiClass;

            let multiClassName = 'col-1-2';

            if (dialogPanel.data.data.width === "1") {
                multiClassName = 'multi-col-1-1';
            }

            else if (dialogPanel.data.data.width === "1/3") {
                multiClassName = 'multi-col-1-3';

            }

            else if (dialogPanel.data.data.width === "2/3") {
                multiClassName = 'multi-col-2-3';


            }

            else if (dialogPanel.data.data.width === "3/4") {
                multiClassName = 'multi-col-3-4';

            }

            else if (dialogPanel.data.data.width === "5/6") {
                multiClassName = 'multi-col-5-6';

            }

            else if (dialogPanel.data.data.width === "1/2") {
                multiClassName = 'multi-col-1-2';

            }

            else if (dialogPanel.data.data.width === "1/4") {
                multiClassName = 'multi-col-1-4';

            }

            else if (dialogPanel.data.data.width === "1/6") {
                multiClassName = 'multi-col-1-6';
            }

            else if (dialogPanel.data.data.width === "1/8") {
                multiClassName = 'multi-col-1-8';

            }
            else if (dialogPanel.data.data.width === "3/10") {
                multiClassName = 'multi-col-3-10';

            }
            else if (dialogPanel.data.data.width === "1/16") {
                multiClassName = 'multi-col-1-16';

            }
            else if (dialogPanel.data.data.width === "5/8") {
                multiClassName = 'multi-col-5-8';

            }
            else if (dialogPanel.data.data.width === "3/8") {
                multiClassName = 'multi-col-3-8';

            }

            else {
                multiClassName = 'multi-col-1-1';

            }

            let multiWrapper = `
<div class="${multiClassName} multiwrapper">
`;
            let wrapperEnd = `
</div>`;

            finalContent += multiWrapper;


            for (let i = 0; i < dialogPanel.data.data.panels.length; i++) {
                let myp = dialogPanel.data.data.panels[i];
                //let getPanel = game.items.get(myp.id);
                let getPanel = await auxMeth.getTElement(myp.id, "panel", myp.ikey);

                finalContent += await this.generateDialogPanelHTML(getPanel);
            }

            finalContent += wrapperEnd;

        }

        else {
            finalContent = await this.generateDialogPanelHTML(dialogPanel);
        }

        let d = new Dialog({
            title: dialogPanel.data.data.title,
            content: finalContent,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "OK",
                    callback: async (html) => {
                        let dialogvalues = html[0].getElementsByClassName("rdialogInput");
                        let dialogProps = {};

                        for (let k = 0; k < dialogvalues.length; k++) {
                            let myKey = dialogvalues[k].getAttribute("attKey");
                            setProperty(dialogProps, myKey, {});
                            if (dialogvalues[k].type == "checkbox") {

                                dialogProps[myKey].value = dialogvalues[k].checked;
                            }
                            else {
                                dialogProps[myKey].value = dialogvalues[k].value;
                            }

                        }
                        //console.log(dialogProps);
                        this.rollExpression(rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, rollcitemID, targets, dialogProps, useData);
                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => { console.log("canceling selection"); }
                }
            },
            default: "one",
            rollDialog: true,
            actorattributes: actorattributes,
            citemattributes: citemattributes,
            number: number,
            close: () => console.log("cItem selection dialog was shown to player.")
        }, { width: null });
        d.render(true);


    }

    async generateDialogPanelHTML(dialogPanel) {
        let divclassName = 'col-1-2';

        if (dialogPanel.data.data.width === "1") {
            divclassName = 'col-1-1';
        }

        else if (dialogPanel.data.data.width === "1/3") {
            divclassName = 'col-1-3';

        }

        else if (dialogPanel.data.data.width === "2/3") {
            divclassName = 'col-2-3';


        }

        else if (dialogPanel.data.data.width === "3/4") {
            divclassName = 'col-3-4';

        }

        else if (dialogPanel.data.data.width === "5/6") {
            divclassName = 'col-5-6';

        }

        else if (dialogPanel.data.data.width === "1/2") {
            divclassName = 'col-1-2';

        }

        else if (dialogPanel.data.data.width === "1/4") {
            divclassName = 'col-1-4';

        }

        else if (dialogPanel.data.data.width === "1/6") {
            divclassName = 'col-1-6';
        }

        else if (dialogPanel.data.data.width === "1/8") {
            divclassName = 'col-1-8';

        }
        else if (dialogPanel.data.data.width === "3/10") {
            divclassName = 'col-3-10';

        }
        else if (dialogPanel.data.data.width === "1/16") {
            divclassName = 'col-1-16';

        }
        else if (dialogPanel.data.data.width === "5/8") {
            divclassName = 'col-5-8';

        }
        else if (dialogPanel.data.data.width === "3/8") {
            divclassName = 'col-3-8';

        }

        else {
            divclassName = 'col-1-1';

        }
        let alignment = "";
        if (dialogPanel.data.data.contentalign == "center") {
            alignment = "centercontent";
        }

        else if (dialogPanel.data.data.contentalign == "right") {
            alignment = "righcontent";
        }

        let textalignment = "";
        if (dialogPanel.data.data.alignment == "center") {
            textalignment = "centertext";
        }

        else if (dialogPanel.data.data.alignment == "right") {
            textalignment = "rightext";
        }

        else {
            textalignment = "lefttext";
        }

        let finalContent = `
<div class="${divclassName} ${dialogPanel.data.data.panelKey}">
`;
        let endDiv = `
</div>

`;

        if (dialogPanel.data.data.title != "") {
            finalContent += `
            <div class="panelheader ${dialogPanel.data.data.headergroup}">
${dialogPanel.data.data.title}
            </div>
            `;
        }

        let maxcolumns = dialogPanel.data.data.columns;
        let currentCol = 0;
        for (let i = 0; i < parseInt(dialogPanel.data.data.properties.length); i++) {
            let panelPropertyRef = dialogPanel.data.data.properties[i];
            //let panelProperty = game.items.get(panelPropertyRef.id);
            let panelProperty = await auxMeth.getTElement(panelPropertyRef.id, "property", panelPropertyRef.ikey);

            if (currentCol == 0) {
                //Create first Row
                finalContent += `
<div class="new-row  ${alignment}">
`;
            }
            let labelwidth = "";
            let inputwidth = "";

            if (panelProperty.data.data.labelsize == "F") {
                labelwidth = " label-free";
            }

            else if (panelProperty.data.data.labelsize == "S") {
                labelwidth = " label-small";
            }

            else if (panelProperty.data.data.labelsize == "T") {
                labelwidth = " label-tiny";
            }

            else if (panelProperty.data.data.labelsize == "M") {
                labelwidth = " label-med";
            }

            else if (panelProperty.data.data.labelsize == "L") {
                labelwidth = " label-medlarge";
            }

            if (panelProperty.data.data.inputsize == "F") {
                inputwidth = "input-free";
            }

            else if (panelProperty.data.data.inputsize == "S") {
                inputwidth = "input-small";
            }

            else if (panelProperty.data.data.inputsize == "M") {
                inputwidth = "input-med";
            }

            else if (panelProperty.data.data.inputsize == "L") {
                inputwidth = "input-large";
            }
            else if (panelProperty.data.data.inputsize == "T") {
                inputwidth = "input-tiny";
            }

            let defvalue = "";
            if (panelProperty.data.data.defvalue != "")
                defvalue = "defvalue";

            if (panelProperty.data.data.datatype != "table" && panelProperty.data.data.datatype != "textarea" && panelProperty.data.data.datatype != "badge" && !panelProperty.data.data.ishidden) {
                if (panelProperty.data.data.haslabel) {
                    finalContent += `
<label class="${labelwidth} ${textalignment} ${panelProperty.data.data.fontgroup} " title="${panelProperty.data.data.tooltip}">${panelProperty.data.data.tag}</label>
`;
                }
                if (panelProperty.data.data.datatype == "checkbox") {

                    finalContent += `
<input class="rdialogInput checkbox check-${panelProperty.data.data.attKey} ${panelProperty.data.data.inputgroup} ${defvalue}" title="${panelProperty.data.data.tooltip}" checkGroup ="${panelProperty.data.data.checkgroup}" attKey ="${panelProperty.data.data.attKey}" type="checkbox">	
`;
                }
                else if (panelProperty.data.data.datatype == "list") {
                    finalContent += `
<select  class="rdialogInput select-${panelProperty.data.data.attKey} ${panelProperty.data.data.inputgroup} ${defvalue}" title="${panelProperty.data.data.tooltip}" attKey ="${panelProperty.data.data.attKey}"  data-type="String">
`;
                    let options = panelProperty.data.data.listoptions.split(",");
                    for (let j = 0; j < options.length; j++) {
                        finalContent += `
<option  value="${options[j]}">${options[j]}</option>
`;
                    }
                    finalContent += `
</select>
`
                }

                else if (panelProperty.data.data.datatype == "label") {

                }
                else {
                    let isauto = "";
                    let arrows = "";
                    if (panelProperty.data.data.auto != "")
                        isauto = "isauto";
                    if (panelProperty.data.data.arrows) {
                        arrows = "hasarrows"
                    }
                    finalContent += `
<input class="rdialogInput ${inputwidth} ${panelProperty.data.data.inputgroup} ${isauto} ${defvalue} ${arrows}" attKey ="${panelProperty.data.data.attKey}" type="text" value="${panelProperty.data.data.defvalue}">	
`;
                }

                currentCol += 1;
            }

            if (currentCol == maxcolumns || i == parseInt(dialogPanel.data.data.properties.length - 1)) {
                finalContent += endDiv;
                currentCol = 0;
            }

        }

        finalContent += endDiv;

        return finalContent;
    }

    async _onRollCheck(attrID, attKey, citemID, citemKey = null, ciRoll = false, isFree = false, tableKey = null, useData = null) {
        //console.log("rolling att " + attrID + " item " + citemID);

        let actorattributes = this.actor.data.data.attributes;

        let citemattributes;
        let rollexp;
        let rollname;
        let rollid = [];
        let hasDialog = false;
        let dialogID;
        let dialogName;
        let citem;
        let property;
        let initiative = false;

        let findcitem;
        let number;
        let isactive;
        let ciuses;
        let rollcitemID;

        if (citemID != null) {
            if (!isFree) {

                //citem = await game.items.get(citemID);
                citem = await await auxMeth.getcItem(citemID, citemKey);
                findcitem = this.actor.data.data.citems.find(y => y.id == citemID);
                if (findcitem != null) {
                    citemattributes = findcitem.attributes;

                }

                if (citem != null)
                    rollcitemID = citemID;

            }

            else {

                if (tableKey != null) {
                    let tableItems = actorattributes[tableKey].tableitems;
                    let myFreeItem = tableItems.find(y => y.id == citemID);
                    citemattributes = myFreeItem.attributes;
                }

            }


            //console.log(citem);
        }

        if (!ciRoll) {
            property = await auxMeth.getTElement(attrID, "property", attKey);
            rollexp = property.data.data.rollexp;
            rollname = property.data.data.rollname;
            hasDialog = property.data.data.hasdialog;
            dialogID = property.data.data.dialogID;
            dialogName = property.data.data.dialogName;
            rollid.push(property.data.data.rollid);
        }
        else {
            rollexp = citem.data.data.roll;
            rollname = citem.data.data.rollname;
            hasDialog = citem.data.data.hasdialog;
            dialogID = citem.data.data.dialogID;
            dialogName = citem.data.data.dialogName;
            rollid.push(citem.data.data.rollid);
        }

        let targets = game.user.targets.ids;

        if (findcitem != null) {
            number = findcitem.number;
            isactive = findcitem.isactive;
            ciuses = findcitem.uses;
        }


        if (hasDialog) {
            this.generateRollDialog(dialogID, dialogName, rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, rollcitemID, targets, useData);
        }
        else {
            this.rollExpression(rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, rollcitemID, targets, null, useData)
        }


        //return finalroll;

    }

    async rollExpression(rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, rollcitemID, targets, dialogProps = null, useData = null) {

        rollexp = await auxMeth.parseDialogProps(rollexp, dialogProps);

        rollname = await auxMeth.parseDialogProps(rollname, dialogProps);

        let tokenid;

        //console.log(rollexp);

        let finalroll;

        //PARSE actor name
        rollexp = await rollexp.replace(/\#{actor}/g, this.actor.name);

        if (targets.length > 0 && ((rollexp.includes("#{target|") || rollexp.includes("add(")) || rollexp.includes("set("))) {
            for (let i = 0; i < targets.length; i++) {
                tokenid = canvas.tokens.placeables.find(y => y.id == targets[i]);
                //TEST SERE FOR BETTER ROLL RESULTS
                //finalroll = await this.actor.rollSheetDice(rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, tokenid, rollcitemID);
                let finalrollprev = await this.actor.rollSheetDice(rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, tokenid, rollcitemID);
                finalroll = finalrollprev.result;
            }
        }

        else {
            if (this.actor.isToken && this.token != null)
                tokenid = this.token.id;
            //TEST SERE FOR BETTER ROLL RESULTS
            //finalroll = await this.actor.rollSheetDice(rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, null, rollcitemID, tokenid);
            let finalrollprev = await this.actor.rollSheetDice(rollexp, rollname, rollid, actorattributes, citemattributes, number, isactive, ciuses, null, rollcitemID, tokenid);
            finalroll = finalrollprev.result;
        }

        if (useData != null) {
            await this.activateCI(useData.id, useData.value, useData.iscon, finalroll);
        }
    }

    //Creates the attributes the first time a template is chosen for a character
    async refreshSheet(gtemplate) {
        //Gets all game properties

        //console.log(gtemplate);

        //Finds master property
        await this.actor.update({ "data.gtemplate": gtemplate });


        //await this.actor.update(this.actor.data);
        //await this.actor.actorUpdater();

    }

    async setTemplate(gtemplate, actorData) {
        console.log("setting sheet");
        //console.log(actorData);

        const propitems = game.items.filter(y => y.data.type == "property");

        if (actorData == null)
            actorData = duplicate(this.actor.data);

        const attData = actorData.data.attributes;
        if (gtemplate == "" || gtemplate == null)
            gtemplate = "Default";
        actorData.data.gtemplate = gtemplate;

        //Looks for template and finds inputs

        var parser = new DOMParser();
        //var htmlcode = await fetch(this.getHTMLPath()).then(resp => resp.text());

        let htmlcode = await auxMeth.getTempHTML(gtemplate);
        actorData.data._html = htmlcode;
        //console.log(htmlcode);
        var form = await parser.parseFromString(htmlcode, 'text/html').querySelector('form');
        //console.log(form);
        //Loops the inputs and creates the related attributes

        if (form == null)
            ui.notifications.warn("Please rebuild character sheet before assigning");

        var inputs = await form.querySelectorAll('input,select,textarea');
        for (let i = 0; i < inputs.length; i++) {
            let newAtt = inputs[i];

            let attId = newAtt.getAttribute("attId");
            //console.log(newAtt);
            let attKey = newAtt.getAttribute("name");
            attKey = attKey.replace("data.attributes.", '');
            attKey = attKey.replace(".value", '');
            if (attId != null)
                await this.setAttributeValues(attId, attData, attKey);

        }

        //For special case of radioinputs
        let radioinputs = form.getElementsByClassName("radio-input");
        for (let i = 0; i < radioinputs.length; i++) {
            let newAtt = radioinputs[i];
            let attId = newAtt.getAttribute("attId");
            let attKey = newAtt.getAttribute("name");
            attKey = attKey.replace("data.attributes.", '');
            attKey = attKey.replace(".value", '');
            await this.setAttributeValues(attId, attData, attKey);
        }

        //For special cases of badges
        let badgeinputs = form.getElementsByClassName("badge-click");
        for (let i = 0; i < badgeinputs.length; i++) {
            let newAtt = badgeinputs[i];
            let attId = newAtt.getAttribute("attId");
            let attKey = newAtt.getAttribute("attKey");
            await this.setAttributeValues(attId, attData, attKey);
        }

        //For special cases of tables
        let tableinputs = form.getElementsByClassName("sbtable");
        for (let i = 0; i < tableinputs.length; i++) {
            let newAtt = tableinputs[i];
            let attId = newAtt.getAttribute("attId");
            let attKey = newAtt.getAttribute("name");
            attKey = attKey.replace("data.attributes.", '');
            attKey = attKey.replace(".value", '');
            await this.setAttributeValues(attId, attData, attKey);
        }

        //For special cases of custom checboxes
        let custominputs = form.getElementsByClassName("customcheck");
        for (let i = 0; i < custominputs.length; i++) {
            let newAtt = custominputs[i];
            let attId = newAtt.getAttribute("attId");
            let attKey = newAtt.getAttribute("name");
            if (attKey != null) {

                attKey = attKey.replace("data.attributes.", '');
                attKey = attKey.replace(".value", '');
            }
            else {
                attKey = newAtt.getAttribute("attkey");
            }

            await this.setAttributeValues(attId, attData, attKey);
        }

        //Get token settings
        //Set token mode
        let tokenbar = form.getElementsByClassName("token-bar1");
        let bar1Att = tokenbar[0].getAttribute("tkvalue");

        let tokenname = form.getElementsByClassName("token-displayName");
        let displayName = tokenname[0].getAttribute("tkvalue");

        let tokenshield = form.getElementsByClassName("token-shieldstat");
        let shield = tokenshield[0].getAttribute("tkvalue");

        let biofield = form.getElementsByClassName("check-biovisible");
        let biovisible = biofield[0].getAttribute("biovisible");

        let resizefield = form.getElementsByClassName("check-resizable");
        let resizable = biofield[0].getAttribute("resizable");

        let visifield = form.getElementsByClassName("token-visitabs");
        let visitabs = visifield[0].getAttribute("visitabs");

        actorData.data.displayName = CONST.TOKEN_DISPLAY_MODES[displayName];
        actorData.data.tokenbar1 = "attributes." + bar1Att;
        actorData.data.tokenshield = shield;
        if (biovisible === "false")
            biovisible = false;
        if (biovisible === "true")
            biovisible = true;
        if (resizable === "false")
            resizable = false;
        if (resizable === "true")
            resizable = true;
        actorData.data.biovisible = biovisible;
        actorData.data.resizable = resizable;
        actorData.data.visitabs = parseInt(visitabs);
        //console.log(actorData);
        let mytoken = await this.setTokenOptions(actorData);

        await this.actor.update({ "data": actorData.data, "token": mytoken }, { diff: false });
        await this.actor.update({ "data": actorData.data, "token": mytoken });
    }

    async setAttributeValues(attID, attData, propName) {

        //reference to attribute
        //console.log(attID + " " + propName);
        //const attData = this.actor.data.data.attributes;
        //const property = await game.items.get(attID);
        const property = await auxMeth.getTElement(attID, "property", propName);

        const attribute = property.data.data.attKey;
        //console.log(attribute);
        let idkey = attData[attribute];
        let populate = false;
        if (idkey == null) {
            populate = true;
        }
        else {
            if (idkey.id == null) {
                //console.log(property.data.data.attKey + " no ID needs " + attID);
                populate = true;
            }

            //            else{
            //                if(idkey.value==null)
            //                    populate = true;
            //            }

            if (property.data.data.datatype == "radio" && (idkey.max == null || idkey.max == "" || idkey.value == "" || idkey.value == null)) {
                populate = true;
            }

            //            if(property.data.data.maxtop){
            //                console.log("setting");
            //                setProperty(attData[attribute],"maxblocked", true);
            //            }
            //            else{
            //                setProperty(attData[attribute],"maxblocked", false);
            //            }

        }

        if (property.data.data.datatype == "table") {
            // if (!hasProperty(attData[attribute], "tableitems")) {
            populate = true;
            // }

        }

        if (property.data.data.datatype == "checkbox") {

            if (attData[attribute] != null)
                setProperty(attData[attribute], "checkgroup", property.data.data.checkgroup);

        }

        //console.log(property.data.data.attKey + " " + property.data.data.datatype + " " + populate);
        if (!hasProperty(attData, attribute) || Object.keys(attData[attribute]).length == 0 || populate) {
            //console.log("populating prop");
            attData[attribute] = {};
            setProperty(attData[attribute], "id", "");
            attData[attribute].id = attID;

            //Sets id and auto
            if (property.data.data.datatype != "table") {

                if (!hasProperty(attData[attribute], "value"))
                    setProperty(attData[attribute], "value", "");
                setProperty(attData[attribute], "prev", "");
                await setProperty(attData[attribute], "isset", false);

                //Sets auto, auto max, and max
                if (property.data.data.automax != "" || property.data.data.datatype == "radio") {

                    setProperty(attData[attribute], "max", "");

                }

                if (property.data.data.datatype == "checkbox") {
                    setProperty(attData[attribute], "checkgroup", property.data.data.checkgroup);

                }

            }
            else {
                //console.log("setting table " + attribute);
                let tablegroup = property.data.data.group;
                //let groupObj = await game.items.get(tablegroup.id);
                //console.log(tablegroup);
                let groupObj = await auxMeth.getTElement(tablegroup.id, "group", tablegroup.ikey);
                if (groupObj == null) {
                    ui.notifications.warn("Please reassign group to table " + attribute);
                    console.log("Error:Please reassign group to table " + attribute);
                }

                let groupprops = groupObj.data.data.properties;
                //console.log(groupprops);
                setProperty(attData[attribute], "istable", true);
                setProperty(attData[attribute], "totals", {});
                if (!hasProperty(this.actor.data.data.attributes[attribute], "tableitems")) {
                    setProperty(attData[attribute], "tableitems", []);
                }

                const attTableKey = attData[attribute];
                for (let i = 0; i < groupprops.length; i++) {
                    let propId = groupprops[i].id;
                    //let propData = game.items.get(propId);
                    let propData = await auxMeth.getTElement(propId, "property", groupprops[i].ikey);
                    let propKey = propData.data.data.attKey;
                    setProperty(attTableKey.totals, propKey, {});
                    const tableAtt = attTableKey.totals[propKey];
                    setProperty(tableAtt, "id", propId);
                    if (propData.data.data.totalize) {

                        setProperty(tableAtt, "total", "");
                        setProperty(tableAtt, "prev", "");
                    }
                    //TO FIX IN FUTURE
                    // for(let j=0;j<this.actor.data.data.attributes[attribute].tableitems.length;j++){
                    //     let tableItemProp = this.actor.data.data.attributes[attribute].tableitems[j].attributes;
                    //     if(tableItemProp[propKey]==null){
                    //         setProperty(attData[attribute], "tableitems", []);
                    //         let newtableBlock = attData[attribute];
                    //         let newtableItem = newtableBlock.tableitems;
                    //         newtableItem = this.actor.data.data.attributes[attribute].tableitems[j];
                    //         newtableItem.attributes[propKey] = {};
                    //         newtableItem.attributes[propKey].value = propData.data.data.defvalue;
                    //     }

                    // }

                }
            }


        }



        //console.log(attData[attribute]);

        //return attData;

    }

    async checkTabsExisting() {

        //Check Tabs
        let tabs = this.actor.data.flags.tabarray;
        let changed = false;
        const items = game.items;

        if (tabs != null) {
            for (let i = 0; i < tabs.length; i++) {
                if (!game.items.get(tabs[i].id)) {
                    let index = tabs.indexOf(tabs[i]);
                    if (index > -1) {
                        tabs.splice(index, 1);
                        changed = true;
                    }
                }
            }
        }

        if (changed)
            this.updateTabs();

    }

    /* -------------------------------------------- */

    /**
   * HTML Editors
   */

    async addNewTab(newHTML, tabitem, index) {
        console.log("adding Tabs");

        var wrapper = document.createElement('div');

        if (newHTML == null) {
            wrapper.innerHTML = this.actor.data.data._html;
        }

        else {
            wrapper.innerHTML = newHTML;
        }

        let deftemplate = wrapper;
        //console.log(deftemplate);

        let tabname = tabitem.data.title;
        let tabKey = tabitem.data.tabKey;

        //Tab selector
        let p = deftemplate.querySelector("#tabs");

        let c = deftemplate.querySelector("#tab-last");

        let cindex = Array.from(p.children).indexOf(c);
        let totaltabs = parseInt(p.getAttribute("tabs"));
        let newElement = document.createElement('a');
        newElement.className = 'item tab-button';
        newElement.setAttribute('id', "tab-" + index);
        newElement.setAttribute("data-tab", tabKey);
        newElement.textContent = tabname;
        p.insertBefore(newElement, p.children[cindex]);
        p.setAttribute("tabs", totaltabs + 1);

        //ADD VISIBILITY RULES TO TAB
        if (tabitem.data.condop != "NON") {
            let attProp = ".value";
            if (tabitem.data.condat != null) {
                if (tabitem.data.condat.includes("max")) {
                    attProp = "";
                }
            }


            if (tabitem.data.condop == "EQU") {
                // if (tabitem.data.condvalue == "true" || tabitem.data.condvalue == "false" || tabitem.data.condvalue == true || tabitem.data.condvalue == false) {
                newElement.insertAdjacentHTML('beforebegin', "{{#if actor.data.attributes." + tabitem.data.condat + attProp + "}}");
                newElement.insertAdjacentHTML('afterend', "{{/if}}");
                // }
                // else {
                //     newElement.insertAdjacentHTML('afterbegin', "{{#ifCond actor.data.attributes." + tabitem.data.condat + attProp + " '" + tabitem.data.condvalue + "'}}");
                //     newElement.insertAdjacentHTML('beforeend', "{{/ifCond}}");
                // }

            }

            else if (tabitem.data.condop == "HIH") {
                newElement.insertAdjacentHTML('beforebegin', "{{#ifGreater actor.data.attributes." + tabitem.data.condat + attProp + " '" + tabitem.data.condvalue + "'}}");
                newElement.insertAdjacentHTML('afterend', "{{/ifGreater}}");
            }

            else if (tabitem.data.condop == "LOW") {
                newElement.insertAdjacentHTML('beforebegin', "{{#ifLess actor.data.attributes." + tabitem.data.condat + attProp + " '" + tabitem.data.condvalue + "'}}");
                newElement.insertAdjacentHTML('afterend', "{{/ifLess}}");
            }

            else if (tabitem.data.condop == "NOT") {
                newElement.insertAdjacentHTML('beforebegin', "{{#ifNot actor.data.attributes." + tabitem.data.condat + attProp + " '" + tabitem.data.condvalue + "'}}");
                newElement.insertAdjacentHTML('afterend', "{{/ifNot}}");
            }
        }

        if (tabitem.data.controlby == "gamemaster") {
            newElement.insertAdjacentHTML('beforebegin', "{{#isGM}}");
            newElement.insertAdjacentHTML('afterend', "{{/isGM}}");
        }

        else {
            newElement.className += " player-tab";
        }

        //Tab content
        let parentNode = deftemplate.querySelector('#sheet-body');
        let div5 = document.createElement("DIV");
        div5.className = "tab scrollable " + tabKey + "_tab";
        div5.setAttribute('id', tabKey + "_Def");
        div5.setAttribute("data-group", "primary");
        div5.setAttribute("data-tab", tabKey);
        parentNode.appendChild(div5);

        let div9 = document.createElement("DIV");
        div9.className = "new-column sbbody";
        div9.setAttribute('id', tabKey + "Body");
        div5.appendChild(div9);

        //Set token mode
        let tokenbar = deftemplate.getElementsByClassName("token-bar1");
        let tokenshield = deftemplate.getElementsByClassName("token-shieldstat");
        let tokenname = deftemplate.getElementsByClassName("token-displayName");

        let displayName = this.actor.data.data.displayName;
        console.log(displayName);
        if (displayName == null)
            displayName = "NONE";

        tokenbar[0].setAttribute("tkvalue", this.actor.data.data.tokenbar1);
        tokenname[0].setAttribute("tkvalue", displayName);
        tokenshield[0].setAttribute("tkvalue", this.actor.data.data.shieldstat);

        let biovisiblefield = deftemplate.getElementsByClassName("check-biovisible");
        let resizablefield = deftemplate.getElementsByClassName("check-resizable");
        console.log(biovisiblefield);
        biovisiblefield[0].setAttribute("biovisible", this.actor.data.data.biovisible);
        resizablefield[0].setAttribute("resizable", this.actor.data.data.resizable);

        let visitabfield = deftemplate.getElementsByClassName("token-visitabs");
        visitabfield[0].setAttribute("visitabs", this.actor.data.data.visitabs);

        let finalreturn = new XMLSerializer().serializeToString(deftemplate);
        return finalreturn;
    }

    async addNewPanel(newHTML, tabpanel, tabKey, tabname, firstmrow, multiID = null, multiName = null, _paneldata = null, multiheadergroup = null) {
        //Variables
        console.log("adding Panel " + tabpanel.name + " in " + tabKey);
        console.log(tabpanel);

        //        if(tabpanel.data==null)
        //            return;

        var wrapper = document.createElement('div');
        if (newHTML == null) {
            wrapper.innerHTML = this.actor.data.data._html;
        }

        else {
            wrapper.innerHTML = newHTML;
        }

        //let deftemplate= wrapper;
        let deftemplate = new DOMParser().parseFromString(newHTML, "text/html");
        const actor = this.actor;
        const flags = this.actor.data.flags;
        const parentNode = deftemplate.querySelector('#' + tabKey + 'Body');
        //console.log(tabpanel);
        //console.log(deftemplate);

        let fontgroup = "";
        let inputgroup = "";

        if (tabpanel.data.fontgroup != null)
            fontgroup = tabpanel.data.fontgroup;

        if (tabpanel.data.inputgroup != null)
            inputgroup = tabpanel.data.inputgroup;

        //        let fontgroup = tabpanel.data.fontgroup;
        //        let inputgroup = tabpanel.data.inputgroup;

        let initial = false;
        let div6;


        if (multiID == null) {
            console.log("INITIAL _ " + tabpanel.name + " width: " + flags.rwidth + " rows: " + flags.rows);
        }
        else {
            console.log("INITIAL _ " + tabpanel.name + " maxrows: " + flags.maxrows + " multiwidth: " + flags.multiwidth + "maxwidth: " + flags.maxwidth);
        }

        if (flags.rwidth >= 1) {
            if (multiID == null) {
                flags.rows += 1;
                flags.rwidth = 0;
            }
            else {
                if (firstmrow) {
                    flags.rwidth = 0;
                    flags.rows += 1;
                }

            }

        }

        else if (firstmrow && flags.rwidth == 0 && flags.rows > 1) {
            flags.rows += 1;
        }

        if (flags.multiwidth >= flags.maxwidth) {
            console.log("newmultirow");
            flags.multiwidth == 0;
        }

        if (flags.multiwidth == 0 && multiID != null) {
            flags.maxrows += 1;
            initial = true;
        }



        div6 = deftemplate.createElement("DIV");

        if (firstmrow) {

            if (flags.rwidth == 0 || flags.rwidth == 1 || (flags.multiwidth == 0 && multiID != null)) {

                initial = true;

            }

        }

        let labelwidth;
        var columns = tabpanel.data.columns;

        //Set panel width
        if (tabpanel.data.width === "1") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-1-1';
            if (multiID == null) {
                flags.rwidth += 1;
            }
            else {
                flags.multiwidth += 1;
                div6.className = this.getmultiWidthClass(tabpanel.data.width);
            }

        }

        else if (tabpanel.data.width === "1/3") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-1-3';
            if (multiID == null) {
                flags.rwidth += 0.333;
            }
            else {
                flags.multiwidth += 0.333;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if (tabpanel.data.width === "2/3") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-2-3';
            if (multiID == null) {
                flags.rwidth += 0.666;
            }
            else {
                flags.multiwidth += 0.666;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if (tabpanel.data.width === "3/4") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-3-4';
            if (multiID == null) {
                flags.rwidth += 0.75;
            }
            else {
                flags.multiwidth += 0.75;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if (tabpanel.data.width === "5/6") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-5-6';
            if (multiID == null) {
                flags.rwidth += 0.833;
            }
            else {
                flags.multiwidth += 0.833;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if (tabpanel.data.width === "1/2") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-1-2';
            if (multiID == null) {
                flags.rwidth += 0.5;
            }
            else {
                flags.multiwidth += 0.5;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if (tabpanel.data.width === "1/4") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-1-4';
            if (multiID == null) {
                flags.rwidth += 0.25;
            }
            else {
                flags.multiwidth += 0.25;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if (tabpanel.data.width === "1/6") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-1-6';
            if (multiID == null) {
                flags.rwidth += 0.166;
            }
            else {
                flags.multiwidth += 0.166;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if (tabpanel.data.width === "1/8") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-1-8';
            if (multiID == null) {
                flags.rwidth += 0.125;
            }
            else {
                flags.multiwidth += 0.125;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }
        else if (tabpanel.data.width === "3/10") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-3-10';
            if (multiID == null) {
                flags.rwidth += 0.3;
            }
            else {
                flags.multiwidth += 0.3;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }
        else if (tabpanel.data.width === "1/16") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-1-16';
            if (multiID == null) {
                flags.rwidth += 0.0625;
            }
            else {
                flags.multiwidth += 0.0625;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }
        else if (tabpanel.data.width === "5/8") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-5-8';
            if (multiID == null) {
                flags.rwidth += 0.625;
            }
            else {
                flags.multiwidth += 0.625;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }
        else if (tabpanel.data.width === "3/8") {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-3-8';
            if (multiID == null) {
                flags.rwidth += 0.375;
            }
            else {
                flags.multiwidth += 0.375;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else {
            if ((firstmrow && multiID == null) || (multiID != null))
                div6.className = 'col-1-1';
            if (multiID == null) {
                flags.rwidth += 1;
            }
            else {
                flags.multiwidth += 1;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        if (multiID == null) {
            console.log("PRE _ " + tabpanel.name + " width: " + flags.rwidth + " rows: " + flags.rows);
        }
        else {
            console.log("PRE _ " + tabpanel.name + " maxrows: " + flags.maxrows + " multiwidth: " + flags.multiwidth + "maxwidth: " + flags.maxwidth);
        }

        div6.className += " " + tabpanel.data.panelKey + "_container";

        if (flags.rwidth > 0.95 && flags.rwidth <= 1)
            flags.rwidth = 1.015;


        console.log("firstmrow: " + firstmrow);
        if (flags.rwidth > 1.015) {
            // flags.rwidth -= 1;
            // if (flags.rwidth < 0.1)
            flags.rwidth = 0;
            if (firstmrow && multiID == null) {
                flags.rows += 1;
                initial = true;
            }

        }

        console.log("rows: " + flags.rows);

        if (flags.multiwidth > 0.95 && flags.multiwidth <= 1)
            flags.multiwidth = 1;

        if (multiID != null) {

            if (flags.multiwidth > flags.maxwidth) {
                flags.multiwidth -= flags.maxwidth;
                if (flags.multiwidth < 0.1)
                    flags.multiwidth = 0;
                flags.maxrows += 1;
                initial = true;
            }

        }

        if (multiID == null) {
            console.log("POST _ " + tabpanel.name + " width: " + flags.rwidth + " rows: " + flags.rows + " initial:" + initial);
        }
        else {
            console.log("POST _ " + tabpanel.name + " maxrows: " + flags.maxrows + " multiwidth: " + flags.multiwidth + "maxwidth: " + flags.maxwidth);
        }

        if (initial) {
            console.log("creating row initial true");
        }
        else {
            console.log("getting multirow");
        }


        //console.log(tabpanel.name + "post  width: " +flags.rwidth + " rows:" + flags.rows);

        if (tabpanel.data.title != "") {
            var new_header = deftemplate.createElement("DIV");

            if (tabpanel.data.backg == "T") {
                new_header.className = "panelheader-t";
            }
            else {
                new_header.className = "panelheader";
            }

            if (tabpanel.data.headergroup != "")
                new_header.className += " " + tabpanel.data.headergroup;

            new_header.textContent = tabpanel.data.title;
            div6.appendChild(new_header);
        }

        let properties = tabpanel.data.properties;

        var count = 0;
        var divtemp;
        var new_row = deftemplate.createElement("DIV");

        //LOAD THE PROPERTIES INPUT FIELDS
        //await properties.forEach(function (rawproperty) {
        for (let n = 0; n < properties.length; n++) {

            let rawproperty = properties[n];

            //label alignment
            if (tabpanel.data.alignment == "right") {
                labelwidth = "righttext";
            }
            else if (tabpanel.data.alignment == "center") {
                labelwidth = "centertext";
            }

            else {
                labelwidth = "";
            }

            console.log(rawproperty);
            //let propertybase = game.items.get(rawproperty.id);
            let propertybase = await auxMeth.getTElement(rawproperty.id, "property", rawproperty.ikey);



            if (propertybase == null) {
                ui.notifications.warn("The property " + rawproperty.name + " in panel " + tabpanel.name + " does not exist anymore. Please remove the reference to it");
                throw new Error("No property!");
                return "noproperty";
            }

            else {



                let property = propertybase.data;

                if (property.data.attKey == null || property.data.attKey == "") {
                    ui.notifications.warn("The property " + rawproperty.name + " in panel " + tabpanel.name + " does not have a key");
                    throw new Error("No property Key!");
                    return "noproperty";
                }


                fontgroup = tabpanel.data.fontgroup;
                inputgroup = tabpanel.data.inputgroup;

                if (property.data.fontgroup != "")
                    fontgroup = property.data.fontgroup;

                if (property.data.inputgroup != "")
                    inputgroup = property.data.inputgroup;

                if (fontgroup == null)
                    fontgroup = tabpanel.data.fontgroup;
                if (inputgroup == null)
                    inputgroup = tabpanel.data.inputgroup;

                if (count == 0) {

                    new_row.className = "new-row ";
                    new_row.className += tabpanel.data.panelKey;
                    divtemp = deftemplate.createElement("DIV");

                    if (tabpanel.data.contentalign == "center") {
                        divtemp.className = "flexblock-center " + tabpanel.data.panelKey + "_row";
                    }
                    else if (tabpanel.data.contentalign == "right") {
                        divtemp.className = "flexblock-right " + tabpanel.data.panelKey + "_row";
                    }
                    else {
                        divtemp.className = "flexblock-left " + tabpanel.data.panelKey + "_row";
                    }


                    div6.appendChild(new_row);
                    new_row.appendChild(divtemp);
                }

                //Attribute input
                let sInput;
                let sInputMax;
                let sInputArrows;

                //Set Label
                if (property.data.haslabel && property.data.datatype != "table" && property.data.datatype != "badge" && property.data.datatype != "button") {
                    //Attribute label
                    var sLabel = deftemplate.createElement("H3");

                    if (property.data.labelsize == "F") {
                        labelwidth += " label-free";
                    }

                    else if (property.data.labelsize == "S") {
                        labelwidth += " label-small";
                    }

                    else if (property.data.labelsize == "T") {
                        labelwidth += " label-tiny";
                    }

                    else if (property.data.labelsize == "M") {
                        labelwidth += " label-med";
                    }

                    else if (property.data.labelsize == "L") {
                        labelwidth += " label-medlarge";
                    }

                    sLabel.className = labelwidth + " " + property.data.attKey + "_label";
                    sLabel.textContent = property.data.tag;

                    if (property.data.tooltip != null)
                        if (property.data.tooltip != "")
                            if (property.data.tooltip.length > 0)
                                sLabel.title = property.data.tooltip;

                    divtemp.appendChild(sLabel);

                    //Adds identifier
                    sLabel.setAttribute("id", property.data.attKey);
                    sLabel.setAttribute("attid", rawproperty.id);

                    if (property.data.labelformat == "B") {
                        sLabel.className += " boldtext";
                    }

                    else if (property.data.labelformat == "D") {
                        sLabel.textContent = "";

                        let dieContainer = deftemplate.createElement("DIV");
                        dieContainer.setAttribute("title", property.data.tag);

                        let dieSymbol = deftemplate.createElement('i');
                        dieSymbol.className = "fas fa-dice-d20";
                        dieContainer.appendChild(dieSymbol);

                        sLabel.appendChild(dieContainer);

                    }

                    else if (property.data.labelformat == "S") {
                        sLabel.className += " smalltext";

                    }

                    //Sets class required for rolling
                    if (property.data.hasroll) {
                        sLabel.className += " rollable";
                    }


                    if (fontgroup != "")
                        sLabel.className += " " + fontgroup;

                    console.log(sLabel.className + " " + sLabel.textContent);


                }

                //Check property type
                if (property.data.datatype === "checkbox") {

                    if (!property.data.customcheck && (property.data.onPath == "" || property.data.offPath == "")) {
                        sInput = deftemplate.createElement("INPUT");
                        sInput.className = "input-small";
                        if (property.data.labelsize == "T")
                            sInput.className = "input-tiny";
                        sInput.setAttribute("name", "data.attributes." + property.data.attKey + ".value");
                        sInput.setAttribute("type", "checkbox");
                        sInput.setAttribute("toparse", "{{checked actor.data.attributes." + property.data.attKey + ".value}}~~");
                    }

                    else {
                        sInput = deftemplate.createElement("DIV");
                        sInput.className = "input-small";
                        if (property.data.inputsize == "T")
                            sInput.className = "input-tiny";
                        sInput.setAttribute("attKey", property.data.attKey);
                        sInput.setAttribute("onPath", property.data.onPath);
                        sInput.setAttribute("offPath", property.data.offPath);
                        sInput.className += " customcheck";
                    }
                }

                //Check property type
                else if (property.data.datatype === "radio") {

                    sInput = deftemplate.createElement("DIV");
                    sInput.className = "radio-input";
                    sInput.setAttribute("name", property.data.attKey);

                }

                else if (property.data.datatype === "textarea") {

                    sInput = deftemplate.createElement("TEXTAREA");
                    if (property.data.inputsize == "S") {
                        sInput.className = "texteditor-small";
                    }

                    else if (property.data.inputsize == "L") {
                        sInput.className = "texteditor-large";
                    }
                    else {
                        sInput.className = "texteditor-med";
                    }

                    sInput.setAttribute("name", "data.attributes." + property.data.attKey + ".value");
                    sInput.textContent = "{{" + "data.data.attributes." + property.data.attKey + ".value}}";

                }

                else if (property.data.datatype === "badge") {

                    sInput = deftemplate.createElement("DIV");
                    sInput.className = "badge-block centertext";
                    sInput.setAttribute("name", property.data.attKey);

                    let badgelabel = deftemplate.createElement("LABEL");
                    badgelabel.className = "badgelabel";
                    badgelabel.className += " badgelabel-" + property.data.attKey;
                    badgelabel.textContent = property.data.tag;

                    if (property.data.tooltip != null)
                        if (property.data.tooltip != "")
                            if (property.data.tooltip.length > 0)
                                badgelabel.title = property.data.tooltip;

                    sInput.appendChild(badgelabel);

                    let extraDiv = deftemplate.createElement("DIV");
                    extraDiv.className = "badge-container";

                    let badgea = deftemplate.createElement('a');
                    badgea.className = "badge-image";
                    badgea.className += " badge-" + property.data.attKey;

                    let badgei = deftemplate.createElement('i');
                    badgei.className = "badge-click";
                    badgei.setAttribute("attKey", property.data.attKey);
                    badgei.setAttribute("attId", property._id);
                    badgea.appendChild(badgei);

                    extraDiv.appendChild(badgea);

                    if (game.user.isGM) {
                        let gmbadgea = deftemplate.createElement('a');
                        gmbadgea.setAttribute("attKey", property.data.attKey);
                        gmbadgea.setAttribute("attId", property._id);
                        gmbadgea.className = "badge-clickgm";

                        let gmbadgei = deftemplate.createElement('i');
                        gmbadgei.className = "fas fa-plus-circle";

                        gmbadgea.appendChild(gmbadgei);
                        extraDiv.appendChild(gmbadgea);
                    }

                    sInput.appendChild(extraDiv);
                }

                else if (property.data.datatype === "list") {

                    sInput = deftemplate.createElement("SELECT");
                    if (property.data.inputsize == "F") {
                        sInput.className = "input-free";
                    }

                    else if (property.data.labelsize == "S") {
                        sInput.className = "input-small";
                    }

                    else if (property.data.labelsize == "T") {
                        sInput.className = "input-tiny";
                    }

                    else if (property.data.labelsize == "M") {
                        sInput.className = "input-med";
                    }

                    else if (property.data.labelsize == "L") {
                        sInput.className = "input-medlarge";
                    }

                    else {
                        sInput.className = "input-med";
                    }

                    //sInput.className = "input-med";
                    sInput.setAttribute("name", "data.attributes." + property.data.attKey + ".value");
                    sInput.insertAdjacentHTML('beforeend', "{{#select data.data.attributes." + property.data.attKey + ".value}}");

                    //IM ON IT
                    var rawlist = property.data.listoptions;
                    var listobjects = rawlist.split(',');

                    for (var i = 0; i < listobjects.length; i++) {
                        let n_option = deftemplate.createElement("OPTION");
                        n_option.setAttribute("value", listobjects[i]);
                        n_option.textContent = listobjects[i];
                        sInput.appendChild(n_option);
                    }



                    sInput.insertAdjacentHTML('beforeend', "{{/select}}");
                }

                else if (property.data.datatype === "button") {
                    sInput = deftemplate.createElement("a");
                    if (property.data.labelformat != "D") {
                        sInput.className = "sbbutton";
                    }

                    let buttonContent = deftemplate.createElement("i");

                    buttonContent.className = property.data.attKey + "_button macrobutton";
                    if (property.data.labelformat != "D") {
                        buttonContent.textContent = property.data.tag;
                    }
                    else {
                        buttonContent.className += " fas fa-dice-d20 ";
                    }

                    buttonContent.setAttribute("macroid", property.data.macroid);
                    sInput.appendChild(buttonContent);
                }

                else if (property.data.datatype === "table") {
                    new_row.className = "table-row " + property.data.attKey + "_row";

                    //TABLE LAYOUT
                    sInput = deftemplate.createElement("TABLE");
                    if (property.data.tableheight == "S") {
                        sInput.className = "table-small";
                    }
                    else if (property.data.tableheight == "M") {
                        sInput.className = "table-med";
                    }
                    else if (property.data.tableheight == "T") {
                        sInput.className = "table-tall";
                    }
                    else {
                        sInput.className = "table-free";
                    }

                    sInput.className += " sbtable";

                    sInput.setAttribute("name", "data.attributes." + property.data.attKey);
                    sInput.setAttribute("inputgroup", inputgroup);
                    sInput.setAttribute("value", "{{data.data.attributes." + property.data.attKey + ".value}}");

                    sInput.innerHTML = '';

                    //get group
                    //const group = game.items.get(property.data.group.id);
                    const group = await auxMeth.getTElement(property.data.group.id, "group", property.data.group.ikey);

                    //Create header
                    let header = deftemplate.createElement("THEAD");
                    if (!property.data.hasheader)
                        header.style.display = "none";
                    sInput.appendChild(header);
                    let header_row = deftemplate.createElement("TR");
                    header_row.className += " " + fontgroup;
                    header_row.setAttribute("tableKey", property.data.attKey);
                    header.appendChild(header_row);

                    //Add name ta
                    if ((property.data.onlynames == "DEFAULT" || property.data.onlynames == "ONLY_NAMES") && !property.data.isfreetable) {
                        if (!property.data.namecolumn) {
                            property.data.namecolumn = "Item";
                        }

                        let hnameCell = deftemplate.createElement("TH");
                        //hnameCell.className = "input-free";
                        hnameCell.className = "label-large";
                        hnameCell.textContent = property.data.namecolumn;
                        hnameCell.className += " tableheader nameheader";
                        header_row.appendChild(hnameCell);
                    }


                    if (property.data.onlynames != "ONLY_NAMES") {
                        if (property.data.hasactivation && !property.data.isfreetable) {
                            let hactiveCell = deftemplate.createElement("TH");
                            hactiveCell.className = "input-min";
                            hactiveCell.className += " tableheader";
                            hactiveCell.textContent = "Active";
                            header_row.appendChild(hactiveCell);
                        }

                        if (property.data.hasunits && !property.data.isfreetable) {
                            let hnumberCell = deftemplate.createElement("TH");
                            hnumberCell.className = "input-min";
                            hnumberCell.className += " tableheader";
                            hnumberCell.textContent = "Num";
                            header_row.appendChild(hnumberCell);
                        }

                        //REMOVE USES WORKSTREAM
                        if (property.data.hasuses && property.data.hasactivation && !property.data.isfreetable) {
                            let husesCell = deftemplate.createElement("TH");
                            husesCell.className = "input-uses";
                            husesCell.className += " tableheader";
                            husesCell.textContent = "Uses";
                            header_row.appendChild(husesCell);
                        }

                        if (group != null) {

                            const groupprops = group.data.data.properties;
                            //let isfirstFree = true;
                            for (let i = 0; i < groupprops.length; i++) {
                                console.log(groupprops[i].id + " key:" + groupprops[i].ikey + " name:" + groupprops[i].name);

                                //let propTable = game.items.get(groupprops[i].id);
                                let propTable = await auxMeth.getTElement(groupprops[i].id, "property", groupprops[i].ikey);
                                if (propTable == null)
                                    break;
                                let hCell = deftemplate.createElement("TH");

                                hCell.className = "input-med";

                                if (propTable.data.data.labelsize == "F") {
                                    hCell.className = "label-free";

                                }
                                else if (propTable.data.data.labelsize == "S") {
                                    hCell.className = "label-small";
                                }
                                else if (propTable.data.data.labelsize == "T") {
                                    hCell.className = "label-tiny";
                                }
                                else if (propTable.data.data.labelsize == "L" && propTable.data.data.inputsize == "M") {
                                    hCell.className = "label-medlarge";
                                }
                                else if (propTable.data.data.labelsize == "L" && propTable.data.data.inputsize == "L") {
                                    hCell.className = "label-big";
                                }
                                else if (propTable.data.data.labelsize == "L") {
                                    hCell.className = "label-large";
                                }
                                else {
                                    hCell.className = "label-med";
                                }

                                // if(property.data.isfreetable && isfirstFree){
                                //     hCell.className += " firstcol";
                                //     isfirstFree = false;
                                // }


                                hCell.className += " tableheader propheader";
                                hCell.setAttribute("attKey", propTable.data.data.attKey);
                                hCell.textContent = propTable.data.data.tag;

                                if (!propTable.data.data.ishidden)
                                    header_row.appendChild(hCell);
                            }
                        }
                    }

                    //Add transfer column
                    if (property.data.transferrable) {
                        let transferCell = deftemplate.createElement("TH");
                        transferCell.className = "input-min tableheader";
                        header_row.appendChild(transferCell);
                    }

                    //Add delete column
                    let deleteCell = deftemplate.createElement("TH");
                    deleteCell.className = " tableheader cell-empty";
                    header_row.appendChild(deleteCell);

                    let tbody = deftemplate.createElement("TBODY");
                    tbody.className = "table";
                    tbody.className += " " + inputgroup;
                    tbody.setAttribute("id", property._id);
                    sInput.appendChild(tbody);

                }

                else {

                    sInput = deftemplate.createElement("INPUT");

                    sInput.setAttribute("name", "data.attributes." + property.data.attKey + ".value");
                    sInput.setAttribute("value", "{{data.data.attributes." + property.data.attKey + ".value}}");

                    if (property.data.datatype === "simplenumeric") {

                        sInput.setAttribute("type", "text");
                        sInput.className = "input-min";

                        if (property.data.inputsize == "M") {
                            sInput.className = "input-med";
                        }

                        if (!hasProperty(property.data, "maxvisible")) {
                            property.data.maxvisible = true;
                        }

                        if (property.data.automax != "" && property.data.maxvisible) {
                            sInputMax = await deftemplate.createElement("INPUT");
                            sInputMax.setAttribute("type", "text");
                            sInput.className = "input-ahalf ";
                            sInputMax.className = "input-bhalf input-disabled inputGM " + property.data.attKey + ".max";
                            sInputMax.setAttribute("name", "data.attributes." + property.data.attKey + ".max");
                            sInputMax.setAttribute("value", "{{data.data.attributes." + property.data.attKey + ".max}}");
                        }

                        if (property.data.arrows && !property.data.ishidden) {
                            sInputArrows = deftemplate.createElement("SPAN");
                            let arrContainer = deftemplate.createElement("A");
                            arrContainer.className = "arrcontainer";
                            arrContainer.style.display = "inline-block";
                            arrContainer.setAttribute("attKey", property.data.attKey);
                            let arrUp = deftemplate.createElement("I");
                            arrUp.className = "arrup";
                            let arrDown = deftemplate.createElement("I");
                            arrDown.className = "arrdown";

                            if (!property.data.editable) {
                                arrContainer.setAttribute("arrlock", true);
                            }

                            arrContainer.appendChild(arrUp);
                            arrContainer.appendChild(arrDown);
                            sInputArrows.appendChild(arrContainer);
                        }


                    }

                    else if (property.data.datatype == "label") {
                        sInput.setAttribute("type", "text");
                        sInput.className = "input-free";
                        sInput.style.display = "none";
                    }

                    else {
                        sInput.setAttribute("type", "text");
                        sInput.className = "";
                        if (property.data.inputsize != null) {
                            if (property.data.inputsize == "F") {
                                sInput.className = "input-free";
                            }

                            else if (property.data.inputsize == "S") {
                                sInput.className = "input-small";
                            }

                            else if (property.data.inputsize == "M") {
                                sInput.className = "input-med";
                            }

                            else if (property.data.inputsize == "L") {
                                sInput.className = "input-large";
                            }
                            else if (property.data.inputsize == "T") {
                                sInput.className = "input-tiny";
                            }
                        }
                        else {
                            sInput.className = "input-free";
                        }
                    }

                    if (property.data.auto != "") {
                        sInput.setAttribute("readonly", "true");
                        sInput.className += " input-disabled";
                    }

                }

                //Adds identifier
                sInput.className += " " + property.data.attKey;
                if (property.data.datatype != "table")
                    sInput.className += " " + inputgroup;
                console.log(property);
                sInput.setAttribute("attId", property._id);

                if (!property.data.editable)
                    sInput.className += " inputGM";

                if (property.data.ishidden) {
                    sInput.style.display = "none";
                    if (sLabel != null && property.data.haslabel)
                        sLabel.style.display = "none";
                }


                if (property.data.datatype != "label")
                    await divtemp.appendChild(sInput);

                if (property.data.automax != "" && property.data.maxvisible && sInputMax != null) {
                    //sInputMax.className += " " + inputgroup;
                    //divtemp.insertBefore(sInputMax, sInput.nextSibling);
                    await divtemp.appendChild(sInputMax);
                }
                if (sInputArrows != null) {
                    await divtemp.appendChild(sInputArrows);
                }

                count++;

                if (count == columns) {
                    count = 0;
                }

            }
            //}, this);
        }

        //GEt final HTML
        var parentRow;
        //console.log("rwidth: " + flags.rwidth + " rows: " + flags.rows);
        if (multiID == null) {
            console.log(tabpanel.name + " width: " + flags.rwidth + " rows: " + flags.rows + " initial: " + initial);
        }
        else {
            console.log(tabpanel.name + " rwidth: " + flags.rwidth + " multiwidth: " + flags.multiwidth + " initial: " + initial + " maxrows " + flags.maxrows);
        }

        let checktest = deftemplate.getElementById(tabname + "row" + flags.rows);

        if ((flags.rwidth == 0 || initial) && (firstmrow || checktest == null)) {
            console.log("setting new row attribute");
            parentRow = deftemplate.createElement("DIV");
            parentRow.className = 'new-block';

            if (multiID == null) {
                parentRow.setAttribute('id', tabname + "row" + flags.rows);
                await parentNode.appendChild(parentRow);
            }
            else {
                let multiwclass = flags.multiwclass;
                console.log("MultiPanel Container " + multiwclass);
                let parentRoot;
                let parentGranda = deftemplate.createElement("DIV");
                parentGranda.setAttribute('id', multiID + "multi");
                parentGranda.className = multiwclass + "-col";

                //If has header:
                if (multiName != null && multiName != "") {
                    let new_header = document.createElement("DIV");

                    if (tabpanel.data.backg == "T") {
                        new_header.className = "panelheader-t";
                    }
                    else {
                        new_header.className = "panelheader";
                    }
                    new_header.className += " " + multiheadergroup;
                    new_header.textContent = multiName;
                    await parentGranda.appendChild(new_header);
                }



                console.log("MultiRow Container: " + multiID + "multirow" + flags.maxrows);
                parentRow.setAttribute('id', multiID + "multirow" + flags.maxrows);

                if (flags.rwidth == 0) {
                    parentRoot = document.createElement("DIV");
                    parentRoot.className = 'new-block';
                    console.log("creating row: " + flags.rows);
                    parentRoot.setAttribute('id', tabname + "row" + flags.rows);
                    await parentNode.appendChild(parentRoot);
                    await parentRoot.appendChild(parentGranda);
                }

                else {
                    parentRoot = deftemplate.getElementById(tabname + "row" + flags.rows);
                    await parentNode.appendChild(parentRoot);
                    await parentRoot.appendChild(parentGranda);
                }

                await parentGranda.appendChild(parentRow);

                //parentGranda conditional visibility, to reorganize in method with previous ones
                //                if(_paneldata.condop!="NON"){
                //                    let attProp = ".value";
                //                    if(_paneldata.condat!=null){
                //                        if(_paneldata.condat.includes("max")){
                //                            attProp = "";
                //                        }
                //                    }
                //
                //
                //                    if(_paneldata.condop=="EQU"){
                //                        if(_paneldata.condvalue == "true"||_paneldata.condvalue == "false" || typeof _paneldata.condvalue ==="boolean"){
                //                            parentGranda.insertAdjacentHTML( 'beforebegin', "{{#if actor.data.attributes." + _paneldata.condat + attProp + "}}" );
                //                            parentGranda.insertAdjacentHTML( 'afterend', "{{/if}}" );
                //                        }
                //                        else{
                //                            parentGranda.insertAdjacentHTML( 'afterbegin', "{{#ifCond actor.data.attributes." + _paneldata.condat + attProp + " '" + _paneldata.condvalue + "'}}" );
                //                            parentGranda.insertAdjacentHTML( 'beforeend', "{{/ifCond}}" );
                //                        }
                //
                //                    }
                //
                //                    else if(_paneldata.condop=="HIH"){
                //                        parentGranda.insertAdjacentHTML( 'afterbegin', "{{#ifGreater actor.data.attributes." + _paneldata.condat + attProp + " '" + _paneldata.condvalue + "'}}" );
                //                        parentGranda.insertAdjacentHTML( 'beforeend', "{{/ifGreater}}" );
                //                    }
                //
                //                    else if(_paneldata.condop=="LOW"){
                //                        parentGranda.insertAdjacentHTML( 'afterbegin', "{{#ifLess actor.data.attributes." + _paneldata.condat + attProp + " '" + _paneldata.condvalue + "'}}" );
                //                        parentGranda.insertAdjacentHTML( 'beforeend', "{{/ifLess}}" );
                //                    }
                //                }

            }


        }

        else {

            if (multiID == null) {
                console.log("getting existing row id " + tabname + "row" + flags.rows);
                parentRow = deftemplate.getElementById(tabname + "row" + flags.rows);
            }
            else {
                if (initial) {
                    //parentRow = deftemplate.getElementById(multiID + "multi");
                    parentRow = document.createElement("DIV");
                    parentRow.className = 'new-multiblock';

                    let parentRoot;
                    let parentGranda = deftemplate.getElementById(multiID + "multi");

                    console.log("Creating multiRow Container: " + multiID + "multirow" + flags.maxrows);
                    parentRow.setAttribute('id', multiID + "multirow" + flags.maxrows);

                    if (flags.rwidth == 0) {
                        parentRoot = deftemplate.createElement("DIV");
                        parentRoot.className = 'new-block';
                        console.log("creating row: " + flags.rows);
                        parentRoot.setAttribute('id', tabname + "row" + flags.rows);
                    }

                    else {
                        parentRoot = deftemplate.getElementById(tabname + "row" + flags.rows);

                    }

                    await parentNode.appendChild(parentRoot);
                    await parentRoot.appendChild(parentGranda);
                    await parentGranda.appendChild(parentRow);
                }
                else {
                    parentRow = deftemplate.getElementById(multiID + "multirow" + flags.maxrows);
                }

            }

        }
        console.log("almost there");
        await parentRow.appendChild(div6);
        console.log(div6);

        //ADD VISIBILITY RULES TO PANEL
        if (tabpanel.data.condop != "NON") {
            let attProp = ".value";
            if (tabpanel.data.condat != null) {
                if (tabpanel.data.condat.includes(".max")) {
                    attProp = "";
                }
            }


            if (tabpanel.data.condop == "EQU") {
                console.log(div6);
                if ((tabpanel.data.condvalue === "true" || tabpanel.data.condvalue === "false" || tabpanel.data.condvalue === true || tabpanel.data.condvalue === false)) {
                    div6.insertAdjacentHTML('beforebegin', "{{#if actor.data.attributes." + tabpanel.data.condat + attProp + "}}");
                    div6.insertAdjacentHTML('afterend', "{{/if}}");
                }
                else {
                    div6.insertAdjacentHTML('afterbegin', "{{#ifCond actor.data.attributes." + tabpanel.data.condat + attProp + " '" + tabpanel.data.condvalue + "'}}");
                    div6.insertAdjacentHTML('beforeend', "{{/ifCond}}");
                }

            }

            else if (tabpanel.data.condop == "HIH") {
                div6.insertAdjacentHTML('afterbegin', "{{#ifGreater actor.data.attributes." + tabpanel.data.condat + attProp + " '" + tabpanel.data.condvalue + "'}}");
                div6.insertAdjacentHTML('beforeend', "{{/ifGreater}}");
            }

            else if (tabpanel.data.condop == "LOW") {
                div6.insertAdjacentHTML('afterbegin', "{{#ifLess actor.data.attributes." + tabpanel.data.condat + attProp + " '" + tabpanel.data.condvalue + "'}}");
                div6.insertAdjacentHTML('beforeend', "{{/ifLess}}");
            }

            else if (tabpanel.data.condop == "NOT") {
                div6.insertAdjacentHTML('afterbegin', "{{#ifNot actor.data.attributes." + tabpanel.data.condat + attProp + " '" + tabpanel.data.condvalue + "'}}");
                div6.insertAdjacentHTML('beforeend', "{{/ifNot}}");
            }
        }

        if (tabpanel.data.isimg) {
            div6.setAttribute("img", tabpanel.data.imgsrc);
            div6.className += " isimg";

            if (tabpanel.data.contentalign == "center")
                div6.className += " centertext";
        }

        console.log(div6);

        console.log("almost there 2");
        let finalreturn = new XMLSerializer().serializeToString(deftemplate);
        return finalreturn;
        //this.actor.data.data._html = deftemplate.innerHTML;

    }

    async exportHTML(htmlObject, filename) {
        const data = new FormData();
        const blob = new Blob([htmlObject], { type: 'text/html' });

        data.append('target', 'worlds/' + game.data.world.name + "/");
        data.append('upload', blob, filename + '.html');
        data.append('source', 'data');
        console.log(data);

        fetch('upload', { method: 'POST', body: data });

    };

    /* -------------------------------------------- */

    /**
   * Builds the character sheet template based on the options included
   */

    async buildSheet() {
        const actor = this.actor;
        const tabs = actor.data.data.tabs;
        const flags = this.actor.data.flags;

        let newhtml = await auxMeth.buildSheetHML();
        let stringHTML = new XMLSerializer().serializeToString(newhtml)
        //console.log(stringHTML);
        await this.actor.update({ "data._html": stringHTML });

        setProperty(flags, "rows", 0);
        setProperty(flags, "rwidth", 0);
        setProperty(flags, "multiwidth", 0);
        setProperty(flags, "maxwidth", 0);
        setProperty(flags, "maxrows", 0);
        setProperty(flags, "multiwclass", "");

        console.log(actor);

        let keychecker = await this.checkTemplateKeys(tabs);
        await this.actor.update({ "data.buildlog": keychecker.checkerMsg });
        console.log(keychecker);
        if (keychecker.hasissue) {
            ui.notifications.warn("Template actor has consistency problems, please check Config Tab");
            return;
        }
        else {
            await this.buildHTML(tabs);
            this.actor.update({ "data.flags": flags }, { diff: false });
        }


    }

    async setcItemsKey() {
        let gamecItems = game.items.filter(y => y.data.type == "cItem");
        for (let i = 0; i < gamecItems.length; i++) {
            const mycitem = gamecItems[i];
            if (mycitem.data.data.ciKey == "")
                await mycitem.update({ "data.data.ciKey": mycitem.id });
        }
    }

    async checkConsistency() {

        let gamecItems = game.items.filter(y => y.data.type == "cItem");
        let toupdate = false;
        for (let i = 0; i < gamecItems.length; i++) {
            const mycitem = gamecItems[i];
            const mycitemmods = mycitem.data.data.mods;
            for (let j = 0; j < mycitemmods.length; j++) {
                let mymod = mycitemmods[j];
                //setProperty(mymod, "citem", mycitem.data.id);
                // if (!hasProperty(mymod, "index")) {
                //     setProperty(mymod, "index", j);
                //     toupdate = true;
                // }

                if (mymod.items.length > 0) {
                    for (let h = 0; h < mymod.items.length; h++) {
                        if (mymod.items[h].ciKey == null) {
                            let toaddotem = await auxMeth.getcItem(mymod.items[h].id, mymod.items[h].ciKey);
                            if (toaddotem) {
                                toupdate = true;
                                mymod.items[h].ciKey = toaddotem.data.data.ciKey;
                            }

                        }

                    }
                }

            }
            if (toupdate) {
                console.log("updating consistency");
                await mycitem.update({ "data": mycitem.data.data });
            }

        }

        // let gameactors = game.actors;
        // for (let i = 0; i < gameactors.entities.length; i++) {

        //     const myactor = gameactors.entities[i];
        //     const myactorcitems = myactor.data.data.citems;
        //     //console.log("checking actor " + myactor.name);
        //     //console.log(myactorcitems);
        //     if (!myactor.data.data.istemplate) {
        //         if (myactorcitems != null) {
        //             for (let j = myactorcitems.length - 1; j >= 0; j--) {
        //                 let mycitem = myactorcitems[j];
        //                 //console.log(mycitem);
        //                 if (mycitem != null) {
        //                     //let templatecItem = game.items.get(mycitem.id);
        //                     let templatecItem = await auxMeth.getcItem(mycitem.id, mycitem.iKey);
        //                     //console.log(templatecItem);

        //                     if (templatecItem != null) {
        //                         let isconsistent = true;
        //                         let mymods = mycitem.mods;
        //                         if (mymods != null) {
        //                             for (let r = 0; r < mymods.length; r++) {
        //                                 if (mycitem.id != mymods[r].citem)
        //                                     mymods[r].citem = mycitem.id;
        //                                 if (!hasProperty(mymods[r], "index"))
        //                                     setProperty(mymods[r], "index", 0);

        //                                 if (templatecItem.data.data.mods[mymods[r].index] == null) {
        //                                     //console.log(templatecItem.name);
        //                                     //isconsistent = false;
        //                                 }

        //                                 else {
        //                                     if (mymods[r].expr != templatecItem.data.data.mods[mymods[r].index].value)
        //                                         isconsistent = false;
        //                                 }


        //                             }
        //                         }

        //                         //MOD change consistency checker
        //                         if (!isconsistent) {
        //                             console.log(templatecItem.name + " is fucked in " + myactor.name);
        //                             let newData = await myactor.deletecItem(templatecItem.id, true);
        //                             await this.actor.update({ "data": newData.data });
        //                             let subitems = await myactor.addcItem(templatecItem);
        //                             if (subitems)
        //                                 this.updateSubItems(false, subitems);
        //                             //await myactor.update(myactor.data);
        //                         }

        //                     }

        //                     else {
        //                         delete myactorcitems[j];
        //                     }

        //                 }

        //                 else {
        //                     //myactorcitems.split(myactorcitems[j],1);
        //                     delete myactorcitems[j];
        //                 }


        //             }
        //         }

        //         try {
        //             await myactor.update({ "data": myactor.data.data }, { stopit: true });
        //         }
        //         catch (err) {
        //             ui.notifications.warn("Character " + myactor.name + " has consistency problems");
        //         }
        //     }


        // }
    }

    async checkTemplateKeys(tabs) {
        let hasissue = false;
        let compilationMsg = "";
        let myreturn = {};


        //SET CurRenT DATE
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        today = mm + '/' + dd + '/' + yyyy;
        compilationMsg += "Last rebuilt: " + today + ", ";

        let allProps = [];
        let allTabs = [];
        let allPanels = [];
        for (let y = 0; y < tabs.length; y++) {
            //let titem = game.items.get(tabs[y].id);
            let titem = await auxMeth.getTElement(tabs[y].id, "sheettab", tabs[y].ikey);
            let tabitempanels = [];
            if (titem != null) {
                tabitempanels = titem.data.data.panels;
                allTabs.push(titem.data.data.tabKey);
            }
            else {
                allTabs.push(tabs[y].name + "_TAB_NONEXISTING");
                hasissue = true;
            }

            if (tabitempanels == null)
                tabitempanels = [];

            for (let i = 0; i < tabitempanels.length; i++) {
                //let tabpanel = game.items.get(tabitempanels[i].id);
                let tabpanel = await auxMeth.getTElement(tabitempanels[i].id, "panel", tabitempanels[i].ikey);
                console.log("building panel with Key: " + tabitempanels[i].ikey);
                if (tabpanel == null)
                    console.log("PANEL NOT FOUND");
                //console.log(tabpanel.name);
                let panelproperties = [];
                if (tabpanel != null) {
                    if (tabpanel.data.type == "multipanel") {
                        for (let b = 0; b < tabpanel.data.data.panels.length; b++) {
                            //let subpanel = game.items.get(tabpanel.data.data.panels[b].id);
                            console.log(tabpanel.data.data.panels[b]);
                            //console.log(tabpanel.data.data.panels[b].ikey);
                            let subpanel = await auxMeth.getTElement(tabpanel.data.data.panels[b].id, "panel", tabpanel.data.data.panels[b].ikey);
                            if (subpanel) {
                                let subproperties = subpanel.data.data.properties;
                                allPanels.push(subpanel.data.data.panelKey);
                                panelproperties = [].concat(panelproperties, subproperties);
                            }
                            else {
                                ui.notifications.warn("Please remove panel " + tabpanel.data.data.panels[b].name + " at multipanel " + tabpanel.name);
                            }

                        }
                    }
                    else {
                        panelproperties = tabpanel.data.data.properties;
                        allPanels.push(tabpanel.data.data.panelKey);
                    }

                }
                else {
                    allPanels.push(tabitempanels[i].name + "_PANEL_NONEXISTING");
                    hasissue = true;
                }

                if (panelproperties == null)
                    panelproperties = [];

                for (let j = 0; j < panelproperties.length; j++) {
                    //let property = game.items.get(panelproperties[j].id);
                    let property = await auxMeth.getTElement(panelproperties[j].id, "property", panelproperties[j].ikey);
                    if (property != null) {
                        if (property.data.data.datatype == "table" && property.data.data.group.id == null) {
                            compilationMsg += panelproperties[j].name + " table property lacks table group"
                            hasissue = true;
                        }

                        allProps.push(property.data.data.attKey);


                    }
                    else {
                        allProps.push(panelproperties[j].name + "_PROP_NONEXISTING");
                        hasissue = true;
                    }

                }

            }
        }

        //CHECK FOR DUPLICATES
        let duplicateProps = allProps.filter((e, i, a) => a.indexOf(e) !== i);
        for (let n = 0; n < duplicateProps.length; n++) {
            compilationMsg += "property key " + duplicateProps[n] + " is duplicated,";
        }

        let duplicatePanels = allPanels.filter((e, i, a) => a.indexOf(e) !== i);
        for (let m = 0; m < duplicatePanels.length; m++) {
            compilationMsg += "panel key " + duplicatePanels[m] + " is duplicated, ";
        }

        let duplicateTabs = allTabs.filter((e, i, a) => a.indexOf(e) !== i);
        for (let s = 0; s < duplicateTabs.length; s++) {
            compilationMsg += "panel key " + duplicateTabs[s] + " is duplicated, ";
        }

        //CHECK FOR INCORRECT KEYS
        for (let checkPrKey in allProps) {
            if (/\s/.checkPrKey) {
                compilationMsg += "property key " + checkPrKey + " includes blank space, ";
                hasissue = true;
            }

        }

        for (let checkPaKey in allPanels) {
            if (/\s/.checkPaKey) {
                compilationMsg += "panel key " + checkPaKey + " includes blank space, ";
                hasissue = true;
            }

        }

        for (let checkTaKey in allTabs) {
            if (/\s/.checkTaKey) {
                compilationMsg += "tab key " + checkTaKey + " includes blank space, ";
                hasissue = true;
            }

        }

        //CHECK NONEXISTING TEMPLATE ELEMENTS
        let nonEmsg = "";
        let checkNonE = allProps.concat(allPanels, allTabs);
        let nonE = checkNonE.filter(y => y.includes("_NONEXISTING"));
        if (nonE.length > 0) {
            nonEmsg = ", the following elements do not exist in world (type included after _):";
            hasissue = true;
        }

        for (let r = 0; r < nonE.length; r++) {
            let noneKey = nonE[r].replace("_NONEXISTING", "");
            nonEmsg += noneKey + ", ";
        }

        compilationMsg += nonEmsg;

        //IF NOTHING WRONG
        if (!hasissue)
            compilationMsg += " SUCCESFULLY REBUILT"

        myreturn.hasissue = hasissue;
        myreturn.checkerMsg = compilationMsg;

        return myreturn;

    }

    find_duplicate_in_array(myarray) {
        let result = [];
        for (let i = 0; i < myarray.length; i++) {
            let myelement = myarray[i];
            let timespresent = myarray.filter((v) => (v === myelement)).length;
            if (timespresent > 0 && !result.includes(myelement))
                result.push(myelement);
        }
        return result;
    }

    async buildHTML(tabs) {
        console.log("building HTML");

        let newHTML;

        //if (game.settings.get("sandbox", "consistencycheck") != "") {
        await this.checkConsistency();
        //}


        const flags = this.actor.data.flags;
        for (let y = 0; y < tabs.length; y++) {

            //const titem = game.items.get(tabs[y].id).data;
            let titemfinder = await auxMeth.getTElement(tabs[y].id, "sheettab", tabs[y].ikey);
            const titem = titemfinder.data;
            console.log(titem);
            console.log(tabs[y].ikey);
            flags.rwidth = 0;
            newHTML = await this.addNewTab(newHTML, titem, y + 1);
            //console.log(newHTML);
            let tabname = titem.data.tabKey;

            //let gtabitem = JSON.parse(titem.data.panels);
            let tabitempanels = titem.data.panels;
            //console.log(tabitempanels);

            flags.maxrows = 0;


            for (let i = 0; i < tabitempanels.length; i++) {
                //let tabpanel = game.items.get(tabitempanels[i].id);
                let tabpanel = await auxMeth.getTElement(tabitempanels[i].id, "panel", tabitempanels[i].ikey);
                //console.log(tabpanel);


                if (tabpanel.type == "panel")
                    newHTML = await this.addNewPanel(newHTML, tabpanel.data, titem.data.tabKey, tabname, true);

                //                if(newpanelHTML!=null)
                //                    break;
                //console.log(newHTML);

                if (tabpanel.data.type == "multipanel") {
                    console.log("hay multi!");

                    let multipanels = tabpanel.data.data.panels;
                    let multiwidth = this.freezeMultiwidth(tabpanel.data);
                    let newtotalwidth = flags.rwidth + multiwidth;

                    flags.maxwidth = multiwidth;
                    flags.multiwidth = 0;
                    flags.multiwclass = this.getmultiWidthClass(tabpanel.data.data.width);

                    //console.log(multipanels);
                    let firstmrow = true;
                    let ismulti = true;
                    for (let j = 0; j < multipanels.length; j++) {
                        //let singlepanel = game.items.get(multipanels[j].id);
                        let singlepanel = await auxMeth.getTElement(multipanels[j].id, "panel", multipanels[j].ikey);
                        //console.log(multipanels[j]);
                        //LAst argument is only to pass the conditionals. Poorly done, to fix in the future.
                        newHTML = await this.addNewPanel(newHTML, singlepanel.data, titem.data.tabKey, tabname, firstmrow, tabpanel.data.data.panelKey, tabpanel.data.data.title, null, tabpanel.data.data.headergroup);
                        newHTML = await this.addMultipanelVisibility(newHTML, tabpanel.data.data.panelKey, tabpanel.data.data.condat, tabpanel.data.data.condop, tabpanel.data.data.condvalue);
                        if (firstmrow)
                            flags.rwidth += multiwidth;
                        firstmrow = false;

                    }
                }

            }
            //            if(newpanelHTML!=null)
            //                break;
        }

        if (newHTML == null)
            newHTML = this.actor.data.data._html;

        console.log("panels built");
        await this.hideTabsinTemplate();
        //console.log(newHTML);

        var wrapper = document.createElement('div');
        wrapper.innerHTML = newHTML;
        this.actor.data.data._html = newHTML;
        let deftemplate = wrapper;
        //console.log(deftemplate);

        await this.registerHTML(deftemplate.querySelector("#sheet").outerHTML);
    }

    async addMultipanelVisibility(html, multiKey, att, op, val) {
        let deftemplate = new DOMParser().parseFromString(html, "text/html");
        let parentGranda = deftemplate.getElementById(multiKey + "multi");
        if (op != "NON") {
            let attProp = ".value";
            if (att != null) {
                if (att.includes(".max")) {
                    attProp = "";
                }
            }


            if (op == "EQU") {
                if (val == "true" || val == "false" || typeof val === "boolean") {
                    parentGranda.insertAdjacentHTML('beforebegin', "{{#if actor.data.attributes." + att + attProp + "}}");
                    parentGranda.insertAdjacentHTML('afterend', "{{/if}}");
                }
                else {
                    parentGranda.insertAdjacentHTML('afterbegin', "{{#ifCond actor.data.attributes." + att + attProp + " '" + val + "'}}");
                    parentGranda.insertAdjacentHTML('beforeend', "{{/ifCond}}");
                }

            }

            else if (op == "HIH") {
                parentGranda.insertAdjacentHTML('afterbegin', "{{#ifGreater actor.data.attributes." + att + attProp + " '" + val + "'}}");
                parentGranda.insertAdjacentHTML('beforeend', "{{/ifGreater}}");
            }

            else if (op == "LOW") {
                parentGranda.insertAdjacentHTML('afterbegin', "{{#ifLess actor.data.attributes." + att + attProp + " '" + val + "'}}");
                parentGranda.insertAdjacentHTML('beforeend', "{{/ifLess}}");
            }

            else if (op == "NOT") {
                parentGranda.insertAdjacentHTML('afterbegin', "{{#ifNot actor.data.attributes." + att + attProp + " '" + val + "'}}");
                parentGranda.insertAdjacentHTML('beforeend', "{{/ifNot}}");
            }
        }

        let finalreturn = new XMLSerializer().serializeToString(deftemplate);
        return finalreturn;
    }

    hideTabsinTemplate() {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = this.actor.data.data._html;
        let deftemplate = wrapper;

        //Tab selector
        let p = deftemplate.querySelector("#tab-0");
        let c = deftemplate.querySelector("#tab-last");
        p.insertAdjacentHTML('beforebegin', "{{#if actor.data.istemplate}}");
        p.insertAdjacentHTML('beforebegin', "{{else}}");
        c.insertAdjacentHTML('afterend', "{{/if}}");


    }

    freezeMultiwidth(tabpanel) {
        let newidth = 0;
        if (tabpanel.data.width === "1") {
            newidth = 1;
        }

        else if (tabpanel.data.width === "1/3") {
            newidth = 0.333;
        }

        else if (tabpanel.data.width === "2/3") {
            newidth = 0.666;
        }

        else if (tabpanel.data.width === "5/6") {
            newidth = 0.833;
        }

        else if (tabpanel.data.width === "3/4") {
            newidth = 0.75;
        }

        else if (tabpanel.data.width === "1/2") {
            newidth = 0.5;
        }

        else if (tabpanel.data.width === "1/4") {
            newidth = 0.25;
        }

        else if (tabpanel.data.width === "1/6") {
            newidth = 0.166;
        }

        else if (tabpanel.data.width === "1/8") {
            newidth = 0.125;
        }
        else if (tabpanel.data.width === "3/10") {
            newidth = 0.3;
        }
        else if (tabpanel.data.width === "1/16") {
            newidth = 0.0625;
        }
        else if (tabpanel.data.width === "5/8") {
            newidth = 0.625;
        }
        else if (tabpanel.data.width === "3/8") {
            newidth = 0.375;
        }

        else {
            newidth = 1;
        }
        return newidth;
    }

    getmultiWidthClass(width) {
        let wclass = "";
        if (width === "1") {
            wclass = "multi-1-1";
        }

        else if (width === "1/3") {
            wclass = "multi-1-3";
        }

        else if (width === "2/3") {
            wclass = "multi-2-3";
        }

        else if (width === "5/6") {
            wclass = "multi-5-6";
        }

        else if (width === "1/2") {
            wclass = "multi-1-2";
        }

        else if (width === "1/4") {
            wclass = "multi-1-4";
        }

        else if (width === "3/4") {
            wclass = "multi-3-4";
        }

        else if (width === "1/6") {
            wclass = "multi-1-6";
        }

        else if (width === "1/8") {
            wclass = "multi-1-8";
        }
        else if (width === "3/10") {
            wclass = "multi-3-10";
        }
        else if (width === "1/16") {
            wclass = "multi-1-16";
        }
        else if (width === "5/8") {
            wclass = "multi-5-8";
        }
        else if (width === "3/8") {
            wclass = "multi-3-8";
        }

        else {
            wclass = "multi-1-1";
        }
        return wclass;
    }



    async registerHTML(htmlObject) {
        console.log("registering HTML");

        let stringed = htmlObject.replace('=""', '');

        stringed = stringed.replace(/toparse="/g, '');
        stringed = stringed.replace(/~~"/g, '');

        //this.actor.data.data.gtemplate = this.actor.name;
        this.refreshSheet(this.actor.name);
        //this.actor.data.data._html = stringed;

        await this.actor.update({ "data._html": stringed });
        //console.log(stringed);

        //THIS IS THE LIMITANT CHANGE:
        //await this.actor.update(this.actor.data);

        await this.actor.update();

        await auxMeth.getSheets();

        await this.setcItemsKey();

        //Comment this for debug
        location.reload();
    }

    /* -------------------------------------------- */

    /**
   * Drop element event
   */
    async _onDrop(event) {
        //Initial checks
        event.preventDefault();
        event.stopPropagation();
        let dropitem;
        let dropdata;

        try {
            dropdata = JSON.parse(event.dataTransfer.getData('text/plain'));
            dropitem = game.items.get(dropdata.id);

            if (dropitem.data.type !== "sheettab" && dropitem.data.type !== "cItem") {
                console.log("You can only drop sheettabs or cItems!");
                return false;
            }
        }
        catch (err) {
            console.log("drop error")
            console.log(event.dataTransfer.getData('text/plain'));
            console.log(err);
            return false;
        }

        if (dropdata.ownerID) {

            if (this.actor.id == dropdata.ownerID)
                return;

            this.showTransferDialog(dropdata.id, dropdata.ownerID, dropdata.tokenID);
            return;
        }

        let subitemsTag;
        let isTab = true;
        let subiDataKey;
        let isUnique = true;

        if (dropitem.data.type == "sheettab") {
            subitemsTag = "tabs";
            subiDataKey = "tabKey";
        }
        else if (dropitem.data.type == "cItem") {
            subitemsTag = "citems";
            isTab = false;
            subiDataKey = "ciKey";

            if (!dropitem.data.data.isUnique) {
                isUnique = false;
            }
        }

        //Add tab id to panel
        let subitems = duplicate(this.actor.data.data[subitemsTag]);
        let increaseNum = false;

        for (let i = 0; i < subitems.length; i++) {
            if (subitems[i].id == dropitem.id) {
                if (isUnique) {
                    console.log("item is unique, can not double");
                    return;
                }
                else {
                    subitems[i].number = parseInt(subitems[i].number) + 1;
                    subitems[i].uses = parseInt(subitems[i].uses) + parseInt(dropitem.data.data.maxuses);
                    increaseNum = true;
                    //await this.updateSubItems(isTab,subitems);
                    //await this.actor.actorUpdater();
                    //return;
                }

            }
        }

        if (!increaseNum) {
            if (dropitem.data.type == "cItem") {
                //console.log("adding cItem");
                subitems = await this.actor.addcItem(dropitem);
            }
            else {
                let itemKey = dropitem.data.data[subiDataKey];
                let newItem = {};
                console.log(dropitem);
                setProperty(newItem, itemKey, {});
                newItem[itemKey].id = dropitem.id;
                newItem[itemKey].ikey = itemKey;
                newItem[itemKey].name = dropitem.data.name;
                console.log(newItem);


                subitems.push(newItem[itemKey]);
                //await this.scrollbarSet();
            }
        }

        //console.log(subitems);
        await this.updateSubItems(isTab, subitems);

    }

    async updateSubItems(isTab, subitems) {

        //await this.actor.update();

        if (isTab) {
            //await this.actor.update({"data.tabs": subitems}, {diff: false});
            this.actor.data.data.tabs = subitems;
            await this.actor.update({ "data.tabs": subitems });
        }

        else {

            //this.actor.data.data.citems= subitems;
            //await this.actor.update(this.actor.data);
            if (this.actor.isToken) {
                let myToken = canvas.tokens.get(this.actor.token.id);
                await myToken.document.update({ "actorData.data.citems": subitems });
            }

            else {
                //console.log(subitems);
                await this.actor.update({ "data.citems": subitems });
            }
        }
        //console.log("updating after drop");


        return subitems;
    }


    /* -------------------------------------------- */

    async refreshCItems(basehtml) {
        //console.log("refreshingCItems");
        //TEST
        var parser = new DOMParser();
        let htmlcode = await auxMeth.getTempHTML(this.actor.data.data.gtemplate);
        var _basehtml = await parser.parseFromString(htmlcode, 'text/html').querySelector('form');
        if (_basehtml == null) {
            ui.notifications.warn("Please rebuild character sheet before assigning");
            return;
        }

        //console.log(basehtml);
        //GET CITEMS
        let myactor = this.actor.data.data;

        if (this.actor.isToken) {
            let tokenId = this.id.split("-")[2];
            let mytoken = canvas.tokens.get(tokenId);
            myactor = mytoken.actor.data.data;
        }
        const citems = myactor.citems;
        const attributes = myactor.attributes;

        //SET TABLES INFO
        const html = await basehtml.find(".table");
        const _html = await _basehtml.querySelectorAll('table');

        //Gets all game properties
        const propitems = game.items.filter(y => y.data.type == "property" && y.data.data.datatype == "table");
        //console.log(propitems);

        let totalTables = [];
        let forceUpdate = false;

        for (let y = 0; y < html.length; y++) {
            let tableID = html[y].id;
            let tableVisible = true;
            let newElement = { tableID, tableVisible };
            totalTables.push(newElement);
        }

        for (let y = 0; y < _html.length; y++) {
            let tableID = _html[y].getAttribute("attid");
            let tableVisible = false;
            let existingTable = totalTables.find(y => y.tableID == tableID);
            let newElement = { tableID, tableVisible };
            if (existingTable == null) {
                totalTables.push(newElement);
            }

        }

        //console.log(totalTables);

        for (let i = 0; i < totalTables.length; i++) {
            //console.log(html);
            let tableID = totalTables[i].tableID;
            let table = html[i];
            let inputgroup;

            //let table = html.find(y=>y.id==tableID);
            //console.log(tableID);

            if (table != null) {
                table.innerHTML = '';
                inputgroup = await table.parentNode.getAttribute("inputgroup");
                if (inputgroup == null)
                    inputgroup = await table.getAttribute("inputgroup");
            }

            if (inputgroup == null)
                inputgroup = "";

            const propTable = await propitems.find(y => y.id == tableID);

            //const propTable = await propitems.find(y=>y.id == html[i].getAttribute("attid"));
            let group;
            let groupID;
            let tableKey;
            let isFree;

            if (propTable != null) {
                groupID = propTable.data.data.group;
                //group = game.items.get(groupID.id);
                group = await auxMeth.getTElement(groupID.id, "group", groupID.ikey);
                tableKey = propTable.data.data.attKey;
                isFree = propTable.data.data.isfreetable;
            }

            if (group != null) {

                let groupprops = group.data.data.properties;
                let groupcitems;

                if (isFree) {
                    if (attributes[tableKey] != null) {
                        groupcitems = attributes[tableKey].tableitems;

                        if (this.sortOption != null) {
                            if (this.sortOption[tableKey] != null) {
                                groupcitems = groupcitems.sort(auxMeth.aTdynamicSort(this.sortOption[tableKey], propTable.data.data.datatype));
                            }

                        }
                    }

                    if (groupcitems == null)
                        groupcitems = [];

                }
                else {
                    groupcitems = await citems.filter(y => y.groups.find(item => item.id == groupID.id || item.ikey == groupID.ikey));
                    groupcitems = groupcitems.sort(auxMeth.dynamicSort("name"));

                    if (this.sortOption != null) {
                        if (this.sortOption[tableKey] != null && this.sortOption[tableKey] != "name") {
                            groupcitems = groupcitems.sort(auxMeth.aTdynamicSort(this.sortOption[tableKey], propTable.data.data.datatype));
                        }

                    }
                }

                for (let n = 0; n < groupcitems.length; n++) {
                    let ciObject = groupcitems[n];
                    let ciTemplate;
                    if (!isFree) {
                        //ciTemplate = game.items.get(ciObject.id);
                        ciTemplate = await auxMeth.getcItem(ciObject.id, ciObject.ciKey);
                        // if (ciTemplate == null) {
                        //     //game.actors.importFromCompendium(<PACK>, <ID>, {}, {keepId: true})

                        //     let locatedPack;
                        //     let locatedId;
                        //     for (let pack of game.packs) {
                        //         const packContents = await pack.getDocuments();
                        //         let citems = packContents.filter(y => Boolean(y.data.data));
                        //         let is_here = citems.find(y => y.data.data.ciKey == ciObject.id);
                        //         if (is_here) {
                        //             locatedPack = pack;
                        //             locatedId = is_here.id;
                        //         }


                        //     }

                        //     if (locatedPack != null) {
                        //         let importedobject = await game.items.importFromCompendium(locatedPack, locatedId, { folder: locatedPack.name, keepId: true });
                        //         console.log(importedobject);
                        //         ciTemplate = importedobject;
                        //         ciObject.id = ciTemplate.id;
                        //     }

                        //     else {
                        //         citems.splice(citems.indexOf(ciObject), 1);
                        //         forceUpdate = true;
                        //         continue;
                        //     }


                        // }
                    }

                    //console.log(ciObject.name);
                    let new_row = document.createElement("TR");
                    new_row.className = "table-row " + inputgroup + " " + propTable.data.data.attKey + "_row";
                    let rowname = "table-row-" + ciObject.id;
                    if (!isFree)
                        rowname = ciObject.name;
                    new_row.setAttribute("name", ciObject.name);
                    new_row.setAttribute("id", ciObject.id);
                    new_row.setAttribute("ciKey", ciObject.ciKey);
                    if (table != null)
                        table.appendChild(new_row);

                    if (ciObject != null && (ciTemplate != null || isFree)) {
                        //Link Element
                        if ((propTable.data.data.onlynames == "DEFAULT" || propTable.data.data.onlynames == "ONLY_NAMES") && !isFree) {
                            let firstcell = document.createElement("TD");
                            firstcell.className = "input-free linkable tablenamecell " + propTable.data.data.attKey + "_namecell";
                            firstcell.className += " " + inputgroup;
                            firstcell.textContent = ciObject.name;
                            firstcell.setAttribute("item_id", ciObject.id);
                            firstcell.setAttribute("item_ciKey", ciObject.ciKey);
                            firstcell.addEventListener("click", this.linkCItem, false);
                            new_row.appendChild(firstcell);
                        }


                        if ((propTable.data.data.onlynames != "ONLY_NAMES")) {
                            if (propTable.data.data.hasactivation && !isFree) {
                                let activecell = document.createElement("TD");
                                activecell.className = "input-min centertext";
                                activecell.className += " " + inputgroup;
                                new_row.appendChild(activecell);

                                if (ciObject.usetype == "ACT" && !isFree) {
                                    let activeinput = document.createElement("INPUT");
                                    activeinput.className = "centertext";
                                    activeinput.className += " " + inputgroup;
                                    activeinput.type = "checkbox";
                                    activeinput.checked = ciObject.isactive;

                                    activeinput.addEventListener("change", (event) => this.useCIIcon(ciObject.id, ciObject.ciKey, activeinput.checked, false, true));

                                    activecell.appendChild(activeinput);
                                }

                                else if (ciObject.usetype == "CON" && !isFree) {
                                    let inputwrapper = document.createElement('a');
                                    let torecharge = false;

                                    if (ciObject.uses > 0 || ciObject.maxuses == 0) {
                                        inputwrapper.addEventListener("click", (event) => this.useCIIcon(ciObject.id, ciObject.ciKey, false, true));
                                    }

                                    else {
                                        if (ciObject.rechargable) {
                                            torecharge = true;
                                        }

                                        else {
                                            inputwrapper = document.createElement("DIV");
                                        }

                                    }

                                    inputwrapper.className = "consumable-button";
                                    inputwrapper.title = "Use item";
                                    activecell.appendChild(inputwrapper);

                                    let activeinput = document.createElement('i');
                                    if (ciObject.icon == "BOOK") {
                                        activeinput.className = "fas fa-book";
                                    }
                                    else if (ciObject.icon == "VIAL") {
                                        activeinput.className = "fas fa-vial";
                                    }
                                    else {
                                        activeinput.className = "fas fa-star";
                                    }

                                    if (torecharge) {
                                        activeinput.className = "fas fa-recycle";
                                        inputwrapper.addEventListener("click", (event) => this.rechargeCI(ciObject.id, ciObject.ciKey));
                                    }


                                    inputwrapper.appendChild(activeinput);
                                }

                            }

                            if (propTable.data.data.hasunits && !isFree) {
                                let numcell = document.createElement("TD");
                                numcell.className = "input-min centertext";
                                numcell.className += " " + inputgroup;
                                new_row.appendChild(numcell);

                                let numinput = document.createElement("INPUT");
                                numinput.className = "table-input table-num centertext";
                                numinput.className += " " + inputgroup;

                                let ciNumber = ciObject.number;

                                numinput.value = ciObject.number;
                                numinput.addEventListener("change", (event) => this.changeCINum(ciObject.id, ciObject.ciKey, event.target.value));

                                numcell.appendChild(numinput);
                            }

                            //REMOVE USES WORKSTREAM
                            if (propTable.data.data.hasuses && propTable.data.data.hasactivation && !isFree) {
                                let usescell = document.createElement("TD");
                                usescell.className = "tabblock-center";
                                usescell.className += " " + inputgroup;
                                new_row.appendChild(usescell);

                                let usevalue = document.createElement("INPUT");
                                usevalue.className = "table-num centertext";
                                usevalue.className += " " + inputgroup;

                                usescell.appendChild(usevalue);

                                if (!propTable.data.data.editable && !game.user.isGM) {
                                    //usevalue.setAttribute("readonly", "true");  
                                    usevalue.className += " inputGM";
                                }

                                if (ciObject.usetype == "CON") {

                                    let maxuses = ciObject.maxuses;

                                    // if (!isFree)
                                    //     maxuses = await auxMeth.autoParser(ciTemplate.data.data.maxuses, attributes, ciObject.attributes, false);
                                    // maxuses = parseInt(maxuses);

                                    let ciuses = ciObject.uses;

                                    // if (isNaN(ciuses))
                                    //     ciObject.uses = await auxMeth.autoParser(ciuses, attributes, ciObject.attributes, false);
                                    usevalue.value = parseInt(ciObject.uses);

                                    if (maxuses == 0) {
                                        usescell.className = " table-empty";
                                        usevalue.className = " table-empty-small";
                                        usevalue.value = "∞";
                                        usevalue.setAttribute("readonly", "true");
                                    }

                                    else {
                                        let separator = document.createElement("DIV");
                                        separator.className = "table-sepnum";
                                        separator.textContent = "/";

                                        let maxusevalue = document.createElement("DIV");

                                        let numberuses = ciObject.number;
                                        if (numberuses == 0)
                                            numberuses = 1;

                                        maxusevalue.className = "table-maxuse table-num centertext";
                                        // maxusevalue.textContent = "/ " + parseInt(numberuses * maxuses);
                                        maxusevalue.textContent = parseInt(ciObject.maxuses);
                                        usevalue.addEventListener("change", (event) => this.changeCIUses(ciObject.id, event.target.value));
                                        usescell.appendChild(separator);
                                        usescell.appendChild(maxusevalue);
                                    }



                                }

                                else {
                                    usescell.className = " table-empty";
                                    usevalue.className = " table-empty-small";
                                    usevalue.value = " ";
                                    usevalue.setAttribute("readonly", "true");
                                }

                            }

                            let isfirstFree = true;

                            for (let k = 0; k < groupprops.length; k++) {
                                let propRef = groupprops[k].id;
                                //let propObj = game.items.get(groupprops[k].id);
                                let propObj = await auxMeth.getTElement(groupprops[k].id, "property", groupprops[k].ikey);
                                let propdata = propObj.data.data;
                                let propKey = propObj.data.data.attKey;
                                let new_cell = document.createElement("TD");
                                let isconstant = groupprops[k].isconstant;

                                new_cell.className = "centertext ";
                                new_cell.className += propKey;
                                new_cell.className += " " + inputgroup;

                                if (((ciObject.attributes[propKey] != null && propdata.datatype != "label") || (propdata.datatype == "label")) && !propdata.ishidden) {
                                    if (propdata.datatype == "textarea") {

                                        let textiContainer = document.createElement('a');

                                        let textSymbol = document.createElement('i');
                                        textSymbol.className = "far fa-file-alt";
                                        textiContainer.appendChild(textSymbol);

                                        new_cell.appendChild(textiContainer);
                                        new_row.appendChild(new_cell);
                                        let isdisabled = false;
                                        if (isconstant)
                                            isdisabled = true;
                                        textiContainer.addEventListener("click", (event) => {
                                            if (isFree) {
                                                this.showFreeTextAreaDialog(ciObject.id, tableKey, propKey, isdisabled);
                                            }
                                            else {
                                                this.showTextAreaDialog(ciObject.id, propKey, isdisabled);
                                            }


                                        });
                                        //}

                                    }

                                    else if (propdata.datatype != "radio" && propdata.datatype != "table") {

                                        let constantvalue;
                                        let constantauto = false;
                                        if (propdata.datatype != "label")
                                            if (!isFree) {
                                                if (ciTemplate.data.data.attributes[propKey] == null) {
                                                    ui.notifications.warn("Inconsistent cItem. Please remove and readd cItem " + ciTemplate.data.name + " to Actor");
                                                    console.log(propKey + " fails from " + ciTemplate.data.name);
                                                }
                                                //REDUNDANT MUCH LIKELY - CONSTANTVALUE MIGHT NOT BE NEEDED
                                                constantvalue = ciTemplate.data.data.attributes[propKey].value;
                                                if (propdata.auto != "") {
                                                    constantauto = true;
                                                    constantvalue = propdata.auto;
                                                }
                                                let cvalueToString = constantvalue.toString();
                                                let nonumsum = /[#@]{|\%\[|\if\[|\?\[/g;
                                                let checknonumsum = cvalueToString.match(nonumsum);

                                                let justexpr = true;
                                                if (propdata.datatype == "simplenumeric")
                                                    justexpr = false;
                                                //REDUNDANT MUCH LIKELY
                                                if (checknonumsum) {
                                                    constantvalue = await constantvalue.replace(/\#{name}/g, ciObject.name);
                                                    constantvalue = await constantvalue.replace(/\#{active}/g, ciObject.isactive);
                                                    constantvalue = await constantvalue.replace(/\#{uses}/g, ciObject.uses);
                                                    constantvalue = await auxMeth.autoParser(constantvalue, this.actor.data.data.attributes, ciObject.attributes, justexpr, false, ciObject.number, ciObject.uses);
                                                }

                                            }

                                            else {
                                                constantvalue = propdata.defvalue;
                                            }

                                        //AUTO FOR CITEMS CHANGED!!!
                                        // if (propdata.auto != "")
                                        //     constantvalue = ciObject.attributes[propKey].value;

                                        if (isconstant) {
                                            let cContent = constantvalue;
                                            //console.log(propdata);
                                            if (propdata.datatype == "label") {
                                                if (propdata.labelformat == "D") {
                                                    cContent = "";
                                                    //console.log("adding roll");
                                                    let dieContainer = document.createElement("DIV");
                                                    dieContainer.setAttribute("title", propdata.tag);
                                                    dieContainer.className = "";
                                                    if (propdata.labelsize == "S") {
                                                        dieContainer.className += "label-small";
                                                    }

                                                    else if (propdata.labelsize == "T") {
                                                        dieContainer.className += "label-tiny";
                                                    }

                                                    else if (propdata.labelsize == "M") {
                                                        dieContainer.className += "label-med";
                                                    }

                                                    else if (propdata.labelsize == "L") {
                                                        dieContainer.className += "label-large";
                                                    }

                                                    let dieSymbol = document.createElement('i');
                                                    dieSymbol.className = "fas fa-dice-d20";
                                                    dieContainer.appendChild(dieSymbol);

                                                    new_cell.appendChild(dieContainer);
                                                }
                                                else {
                                                    cContent = propdata.tag;
                                                    new_cell.textContent = cContent;
                                                }

                                            }

                                            else {

                                                if (propdata.datatype === "checkbox") {
                                                    //console.log("checkbox");
                                                    let cellvalue = document.createElement("INPUT");
                                                    //cellvalue.className = "table-input centertext";


                                                    cellvalue = document.createElement("INPUT");
                                                    cellvalue.className = "input-small";
                                                    if (propdata.labelsize == "T")
                                                        cellvalue.className = "input-tiny";
                                                    cellvalue.setAttribute("type", "checkbox");
                                                    let setvalue = false;
                                                    //console.log(ciObject.attributes[propKey].value);
                                                    if (ciObject.attributes[propKey].value === true || ciObject.attributes[propKey].value === "true") {
                                                        setvalue = true;
                                                    }

                                                    if (ciObject.attributes[propKey].value === false || ciObject.attributes[propKey].value === "false") {
                                                        ciObject.attributes[propKey].value = false;
                                                    }

                                                    //console.log(setvalue);

                                                    cellvalue.checked = setvalue;
                                                    cellvalue.setAttribute("disabled", "disabled");
                                                    //console.log("lol");
                                                    new_cell.appendChild(cellvalue);

                                                }
                                                else {
                                                    new_cell.textContent = cContent;
                                                }



                                            }

                                            if (propdata.labelsize == "F") {
                                                new_cell.className += " label-free";
                                            }

                                            else if (propdata.labelsize == "S") {
                                                new_cell.className += " label-small";
                                            }

                                            else if (propdata.labelsize == "T") {
                                                new_cell.className += " label-tiny";
                                            }

                                            else if (propdata.labelsize == "M") {
                                                new_cell.className += " label-med";
                                            }

                                            else if (propdata.labelsize == "L") {
                                                new_cell.className += " label-large";
                                            }

                                            if (propdata.hasroll) {
                                                // Alondaar Drag events for macros.
                                                if (this.actor.isOwner) {
                                                    let handler = ev => this._onDragStart(ev, groupprops[k].id, propdata.attKey, ciObject.id, ciObject.ciKey, false, isFree, tableKey, null);
                                                    new_cell.setAttribute("draggable", true);
                                                    new_cell.addEventListener("dragstart", handler, false);
                                                }
                                                new_cell.className += " rollable";
                                                new_cell.addEventListener('click', this._onRollCheck.bind(this, groupprops[k].id, propdata.attKey, ciObject.id, ciObject.ciKey, false, isFree, tableKey, null), false);
                                            }
                                        }

                                        else {
                                            //console.log(propdata);
                                            let cellvalue = document.createElement("INPUT");
                                            //cellvalue.className = "table-input centertext";

                                            if (propdata.datatype === "checkbox") {

                                                cellvalue = document.createElement("INPUT");
                                                cellvalue.className = "input-small";
                                                if (propdata.labelsize == "T")
                                                    cellvalue.className = "input-tiny";
                                                cellvalue.className += " " + inputgroup;
                                                cellvalue.setAttribute("type", "checkbox");
                                                let setvalue = false;

                                                if (ciObject.attributes[propKey].value === true || ciObject.attributes[propKey].value === "true") {
                                                    setvalue = true;
                                                }

                                            }

                                            else if (propdata.datatype === "list") {

                                                cellvalue = document.createElement("SELECT");
                                                cellvalue.className = "table-input centertext";

                                                cellvalue.className += " " + inputgroup;

                                                if (propdata.inputsize == "F") {
                                                    cellvalue.className += "  table-free";
                                                }

                                                else if (propdata.inputsize == "S") {
                                                    cellvalue.className += " input-small";
                                                }

                                                else if (propdata.inputsize == "T") {
                                                    cellvalue.className += " input-tiny";
                                                }

                                                else if (propdata.inputsize == "M") {
                                                    cellvalue.className += " input-med";
                                                }

                                                else if (propdata.inputsize == "L") {
                                                    cellvalue.className += " input-large";
                                                }

                                                else {
                                                    cellvalue.className += "  table-free";
                                                }

                                                //IM ON IT
                                                var rawlist = propdata.listoptions;
                                                var listobjects = rawlist.split(',');
                                                //console.log(ciObject.attributes[propKey].value);
                                                for (let y = 0; y < listobjects.length; y++) {
                                                    let n_option = document.createElement("OPTION");
                                                    n_option.setAttribute("value", listobjects[y]);
                                                    n_option.textContent = listobjects[y];
                                                    cellvalue.appendChild(n_option);
                                                }

                                            }

                                            else if (propdata.datatype === "simpletext" || propdata.datatype === "label") {
                                                cellvalue = document.createElement("INPUT");
                                                cellvalue.setAttribute("type", "text");

                                                cellvalue.className = "table-input";
                                                cellvalue.className += " " + inputgroup;
                                                if (propdata.inputsize != null && (((k > 0) && !isFree) || isFree)) {
                                                    if (propdata.inputsize == "F") {
                                                        cellvalue.className += "  table-free";
                                                    }

                                                    else if (propdata.inputsize == "S") {
                                                        cellvalue.className += " input-small";
                                                    }

                                                    else if (propdata.inputsize == "T") {
                                                        cellvalue.className += " input-tiny";
                                                    }

                                                    else if (propdata.inputsize == "M") {
                                                        cellvalue.className += " input-med";
                                                    }

                                                    else if (propdata.inputsize == "L") {
                                                        cellvalue.className += " input-large";
                                                    }

                                                    else {
                                                        cellvalue.className += "  table-free";
                                                    }
                                                }

                                                if (propdata.datatype === "label") {
                                                    cellvalue.setAttribute("readonly", "true");
                                                }

                                            }

                                            else if (propdata.datatype === "simplenumeric") {
                                                cellvalue = document.createElement("INPUT");
                                                cellvalue.setAttribute("type", "text");
                                                cellvalue.className = "table-input centertext";
                                                cellvalue.className += " " + propTable.data.data.inputgroup;


                                                if (propdata.inputsize == "M") {
                                                    cellvalue.className += " input-med";
                                                }

                                                else if (propdata.inputsize == "T") {
                                                    cellvalue.className += " table-tiny";
                                                }

                                                else {
                                                    cellvalue.className += " table-small";
                                                }

                                            }

                                            if (!propdata.editable && !game.user.isGM)
                                                cellvalue.setAttribute("readonly", true);

                                            if (propdata.datatype != "checkbox") {

                                                if (ciObject.attributes[propKey].value == "" || constantauto) {
                                                    ciObject.attributes[propKey].value = constantvalue;
                                                }

                                                cellvalue.value = ciObject.attributes[propKey].value;

                                                // Set attribute value to the actual value for css selector functionality
                                                cellvalue.setAttribute("value", cellvalue.value);


                                                if (propdata.auto != "") {

                                                    cellvalue.setAttribute("readonly", true);
                                                }

                                            }

                                            else {
                                                let setvalue = false;
                                                //console.log(ciObject.attributes[propKey].value);
                                                if (ciObject.attributes[propKey].value === true || ciObject.attributes[propKey].value === "true") {
                                                    setvalue = true;
                                                }

                                                cellvalue.checked = setvalue;

                                            }

                                            cellvalue.className += " " + propdata.attKey;
                                            // if (isFree && isfirstFree) {
                                            //     if (propdata.inputsize == "F")
                                            //         cellvalue.className += " firstcol";
                                            //     isfirstFree = false;
                                            // }

                                            if (!isFree) {

                                                new_cell.addEventListener("change", (event) => this.saveNewCIAtt(ciObject.id, groupprops[k].id, propdata.attKey, event.target.value));
                                            }
                                            else {
                                                let ischeck = false;
                                                if (propdata.datatype == "checkbox") {
                                                    ischeck = true;
                                                }
                                                new_cell.addEventListener("change", (event) => this.saveNewFreeItem(ciObject.id, tableKey, propKey, event.target.value, ischeck, event.target.checked));
                                            }

                                            new_cell.appendChild(cellvalue);

                                        }


                                    }

                                    new_row.appendChild(new_cell);
                                }

                            }
                        }

                        //Add transfer column
                        if (propTable.data.data.transferrable) {
                            let transferCell = document.createElement("TD");
                            transferCell.className = "ci-transfercell";

                            let wraptransferCell = document.createElement('A');
                            wraptransferCell.className = "ci-transfer";
                            //wraptransferCell.className += " " + inputgroup;
                            wraptransferCell.title = "Grab Item";
                            wraptransferCell.draggable = "true";
                            transferCell.appendChild(wraptransferCell);
                            let tokenID;
                            if (this.token != null)
                                tokenID = this.token.id;
                            transferCell.addEventListener("dragstart", (event) => this.dragcItem(event, ciObject.id, ciObject.number, this.actor.id, tokenID));
                            new_row.appendChild(transferCell);
                        }


                        //Delete Element
                        if (propTable.data.data.editable || game.user.isGM) {
                            let deletecell = document.createElement("TD");
                            deletecell.className = "ci-delete";
                            //deletecell.className += " " + inputgroup;
                            let wrapdeleteCell = document.createElement('a');
                            wrapdeleteCell.className = "ci-delete";
                            //wrapdeleteCell.className += " " + inputgroup;
                            wrapdeleteCell.title = "Delete Item";
                            deletecell.appendChild(wrapdeleteCell);

                            let wrapdeleteBton = document.createElement('i');
                            wrapdeleteBton.className = "fas fa-times-circle";
                            if (!isFree) {
                                wrapdeleteBton.addEventListener('click', this.deleteCItem.bind(this, ciObject.id, false), false);
                            }
                            else {
                                wrapdeleteBton.addEventListener('click', this.deleteFreeItem.bind(this, ciObject.id, tableKey), false);
                            }

                            wrapdeleteCell.appendChild(wrapdeleteBton);

                            new_row.appendChild(deletecell);
                        }


                    }

                }

                if (groupcitems.length == 0) {
                    //Empty row;

                    let new_row = document.createElement("TR");
                    new_row.className = "empty-row";
                    new_row.className += " " + inputgroup;

                    let headercells = document.getElementsByTagName("table");

                    for (let x = 0; x < headercells.length; x++) {
                        if (headercells[x].classList.contains(propTable.data.data.attKey)) {
                            let columns = headercells[x].getElementsByTagName("th");
                            for (let w = 0; w < columns.length; w++) {
                                let empty_cell = document.createElement("TD");
                                new_row.appendChild(empty_cell);
                            }
                        }

                    }
                    if (table != null)
                        table.appendChild(new_row);

                }

                if (isFree && table != undefined) {
                    let new_row = document.createElement("TR");
                    new_row.className = "transparent-row";
                    if (inputgroup)
                        new_row.className += " " + inputgroup;
                    new_row.setAttribute("id", propTable.data.data.attKey + "_plus");

                    let new_pluscell = document.createElement("TD");
                    new_pluscell.className = "pluscell";

                    let plusContainer = document.createElement("A");
                    plusContainer.className = "mod-button addRow";
                    //plusContainer.addEventListener('click',this.addFreeRow.bind(propTable.data.data.attKey),false);
                    plusContainer.addEventListener("click", (event) => this.addFreeRow(propTable.data.data.attKey));

                    let plusButton = document.createElement("I");
                    plusButton.className = "fas fa-plus-circle fa-1x";

                    plusContainer.appendChild(plusButton);
                    new_pluscell.appendChild(plusContainer);
                    new_row.appendChild(new_pluscell);
                    table.appendChild(new_row);
                }

                if (propTable.data.data.hastotals && table != null) {
                    let new_row = document.createElement("TR");
                    new_row.className = "totals-row";

                    let headercells = document.getElementsByTagName("table");
                    let counter = groupcitems.length;

                    let lastRow = table.children[table.children.length - 1];
                    let cellTotal = lastRow.children.length;
                    let cellcounter = 0;
                    let totalin = false;

                    if (propTable.data.data.onlynames != "ONLY_NAMES" && lastRow.children[cellcounter] != null) {

                        if (propTable.data.data.onlynames != "NO_NAMES" && !isFree) {
                            let empty_cell = document.createElement("TD");
                            empty_cell.textContent = "TOTAL";
                            empty_cell.className = lastRow.children[cellcounter].className;
                            empty_cell.className += " boldtext";
                            empty_cell.className = empty_cell.className.replace("linkable", "");
                            new_row.appendChild(empty_cell);
                            cellcounter += 1;
                            totalin = true;
                        }

                        if (propTable.data.data.hasactivation) {
                            let empty_cell = document.createElement("TD");
                            empty_cell.className = lastRow.children[cellcounter] != null ? lastRow.children[cellcounter].className : "";
                            new_row.appendChild(empty_cell);
                            cellcounter += 1;

                        }

                        if (propTable.data.data.hasunits) {
                            let empty_cell = document.createElement("TD");
                            empty_cell.className = lastRow.children[cellcounter] != null ? lastRow.children[cellcounter].className : "";
                            new_row.appendChild(empty_cell);
                            cellcounter += 1;
                        }

                        if (propTable.data.data.hasuses) {
                            let empty_cell = document.createElement("TD");
                            empty_cell.className = lastRow.children[cellcounter] != null ? lastRow.children[cellcounter].className : "";
                            new_row.appendChild(empty_cell);
                            cellcounter += 1;
                        }

                        for (let k = 0; k < groupprops.length; k++) {

                            let propRef = groupprops[k].id;
                            //let propObj = game.items.get(groupprops[k].id);
                            let propObj = await auxMeth.getTElement(groupprops[k].id, "property", groupprops[k].ikey);
                            let propdata = propObj.data.data;
                            let propKey = propObj.data.data.attKey;

                            if (!propdata.ishidden) {
                                if (propdata.totalize) {
                                    let total_cell = document.createElement("TD");
                                    let newtotal;
                                    if (myactor.attributes[tableKey] != null) {
                                        let totalvalue = myactor.attributes[tableKey].totals[propKey];
                                        if (totalvalue)
                                            newtotal = totalvalue.total;
                                    }

                                    if (newtotal == null || isNaN(newtotal))
                                        newtotal = 0;
                                    total_cell.className = lastRow.children[cellcounter] != null ? lastRow.children[cellcounter].className : "";
                                    total_cell.className += " centertext";
                                    total_cell.textContent = newtotal;
                                    new_row.appendChild(total_cell);
                                    cellcounter += 1;
                                }
                                else {
                                    let empty_cell = document.createElement("TD");
                                    empty_cell.className = lastRow.children[cellcounter] != null ? lastRow.children[cellcounter].className : "";
                                    new_row.appendChild(empty_cell);
                                    cellcounter += 1;

                                    if (!totalin) {
                                        empty_cell.textContent = "TOTAL";
                                        empty_cell.className += " boldtext";
                                        totalin = true;
                                    }

                                }
                            }


                        }

                        //For transfer cell
                        if (propTable.data.data.transferrable) {
                            let empty_cell = document.createElement("TD");
                            empty_cell.className = lastRow.children[cellcounter] != null ? lastRow.children[cellcounter].className : "";
                            new_row.appendChild(empty_cell);
                            cellcounter += 1;
                        }

                        //Extra for deleted cell
                        if (propTable.data.data.editable || game.user.isGM) {
                            let empty_cell = document.createElement("TD");
                            empty_cell.className = lastRow.children[cellcounter] != null ? lastRow.children[cellcounter].className : "";
                            new_row.appendChild(empty_cell);
                            cellcounter += 1;
                        }


                        if (table != null)
                            table.appendChild(new_row);
                    }


                }

            }

        }

        if (forceUpdate)
            await this.actor.update({ "data.citems": citems });
        //console.log("refreshcItem finished");
    }

    async dragcItem(ev, iD, number, originiD, tokenID = null) {
        ev.stopPropagation();

        let ciTemTemplate = game.items.get(iD);

        let dragData = { type: ciTemTemplate, id: iD, ownerID: originiD, tokenID: tokenID };
        ev.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        this._dragType = dragData.type;
    }

    async showTransferDialog(id, ownerID, tokenID) {
        let actorOwner;
        if (tokenID == null) {
            actorOwner = game.actors.get(ownerID);
        }
        else {
            let myToken = canvas.tokens.get(tokenID);
            actorOwner = myToken.actor;
        }
        let ownercItems = duplicate(actorOwner.data.data.citems);
        let cItem = ownercItems.find(y => y.id == id);
        let cItemOrig = await auxMeth.getcItem(id);

        let d = new Dialog({
            title: "Transfer from " + actorOwner.name,
            content: `	<div class="transfer-itemmname">
<label class="label-citemtransfer">` + cItem.name + ` max: ` + cItem.number + `</label>
</div>
<div class="transfer-itemnumber">
<input class="input-transfer" type="number" id="transfer-number" value="1">
</div>
<div class="transfer-takeall">
<label class="label-transfer">Take All</label>
<input class="check-transfer" type="checkbox" id="transfer-all">
</div>`,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Save",
                    callback: async (html) => {
                        let numElem = html[0].getElementsByClassName("input-transfer");
                        numElem = numElem[0].value;
                        let transferAll = html[0].getElementsByClassName("check-transfer");
                        transferAll = transferAll[0].checked;
                        let mynum = 1;

                        let regE = /^\d+$/g;
                        let isnum = numElem.match(regE);
                        if (isnum)
                            mynum = parseInt(numElem);


                        if (transferAll)
                            mynum = parseInt(cItem.number);

                        if (mynum > cItem.number)
                            mynum = cItem.number;

                        cItem.number -= mynum;

                        //REQUEST IF NOT GM
                        if (!game.user.isGM) {
                            await this.actor.requestTransferToGM(this.actor.id, ownerID, id, mynum);
                        }

                        else {
                            await actorOwner.update({ "data.citems": ownercItems })
                        }


                        let newcitems = duplicate(this.actor.data.data.citems);
                        let citemowned = newcitems.find(y => y.id == id);

                        if (!citemowned) {
                            newcitems = await this.actor.addcItem(cItemOrig, null, null, mynum);
                        }
                        else {
                            citemowned.number += mynum;
                        }

                        await this.updateSubItems(false, newcitems);



                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => { console.log("canceling text edition"); }
                }
            },
            default: "one",
            close: () => {
                console.log("Text edition dialog was shown to player.");
            }
        });

        d.render(true);
    }

    showTextAreaDialog(citemID, citemAttribute, disabled) {
        let citem = this.actor.data.data.citems.find(y => y.id == citemID);
        let ciProp = game.items.find(y => y.data.data.attKey == citemAttribute);
        if (ciProp == null)
            return;
        let isdisabled = ""
        if (disabled)
            isdisabled = "disabled";


        let content = `
            <textarea id="dialog-textarea-${citemID}-${citemAttribute}" class="textdialog texteditor-large ${ciProp.data.data.inputgroup}" ${isdisabled}>${citem.attributes[citemAttribute].value}</textarea>
            `;
        content += `
            <div class="new-row">
                <div class="lockcontent">
                    <a class="dialoglock-${citemID}-${citemAttribute} lock centertext" title="Edit"><i class="fas fa-lock fa-2x"></i></a>
                    <a class="dialoglock-${citemID}-${citemAttribute} lockopen centertext" title="Edit"><i class="fas fa-lock-open fa-2x"></i></a>
                </div>
            </div>
            `;
        let d = new Dialog({
            title: citem.name + "-" + citemAttribute,
            content: content,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Save",
                    callback: async (html) => {
                        if (!disabled) {
                            citem.attributes[citemAttribute].value = d.data.dialogValue;
                            await this.actor.update({ "data.citems": this.actor.data.data.citems }, { diff: false });
                        }

                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => { console.log("canceling text edition"); }
                }
            },
            default: "one",
            close: () => {
                console.log("Text edition dialog was shown to player.");
            },
            citemText: true,
            dialogValue: citem.attributes[citemAttribute].value
        });

        d.render(true);
    }

    showFreeTextAreaDialog(freeId, freeTableKey, freePropKey, disabled) {

        let freeitem = this.actor.data.data.attributes[freeTableKey].tableitems.find(y => y.id == freeId);
        let ciProp = game.items.find(y => y.data.data.attKey == freePropKey);
        if (ciProp == null)
            return;
        let isdisabled = ""
        if (disabled)
            isdisabled = "disabled";


        let content = `
            <textarea id="dialog-textarea-${freeId}-${freePropKey}" class="textdialog texteditor-large" ${isdisabled}>${freeitem.attributes[freePropKey].value}</textarea>
            `
        if (game.user.isGM || ciProp.data.data.editable)
            content += `
            <div class="new-row">
                <div class="lockcontent">
                    <a class="dialoglock-${freeId}-${freePropKey} lock centertext" title="Edit"><i class="fas fa-lock fa-2x"></i></a>
                    <a class="dialoglock-${freeId}-${freePropKey} lockopen centertext" title="Edit"><i class="fas fa-lock-open fa-2x"></i></a>
                </div>
            </div>
            `

        //'<textarea id="dialog-textarea-' + freeId + "-" + freePropKey + '" class="texteditor-large ' + ciProp.data.data.inputgroup + '"' + isdisabled + '>' + freeitem.attributes[freePropKey].value + '</textarea>'

        let d = new Dialog({
            title: "Item Num " + freeId,
            content: content,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Save",
                    callback: async (html) => {
                        if (!disabled) {
                            let key = "data.attributes." + freeTableKey + ".tableitems[" + freeId + "].attributes." + freePropKey + ".value";
                            let freeattributes = duplicate(this.actor.data.data.attributes[freeTableKey].tableitems);
                            let freeTarget = freeattributes.find(y => y.id == freeId)
                            freeTarget.attributes[freePropKey].value = d.data.dialogValue;
                            await this.actor.update({ [`data.attributes.${freeTableKey}.tableitems`]: freeattributes });
                        }

                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => { console.log("canceling text edition"); }
                }
            },
            default: "one",
            close: () => {
                console.log("Text edition dialog was shown to player.");
            },
            citemText: true,
            dialogValue: freeitem.attributes[freePropKey].value
        });

        d.render(true);
    }

    async saveNewCIAtt(ciId, propId, propKey, value) {
        //console.log("changing citem");
        let cItemsID = duplicate(this.actor.data.data.citems);
        let citem = cItemsID.find(y => y.id == ciId);
        let propObj = await auxMeth.getTElement(propId, "property", propKey);
        //console.log(value);

        if (propObj.data.data.datatype != "checkbox") {
            if (propObj.data.data.automax != "") {
                let ciMax = await auxMeth.autoParser(propObj.data.data.automax, this.actor.data.data.attributes, citem.attributes, false);
                if (value > ciMax) {
                    value = ciMax;
                }
            }
            citem.attributes[propKey].value = value;
        }

        else {

            let setvalue = true;
            if (citem.attributes[propObj.data.data.attKey].value) {
                setvalue = false;
            }
            citem.attributes[propObj.data.data.attKey].value = setvalue;

            if (propObj.data.data.checkgroup != null)
                if (propObj.data.data.checkgroup != "") {
                    let checkgroup = propObj.data.data.checkgroup;
                    let unparsedchkgroupArray = checkgroup.split(";");
                    let chkgroupArray = [];
                    for (let j = 0; j < unparsedchkgroupArray.length; j++) {
                        let parsedgrpCheck = await auxMeth.autoParser(unparsedchkgroupArray[j], this.actor.data.data.attributes, citem.attributes, true);
                        if (parsedgrpCheck == " ")
                            parsedgrpCheck = "";
                        chkgroupArray.push(parsedgrpCheck);
                    }

                    if (setvalue) {
                        for (let x = 0; x < cItemsID.length; x++) {
                            let anycitem = cItemsID[x];
                            for (const [propKey, propValues] of Object.entries(anycitem.attributes)) {

                                if (anycitem.id != ciId) {
                                    let propKeyObj = game.items.find(y => y.data.data.attKey == propKey);
                                    if (propKeyObj != null && propKey != "name") {

                                        if (propKeyObj.data.data.datatype == "checkbox" && propKeyObj.data.data.checkgroup != "") {
                                            let pointerchkgroupArray = propKeyObj.data.data.checkgroup.split(";");
                                            for (let z = 0; z < pointerchkgroupArray.length; z++) {
                                                let checkKey = pointerchkgroupArray[z];
                                                let parsedKey = await auxMeth.autoParser(checkKey, this.actor.data.data.attributes, anycitem.attributes, true);
                                                if (chkgroupArray.includes(parsedKey))
                                                    propValues.value = false;
                                            }

                                        }

                                    }


                                }


                            }

                        }




                    }


                }
        }

        if (!this.actor.isToken) {
            this.actor.update({ "data.citems": cItemsID });
        }
        else {
            let tokenId = this.id.split("-")[2];
            let mytoken = canvas.tokens.get(tokenId);
            await mytoken.document.update({ "actorData.data.citems": cItemsID });
        }


    }

    async saveNewFreeItem(id, tableKey, fpropKey, value, ischeck = false, checked = null) {
        let myfreeItems = await duplicate(this.actor.data.data.attributes[tableKey].tableitems);
        let myItem = myfreeItems.find(y => y.id == id);

        if (ischeck) {
            value = checked;
            let propObj = game.items.find(y => y.data.data.attKey == fpropKey);
            if (propObj.data.data.checkgroup != null)
                if (propObj.data.data.checkgroup != "") {
                    let checkgroup = propObj.data.data.checkgroup;
                    let chkgroupArray = checkgroup.split(";");
                    if (value) {
                        for (const [propKey, propValues] of Object.entries(myItem.attributes)) {

                            if (propKey != propObj.data.data.attKey) {
                                let propKeyObj = game.items.find(y => y.data.data.attKey == propKey);
                                if (propKeyObj != null) {
                                    if (propKeyObj != "" && propKeyObj.data.data.datatype == "checkbox") {
                                        let pointerchkgroupArray = propKeyObj.data.data.checkgroup.split(";");
                                        for (let z = 0; z < chkgroupArray.length; z++) {
                                            let checkKey = chkgroupArray[z];
                                            let parsedKey = await auxMeth.autoParser(checkKey, this.actor.data.data.attributes, myItem.attributes, true);
                                            if (pointerchkgroupArray.includes(parsedKey))
                                                propValues.value = false;
                                        }
                                    }

                                }


                            }


                        }



                    }


                }
        }


        myItem.attributes[fpropKey].value = value;
        await this.actor.update({ [`data.attributes.${tableKey}.tableitems`]: myfreeItems });
    }

    async linkCItem(evt) {
        //console.log();
        let item = await auxMeth.getcItem(evt.currentTarget.getAttribute("item_id"), evt.currentTarget.getAttribute("item_ciKey"));
        item.sheet.render(true);
    }

    async useCIIcon(itemId, ciKey, value, iscon = false, isactivation = false) {
        //const citemObj = game.items.get(itemId).data.data;
        let citemObjfinder = await auxMeth.getcItem(itemId, ciKey);
        const citemObj = citemObjfinder.data.data;


        if (citemObj.roll != "" && (!isactivation || (isactivation && value))) {
            let cItemData = {};
            cItemData.id = itemId;
            cItemData.value = value;
            cItemData.iscon = iscon;
            this._onRollCheck(null, null, itemId, ciKey, true, null, null, cItemData);
        }

        else {
            this.activateCI(itemId, value, iscon, null, isactivation);
        }
    }

    async activateCI(itemId, value, iscon = false, roll = null, isactivation = false) {
        const actorData = duplicate(this.actor.data.data);
        const citems = actorData.citems;
        const citem = citems.find(y => y.id == itemId);
        const attributes = this.actor.data.data.attributes;

        let citemObjfinder = await auxMeth.getcItem(itemId, citem.ciKey);
        const citemObj = citemObjfinder.data.data;
        let objectUses = duplicate(citem.uses);

        if (isactivation) {
            citem.isactive = value;
        }

        else {
            citem.isactive = true;
        }


        if (citem.isactive)
            citem.isreset = false;

        //console.log(citem.maxuses);
        if (iscon && citem.maxuses > 0) {
            objectUses -= 1;
            let thismaxuses = parseInt(citem.maxuses);
            if (citem.uses > 0 && citemObj.usetype == "CON") {
                let actualItems = Math.ceil(parseInt(objectUses) / (thismaxuses / citem.number));

                if (!citemObj.rechargable) {
                    citem.number = actualItems;
                    if (objectUses == 0)
                        citem.number = 0;
                }


            }

            citem.uses -= 1;

            if (!citemObj.rechargable)
                citem.maxuses = parseInt(citemObj.maxuses) * parseInt(citem.number);

        }

        this.actor.data.flags.haschanged = true;

        if (roll != null) {
            citem.attributes._lastroll = roll;
        }

        await this.actor.update({ "data.citems": citems });
    }

    async rechargeCI(itemId, ciKey) {
        const citems = duplicate(this.actor.data.data.citems);
        const citem = citems.find(y => y.id == itemId);
        //const citemObj = game.items.get(itemId).data.data;
        let citemObjfinder = await auxMeth.getcItem(itemId, ciKey);
        const citemObj = citemObjfinder.data.data;

        let totalnumber = citem.number;
        if (totalnumber == 0)
            totalnumber = 1;

        citem.uses = citem.maxuses;
        await this.actor.update({ "data.citems": citems });
    }

    async deleteCItem(itemID, cascading = false) {
        //get Item
        //console.log("deleting");

        let subitems = await this.actor.deletecItem(itemID, cascading);

        //console.log(subitems);
        if (this.actor.isToken) {

            let myToken = canvas.tokens.get(this.actor.token.id);

            await myToken.actor.update({ "data": subitems.data });
            //await myToken.update({"data.citems": this.actor.data.data.citems});
        }

        else {
            await this.actor.update({ "data": subitems.data });
            //await this.actor.update(this.actor.data);
        }


        //await this.actor.update(this.actor.data);

    }

    async addFreeRow(tableKey) {

        let myfreeItems = await duplicate(this.actor.data.data.attributes[tableKey].tableitems);
        let lastIndex = -1;
        if (myfreeItems.length)
            lastIndex = myfreeItems[myfreeItems.length - 1].id;

        let newItem = {};
        newItem.attributes = {};
        newItem.icon = "star";
        newItem.id = lastIndex + 1;

        //Get element values
        //let tableTemplate = game.items.find(y => y.data.type == "property" && y.data.data.datatype == "table" && y.data.data.attKey == tableKey);
        let tableTemplate = await auxMeth.getTElement(null, "property", tableKey);

        if (tableTemplate != null) {
            let tableGroup = tableTemplate.data.data.group.id;
            if (tableGroup != null) {
                let groupTemplate = await auxMeth.getTElement(tableTemplate.data.data.group.id, "group", tableTemplate.data.data.group.ikey);
                let groupProps = groupTemplate.data.data.properties;
                if (groupProps.length > 0) {
                    for (let i = 0; i < groupProps.length; i++) {
                        //let propTemplate = game.items.get(groupProps[i].id);
                        let propTemplate = await auxMeth.getTElement(groupProps[i].id, "property", groupProps[i].ikey);
                        newItem.attributes[propTemplate.data.data.attKey] = {};
                        newItem.attributes[propTemplate.data.data.attKey].value = propTemplate.data.data.defvalue;
                    }
                }
            }

        }

        myfreeItems.push(newItem);
        await this.actor.update({ [`data.attributes.${tableKey}.tableitems`]: myfreeItems });


    }

    async deleteFreeItem(id, tableKey) {
        let myfreeItems = await duplicate(this.actor.data.data.attributes[tableKey].tableitems);
        myfreeItems.splice(myfreeItems.indexOf(myfreeItems.find(y => y.id == id)), 1);
        await this.actor.update({ [`data.attributes.${tableKey}.tableitems`]: myfreeItems });
    }

    handleGMinputs(basehtml) {
        //SET TABLES INFO
        const gminputs = basehtml.find(".inputGM");
        for (let i = 0; i < gminputs.length; i++) {
            let input = gminputs[i];

            if (!game.user.isGM) {
                input.setAttribute("readonly", true);

                if (input.type == "select-one")
                    input.className += " list-noneditable";
            }
        }
    }

    async changeCINum(itemID, ciKey, value) {

        let citemIDs = duplicate(this.actor.data.data.citems);
        let citem = this.actor.data.data.citems.find(y => y.id == itemID);
        let citemNew = citemIDs.find(y => y.id == itemID);

        if (value == 0) {
            value = 1;
        }

        if (value < 0 || isNaN(value)) {
            value = citem.number;
        }



        citemNew.number = value;

        //let cItemTemp = game.items.get(itemID);
        // let cItemTemp = await auxMeth.getcItem(itemID, ciKey);
        // let tempmaxuses = await auxMeth.autoParser(cItemTemp.data.data.maxuses, this.actor.data.data.attributes, cItemTemp.data.data.attributes, false);

        // citemNew.maxuses = parseInt(value * tempmaxuses);
        //citemNew.uses = citemNew.maxuses;

        //await this.scrollbarSet(false);
        //this.actor.update(this.actor.data);

        await this.actor.update({ "data.citems": citemIDs });

    }

    async changeCIUses(itemID, value) {
        let citemIDs = duplicate(this.actor.data.data.citems);
        let citem = citemIDs.find(y => y.id == itemID);
        let myindex = citemIDs.indexOf(citem);

        citem.uses = value;
        // console.log("changing");
        // if (parseInt(citem.uses) >= parseInt(citem.maxuses)) {
        //     citem.maxuses = parseInt(citem.uses);
        // }

        //await this.scrollbarSet(false);
        //await this.actor.update(this.actor.data);
        await this.actor.update({ "data.citems": citemIDs });

    }


    async refreshBadge(basehtml) {
        const html = await basehtml.find(".badge-click");
        for (let i = 0; i < html.length; i++) {
            let badgeNode = html[i];
            let propKey = badgeNode.getAttribute("attKey");
            const att = this.actor.data.data.attributes[propKey];
            if (att != null)
                badgeNode.textContent = att.value;
        }
    }

    // call before super._render
    async _saveScrollStates() {

        //console.log("getting scroll");
        let scrollStates = [];

        let html = this._element;

        if (html == null)
            return;

        let lists = html.find(".scrollable");

        for (let list of lists) {
            scrollStates.push($(list).scrollTop());
        }

        return scrollStates;
    }

    // call after super._render
    async _setScrollStates() {
        let html = this._element;

        if (html == null)
            return;

        if (this.scrollStates) {

            let lists = html.find(".scrollable");

            for (let i = 0; i < lists.length; i++) {
                let newEl = $(lists[i]);
                let newScroll = parseInt(this.scrollStates[i]);
                newEl[0].scrollTop = newScroll;
            }
        }
    }

    async _render(force = false, options = {}) {
        this.scrollStates = await this._saveScrollStates();

        await super._render(force, options);

        //await new Promise(async ()=>{ await this._setScrollStates() },0);


        // await this._setScrollStates();
    }

    async modifyLists(basehtml) {
        const attKeys = Object.keys(this.actor.data.data.attributes)

        attKeys.forEach((key, index) => {

            let aProp = this.actor.data.data.attributes[key];

            if (aProp.listedit != null) {
                let mytag = "." + key;
                let myhtmllist = basehtml.find(mytag);

                if (aProp.listedit.add != null)
                    for (let i = 0; i < aProp.listedit.add.length; i++) {

                        let addoption = aProp.listedit.add[i];

                        var option = document.createElement("option");
                        option.value = option.text = addoption;

                        if ($(myhtmllist[0]).has('option[value="' & addoption & '"]'))
                            myhtmllist[0].add(option);


                    }

                if (aProp.listedit.remove != null)
                    for (let j = 0; j < aProp.listedit.remove.length; j++) {
                        let removeoption = aProp.listedit.remove[j];

                        for (var n = 0; n < myhtmllist[0].options.length; n++) {
                            if (myhtmllist[0].options[n].value === removeoption) {
                                myhtmllist[0].remove(n);
                                break;
                            }
                        }



                    }
                myhtmllist[0].value = aProp.value;
            }

        });

    }

    async populateRadioInputs(basehtml) {
        //console.log("reinput");
        const html = await basehtml.find(".radio-input");
        for (let i = 0; i < html.length; i++) {

            let radioNode = html[i];

            const attributes = this.actor.data.data.attributes;
            let value = 0;
            let propId = radioNode.getAttribute("attId");
            let propRawName = radioNode.getAttribute("name");
            propRawName = propRawName.replace("data.attributes.", '');
            propRawName = propRawName.replace(".value", '');
            //let property = game.items.get(propId);
            let property = await auxMeth.getTElement(propId, "property", propRawName);

            if (property != null) {

                let attKey = property.data.data.attKey;
                let radiotype = property.data.data.radiotype;

                if (attributes[attKey] != null) {
                    let maxRadios = attributes[attKey].max;
                    value = attributes[attKey].value;

                    radioNode.innerHTML = '';
                    //console.log(value);
                    if (maxRadios > 0) {
                        for (let j = 0; j <= parseInt(maxRadios); j++) {
                            let radiocontainer = document.createElement('a');
                            let clickValue = j;
                            radiocontainer.setAttribute("clickValue", clickValue);
                            radiocontainer.className = "radio-element";
                            //radiocontainer.style = "font-size:14px;";
                            //if (radiotype == "S")
                            //radiocontainer.style = "font-size:16px;";


                            let radiobutton = document.createElement('i');

                            if (j == 0) {
                                radiobutton.className = "far fa-times-circle";
                            }

                            else if (value >= clickValue) {
                                radiobutton.className = "fas fa-circle";
                                if (radiotype == "S") {

                                    radiobutton.className = "fas fa-square";
                                }


                            }
                            else {
                                radiobutton.className = "far fa-circle";
                                if (radiotype == "S") {
                                    radiobutton.className = "far fa-square";
                                }


                            }

                            radiocontainer.appendChild(radiobutton);
                            if (property.data.data.editable || game.user.isGM)
                                radiobutton.addEventListener("click", (event) => this.clickRadioInput(clickValue, propId, event.target));

                            await radioNode.appendChild(radiocontainer);

                        }

                    }
                }

            }

        }
    }

    //Set external images
    async setImages(basehtml) {
        const html = await basehtml.find(".isimg");
        for (let i = 0; i < html.length; i++) {
            let imgNode = html[i];
            let imgPath = imgNode.getAttribute("img");

            let imgEl = document.createElement('img');
            imgEl.className = "isimg";
            imgEl.src = imgPath;

            imgNode.appendChild(imgEl);
        }
    }

    async addHeaderButtons(basehtml) {

    }

    async customCallOverride(basehtml) {

    }

    //Set external images
    async setCheckboxImages(basehtml) {
        const html = await basehtml.find(".customcheck");
        for (let i = 0; i < html.length; i++) {
            let checkNode = html[i];
            let onPath = checkNode.getAttribute("onPath");
            let offPath = checkNode.getAttribute("offPath");
            let propKey = checkNode.getAttribute("attKey");

            if (this.actor.data.data.attributes[propKey] != null) {
                let myvalue = this.actor.data.data.attributes[propKey].value;

                let selected = offPath;
                if (myvalue)
                    selected = onPath;
                checkNode.style.backgroundImage = "url('" + selected + "')";
            }

        }
    }

    async clickRadioInput(clickValue, propId, target) {
        //let property = game.items.get(propId);
        let property = await auxMeth.getTElement(propId);
        let radiotype = property.data.data.radiotype;
        let attKey = property.data.data.attKey;
        const attributes = this.actor.data.data.attributes;
        //attributes[attKey].value =  clickValue;
        await this.actor.update({ [`data.attributes.${attKey}.value`]: clickValue });
        //await this.actor.actorUpdater();
        //await this.actor.update({"data.attributes":attributes}, {diff: false});
        if (clickValue > 0) {
            target.className = "fas fa-circle";
            //target.style = "font-size:14px;";
            if (radiotype == "S") {
                //target.style = "font-size:16px;";
                target.className = "fas fa-square";
            }
        }

        //await this.scrollbarSet();

    }

    async displaceTabs2(next = null, newhtml) {
        //console.log("displacing");
        let tabs;
        let nonbio = false;
        let actorsheet = this;

        //console.log(newhtml);

        let fakelastTab = $(newhtml).find('#tab-last');
        fakelastTab.remove();

        let biotab = $(newhtml).find('#tab-0');
        if (!this.actor.data.data.biovisible) {
            nonbio = true;

            if (biotab.length > 0)
                if (biotab[0].classList.contains("active"))
                    biotab[0].nextElementSibling.click();
            biotab.remove();
        }

        else {
            biotab[0].classList.add("player-tab");
        }

        if (game.user.isGM) {
            tabs = $(newhtml).find(".tab-button");
        }
        else {
            tabs = $(newhtml).find(".player-tab");
        }

        let activetab = $(newhtml).find(".tab-button.active");

        let foundfirst = false;
        let passedfirst = false;
        let maxtabs = this.actor.data.data.visitabs - 1;
        let totaltabs = tabs.length;
        //console.log(tabs);

        let minTab = totaltabs - (maxtabs + 1);
        if (minTab < 0)
            minTab = 0;
        if (activetab.index() > minTab) {
            tabs[minTab].classList.add("visible-tab");
        }


        let tabcounter = 0;
        let firsthidden = false;
        let firstpassed = false;
        let displaying = false;
        let displaycounter = 0;
        let fvble = actorsheet._tabs[0].active;
        if (actorsheet._tabs[0].firstvisible != null) {
            let currentOn;
            currentOn = tabs.find(y => y.dataset?.tab == actorsheet._tabs[0].firstvisible);
            tabs.each(async function (i, tab) {
                if (tab.dataset.tab == actorsheet._tabs[0].firstvisible) {
                    currentOn = tab;
                }
            })

            if (currentOn != null)
                fvble = actorsheet._tabs[0].firstvisible;

            if (nonbio && actorsheet._tabs[0].firstvisible == "description")
                fvble = actorsheet._tabs[0].active;
        }


        tabs.each(async function (i, tab) {

            if (tab.dataset.tab == fvble && !foundfirst) {
                let nexttab = tabs[i + 1];
                let prevtab = tabs[i - 1];
                let lasttab = tabs[i + maxtabs + 1];
                if (next == "prev") {
                    if (prevtab != null)
                        fvble = prevtab.dataset.tab;
                }
                else if (next == "next") {
                    if (nexttab != null && lasttab != null)
                        fvble = nexttab.dataset.tab;
                }
                actorsheet._tabs[0].firstvisible = fvble;
                foundfirst = true;
            }
        })

        tabs.each(async function (i, tab) {

            if (displaying) {
                if (displaycounter <= maxtabs) {
                    if (!tab.classList.contains("visible-tab"))
                        tab.classList.add("visible-tab");
                    tab.classList.remove("hidden-tab");
                    displaycounter += 1;
                }
                else {
                    displaying = false;
                    if (!tab.classList.contains("hidden-tab"))
                        tab.classList.add("hidden-tab");
                    tab.classList.remove("visible-tab");
                }

            }
            else {
                if (tab.dataset.tab == fvble) {
                    if (!tab.classList.contains("visible-tab"))
                        tab.classList.add("visible-tab");
                    tab.classList.remove("hidden-tab");
                    displaying = true;
                    displaycounter += 1;
                }
                else {
                    if (!tab.classList.contains("hidden-tab"))
                        tab.classList.add("hidden-tab");
                    tab.classList.remove("visible-tab");
                }

            }


        })

    }

    async setSheetStyle() {
        //console.log(this.actor.data.data.gtemplate);

        let _mytemplate = await game.actors.find(y => y.data.data.istemplate && y.data.data.gtemplate == this.actor.data.data.gtemplate);
        if (_mytemplate == null)
            return;
        let basehtml = this.element;

        if (this.actor.data.data.gtemplate == "Default")
            return;

        let bground = await basehtml.find(".window-content");
        let sheader = await basehtml.find(".sheet-header");
        let wheader = await basehtml.find(".window-header");
        let stabs = await basehtml.find(".atabs");

        //Set Height
        if (_mytemplate.data.data.setheight != "" && !_mytemplate.data.data.resizable) {
            basehtml[0].style.height = _mytemplate.data.data.setheight + "px";
            let tabhandler = await basehtml.find(".tab");
            for (let j = 0; j < tabhandler.length; j++) {
                let mytab = tabhandler[j];

                let totalheight = parseInt(_mytemplate.data.data.setheight) - parseInt(wheader[0].clientHeight) - parseInt(sheader[0].clientHeight) - parseInt(stabs[0].clientHeight) - 15;
                mytab.style.height = totalheight + "px";
            }
        }


        //Set Background
        if (_mytemplate.data.data.backg != "") {
            bground[0].style.background = "url(" + _mytemplate.data.data.backg + ") repeat";
        }


        if (!_mytemplate.data.data.resizable) {
            let sizehandler = await basehtml.find(".window-resizable-handle");
            sizehandler[0].style.visibility = "hidden";
        }

        else {
            let tabhandler = await basehtml.find(".tab");
            for (let j = 0; j < tabhandler.length; j++) {
                let mytab = tabhandler[j];

                let totalheight = parseInt(basehtml[0].style.height) - parseInt(wheader[0].clientHeight) - parseInt(sheader[0].clientHeight) - parseInt(stabs[0].clientHeight) - 15;
                mytab.style.height = totalheight + "px";
            }
        }
    }

    async checkAttributes(formData) {
        for (let att in formData) {
            if (att.includes("data.attributes.")) {
                let thisatt = formData[att];
                if (Array.isArray(formData[att]))
                    formData[att] = thisatt[0];

            }
        }
        //console.log(formData);

        return formData
    }

    //**override
    _onEditImage(event) {
        const attr = event.currentTarget.dataset.edit;
        const current = getProperty(this.actor.data, attr);
        const myactor = this.actor;
        new FilePicker({
            type: "image",
            current: current,
            callback: async (path) => {
                event.currentTarget.src = path;
                //manual overwrite of src
                let imageform = this.form.getElementsByClassName("profile-img");
                imageform[0].setAttribute("src", path);
                //myactor.data.img = path;

                //myactor.update(myactor.data);

                let mytoken = await this.setTokenOptions(myactor.data, path);

                if (mytoken)
                    await myactor.update({ "token": mytoken, "img": path });

                this._onSubmit(event);
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        }).browse(current);

    }

    async setTokenOptions(myactorData, path = null) {

        //console.log(myactorData.token);

        if (path == null)
            path = myactorData.img;

        let mytoken = await duplicate(myactorData.token);

        if (!myactorData.data.istemplate) {
            if (mytoken.dimLight == null)
                mytoken.dimLight = 0;

            if (mytoken.dimSight == null)
                mytoken.dimSight = 0;

            if (mytoken.brightLight == null)
                mytoken.brightLight = 0;

            mytoken.img = path;

            //mytoken.name = myactorData.name;

            if (game.settings.get("sandbox", "tokenOptions")) {

                let displayName = myactorData.data.displayName;

                if (myactorData.token) {

                    mytoken.displayName = displayName;

                    mytoken.displayBars = displayName;

                    if (myactorData.data.tokenbar1 != null)
                        mytoken.bar1.attribute = myactorData.data.tokenbar1;

                }


            }
        }

        return mytoken;

    }

    async _updateObject(event, formData) {
        event.preventDefault();
        //console.log("updateObject");
        //console.log(event);
        //console.log(event.target.name);
        //console.log(formData);
        //console.log(formData["data.biography"]);

        //await this.scrollbarSet();

        if (event.target == null && !game.user.isGM && !formData["data.biography"])
            return;

        if (event.target)
            if (event.target.name == "")
                return;


        //console.log(event);

        if (formData["data.gtemplate"] == "")
            formData["data.gtemplate"] = this.actor.data.data.gtemplate;


        formData = await this.checkAttributes(formData);


        //console.log("User: " + game.user.id + " is updating actor: " + this.actor.name + " target: " + event.target.name);

        if (event.target != null) {
            let target = event.target.name;
            let escapeForm = false;
            //console.log(target);

            if (target == "data.gtemplate")
                return;

            //if(!escapeForm){
            //console.log("form changed");
            //console.log(event.target.name);
            let property;
            let modmax = false;
            if (target.includes(".max")) {
                modmax = true;
            }
            if (target != null) {


                target = target.replace(".value", "");
                target = target.replace(".max", "");


                let attri = target.split(".")[2];
                //console.log(attri);
                //property = game.items.find(y => y.data.type == "property" && y.data.data.attKey == attri);
                property = await auxMeth.getTElement("NONE", "property", attri);
                //console.log(property);
            }



            if (property != null) {
                if (property.data.data.datatype != "checkbox") {
                    formData[event.target.name] = event.target.value;
                }
                else {

                    formData[event.target.name] = event.target.checked;
                }

                let attrimodified = target + ".modified";
                let attrimodmax = target + ".modmax";
                if (!modmax) {

                    formData[attrimodified] = true;

                }
                else {

                    formData[attrimodmax] = true;
                }

            }
            else {
                if (target == "data.biovisible") {
                    formData["data.biovisible"] = event.target.checked;
                }

                else if (target == "data.resizable") {
                    formData["data.resizable"] = event.target.checked;
                }

                else if (target == "data.istemplate") {
                    formData["data.istemplate"] = event.target.checked;
                }

                else {
                    formData[event.target.name] = event.currentTarget.value;
                }

            }




        }

        //console.log(formData);
        //console.log("updating form");

        await super._updateObject(event, formData);

    }

    /* -------------------------------------------- */

}

