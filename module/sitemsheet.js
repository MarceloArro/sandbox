/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */

import { auxMeth } from "./auxmeth.js";
export class sItemSheet extends ItemSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["sandbox", "sheet", "item"],
            width: 520,
            height: 500,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
        });
    }

    /* -------------------------------------------- */

    /** @override */
    get template() {
        const path = "systems/sandbox/templates/";
        return `${path}/${this.item.data.type}.html`;
    }


    /** @override */
    async getData() {

        if (this.item.data.type == "cItem")
            await this.checkStillUnique();

        const item = this.item;
        const data = super.getData();
        data.flags = item.data.flags;

        //BEHOLD THE BEST DEBUGGER LINE ON SANDBOX!
        //console.log(data);

        return data;

    }

    /* -------------------------------------------- */

    /** @override */

    activateListeners(html) {
        super.activateListeners(html);

        // Activate tabs
        let tabs = html.find('.tabs');
        let initial = this._sheetTab;
        new TabsV2(tabs, {
            initial: initial,
            callback: clicked => this._sheetTab = clicked.data("tab")
        });

        //Drag end event 
        this.form.ondrop = ev => this._onDrop(ev);

        // Checks if the attribute of the cItem is variable, or it's value stays constant on each cItem
        html.find('.check-isconstant').click(ev => {
            const li = $(ev.currentTarget);
            const value = ev.target.value;
            let obj = li.attr("name");
            let namechain = obj.split(".");
            let name = namechain[1];
            let index = namechain[0];
            const propis = this.item.data.data.properties;
            const prop = propis[index];

            if (prop.isconstant) {
                prop.isconstant = false;
            }
            else {
                prop.isconstant = true;
            }

            //this.item.data.data.properties = propis;
            //this.item.update(this.item.data);

            this.item.update({ "data.properties": this.item.data.data.properties });
        });

        // Checks if a Mod is executable only one
        html.find('.check-once').click(ev => {
            const li = $(ev.currentTarget);
            const value = ev.target.value;
            let index = li.attr("index");
            const mod = this.item.data.data.mods[index];

            if (mod.once) {
                mod.once = false;
            }
            else {
                mod.once = true;
            }

            this.item.update({ "data.mods": this.item.data.data.mods });
            //this.item.update(this.item.data);
        });

        html.find('.mod-add').click(ev => {
            this.adnewCIMod();
        });

        html.find('.check-hasuses').click(ev => {
            let activated = this._element[0].getElementsByClassName("check-hasactivation");
            const value = ev.target.checked;
            if (value)
                activated[0].checked = true;

        });

        html.find('.check-hasactivation').click(ev => {
            let uses = this._element[0].getElementsByClassName("check-hasuses");
            const value = ev.target.checked;
            if (!value)
                uses[0].checked = false;

        });

        html.find('.checkonPath').click(ev => {

            new FilePicker({
                type: "image",
                displayMode: "tiles",
                current: this.item.data.data.onPath,
                callback: imagePath => this.item.update({ "data.onPath": imagePath }),
            }).browse(this.item.data.data.checkonPath);
        });

        html.find('.checkoffPath').click(ev => {

            new FilePicker({
                type: "image",
                displayMode: "tiles",
                current: this.item.data.data.offPath,
                callback: imagePath => this.item.update({ "data.offPath": imagePath }),
            }).browse(this.item.data.data.checkoffPath);
        });

        html.find('.tokeniconpath').click(ev => {

            new FilePicker({
                type: "image",
                displayMode: "tiles",
                current: this.item.data.data.tokeniconpath,
                callback: imagePath => this.item.update({ "data.tokeniconpath": imagePath }),
            }).browse(this.item.data.data.tokeniconpath);
        });

        html.find('.mod-input').change(ev => {
            const li = $(ev.currentTarget);
            const value = ev.target.value;
            let obj = li.attr("name");
            let namechain = obj.split(".");
            let name = namechain[1];
            let index = namechain[0];

            this.editmodInput(index, name, value);
        });

        html.find('.mod-delete').click(ev => {
            const li = $(ev.currentTarget);
            const value = ev.target.value;
            let obj = li.attr("name");
            let namechain = obj.split(".");
            let index = namechain[0];
            this.deletemodInput(index);
        });

        html.find('.modcitem-edit').click(async (ev) => {

            let citemId = ev.target.parentElement.getAttribute("citemId");
            let ciKey = ev.target.parentElement.getAttribute("ciKey");
            //let citem = game.items.get(citemId);
            let citem = await auxMeth.getcItem(citemId, ciKey);
            citem.sheet.render(true);
        });

        html.find('.modcitem-delete').click(ev => {
            const mods = this.item.data.data.mods;
            let cindex = ev.target.parentElement.parentElement.getAttribute("cindex");
            let modId = ev.target.parentElement.parentElement.getAttribute("mod");
            this.item.data.data.mods[modId].items.splice(cindex, 1);

            this.item.update({ "data.mods": mods });
            //this.item.update(this.item.data);
        });

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        let subitems = this.getsubItems();
        if (subitems == null) {

            return;
        }

        // Edit Tab item
        html.find('.item-edit').click(async (ev) => {
            const li = $(ev.currentTarget).parents(".property");
            const toedit = subitems[li.data("itemId")];
            //console.log(this.item.type);
            //const item = game.items.get(toedit.id);
            let mysubtype;
            if (this.item.type == "sheettab" || this.item.type == "multipanel")
                mysubtype = "panel";
            if (this.item.type == "panel" || this.item.type == "group")
                mysubtype = "property";
            if (this.item.type == "cItem")
                mysubtype = "group";

            //console.log(mysubtype);
            const item = await auxMeth.getTElement(toedit.id, mysubtype, toedit.ikey);
            item.sheet.render(true);
        });

        // Delete tab Item
        html.find('.item-delete').click(async (ev) => {
            const li = $(ev.currentTarget).parents(".property");
            let todelete = li.data("itemId");
            let obj = subitems[todelete];
            if (this.item.data.type == "cItem") {
                //let group = game.items.get(obj.id);
                let group = await auxMeth.getTElement(obj.id, "group", obj.ikey);
                if (group.data.data.isUnique) {
                    this.item.data.data.isUnique = false;
                }
            }
            const prop = subitems.splice(todelete, 1);
            li.slideUp(200, () => this.render(false));
            this.updateLists(subitems);
        });

        // Top Item
        html.find('.item-top').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            let itemindex = li.data("itemId");
            if (itemindex > 0)
                subitems.splice(itemindex - 1, 0, subitems.splice(itemindex, 1)[0]);
            this.updateLists(subitems);
        });

        // Bottom Item
        html.find('.item-bottom').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            let itemindex = li.data("itemId");
            if (itemindex < subitems.length - 1)
                subitems.splice(itemindex + 1, 0, subitems.splice(itemindex, 1)[0]);
            this.updateLists(subitems);
        });

        html.find('.macroselector').change(ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget);
            this.item.update({ "data.macroid": li.value });
        });

    }

    async listMacros() {
        let macros = this._element[0].getElementsByClassName("macroselector");

        if (macros == null)
            return;

        let selector = macros[0];

        if (selector == null)
            return;

        var length = selector.options.length;

        for (let j = length - 1; j >= 0; j--) {
            selector.options[j] = null;
        }

        var opt = document.createElement('option');
        opt.appendChild(document.createTextNode("No Macro"));
        opt.value = "";
        selector.appendChild(opt);

        for (let k = 0; k < game.macros.contents.length; k++) {
            var opt = document.createElement('option');
            opt.appendChild(document.createTextNode(game.macros.contents[k].name));
            opt.value = game.macros.contents[k].id;
            selector.appendChild(opt);
        }

        if (this.item.data.data.macroid == "") {
            selector.value = ""
        }
        else {
            selector.value = this.item.data.data.macroid;
        }

    }

    async checkItemsExisting() {

        let panels = this.item.data.flags.panelarray;
        let changed = false;

        for (let i = 0; i < panels.length; i++) {
            let anitem = await auxMeth.getTElement(panels[i].id, "panel", panels[i].ikey)
            if (!anitem) {
                let index = panels.indexOf(panels[i]);
                if (index > -1) {
                    panels.splice(index, 1);
                    changed = true;
                }
            }
        }

        if (changed)
            this.updatePanels();
    }

    async _onDrop(event) {
        //Initial checks
        event.preventDefault();
        event.stopPropagation();
        let dropitem;
        let dropmod = false;
        let modId;

        //        if(event==null)
        //            return;

        if (event.target.classList.contains("itemdrop-area")) {
            console.log("dropping on mod");
            dropmod = true;
            modId = event.target.getAttribute("mod");
        }

        else if (event.target.parentElement.classList.contains("itemdrop-area")) {
            console.log("NOT dropping on mod");
            dropmod = true;
            modId = event.target.parentElement.getAttribute("mod");
        }

        let dropmodcitem = false;

        try {
            let dropdata = JSON.parse(event.dataTransfer.getData('text/plain'));
            dropitem = game.items.get(dropdata.id);

            let acceptableObj = "";
            if (this.item.data.type == "panel" || this.item.data.type == "group") {
                acceptableObj = "property";
            }

            else if (this.item.data.type == "sheettab" || this.item.data.type == "multipanel") {
                acceptableObj = "panel";
            }

            //else if(this.item.data.type=="cItem" && !this.item.data.data.isUnique){
            else if (this.item.data.type == "cItem") {
                acceptableObj = "group";
            }

            else if (this.item.data.type == "property" && this.item.data.data.datatype == "table") {
                acceptableObj = "group";
            }

            else if (this.item.data.type == "property" && this.item.data.data.datatype != "table") {
                acceptableObj = "panel";
            }

            else {
                console.log("object not allowed");
                return false;
            }

            if (dropitem.data.type !== acceptableObj) {
                if (this.item.data.type == "sheettab" && (dropitem.data.type == "multipanel" || dropitem.data.type == "panel")) {

                }

                else if (this.item.data.type == "cItem" && dropitem.data.type == "cItem" && dropmod) {
                    dropmodcitem = true;
                    await this.addItemToMod(modId, dropitem.id, dropitem.data.data.ciKey);
                }


                else if (this.item.data.type == "cItem" && (dropitem.data.type == "panel" || dropitem.data.type == "multipanel") && this.item.data.data.hasdialog) {

                }

                else if (this.item.data.type == "property" && dropitem.data.type == "multipanel" && this.item.data.data.hasdialog) {

                }

                else {
                    console.log("object not allowed");
                    return false;
                }

            }


        }
        catch (err) {
            console.log("ItemCollection | drop error")
            console.log(event.dataTransfer.getData('text/plain'));
            console.log(err);
            return false;
        }

        if (dropmodcitem)
            return;

        let keyCode = this.getitemKey(dropitem.data);
        let itemKey = dropitem.data.data[keyCode];

        const itemData = this.item.data.data;
        //console.log(itemKey + " " + keyCode);
        let newItem = {}
        setProperty(newItem, itemKey, {});
        newItem[itemKey].id = dropitem.id;
        newItem[itemKey].name = dropitem.data.name;
        newItem[itemKey].ikey = itemKey;
        //console.log(newItem);
        if (this.item.data.type == "group" && dropitem.data.type == "property") {
            newItem[itemKey].isconstant = true;
        }

        //console.log(newItem);

        if (this.item.data.type != "property") {
            //Add element id to panel
            const subitems = await this.getsubItems();
            //console.log(subitems);

            for (let i = 0; i < subitems.length; i++) {
                if (subitems[i].id == dropitem.data.id) {
                    return;
                }
            }

            if (!subitems.find(y => y.id == newItem[itemKey].id))
                await subitems.push(newItem[itemKey]);



            if (this.item.data.type == "cItem" && dropitem.data.type == "group" && dropitem.data.data.isUnique) {
                itemData.isUnique = true;
                itemData.uniqueGID = dropitem.data.id;
                await this.item.update({ "data": itemData });
            }

            else if (this.item.data.data.hasdialog && (dropitem.data.type == "panel" || dropitem.data.type == "multipanel")) {
                const myitem = this.item.data.data;
                await this.item.update({ "data.dialogID": dropitem.id, "data.dialogName": dropitem.data.data.panelKey });
            }

            else {
                await this.updateLists(subitems);

            }



        }

        else {

            if (this.item.data.data.datatype == "table" && dropitem.data.type == "group") {
                const myitem = this.item.data.data;
                myitem.group.id = dropitem.id;
                //TODO --- No sería Title?
                myitem.group.name = dropitem.data.name;
                myitem.group.ikey = itemKey;
                this.item.data.data.group = myitem.group;
                //await this.item.update(this.item.data);

                await this.item.update({ "data.group": myitem.group });
            }
            else if (this.item.data.data.hasdialog && (dropitem.data.type == "panel" || dropitem.data.type == "multipanel")) {
                const myitem = this.item.data.data;

                await this.item.update({ "data.dialogID": dropitem.id, "data.dialogName": dropitem.data.data.panelKey });
            }


        }
        //console.log("updated");
        //console.log(this.item.data.data);

    }

    getsubItems() {

        let subitems;

        if (this.item.data.type == "panel" || this.item.data.type == "group") {
            subitems = this.item.data.data.properties;
        }

        else if (this.item.data.type == "sheettab" || this.item.data.type == "multipanel") {
            subitems = this.item.data.data.panels;
        }

        else if (this.item.data.type == "cItem") {
            subitems = this.item.data.data.groups;
        }

        //console.log(subitems);

        return subitems;
    }

    getitemKey(itemdata) {

        let objKey;
        //console.log(itemdata.type);
        if (itemdata.type == "property") {
            objKey = "attKey";
        }

        else if (itemdata.type == "panel" || itemdata.type == "multipanel") {
            objKey = "panelKey";
        }

        else if (itemdata.type == "group") {
            objKey = "groupKey";
        }

        return objKey;
    }

    async updateLists(subitems) {
        if (this.item.data.type == "panel" || this.item.data.type == "group") {
            await this.item.update({ "data.properties": subitems });
            //this.item.data.data.properties = subitems;
        }

        else if (this.item.data.type == "sheettab" || this.item.data.type == "multipanel") {
            await this.item.update({ "data.panels": subitems });
            //this.item.data.data.panels = subitems;
        }

        else if (this.item.data.type == "cItem") {
            //console.log(subitems);
            await this.item.update({ "data.groups": subitems });
            //this.item.data.data.groups = subitems;
        }

        //console.log("updated");
        //await this.item.update(this.item.data);

        return subitems;
    }

    async checkStillUnique() {
        let isUnique = false;
        const groups = this.item.data.data.groups;
        for (let j = groups.length - 1; j >= 0; j--) {
            let groupId = groups[j].id;
            //let groupObj = game.items.get(groupId);
            let groupObj = await auxMeth.getTElement(groupId, "group", groups[j].ikey);

            //Checks if group still exist
            if (groupObj != null) {
                if (groupObj.data.data.isUnique) {
                    isUnique = true;
                }
            }
            else {
                groups.splice(j, 1);
            }

        }
        //console.log(isUnique);
        if (isUnique) {
            if (!this.item.data.data.isUnique) {
                this.item.data.data.isUnique = true;
            }
        }
        else {
            if (this.item.data.data.isUnique) {
                this.item.data.data.isUnique = false;
            }
        }
    }

    async refreshCIAttributes(basehtml) {
        //console.log("updating CItem attr");

        const html = await basehtml.find(".attribute-list")[0];
        html.innerHTML = '';

        let attrArray = [];
        let tosave = false;

        let attributes = this.item.data.data.attributes ?? this.options.data.data.attributes;
        let groups = this.item.data.data.groups ?? this.options.data.data.groups;
        let newgroups = duplicate(groups);
        let changegroups = false;
        for (let j = groups.length - 1; j >= 0; j--) {
            let groupId = groups[j].id;
            //let propObj = game.items.get(groupId);
            let propObj = await auxMeth.getTElement(groupId, "group", groups[j].ikey);

            if (groupId != propObj.id) {
                changegroups = true;
                newgroups[j].id = propObj.id;
            }

            if (propObj != null) {
                let propertyIds = propObj.data.data.properties;

                for (let i = propertyIds.length - 1; i >= 0; i--) {
                    let propertyId = propertyIds[i].id;
                    //let ppObj = game.items.get(propertyId);
                    let ppObj = await auxMeth.getTElement(propertyId, "property", propertyIds[i].ikey);

                    if (ppObj != null) {
                        if (!ppObj.data.data.ishidden || game.user.isGM) {
                            let property = ppObj.data.data;

                            let new_container = document.createElement("DIV");
                            new_container.className = "new-row";
                            new_container.setAttribute("id", "row-" + i);

                            let new_row = document.createElement("DIV");
                            new_row.className = "flexblock-left";
                            new_row.setAttribute("id", i);

                            if (property.datatype != "group" && property.datatype != "label") {



                                let label = document.createElement("H3");
                                label.className = "label-free";
                                label.textContent = property.tag;

                                let input;

                                if (!hasProperty(attributes, property.attKey)) {
                                    setProperty(attributes, property.attKey, {});
                                    if (property.datatype === "simplenumeric") {
                                        attributes[property.attKey].value = await auxMeth.autoParser(property.defvalue, null, attributes, false);
                                    }

                                    else {
                                        attributes[property.attKey].value = await auxMeth.autoParser(property.defvalue, null, attributes, true);
                                    }

                                    tosave = true;
                                }

                                let attribute = attributes[property.attKey];

                                if (attribute.ishidden == null) {
                                    attribute.ishidden = false;
                                    tosave = true;
                                }


                                if (attribute.value == "" || attribute.value == null) {
                                    if (property.datatype === "simplenumeric") {
                                        //BUG FIXER
                                        //                                        let newPObj = {};
                                        //                                        newPObj.value = 0;
                                        //                                        await this.item.update({[`data.attributes.${property.attKey}`] : newPObj});

                                        attribute.value = 0;
                                    }
                                    else {
                                        attribute.value = property.defvalue;
                                    }
                                }

                                if (property.datatype != "list") {
                                    //console.log("editando");

                                    if (property.datatype == "textarea") {
                                        input = document.createElement("TEXTAREA");
                                        input.setAttribute("name", property.attKey);
                                        input.textContent = attribute.value;

                                        if (property.inputsize == "S") {
                                            input.className = "texteditor-small";
                                        }

                                        else if (property.inputsize == "L") {
                                            input.className = "texteditor-large";
                                        }
                                        else {
                                            input.className = "texteditor-med";
                                        }
                                    }
                                    else {
                                        input = document.createElement("INPUT");
                                        input.setAttribute("name", property.attKey);



                                        if (property.datatype === "simplenumeric") {

                                            input.setAttribute("type", "number");
                                            input.className = "input-smallmed";


                                            if (property.auto != "" && property.auto != null) {
                                                let atvalue = await auxMeth.autoParser(property.auto, null, attributes, false);
                                                input.setAttribute("value", atvalue);
                                                input.setAttribute("readonly", "true");
                                            }
                                            else {
                                                input.setAttribute("value", attribute.value);
                                            }

                                        }
                                        else if (property.datatype === "simpletext") {
                                            input.setAttribute("type", "text");
                                            input.className = "input-med";
                                            input.setAttribute("value", attribute.value);
                                        }

                                        else if (property.datatype === "checkbox") {
                                            input.setAttribute("type", "checkbox");
                                            let setvalue = false;
                                            //console.log(attribute.value);
                                            if (attribute.value === true || attribute.value === "true") {
                                                setvalue = true;
                                            }

                                            if (attribute.value === "false")
                                                attribute.value = false;

                                            //console.log(setvalue);
                                            input.checked = setvalue;
                                        }
                                    }

                                }
                                //LIST
                                else {
                                    input = document.createElement("SELECT");
                                    input.className = "input-med";
                                    input.setAttribute("name", property.attKey);
                                    var rawlist = property.listoptions;
                                    var listobjects = rawlist.split(',');

                                    for (var n = 0; n < listobjects.length; n++) {
                                        let n_option = document.createElement("OPTION");
                                        n_option.setAttribute("value", listobjects[n]);
                                        n_option.textContent = listobjects[n];
                                        if (listobjects[n] == attribute.value)
                                            n_option.setAttribute("selected", 'selected');

                                        input.appendChild(n_option);
                                    }

                                }

                                input.className += " att-input";
                                input.addEventListener("change", (event) => this.updateFormInput(event.target.name, event.target.value, propertyId, propertyIds[i].ikey));

                                label.className += " att-input-label";

                                if (!game.user.isGM) {
                                    input.setAttribute("readonly", "true");
                                }

                                await new_row.appendChild(label);
                                if (property.datatype != "label")
                                    await new_row.appendChild(input);

                                await new_container.appendChild(new_row);

                                //TEST
                                // if(!property.ishidden){
                                //     let new_div = document.createElement("DIV");
                                //     new_div.className = "citem-attribute";

                                //     let mode_block = document.createElement("INPUT");
                                //     mode_block.className = "visible-input";
                                //     mode_block.setAttribute("id", i);
                                //     mode_block.setAttribute("type", "checkbox");
                                //     let setvalue = false;

                                //     if (attribute.ishidden == null)
                                //         attribute.ishidden = false;

                                //     if (attribute.ishidden === true || attribute.ishidden === "true") {
                                //         setvalue = true;
                                //     }

                                //     if (attribute.ishidden === "false")
                                //         attribute.ishidden = false;


                                //     mode_block.checked = setvalue;
                                //     mode_block.addEventListener("change", (event) => this.updateAttVisibility(property.attKey, event.target.checked));
                                //     //TEST END

                                //     new_div.appendChild(mode_block);
                                //     await new_row.appendChild(new_div);
                                // }

                                await html.appendChild(new_container);

                            }
                        }

                    }

                    else {
                        propertyIds.splice(i, 1);
                    }



                }
            }

            else {
                groups.splice(j, 1);
            }

        }
        //console.log(html);
        if (this.item.data.permission.default > CONST.ENTITY_PERMISSIONS.OBSERVER || this.item.data.permission[game.user.id] > CONST.ENTITY_PERMISSIONS.OBSERVER || game.user.isGM) {
            if (tosave) {
                this.item.update({ "data.attributes": attributes });
                //this.item.data.data.attributes = attributes;
                //this.item.update(this.item.data);
            }

            if (changegroups) {
                this.item.update({ "data.groups": newgroups });
            }
        }



    }

    async updateAttVisibility(name, value) {

        await this.item.update({ [`data.attributes.${name}.ishidden`]: value });
    }

    async updateFormInput(name, value, propId, propKey) {
        //console.log(value);
        let setvalue;

        //let propObj = await game.items.get(propId);
        let propObj = await auxMeth.getTElement(propId, "property", propKey);
        if (propObj.data.data.datatype == "checkbox") {
            setvalue = true;
            let attKey = [propObj.data.data.attKey];

            let currentvalue = this.item.data.data.attributes[attKey].value;

            if (currentvalue == true || currentvalue == "true") {
                setvalue = false;
            }

            this.item.data.data.attributes[propObj.data.data.attKey].value = setvalue;

        }

        else {
            setvalue = value;
            this.item.data.data.attributes[propObj.data.data.attKey].value = setvalue;

        }

        await this.item.update({ [`data.attributes.${name}.value`]: setvalue });
        //await this.item.update({"data.attributes":this.item.data.data.attributes},{diff:false});

        //this.item.update(this.item.data);
    }


    async adnewCIMod() {
        const mods = this.item.data.data.mods;

        let newindex = mods.length - 1;
        if (newindex < 0) {
            newindex = 0;
        }
        else {

            newindex = mods[mods.length - 1].index + 1;
        }

        let newMod = {};
        newMod.name = "New Mod";
        newMod.index = newindex;
        newMod.type = "ADD";
        newMod.attribute = "";
        newMod.selectnum = "";
        newMod.listmod = "INCLUDE";
        newMod.items = [];
        newMod.citem = this.item.data.id;


        await mods.push(newMod);

        await this.item.update({ "data.mods": mods });

        //this.item.update(this.item.data);

        //console.log(mods);
    }

    async editmodInput(index, name, value) {
        const mods = this.item.data.data.mods;
        const obj = mods[index];
        obj[name] = value;
        //this.item.data.data.mods = mods;

        //this.item.update(this.item.data);

        this.item.update({ "data.mods": mods });
    }

    async deletemodInput(index) {
        const mods = this.item.data.data.mods;
        mods.splice(index, 1);


        this.item.update({ "data.mods": mods });

        //this.item.update(this.item.data);
    }

    async addItemToMod(modId, citemId, ciKey) {
        //console.log(citemId);
        const mods = this.item.data.data.mods;
        const mod = mods[modId];
        //let citem = game.items.get(citemId);
        let citem = await auxMeth.getcItem(citemId, ciKey);
        let arrayItem = {};
        arrayItem.id = citemId;
        arrayItem.name = citem.name;
        arrayItem.ciKey = ciKey;

        if (!mod.items.includes(citemId))
            mod.items.push(arrayItem);
        this.item.update({ "data.mods": mods });

        //this.item.update(this.item.data);
    }

    async customCallOverride(basehtml, data) {

    }

    async scrollBarTest(basehtml) {
        const wcontent = await this._element[0].getElementsByClassName("window-content");
        let newheight = parseInt(wcontent[0].offsetHeight) - 152;

        const html = await basehtml.find(".scrollable");
        for (let i = 0; i < html.length; i++) {
            let scrollNode = html[i];
            scrollNode.style.height = newheight + "px";

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
        //console.log("setting scroll");
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

    }

    /** @override */
    async _updateObject(event, formData) {

        super._updateObject(event, formData);

    }
}
