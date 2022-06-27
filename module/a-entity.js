import { SBOX } from "./config.js";
import { auxMeth } from "./auxmeth.js";

export class gActor extends Actor {

    prepareData() {
        super.prepareData();

        // Get the Actor's data object
        const actorData = this.data;
        const data = actorData.data;
        const flags = actorData.flags;

        if (!hasProperty(flags, "ischeckingauto")) {
            setProperty(flags, "ischeckingauto", false);
        }

        if (!hasProperty(flags, "hasupdated")) {
            setProperty(flags, "hasupdated", true);
        }

        if (!hasProperty(flags, "scrolls")) {
            setProperty(flags, "scrolls", {});
        }

        // Prepare Character data
        //console.log("preparing data");
        if (data.istemplate) {

            if (!hasProperty(flags, "tabarray")) {
                setProperty(flags, "tabarray", []);
            }

            if (!hasProperty(flags, "rows")) {
                setProperty(flags, "rows", 0);
                setProperty(flags, "rwidth", 0);
            }


        }

        if (!hasProperty(flags, "sandbox")) {
            setProperty(flags, "sandbox", {});
        }

        if (!hasProperty(flags.sandbox, "scrolls_" + game.user.id + "_" + this.id)) {
            setProperty(flags.sandbox, "scrolls_" + game.user.id + "_" + this.id, 0);
        }




        //console.log(this);

    }

    prepareDerivedData() {
        //console.log("llo");



        if (!hasProperty(this.data.flags, "sbupdated")) {
            setProperty(this.data.flags, "sbupdated", 0);
        }

        if (!hasProperty(this.data.data, "biovisible")) {
            setProperty(this.data.data, "biovisible", false);
        }
    }

    async _preCreate(data, options, user) {

        await super._preCreate(data, options, user);
        if (data.data != null)
            if (data.data.istemplate)
                this.data.update({ "data.istemplate": false });
    }

    async _preUpdate(updateData, options, userId) {
        //        let upclon = duplicate(updateData);
        //console.log(updateData);
        if (this.data.permission.default >= CONST.ENTITY_PERMISSIONS.OBSERVER || this.data.permission[game.user.id] >= CONST.ENTITY_PERMISSIONS.OBSERVER || game.user.isGM) {
            let myuser = userId;
        }
        else {
            return;
        }

        let noTemplate = true;
        if (updateData.istemplate) {
            noTemplate = false;
        }

        if (!this.data.data.istemplate && updateData.data != null && noTemplate) {

            let actor = duplicate(this.data);
            let newtoken;
            //console.log(actor);

            //I AM TRYING TO MERGE UPDATE DATA TO A DUPLICATE ACTOR, TO RETURN THE RESULTING ACTOR
            let uData = await this.getFinalActorData(actor, updateData.data);

            //console.log(uData);

            //HERE I APPLY THE AUTO CALCULATIONS TO THE RETURNED ACTOR
            let adata = await this.actorUpdater(uData);
            adata = await this.actorUpdater(adata);
            //console.log(adata);

            //COMPARES RETURNED ACTOR DATA TO THE ORIGINAL UPDATEDATA, AND ADDS WHATERVER IS MISSING
            let newattributes = await this.compareKeys(this.data.data.attributes, adata.data.attributes);
            let newcitems = await this.comparecItems(this.data.data.citems, adata.data.citems);
            let newrolls = await this.compareValues(this.data.data.rolls, adata.data.rolls);

            let maindata = updateData.data;

            setProperty(maindata, "selector", adata.data.selector);

            if (newattributes)
                setProperty(maindata, "attributes", newattributes);
            if (newcitems.length > 0) {
                setProperty(maindata, "citems", newcitems);
            }
            else {
                if (updateData.data.citems)
                    updateData.data.citems = adata.data.citems;
            }

            if (newrolls)
                setProperty(maindata, "rolls", newrolls);

        }

        super._preUpdate(updateData, options, userId);

    }

    async createAttProps(actorData, updateData, key) {

        const n = actorData.attributes;
        n[key] = {};
        const c = actorData.attributes[key];

        let a = updateData.attributes[key]
        for (var f in updateData.attributes[key]) {

            let b = a[f];
            c[f] = b;

            //console.log(f + " " + b);
        }


    }

    async getFinalActorData(actor, updateData) {

        const actorData = actor.data;

        //MERGE ATTRIBUTES
        let attributes;
        let attKeys = await Object.keys(actorData.attributes);
        //console.log(attKeys);
        if (updateData.attributes)
            attributes = updateData.attributes;

        if (updateData.istemplate)
            actorData.istemplate = true;

        if (updateData.gtemplate)
            actorData.gtemplate = updateData.gtemplate;

        //console.log(actorData.attributes);
        for (var key in attributes) {

            if (attKeys.includes(key)) {
                if (attributes[key].id != null)
                    actorData.attributes[key].id = attributes[key].id;

                //Checkbox group implementation
                if (attributes[key].checkgroup != null)
                    actorData.attributes[key].checkgroup = attributes[key].checkgroup;

                // if (actorData.attributes[key].checkgroup != null) {
                //     if (attributes[key].value == "on")
                //         attributes[key].value = true;
                // }

                //Checkbox group implementation
                if (actorData.attributes[key].checkgroup != null && attributes[key].modified) {

                    if (actorData.attributes[key].checkgroup != "" && !actorData.attributes[key].value) {
                        let checkgroup = actorData.attributes[key].checkgroup;
                        let chkgroupArray = checkgroup.split(";");

                        for (const [propKey, propValues] of Object.entries(actorData.attributes)) {
                            let propKeyObj = game.items.find(y => y.data.data.attKey == propKey);
                            if (propKeyObj != null && propKeyObj != undefined && propKeyObj != "") //skip mismatch data (CREATE mod)
                                if (propKeyObj.data.data.datatype == "checkbox" && propKey != key) {
                                    let pointerchkgroupArray = propKeyObj.data.data.checkgroup.split(";");
                                    for (let z = 0; z < chkgroupArray.length; z++) {
                                        let checkKey = chkgroupArray[z];
                                        let parsedKey = await auxMeth.autoParser(checkKey, actorData.attributes, null, true);
                                        if (pointerchkgroupArray.includes(parsedKey))
                                            propValues.value = false;
                                    }
                                }

                        }
                        if (updateData.citems) {
                            for (let r = 0; r < updateData.citems.length; r++) {
                                for (const [propKey, propValues] of Object.entries(updateData.citems[r].attributes)) {
                                    if (propKey != propObj.data.data.attKey) {
                                        let propKeyObj = game.items.find(y => y.data.data.attKey == propKey);
                                        if (propKeyObj != null && propKeyObj != "" && propKeyObj != undefined) {
                                            let pointerchkgroupArray = propKeyObj.data.data.checkgroup.split(";");
                                            for (let z = 0; z < chkgroupArray.length; z++) {
                                                let checkKey = chkgroupArray[z];
                                                let parsedKey = await auxMeth.autoParser(checkKey, this.actor.data.data.attributes, citem.attributes, true);
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

                //console.log(key + " checkgroup: " + actorData.attributes[key].checkgroup + " value: " + attributes[key].value);
                if (attributes[key].value != null) {
                    actorData.attributes[key].value = attributes[key].value;
                }


                if (attributes[key].modified != null)
                    actorData.attributes[key].modified = attributes[key].modified;
                if (attributes[key].max != null)
                    actorData.attributes[key].max = attributes[key].max;
                if (attributes[key].modmax != null)
                    actorData.attributes[key].modmax = attributes[key].modmax;
                if (attributes[key].maxadd != null)
                    actorData.attributes[key].maxadd = attributes[key].maxadd;

                if (attributes[key].listedit != null)
                    actorData.attributes[key].listedit = attributes[key].listedit;

                if (actorData.attributes[key].istable && hasProperty(attributes[key], "tableitems"))
                    actorData.attributes[key].tableitems = attributes[key].tableitems;

                if (actorData.attributes[key].istable && hasProperty(attributes[key], "totals")) {
                    for (var totkey in attributes[key].totals) {
                        actorData.attributes[key].totals[totkey] = attributes[key].totals[totkey];
                    }

                }

            }
            else {
                //console.log("adding " + key)
                await this.createAttProps(actorData, updateData, key);

            }
        }

        //MERGE ROLLS
        let rolls;
        let rollKeys = Object.keys(actorData.rolls);
        if (updateData.rolls)
            rolls = updateData.rolls;
        for (var key in rolls) {
            if (rollKeys.includes(key)) {
                actorData.rolls[key].value = rolls[key].value;
            }
        }

        //MERGE CITEMS
        let citems;

        if (updateData.citems) {
            citems = updateData.citems;
            actorData.citems = citems;
        }

        //console.log(citems);

        return actor;
    }

    async compareValues(data1, data2) {
        var result = {};
        var keys = Object.keys(data1);
        for (var key in data2) {
            //console.log(data1[key].value + " vs " + data2[key].value);
            if (!keys.includes(key) || data1[key].value !== data2[key].value) {
                result[key] = {};
                result[key].value = data2[key].value;
            }
        }

        return result;
    }

    async compareKeys(data1, data2) {
        var result = {};
        for (var key in data2) {
            let noProp = false;

            if (data1[key] == null) {
                noProp = true;

            }

            for (var subkey in data2[key]) {

                let createKey = false;
                let noSubKey = false;

                if (!noProp) {
                    if (data1[key][subkey] == null) {
                        createKey = true;
                    }

                    else {
                        if (data1[key][subkey] !== data2[key][subkey])
                            createKey = true;
                    }
                }
                else {
                    createKey = true;
                }

                if (createKey) {

                    if (result[key] == null)
                        result[key] = {};

                    if (data2[key][subkey] != null) {
                        result[key][subkey] = data2[key][subkey];
                    }

                }
            }

        }

        //console.log(result);

        return result;
    }

    async comparecItems(data1, data2) {

        var result = [];
        var keys = Object.keys(data1);

        for (let i = 0; i < data2.length; i++) {
            if (!data1.includes(data2[i])) {
                result.push(data2[i]);
            }

            else {
                if (data2[i] != data1[i]) {
                    result.push(data2[i]);
                }
            }

        }

        return result;
    }

    async listSheets() {

        let templates = await auxMeth.getSheets();
        this.data.data.sheets = templates;

        //let charsheet = document.getElementById("actor-"+this.id);

        let charsheet;
        if (this.token == null) {
            charsheet = document.getElementById("actor-" + this.id);
        }
        else {
            charsheet = document.getElementById("actor-" + this.id + "-" + this.token.data.id);
        }
        let sheets = charsheet.getElementsByClassName("selectsheet");

        if (sheets == null)
            return;

        let selector = sheets[0];

        if (selector == null)
            return;

        var length = selector.options.length;

        for (let j = length - 1; j >= 0; j--) {
            selector.options[j] = null;
        }

        for (let k = 0; k < templates.length; k++) {
            var opt = document.createElement('option');
            opt.appendChild(document.createTextNode(templates[k]));
            opt.value = templates[k];
            selector.appendChild(opt);
        }

        selector.value = this.data.data.gtemplate;
    }

    async updateModifiedData(originaldata, extradata) {

        let existingData = await duplicate(originaldata);
        for (let prop in extradata) {
            if (extradata[prop] === null || extradata[prop] === undefined)
                delete extradata[prop];
            existingData[prop] = extradata[prop];
        }
        let newData = await this.actorUpdater(existingData);
        //console.log(newData);
        return newData;
    }

    //Overrides update method
    async update(data, options = {}) {

        //console.log("updating");
        //console.log("alla");
        //console.log(data);
        //console.log(options);
        let newdata = {};
        let scrollTop;

        if (data != null) {

            if (data["data.citems"] != null) {
                newdata = {};
                setProperty(newdata, "data", {});
                newdata.data.citems = data["data.citems"];
            }
            else {
                newdata = data;
            }

            if (data.biovisible != null) {
                options.diff = false;
            }

            //newdata["flags.sandbox." + "scrolls_" + game.user.id + "_" + this.id] = await this.sheet.scrollbarSet;


        }

        //console.log(newdata);

        if (this.data.data.gtemplate != null) {

            if (newdata == null) {
                setProperty(newdata, "flags", {});
            }

            if (!newdata.flags) {
                newdata["flags.sandbox." + "scrolls_" + game.user.id + "_" + this.id] = scrollTop;
            }

            else {
                if (!hasProperty(newdata.flags, "sandbox"))
                    setProperty(newdata.flags, "sandbox", {});
                newdata.flags.sandbox["scrolls_" + game.user.id + "_" + this.id] = scrollTop;
            }
        }

        //console.log(newdata);

        return super.update(newdata, options);

    }

    async addcItem(ciTem, addedBy = null, data = null, number = null) {
        //console.log("adding citems");
        //console.log(ciTem);

        if (data == null) {
            data = this.data;
        }

        let newdata = duplicate(data);
        let citems = data.data.citems;
        if (citems == null || citems.length == 0)
            citems = [];
        const attributes = data.data.attributes;

        let citemData;

        if (!hasProperty(ciTem.data.data.groups)) {
            citemData = ciTem.data._source.data;
        }
        else {
            citemData = ciTem.data.data;
        }

        let itemKey = "";
        let newItem = {};
        //console.log(ciTem.data.data.groups);
        setProperty(newItem, itemKey, {});
        newItem[itemKey].id = ciTem.id;
        newItem[itemKey].ikey = itemKey;
        newItem[itemKey].name = ciTem.data.name;
        let ciKey = ciTem.data.data.ciKey;
        if (ciKey == "")
            ciKey = ciTem.id;
        newItem[itemKey].ciKey = ciTem.data.data.ciKey;

        if (!data.data.istemplate) {
            if (number == null)
                number = 1;
            newItem[itemKey].number = number;
            newItem[itemKey].isactive = false;
            newItem[itemKey].isreset = true;

            let isunik = citemData.isUnique;

            for (let j = 0; j < citemData.groups.length; j++) {

                //let _groupcheck = await game.items.get(ciTem.data.data.groups[j].id);
                let _groupcheck = await auxMeth.getTElement(citemData.groups[j].id, "group", citemData.groups[j].ikey);
                let groupID = citemData.groups[j].id;
                if (_groupcheck.data.data.isUnique) {
                    for (let i = citems.length - 1; i >= 0; i--) {
                        //let citemObj = game.items.get(citems[i].id);
                        let citemObj = await auxMeth.getcItem(citems[i].id, citems[i].ciKey);
                        let hasgroup = citemObj.data.data.groups.some(y => y.id == groupID);

                        if (hasgroup) {
                            //                            newdata = await this.deletecItem(citems[i].id, true,data);
                            //                            citems = newdata.data.citems;
                            citems[i].todelete = true;
                        }

                    }
                }

            }

            //newItem[itemKey].attributes = ciTem.data.data.attributes;
            //newItem[itemKey].attributes = {};
            //IMPLEMENTATION FOR DEFVALUES IN CITEMS****
            newItem[itemKey].attributes = await duplicate(citemData.attributes);

            // for (var key in citemData.attributes) {
            //     let myprop = await auxMeth.getTElement("NONE", "property", key);
            //     if (myprop != null) {
            //         let defvalue = myprop.data.data.defvalue;
            //         let isauto = defvalue.match(/@|{|,|;|%|\[/g);
            //         if (isauto) {
            //             let newvalue = await auxMeth.autoParser(defvalue, attributes, citemData.attributes, false);
            //             newItem[itemKey].attributes[key].value = newvalue;
            //         }
            //     }
            // }

            var keys = Object.keys(citemData.attributes);

            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                if (keys[i] == "name" || keys[i] == "description")
                    continue;

                let myprop = await auxMeth.getTElement("NONE", "property", key);
                if (myprop != null) {
                    let defvalue = myprop.data.data.defvalue;
                    let isauto = defvalue.match(/@|{|,|;|%|\[/g);
                    if (isauto) {
                        let newvalue = await auxMeth.autoParser(defvalue, attributes, citemData.attributes, false);
                        newItem[itemKey].attributes[key].value = newvalue;
                    }
                }

            }

            newItem[itemKey].attributes.name = ciTem.data.name;
            newItem[itemKey].rolls = {};
            newItem[itemKey].lastroll = 0;

            newItem[itemKey].groups = citemData.groups;
            newItem[itemKey].usetype = citemData.usetype;
            newItem[itemKey].ispermanent = citemData.ispermanent;
            newItem[itemKey].rechargable = citemData.rechargable;
            let maxuses = citemData.maxuses;
            if (isNaN(maxuses))
                maxuses = await auxMeth.autoParser(maxuses, attributes, citemData.attributes, false);
            newItem[itemKey].maxuses = maxuses;
            newItem[itemKey].uses = parseInt(maxuses);
            newItem[itemKey].icon = citemData.icon;
            newItem[itemKey].selfdestruct = citemData.selfdestruct;
            newItem[itemKey].mods = [];
            for (let i = 0; i < citemData.mods.length; i++) {
                let _mod = citemData.mods[i];
                await newItem[itemKey].mods.push({
                    index: _mod.index,
                    citem: ciTem.id,
                    once: false,
                    exec: false,
                    attribute: _mod.attribute,
                    expr: _mod.value,
                    value: null
                });
            }

            //console.log(newItem);

            newItem[itemKey].disabledmods = [];

            if (addedBy) {
                newItem[itemKey].addedBy = addedBy;
            }
        }



        await citems.push(newItem[itemKey]);
        //console.log(citems);

        data.flags.haschanged = true;

        return citems;

    }

    async deletecItem(itemID, cascading = false, thisData = null) {
        //get Item
        //console.log("deleting");
        //console.log(this);

        if (itemID == null || itemID == "")
            return;

        let newdata;
        if (thisData == null) {
            newdata = duplicate(this.data);
        }
        else {
            newdata = thisData;
        }
        const attributes = newdata.data.attributes;
        const citems = newdata.data.citems;
        let toRemove = citems.find(y => y.id == itemID || y.ciKey == itemID);
        //let remObj = game.items.get(itemID);

        if (toRemove == null) {
            return newdata;
        }

        let remObj = await auxMeth.getcItem(itemID, toRemove.ciKey);

        //console.log(remObj);

        if (remObj != null && citems.length > 0 && (toRemove.isactive || toRemove.usetype == "PAS")) {
            let toRemoveObj = remObj.data.data;

            //Remove values added to attributes
            let addsetmods = toRemoveObj.mods.filter(y => y.type == "ADD");
            for (let i = 0; i < addsetmods.length; i++) {
                let modID = addsetmods[i].index;
                //console.log(addsetmods[i]);
                const _basecitem = await citems.find(y => y.id == itemID && y.mods.find(x => x.index == modID));

                if (_basecitem != null) {
                    const _mod = await _basecitem.mods.find(x => x.index == modID);

                    let myAtt = _mod.attribute;
                    let myAttValue = _mod.value;
                    let attProp = "value";

                    if (myAtt != null) {
                        if (myAtt.includes(".max")) {
                            attProp = "max";
                            myAtt = myAtt.replace(".max", "");
                        }
                        const actorAtt = attributes[myAtt];
                        let seedprop = game.items.find(y => y.data.data.attKey == myAtt);

                        if (actorAtt != null) {
                            if (addsetmods[i].type == "ADD") {
                                let jumpmod = await this.checkModConditional(this.data, addsetmods[i], _basecitem);
                                //console.log("cItem NO cumple condicional: " + jumpmod);
                                if (((toRemove.isactive && !toRemoveObj.ispermanent) || (toRemoveObj.usetype == "PAS" && !toRemoveObj.selfdestruct)) && !jumpmod) {

                                    let pdatatype = seedprop?.data.data.datatype || "other";

                                    if (pdatatype == "list") {
                                        let options = seedprop.data.data.listoptions.split(",");
                                        let optIndex = options.indexOf(actorAtt[attProp]);
                                        let newvalue = optIndex - myAttValue;

                                        if (newvalue < 0)
                                            newvalue = 0;
                                        actorAtt[attProp] = options[newvalue];
                                    }
                                    else {
                                        console.log("removing1");
                                        actorAtt[attProp] -= myAttValue;
                                    }

                                }

                            }
                        }

                    }
                }

            }

            let createmods = toRemoveObj.mods.filter(y => y.type == "CREATE");
            for (let h = 0; h < createmods.length; h++) {
                let ccmodID = createmods[h].index;
                let _ccitem = await citems.find(y => y.id == itemID && y.mods.find(x => x.index == ccmodID));
                if (_ccitem != null) {
                    let ccmod = await _ccitem.mods.find(x => x.index == ccmodID);
                    let ccAtt = ccmod.attribute;

                    attributes[ccAtt].value = attributes[ccAtt].prev;

                }
            }

            let setmods = toRemoveObj.mods.filter(y => y.type == "SET");
            for (let u = 0; u < setmods.length; u++) {
                let ccmodID = setmods[u].index;
                let _ccitem = await citems.find(y => y.id == itemID && y.mods.find(x => x.index == ccmodID));
                if (_ccitem != null) {
                    let ccmod = await _ccitem.mods.find(x => x.index == ccmodID);
                    let ccAtt = ccmod.attribute;
                    if (ccmod.exec)
                        if (attributes[ccAtt] != null)
                            attributes[ccAtt].value = attributes[ccAtt].prev;

                }
            }

            let listmods = toRemoveObj.mods.filter(y => y.type == "LIST");
            for (let j = 0; j < listmods.length; j++) {
                let modID = listmods[j];
                let myAtt = modID.attribute;
                let myAttValue = modID.value;
                let myAttListEdit = modID.listmod;
                let splitter = myAttValue.split(",");

                for (let k = 0; k < splitter.length; k++) {
                    let myOpt = splitter[k];

                    if (myAttListEdit == "INCLUDE") {
                        let optIndex = attributes[myAtt].listedit.add.indexOf(myOpt);
                        attributes[myAtt].listedit.add.splice(optIndex, 1);
                    }

                    if (myAttListEdit == "REMOVE") {
                        let optIndex = attributes[myAtt].listedit.remove.indexOf(myOpt);
                        attributes[myAtt].listedit.remove.splice(optIndex, 1);
                    }

                }

            }

            let itemsadded = citems.filter(y => y.addedBy == itemID);
            for (let j = 0; j < itemsadded.length; j++) {

                if (!toRemoveObj.ispermanent)
                    newdata = await this.deletecItem(itemsadded[j].id, true, newdata);
            }

        }

        citems.splice(citems.indexOf(toRemove), 1);
        this.data.flags.haschanged = true;

        //        if(this.isToken){
        //
        //            let tokenId = this.token.id;
        //            let mytoken = canvas.tokens.get(tokenId);
        //            //console.log(mytoken);
        //            await mytoken.update({"data.citems":citems},{diff:false});
        //        }

        return newdata;

    }

    async updateCItems() {
        const citems = this.data.data.citems;
        for (let i = 0; i < citems.length; i++) {
            let citem = citems[i];
            //let citemTemplate = game.items.get(citems[i].id);
            let citemTemplate = await auxMeth.getcItem(citems[i].id, citems[i].ciKey);

            if (citemTemplate != null && hasProperty(citemTemplate.data.data, "groups")) {
                for (let j = 0; j < citemTemplate.data.data.groups.length; j++) {
                    let groupID = citemTemplate.data.data.groups[j];
                    //let group = game.items.get(groupID.id);
                    let group = await auxMeth.getTElement(groupID.id, "group", groupID.ikey);

                    if (group != null) {
                        for (let y = 0; y < group.data.data.properties.length; y++) {
                            let property = group.data.data.properties[y];
                            if (property.isconstant && citem.attributes[property.ikey]) {

                                if (citem.attributes[property.ikey] != null) {
                                    if (citemTemplate.data.data.attributes[property.ikey] != null)
                                        if (citem.attributes[property.ikey].value != citemTemplate.data.data.attributes[property.ikey].value) {
                                            citem.attributes[property.ikey].value = citemTemplate.data.data.attributes[property.ikey].value;
                                        }
                                }

                            }
                        }
                    }


                }
            }

            else {
                citems.splice(citems.indexOf(citem), 1);
            }



        }

    }

    async checkAttConsistency(attributes, mods) {

        let attArray = [];
        //const attributes = this.data.data.attributes;
        //console.log(data.attributes);

        for (let k = 0; k < mods.length; k++) {
            let mod = mods[k];
            if (!attArray.includes(mods.attribute) && mod.attribute != "") {
                let moat = mod.attribute.replace(".max", "");
                await attArray.push(moat);
            }



        }
        //console.log(attArray);

        for (let i = 0; i < attArray.length; i++) {

            let attribute = attArray[i];
            let attID;
            //console.log(attribute);
            let propertypool = await game.items.filter(y => y.data.type == "property" && y.data.data.attKey == attribute);
            let property = propertypool[0];

            if (property != null) {

                if (!hasProperty(attributes, attribute)) {
                    //console.log("noatt");
                    await setProperty(attributes, attribute, {});
                }

                if (!hasProperty(attributes[attribute], "id")) {

                    await setProperty(attributes[attribute], "id", property.data.id);
                    attID = property.data.id;

                }

                let defvalue = await auxMeth.autoParser(property.data.data.defvalue, attributes, null, false);

                if (!hasProperty(attributes[attribute], "value")) {
                    //console.log("novalue");
                    await setProperty(attributes[attribute], "value", defvalue);
                }

                if (!hasProperty(attributes[attribute], "max")) {
                    //console.log("nomax");
                    await setProperty(attributes[attribute], "max", "");
                }

                if (!hasProperty(attributes[attribute], "prev")) {
                    //console.log("noprev");
                    await setProperty(attributes[attribute], "prev", defvalue);
                }
            }

        }

        //console.log(attributes);

    }

    async getMods(citemIDs) {
        //console.log(citemIDs);

        let mods = [];
        for (let n = 0; n < citemIDs.length; n++) {

            let ciID = citemIDs[n].id;
            //let cikeyID = citemIDs[n].ciKey;

            //let citemObjBase = await game.items.get(ciID);
            //console.log(ciID + " " + ciKey +  " " + citemIDs[n].name);
            let citemObjBase = await auxMeth.getcItem(ciID, citemIDs[n].ciKey);

            if (citemObjBase != null) {
                let citemObj = citemObjBase.data.data;
                if (!hasProperty(citemObj, "ciKey"))
                    citemObj = citemObjBase.data._source.data;

                for (let i = 0; i < citemObj.mods.length; i++) {
                    let toaddMod = duplicate(citemObj.mods[i]);
                    toaddMod.citem = ciID;
                    toaddMod.ciKey = citemIDs[n].ciKey;

                    let actorCiMod = citemIDs[n].mods.find(y => y.index == toaddMod.index);
                    toaddMod.once = actorCiMod.once;
                    toaddMod.exec = actorCiMod.exec;
                    await mods.push(toaddMod);
                }
            }

        }

        //console.log(mods);

        return mods;
    }

    async execITEMmods(mods, data) {
        let result = {};
        let citemIDs = data.data.citems;
        let newcitem = false;
        let updatecItem = true;
        const itemmods = mods.filter(y => y.type == "ITEM");

        let selector = false;
        result.iterate = false;

        if (itemmods.length == 0) {
            return result;
        }


        for (let i = 0; i < itemmods.length; i++) {
            let mod = itemmods[i];
            //console.log(mod);
            //let _citem = game.items.get(mod.citem).data.data;
            let _citemfinder = await auxMeth.getcItem(mod.citem, mod.ciKey);
            let _citem = _citemfinder.data.data;
            //console.log(_citem);
            if (!hasProperty(_citem, "ciKey"))
                _citem = _citemfinder.data._source.data;

            let citem = citemIDs.find(y => y.id == mod.citem || y.ciKey == mod.ciKey);
            //console.log(citem);
            if (citem == null)
                continue;
            let jumpmod = false;

            jumpmod = await this.checkModConditional(data, mod, citem);
            //console.log("ITEM Mod " + mod.name + " from Citem " + citem.name + " saltar: " + jumpmod + " once: " + mod.once);
            const _originalcitemmod = await _citem.mods.find(y => y.index == mod.index);
            //console.log(_originalcitemmod);
            const _basecitem = await citemIDs.find(y => y.id == mod.citem && y.ciKey == mod.ciKey && y.mods.find(x => x.index == mod.index));
            //console.log(_basecitem);
            const _mod = await _basecitem.mods.find(x => x.index == mod.index);


            //if (!jumpmod) {
            if (mod.selectnum == 0) {

                for (let k = 0; k < mod.items.length; k++) {

                    let itemtoadd = mod.items[k];
                    let ispresent = citemIDs.some(y => y.id == itemtoadd.id || y.ciKey == itemtoadd.ciKey);
                    //console.log(itemtoadd.name + " " + itemtoadd.id + " " + itemtoadd.ciKey);
                    let ispresentObj;

                    if (ispresent) {
                        ispresentObj = citemIDs.find(y => y.id == itemtoadd.id || y.ciKey == itemtoadd.ciKey);
                    }
                    else {
                        //Change for keeping added items when activated
                        _mod.exec = false;
                    }

                    if ((_citem.usetype == "PAS" || citem.isactive) && !jumpmod) {

                        if (!ispresent && !_mod.exec && !_mod.once) {
                            let toadd = await auxMeth.getcItem(itemtoadd.id, itemtoadd.ciKey);
                            citemIDs = await this.addcItem(toadd, mod.citem, data);
                            result.iterate = true;

                            newcitem = true;
                            //Change for keeping added items when activated
                            _mod.exec = true;
                            if (_originalcitemmod.once)
                                _mod.once = true;
                        }
                    }

                    else {
                        if (ispresent && !_citem.ispermanent) {
                            //Change for keeping added items when activated
                            if (ispresentObj.addedBy == mod.citem && _mod.exec) {
                                newcitem = true;
                                let citemmod = citemIDs.find(y => y.id == itemtoadd.id);
                                let cindex = citemIDs.indexOf(citemmod);
                                console.log("removing " + itemtoadd.name);
                                let duplicanto = await this.deletecItem(itemtoadd.id, true, data);
                                citemIDs = duplicanto.data.citems;
                                await mods.splice(mods.findIndex(e => e.citem === itemtoadd.id), 1);
                            }

                            _mod.exec = false;
                        }
                    }

                }
            }

            else {
                if (!jumpmod) {
                    //let thiscitem = citemIDs.find(y => y.id == mod.citem);

                    if (!hasProperty(citem, "selection")) {
                        setProperty(citem, "selection", []);
                    }

                    let selindex = citem.selection.find(y => y.index == mod.index);

                    if (selindex == null) {
                        let newindex = {};
                        newindex.index = mod.index;
                        newindex.selected = false;
                        citem.selection.push(newindex);
                        selector = true;
                    }

                    else {
                        if (!selindex.selected) {
                            selector = true;
                        }
                    }
                }


            }
            //}

        }

        result.citems = citemIDs;
        result.selector = selector;
        //console.log(result);

        return result;
    }

    async setInputColor() {

        const citemIDs = this.data.data.citems;

        for (let j = 0; j < citemIDs.length; j++) {
            const mods = citemIDs[j].mods;
            if (mods != null) {
                for (let i = 0; i < mods.length; i++) {
                    if (mods[i].exec) {
                        const thismod = mods[i];

                        let charsheet;
                        if (this.token == null) {
                            charsheet = document.getElementById("actor-" + this.id);
                        }
                        else {
                            charsheet = document.getElementById("actor-" + this.id + "-" + this.token.data.id);
                        }

                        if (charsheet != null) {
                            let attinput = charsheet.getElementsByClassName(thismod.attribute);

                            if (attinput[0] != null) {
                                if (parseInt(thismod.value) < 0) {
                                    attinput[0].className += " input-red";
                                }
                                else {
                                    attinput[0].className += " input-green";
                                }
                            }
                        }

                    }
                }
            }

        }

    }

    async checkModConditional(data, mod, actorcitem) {
        //console.log(mod);
        //console.log(data);
        //const mycitem = auxMeth.getcItem(mod.citem,mod.ciKey);
        const citemIDs = data.data.citems;
        const attributes = data.data.attributes;
        let condAtt = mod.condat;
        let jumpmod = false;

        if (condAtt != null && condAtt != "" && mod.condat != "") {
            let condValue = await auxMeth.autoParser(mod.condvalue, attributes, actorcitem.attributes, false);
            let attIntValue;
            if (condAtt.includes("#{") || condAtt.includes("@{")) {

                attIntValue = await auxMeth.autoParser(condAtt, attributes, actorcitem.attributes, false);
            }

            else {
                if (attIntValue == false || attIntValue == true) {
                    attIntValue = attributes[condAtt].value;
                }
                else {
                    if (attributes[condAtt] != null) {
                        if (!isNaN(attIntValue)) {
                            attIntValue = parseInt(attributes[condAtt].value);
                        }
                        else {
                            attIntValue = attributes[condAtt].value;
                        }
                    }
                    else {
                        return jumpmod;
                    }

                }



            }

            //console.log("Comparing " + condAtt + " " + attIntValue + " " + condValue);

            if (mod.condop == "EQU") {
                if (attIntValue.toString() != mod.condvalue.toString()) {
                    jumpmod = true;
                }
            }

            else if (mod.condop == "HIH") {
                if (!isNaN(attIntValue) && !isNaN(condValue)) {
                    if (Number(attIntValue) <= Number(condValue)) {
                        jumpmod = true;
                    }
                }

            }

            else if (mod.condop == "LOW") {
                if (!isNaN(attIntValue) && !isNaN(condValue))
                    if (Number(attIntValue) >= Number(condValue)) {
                        jumpmod = true;
                    }
            }
        }


        //console.log(jumpmod);
        return jumpmod;
    }

    async setdefcItems(actorData) {
        //ADDS defauls CITEMS
        const citemIDs = actorData.data.citems;

        let citems;

        let mytemplate = actorData.data.gtemplate;
        if (mytemplate != "Default") {
            let _template = await game.actors.find(y => y.data.data.istemplate && y.data.data.gtemplate == mytemplate);

            if (_template != null) {
                for (let k = 0; k < _template.data.data.citems.length; k++) {
                    let mycitemId = _template.data.data.citems[k].id;
                    let mycitemiKey = _template.data.data.citems[k].ciKey;
                    //let mycitem = game.items.get(mycitemId);
                    let mycitem = await auxMeth.getcItem(mycitemId, mycitemiKey);
                    let citeminActor = await citemIDs.find(y => y.id == mycitemId || y.ciKey == mycitemiKey);

                    if (!citeminActor && mycitem != null) {
                        citems = await this.addcItem(mycitem, null, actorData);
                    }
                }
            }
        }

        if (citems == null)
            citems = citemIDs;

        return citems;
    }

    async removeDropcITems(actorData) {
        //Removes cITems marked for removal CITEMS
        const citemIDs = actorData.data.citems;
        let toreturn;
        for (let k = 0; k < citemIDs.length; k++) {
            let mycitem = citemIDs[k];

            if (mycitem.todelete)
                actorData = await this.deletecItem(mycitem.id, true, actorData);
        }

        return actorData;
    }

    async checkcItemConsistency(actorData) {
        //Removes cITems marked for removal CITEMS
        const citemIDs = actorData.data.citems;
        const attributes = actorData.data.attributes;

        for (let k = 0; k < citemIDs.length; k++) {
            const mycitem = citemIDs[k];

            //let cIOrigTemplate = game.items.get(mycitem.id);
            let cIOrigTemplate = await auxMeth.getcItem(mycitem.id, mycitem.ciKey);
            //If no template remove cItem
            if (cIOrigTemplate == null) {
                await citemIDs.splice(citemIDs.indexOf(mycitem), 1);
                continue;
            }

            if (mycitem.ciKey == null)
                mycitem.ciKey = cIOrigTemplate.data.data.ciKey;

            let cITemplate = await duplicate(cIOrigTemplate);
            let requestUpdate = false;
            let updatecItem = false;

            //TODO CHECK FOR CHANGED ATTRIBUTES IN ORIGINAL CITEM
            for (let j = 0; j < cITemplate.data.groups.length; j++) {
                let myGroup = cITemplate.data.groups[j];
                //let myGroupTemp = game.items.get(myGroup.id);
                let myGroupTemp = await auxMeth.getTElement(myGroup.id, "group", myGroup.ikey);
                //If no group remove cItem
                if (myGroupTemp == null) {
                    citemIDs.splice(citemIDs.indexOf(k), 1);
                    break;
                }

                let groupProps = myGroupTemp.data.data.properties;

                for (let j = 0; j < groupProps.length; j++) {
                    let myPropId = groupProps[j].id;
                    //let myProp = game.items.get(myPropId);
                    let myProp = await auxMeth.getTElement(myPropId, "property", groupProps[j].ikey);
                    if (myProp == null)
                        break;
                    let att = myProp.data.data.attKey;
                    let tempAtt = cITemplate.data.attributes[att];
                    let newvalue;

                    if (tempAtt != null) {

                        if (hasProperty(mycitem.attributes, att)) {
                            if (groupProps[j].isconstant && tempAtt.value != mycitem.attributes[att].value) {
                                if (actorData.permission.default >= CONST.ENTITY_PERMISSIONS.OBSERVER || actorData.permission[game.user.id] >= CONST.ENTITY_PERMISSIONS.OBSERVER || game.user.isGM)
                                    mycitem.attributes[att].value = tempAtt.value;

                            }
                        }

                        if (game.user.isGM)
                            newvalue = tempAtt.value;

                    }

                    else {
                        updatecItem = true;
                        if (myProp.data.data.datatype === "simplenumeric") {
                            newvalue = await auxMeth.autoParser(myProp.data.data.defvalue, attributes, cITemplate.data.attributes, false);
                        }

                        else {
                            newvalue = await auxMeth.autoParser(myProp.data.data.defvalue, attributes, cITemplate.data.attributes, true);
                        }

                        //GUARDA Y LUEGO ACCEDE
                        if (game.user.isGM) {
                            setProperty(cITemplate.data.attributes, att, {});
                            cITemplate.data.attributes[att].value = newvalue;
                        }

                        else {
                            //REQUEST UPDATE
                            console.log("2: " + att + " " + mycitem.name);
                            requestUpdate = true;
                        }
                    }

                    if (!hasProperty(mycitem.attributes, att)) {
                        if (this.data.permission.default >= CONST.ENTITY_PERMISSIONS.OBSERVER || this.data.permission[game.user.id] >= CONST.ENTITY_PERMISSIONS.OBSERVER || game.user.isGM) {
                            setProperty(mycitem.attributes, att, {});
                            setProperty(mycitem.attributes[att], "value", newvalue);
                        }

                    }



                }

            }

            if (game.user.isGM) {
                if (updatecItem) {
                    await cIOrigTemplate.update({ "data.attributes": cITemplate.data.attributes });
                }

                for (let i = 0; i < cITemplate.data.mods.length; i++) {
                    let originalmod = cITemplate.data.mods[i];
                    let mymod = mycitem.mods.find(y => y.index == originalmod.index);
                    if (mymod == null) {
                        await mycitem.mods.push({
                            index: originalmod.index,
                            citem: mycitem.id,
                            once: originalmod.once,
                            exec: false,
                            attribute: originalmod.attribute,
                            expr: originalmod.value,
                            value: null
                        });
                    }
                    // else {
                    //     if (mymod.items != null)
                    //         if (mymod.items.length > 0) {
                    //             for (let h = 0; h < mymod.items.length; h++) {
                    //                 if (mymod.items[h].ciKey == null) {
                    //                     let toaddotem = await auxMeth.getcItem(mymod.items[h].id);
                    //                     if (toaddotem)
                    //                         mymod.items[h].ciKey = toaddotem.data.data.ciKey;
                    //                 }

                    //             }
                    //         }
                    // }


                }
            }

            else {
                if (requestUpdate == true)
                    ui.notifications.warn("Please ask your GM to Reload template on your character, there are broken cItems");
            }

        }

        return citemIDs;
    }

    async checkActorMods(citemIDs, mods) {
        for (let i = 0; i < citemIDs.length; i++) {
            let myCImods = citemIDs[i].mods;
            for (let j = 0; j < myCImods.length; j++) {
                let modexists = mods.find(y => y.index == myCImods[j].index && y.citem == myCImods[j].citem);

                if (modexists == null)
                    delete myCImods[j];
            }

        }
    }

    async checkPropAuto(actorData, repeat = false) {
        //console.log("checking auto properties");
        //        await this.update({"flags.ischeckingauto":true});
        //        this.data.flags.ischeckingauto = true;
        //        this.data.flags.hasupdated = false;
        let newcitem = false;
        let newroll = false;
        let ithaschanged = false;
        //console.log(actorData);

        const attributes = actorData.data.attributes;


        //console.log(this.data.data.attributes);
        //console.log(actorData);
        let attributearray = [];

        //console.log(sheetAtts);

        for (let attribute in attributes) {
            //console.log(attribute);
            let attdata = attributes[attribute];

            if (Array.isArray(attdata.value))
                attdata.value = attdata.value[0];
            //console.log(attdata.name + " " + attdata.value + " isset " + attdata.isset);
            await setProperty(attdata, "isset", false);
            await setProperty(attdata, "maxset", false);
            await setProperty(attdata, "default", false);

            //TEST TO DELETE
            await setProperty(attdata, "autoadd", 0);
            await setProperty(attdata, "maxadd", 0);
            await setProperty(attdata, "maxexec", false);

            attributearray.push(attribute);

            //}

        }

        //CHECKING CI ITEMS
        actorData = await this.removeDropcITems(actorData);
        actorData.data.citems = await this.setdefcItems(actorData);
        actorData.data.citems = await this.checkcItemConsistency(actorData);

        let mods = [];
        let resMods = true;

        while (resMods) {

            mods = await this.getMods(actorData.data.citems);
            let newmodcitems = await this.execITEMmods(mods, actorData);
            resMods = newmodcitems.iterate;

            actorData.data.selector = newmodcitems.selector;
            if (resMods) {
                newcitem = true;
                ithaschanged = true;

                actorData.data.citems = newmodcitems.citems;
            }
            // console.log(resMods.citems);
        }

        //console.log(mods);
        //actorData.data.citems = this.checkActorMods(actorData.data.citems,mods);

        const citemIDs = actorData.data.citems;
        let originalcIDs = duplicate(citemIDs);
        //console.log(citemIDs);

        await this.updateCItems();
        if (mods.length > 0)
            await this.checkAttConsistency(attributes, mods);

        const rolls = actorData.data.rolls;

        //CREATE MODS
        const createmods = mods.filter(y => y.type == "CREATE");
        for (let i = 0; i < createmods.length; i++) {
            let mod = createmods[i];
            //console.log(mod);
            let modAtt = mod.attribute;
            let mod_defvalue = mod.value;
            if (!hasProperty(attributes, modAtt)) {
                setProperty(attributes, modAtt, {});
                setProperty(attributes[modAtt], "id", mod.citem + "_" + mod.index);
                setProperty(attributes[modAtt], "value", mod_defvalue);
                setProperty(attributes[modAtt], "prev", mod_defvalue);
                setProperty(attributes[modAtt], "autoadd", 0);
                setProperty(attributes[modAtt], "isset", false);
                setProperty(attributes[modAtt], "created", true);
                setProperty(attributes[modAtt], "hastotals", false);
            }

        }

        //CHECK DEFVALUES IF IS NOT AUTO!!
        for (let i = 0; i < attributearray.length; i++) {
            let attribute = attributearray[i];
            let attdata = attributes[attribute];
            //let property = await game.items.get(actorData.data.attributes[attribute].id);
            let property = await auxMeth.getTElement(actorData.data.attributes[attribute].id, "property", attribute);
            const actorAtt = actorData.data.attributes[attribute];

            if (property != null) {
                if (actorAtt.value === "" && property.data.data.auto == "" && !property.data.data.defvalue.includes(".max}")) {
                    if (property.data.data.defvalue != "" || (property.data.data.datatype == "checkbox")) {

                        //console.log("defaulting " + attribute);

                        //console.log(property.data.data.defvalue);
                        let exprmode = false;
                        if (property.data.data.datatype == "simpletext" || property.data.data.datatype == "textarea")
                            exprmode = true;
                        let newValue = await auxMeth.autoParser(property.data.data.defvalue, attributes, null, exprmode);
                        if (property.data.data.datatype == "checkbox") {

                            if (newValue == null) {
                                newValue = false;
                            }
                            else if (newValue == "" || newValue == 0 || newValue === "false") {
                                newValue = false;
                            }

                            else {
                                newValue = true;
                            }

                        }
                        //console.log("defaulting " + attribute + " to " + newValue);
                        if (actorAtt.value != newValue)
                            ithaschanged = true;

                        actorAtt.value = newValue;

                    }

                }
                //console.log(property.data.data);
                //TODO DEFVALUE PARA MAX

                if (attdata.modmax)
                    attdata.maxblocked = true;

                if (actorAtt.max == null || actorAtt.max == "")
                    attdata.maxblocked = false;

                if (property.data.data.automax != null) {
                    if (property.data.data.automax != "") {
                        //console.log(property.data.data.automax);
                        if (!hasProperty(attdata, "maxblocked"))
                            attdata.maxblocked = false;
                        if (!attdata.maxblocked) {
                            actorAtt.max = await auxMeth.autoParser(property.data.data.automax, attributes, null, false);
                            //console.log(attribute +" max to " + actorAtt.max);
                        }

                    }
                }

                if (actorAtt.max == null || actorAtt.max == "")
                    attdata.maxblocked = false;


            }

        }

        //console.log(attributes);

        //CI SET MODS
        const setmods = mods.filter(y => y.type == "SET");
        for (let i = 0; i < setmods.length; i++) {
            let mod = setmods[i];
            //console.log(mod);
            let modAtt = mod.attribute;
            let attProp = "value";
            let modvable = "modified";
            let setvble = "isset";
            if (modAtt.includes(".max")) {
                modAtt = modAtt.replace(".max", "");
                attProp = "max";
                modvable = "modmax";
                setvble = "maxset";
            }

            let citem = citemIDs.find(y => y.id == mod.citem);

            let jumpmod = false;
            if (mod.condop != "NON" && mod.condop != null) {
                jumpmod = await this.checkModConditional(actorData, mod, citem);
            }

            if (hasProperty(attributes, modAtt)) {
                let value = mod.value;

                let finalvalue = value;

                //console.log(mod.name + " " + mod.citem + " " + mod.index + " " + mod.value);



                //let _citem = await game.items.get(mod.citem).data.data; CUIDAO AQUI mod.cIKEy as puesto
                let _citemfinder = await auxMeth.getcItem(mod.citem, mod.ciKey);
                let _citem = _citemfinder.data.data;

                finalvalue = await auxMeth.autoParser(value, attributes, citem.attributes, true, false, citem.number);
                //console.log(finalvalue);

                const myAtt = attributes[modAtt];
                //console.log(mod.name + " " + mod.citem + " " + mod.index);

                const _basecitem = await citemIDs.find(y => y.id == mod.citem && y.mods.find(x => x.index == mod.index));
                const _mod = await _basecitem.mods.find(x => x.index == mod.index);

                if (_mod == null)
                    console.log(citem);

                //Checks if mod has not changed. TODO METHOD TO CHECK THIS AND MOD EXISTING IN BETTER WAY
                //if(_mod.exec && (_mod.value!=finalvalue || _mod.attribute!=modAtt)){
                if (_mod.exec && (_mod.attribute != modAtt)) {
                    _mod.exec = false;
                }

                if (_mod.expr != null) {
                    if (finalvalue != _mod.expr) {
                        _mod.exec = false;
                    }

                }

                _mod.expr = finalvalue;

                let textexpr = value.match(/[|]/g);
                if (textexpr == null && (value.charAt(0) != "|")) {
                    finalvalue = await auxMeth.autoParser(finalvalue, attributes, citem.attributes, false, false, citem.number);
                }



                if ((_citem.usetype == "PAS" || citem.isactive) && !jumpmod) {
                    // if (!_mod.exec)
                    //     myAtt[setvble] = true;
                    if (attProp != "max" || (attProp == "max" && !myAtt.maxblocked)) {
                        //console.log("Setting" + modAtt + " to " + finalvalue);
                        if (!_mod.exec)
                            myAtt.prev = myAtt[attProp];
                        _mod.exec = true;
                        _mod.value = finalvalue;
                        _mod.attribute = mod.attribute;
                        ithaschanged = true;
                        myAtt[attProp] = finalvalue;
                        myAtt[setvble] = true;

                    }
                    //console.log(myAtt[setvble] + " " + setvble );


                }

                else {
                    if (_mod.exec) {
                        _mod.exec = false;
                        myAtt[attProp] = myAtt.prev;
                    }


                }

            }

        }
        //console.log(attributes["CA"]);

        //CI ADD TO NON AUTO ATTR
        const addmods = mods.filter(y => y.type == "ADD");
        for (let i = 0; i < addmods.length; i++) {
            let mod = addmods[i];
            let modAtt = mod.attribute;
            let attProp = "value";
            let modvable = "modified";
            let setvble = "isset";
            if (modAtt.includes(".max")) {
                modAtt = modAtt.replace(".max", "");
                attProp = "max";
                modvable = "modmax";
                setvble = "maxset";
            }
            //console.log(modAtt);

            let citem = await citemIDs.find(y => y.id == mod.citem);

            let jumpmod = false;
            if (mod.condop != "NON" && mod.condop != null) {
                jumpmod = await this.checkModConditional(actorData, mod, citem);
            }
            //console.log(jumpmod);
            //console.log(mod.citem);

            //let _citem = await game.items.get(mod.citem).data.data;
            let _citemfinder = await auxMeth.getcItem(mod.citem, mod.ciKey);
            let _citem = _citemfinder.data.data;

            if (hasProperty(attributes, modAtt)) {

                const myAtt = attributes[modAtt];

                //let seedprop = game.items.get(myAtt.id);
                let seedprop = await auxMeth.getTElement(myAtt.id, "property", modAtt);
                let checker = false;
                if (seedprop != null) {
                    if (seedprop != null && ((seedprop.data.data.automax == "" && attProp == "max") || (seedprop.data.data.auto == "" && attProp == "value")) && (seedprop.data.data.datatype == "simplenumeric" || seedprop.data.data.datatype == "radio" || seedprop.data.data.datatype == "badge" || seedprop.data.data.datatype == "list")) {
                        checker = true;
                    }
                }


                if (myAtt.created || checker) {

                    let value = mod.value;
                    if (value == null)
                        value = 0;
                    let finalvalue = value;
                    if (value != null) {
                        if (isNaN(value)) {
                            if (value.charAt(0) == "|") {
                                value = value.replace("|", "");
                                finalvalue = await auxMeth.autoParser(value, attributes, citem.attributes, true, false, citem.number);
                            }
                            else {
                                finalvalue = await auxMeth.autoParser(value, attributes, citem.attributes, false, false, citem.number);
                            }
                        }
                    }


                    finalvalue = Number(finalvalue);

                    //console.log(mods);

                    const _basecitem = await citemIDs.find(y => y.id == mod.citem && y.mods.find(x => x.index == mod.index));
                    if (_basecitem == null)
                        break;
                    const _mod = await _basecitem.mods.find(x => x.index == mod.index);
                    const _origmod = await _citem.mods.find(x => x.index == mod.index);

                    if (citem.selfdestruct) {
                        if (citem.usetype == "PAS") {
                            citem.ispermanent = true;

                        }

                    }

                    //console.log(_basecitem.name + " " + _mod.exec);
                    let exprcheck = _mod.expr;
                    if (exprcheck == undefined)
                        exprcheck = "";
                    let checkroll;
                    if (exprcheck != "" || exprcheck != null)
                        checkroll = exprcheck.match(/(d[%@(])|(d[0-9]+)/g);
                    if (_mod.exec && ((_mod.value != finalvalue && checkroll == null) || _mod.attribute != modAtt)) {
                        //console.log("resetting " + _mod.attribute);
                        if (!citem.ispermanent) {
                            if (!_mod.attribute.includes(".max")) {
                                attributes[_mod.attribute].value = Number(attributes[_mod.attribute].value) - _mod.value;
                            }
                            else {
                                attributes[_mod.attribute].max = Number(attributes[_mod.attribute].max) - _mod.value;
                            }
                        }

                        _mod.exec = false;
                    }

                    //console.log(myAtt[attProp]);
                    //console.log(mod.name + " exec: " + _mod.exec + " to att:" + modAtt + " isactive " + citem.isactive + " ignoreCond " + jumpmod);
                    if ((_citem.usetype == "PAS" || citem.isactive) && !jumpmod) {

                        if (!_mod.exec || (myAtt[modvable] && !_mod.once)) {
                            myAtt.prev = myAtt[attProp];

                            let pdatatype = seedprop?.data.data.datatype || "other";

                            if (pdatatype == "list") {
                                let options = seedprop.data.data.listoptions.split(",");
                                let optIndex = options.indexOf(myAtt[attProp]);
                                let newvalue = optIndex + finalvalue;
                                if (newvalue + 1 > options.length)
                                    newvalue = options.length - 1;
                                myAtt[attProp] = options[newvalue];
                            }
                            else {
                                myAtt[attProp] = parseInt(Number(myAtt[attProp]) + finalvalue);
                            }

                            //Prueba
                            if (_origmod.once)
                                _mod.once = true;

                            ithaschanged = true;

                            _mod.exec = true;
                            _mod.value = finalvalue;
                            _mod.attribute = modAtt;

                            if (seedprop != null) {
                                if (attProp == "value" && myAtt.max != "" && seedprop.data.data.automax != "") {

                                    if (myAtt[attProp] > myAtt.max && seedprop.data.data.maxtop) {
                                        myAtt[attProp] = myAtt.max;
                                        ithaschanged = true;
                                    }

                                }
                            }


                        }


                    }
                    else {
                        //console.log("isreset:" + citem.isreset + " isactive:" + citem.isactive + " jumpmod: " + jumpmod + " default:" + myAtt.default + " _exec:" + _mod.exec + " ispermanent: " + citem.ispermanent);
                        if ((!citem.isreset || _citem.usetype == "PAS") && _mod.exec && ((citem.isactive && jumpmod) || !citem.isactive) && !myAtt.default && !citem.ispermanent) {
                            //console.log("removing add");
                            _mod.exec = false;
                            if (seedprop.data.data.datatype == "list") {
                                let options = seedprop.data.data.listoptions.split(",");
                                let optIndex = options.indexOf(myAtt[attProp]);
                                let newvalue = optIndex - finalvalue;
                                console.log(options);
                                console.log(optIndex);
                                console.log(finalvalue);
                                console.log(newvalue);
                                if (newvalue < 0)
                                    newvalue = 0;
                                myAtt[attProp] = options[newvalue];
                            }
                            else {
                                myAtt[attProp] = Number(myAtt[attProp]) - Number(finalvalue);
                            }

                            ithaschanged = true;
                        }
                    }

                }

            }
        }

        //AUTO PROPERTIES PRE CALCULATIONS
        //ithaschanged = await this.autoCalculateAttributes(actorData,attributearray,attributes,true);

        //console.log(attributes);
        //CI ADD TO AUTO ATTR
        for (let r = 0; r < 2; r++) {
            for (let i = 0; i < addmods.length; i++) {
                let mod = addmods[i];
                let modAtt = mod.attribute;
                let attProp = "value";
                let modvable = "modified";
                let setvble = "isset";
                if (modAtt.includes(".max")) {
                    modAtt = modAtt.replace(".max", "");
                    attProp = "max";
                    modvable = "modmax";
                    setvble = "maxset";
                }

                let citem = citemIDs.find(y => y.id == mod.citem);

                let jumpmod = false;
                if (mod.condop != "NON" && mod.condop != null) {
                    jumpmod = await this.checkModConditional(actorData, mod, citem);
                }


                //let _citem = game.items.get(mod.citem).data.data;
                let _citemfinder = await auxMeth.getcItem(mod.citem, mod.ciKey);
                let _citem = _citemfinder.data.data;

                //console.log("entering " + mod.name + " " + jumpmod + " for" + modAtt);
                if (hasProperty(attributes, modAtt)) {

                    const myAtt = attributes[modAtt];

                    //let seedprop = game.items.get(myAtt.id);
                    let seedprop = await auxMeth.getTElement(myAtt.id, "property", modAtt);
                    let checker = false;
                    if (seedprop != null) {
                        if ((((seedprop.data.data.automax != "" && attProp == "max") || (seedprop.data.data.auto != "" && attProp == "value")) && (seedprop.data.data.datatype == "simplenumeric" || seedprop.data.data.datatype == "radio" || seedprop.data.data.datatype == "badge")))
                            checker = true;
                    }


                    if (checker) {
                        let value = mod.value;
                        let finalvalue = value;

                        if (isNaN(value)) {
                            if (value.charAt(0) == "|") {
                                value = value.replace("|", "");
                                finalvalue = await auxMeth.autoParser(value, attributes, citem.attributes, true, false, parseInt(citem.number));
                            }
                            else {
                                finalvalue = await auxMeth.autoParser(value, attributes, citem.attributes, false, false, parseInt(citem.number));
                            }
                        }



                        const _basecitem = await citemIDs.find(y => y.id == mod.citem && y.mods.find(x => x.index == mod.index));
                        //console.log(_basecitem);

                        if (_basecitem != null) {
                            const _mod = await _basecitem.mods.find(x => x.index == mod.index);

                            let exprcheck = _mod.expr.toString();
                            let checkroll = exprcheck.match(/(d[%@(])|(d[0-9]+)/g);

                            if (_mod.exec && checkroll != null) {
                                //console.log("die expression")
                                finalvalue = _mod.value;
                            }

                            if (_mod.exec && ((_mod.value != finalvalue && checkroll == null) || _mod.attribute != modAtt)) {
                                //console.log("resetting " + _mod.attribute);

                                let special = attributes[modAtt];
                                //console.log(special);
                                if (!citem.ispermanent) {
                                    if (!_mod.attribute.includes(".max")) {
                                        special.value = Number(special.value) - _mod.value;
                                    }
                                    //                                else{
                                    //                                    //AQUI ESTA EL ERRIR!!!
                                    //                                    special.max = Number(special.max) - _mod.value;
                                    //                                }
                                }

                                _mod.exec = false;
                            }

                            //console.log(myAtt);
                            if (myAtt[setvble]) {
                                _mod.exec = false;
                            }

                            //
                            //                        console.log("finalvalue:" + finalvalue);
                            //                        console.log("expr:" + _mod.expr);
                            //                        console.log("value:" + _mod.value);

                            //console.log("current value:" + attributes[_mod.attribute].value);

                            //console.log("Previo exec:" + _mod.exec + " name:" + citem.name + " to att:" + modAtt + " finalvalue:" + finalvalue + " isset:" + myAtt.isset + " autoadd: " + myAtt["autoadd"]);
                            if ((_citem.usetype == "PAS" || citem.isactive) && !jumpmod && !_mod.once) {

                                //console.log(attProp + " :att/Prop - auto: " + seedprop.data.data.auto);
                                //if(!_mod.exec || (myAtt[modvable] && !mod.once)){
                                //if((seedprop.data.data.automax!="" && attProp=="max") || (seedprop.data.data.auto!="" && attProp=="value")){
                                //console.log("activating mod");
                                ithaschanged = true;

                                _mod.value = finalvalue;
                                _mod.attribute = mod.attribute;

                                //TEST TO REINSTATE
                                //myAtt.isset = true;
                                //myAtt[attProp] = await Number(myAtt[attProp]) + Number(finalvalue);

                                //console.log(rawexp);
                                //console.log(exprmode);



                                //TEST TO DELETE
                                if (r == 0 || !_mod.exec) {
                                    if (attProp == "value")
                                        myAtt["autoadd"] += Number(finalvalue);
                                    if (attProp == "max")
                                        myAtt["maxadd"] += Number(finalvalue);
                                }


                                //console.log("adding auto Add to " + modAtt + " autoadd " + myAtt["autoadd"]);

                                if (seedprop != null) {
                                    if (attProp == "value" && myAtt.max != "" && seedprop.data.data.automax != "") {
                                        //console.log("changemax");
                                        if (myAtt[attProp] > myAtt.max && seedprop.data.data.maxtop) {
                                            myAtt[attProp] = myAtt.max;
                                            ithaschanged = true;
                                        }

                                    }
                                }


                                _mod.exec = true;
                                //Prueba
                                if (mod.once)
                                    _mod.once = true;

                                //}

                            }

                            else {
                                //REMOVE PAS IF IT DOES NOT WORK
                                if ((!citem.isreset || _citem.usetype == "PAS" || jumpmod) && !_citem.isactive) {

                                    if (!myAtt.default && _mod.exec && !citem.ispermanent) {

                                        //myAtt[attProp] = Number(myAtt[attProp]) - Number(finalvalue);
                                        //console.log("Previous in " + modAtt + " autoadd: " + myAtt["autoadd"]);

                                        ithaschanged = true;

                                        //console.log("removing auto Add to " + modAtt + " finalvalue: " + finalvalue + " autoadd: " + myAtt["autoadd"]);
                                    }
                                    //console.log("setting to false " + modAtt);
                                    _mod.exec = false;
                                    //myAtt[setvble] = false;

                                }
                            }
                        }
                        else {
                            //Error on citem,just remove it
                            citemIDs.splice(citemIDs.indexOf(citem), 1);
                        }

                        //console.log(" name:" + citem.name + " default:" + myAtt.default + " isreset:" + citem.isreset + " value:" + finalvalue + " isset:" + myAtt.isset);

                    }

                }
            }
            if (r == 0)
                ithaschanged = await this.autoCalculateAttributes(actorData, attributearray, attributes, true, false);
        }
        //console.log(attributes);


        //console.log(attributes);
        //return;

        //ADD ROLLS
        const rollmods = mods.filter(y => y.type == "ROLL");
        //
        for (let roll in rolls) {
            //ithaschanged = true;

            rolls[roll].modified = false;
            setProperty(rolls[roll], "value", "");


        }

        //console.log(rolls);

        for (let i = 0; i < rollmods.length; i++) {
            let mod = rollmods[i];
            //console.log(mod);
            let rollID = mod.attribute;
            let rollvaluemod = mod.value;
            //console.log(mod);
            let citem = citemIDs.find(y => y.id == mod.citem);
            //let _citem = game.items.get(mod.citem).data.data;
            let _citemfinder = await auxMeth.getcItem(mod.citem, mod.ciKey);
            let _citem = _citemfinder.data.data;

            let jumpmod = false;
            if (mod.condop != "NON" && mod.condop != null) {
                jumpmod = await this.checkModConditional(actorData, mod, citem);
            }

            if (!jumpmod) {

                if (!hasProperty(rolls, rollID)) {
                    setProperty(rolls, rollID, {});
                    setProperty(rolls[rollID], "value", "");
                    //ithaschanged = true;
                }



                let toadd = await auxMeth.autoParser(rollvaluemod, attributes, citem.attributes, false, false, citem.number);
                //console.log(toadd);
                let r_exp = "+(" + toadd + ")";
                const _basecitem = await citemIDs.find(y => y.id == citem.id && y.mods.find(x => x.index == mod.index));
                //console.log(mod.name);
                const _mod = await _basecitem.mods.find(x => x.index == mod.index);
                rolls[rollID].modified = true;

                if ((_citem.usetype == "PAS" || citem.isactive)) {

                    //if(!_mod.exec){
                    _mod.exec = true;
                    ithaschanged = true;
                    //rolls[rollID].value += parseInt(toadd);
                    //console.log(rollID + " previo " + rolls[rollID].value)
                    rolls[rollID].value += r_exp;

                    //console.log("adding " + rollID + toadd +  " total: " + rolls[rollID].value);
                    //}

                }

            }
        }
        let counter = 0;


        //LIST EDITION "TESTING"
        //console.log(mods);
        const listmods = mods.filter(y => y.type == "LIST");

        for (let i = 0; i < listmods.length; i++) {
            let mod = listmods[i];
            let attKey = mod.attribute;
            let attValue = mod.value;
            let editType = mod.listmod;

            //console.log(mod);

            let citem = citemIDs.find(y => y.id == mod.citem);
            //let _citem = game.items.get(mod.citem).data.data;
            let _citemfinder = await auxMeth.getcItem(mod.citem, mod.ciKey);
            let _citem = _citemfinder.data.data;

            let jumpmod = false;
            if (mod.condop != "NON" && mod.condop != null) {
                jumpmod = await this.checkModConditional(actorData, mod, citem);
            }

            if (!jumpmod) {

                const myAtt = attributes[attKey];
                //let seedprop = game.items.get(myAtt.id);
                let seedprop = await auxMeth.getTElement(myAtt.id, "property", attKey);

                if (seedprop != null)
                    if (seedprop.data.data.datatype == "list") {

                        if (attributes[attKey].listedit == null)
                            attributes[attKey].listedit = {};
                        if (editType == "INCLUDE") {
                            if (attributes[attKey].listedit.add == null) {
                                attributes[attKey].listedit.add = [];


                            }

                            let splitter = attValue.split(',');
                            for (let i = 0; i < splitter.length; i++) {
                                let myoption = splitter[i];
                                if (!attributes[attKey].listedit.add.includes(myoption))
                                    !attributes[attKey].listedit.add.push(myoption);
                            }


                        }



                        if (editType == "REMOVE") {
                            if (attributes[attKey].listedit.remove == null) {
                                attributes[attKey].listedit.remove = [];


                            }

                            let splitter = attValue.split(',');
                            for (let i = 0; i < splitter.length; i++) {
                                let myoption = splitter[i];
                                if (!attributes[attKey].listedit.remove.includes(myoption))
                                    !attributes[attKey].listedit.remove.push(myoption);
                            }


                        }
                    }
            }
        }

        //PARSE VALUES TO INT
        for (let i = 0; i < attributearray.length; i++) {
            let attribute = attributearray[i];
            let attdata = attributes[attribute];
            //let property = await game.items.get(actorData.data.attributes[attribute].id);
            let property = await auxMeth.getTElement(actorData.data.attributes[attribute].id, "property", attribute);
            const actorAtt = actorData.data.attributes[attribute];
            if (property != null) {

                let mydefvalue = 0;

                if (property.data.data.datatype == "simplenumeric" || property.data.data.datatype == "radio" || property.data.data.datatype == "badge") {

                    if (property.data.data.defvalue != "") {
                        mydefvalue = property.data.data.defvalue;
                    }

                    if (property.data.data.auto == "" && actorAtt.value === "") {
                        ithaschanged = true;
                        actorAtt.value = await auxMeth.autoParser(mydefvalue, attributes, null, false);
                    }

                    actorAtt.value = parseInt(actorAtt.value);
                    actorAtt.max = parseInt(actorAtt.max);
                }

                if (property.data.data.datatype == "checkbox") {

                    if (actorAtt.value === true || actorAtt.value === false) {

                    }
                    else {
                        if (actorAtt.value === "false") {
                            actorAtt.value = false;
                        }

                        if (actorAtt.value === "true") {
                            actorAtt.value = true;
                        }
                    }

                }





            }

            else {
                if (!attdata.created) {
                    delete actorData.data.attributes[attribute];

                    ithaschanged = true;
                }
                else {
                    actorAtt.value = parseInt(actorAtt.value);
                }

            }
            if (attributearray[i] != "biography") {
                attdata.modified = false;
                attdata.modmax = false;

            }

        }
        //console.log(citemIDs);
        //CONSUMABLES ACTIVE TURN BACK INTO INACTIVE, AND DELETE SELFDESTRUCTIBLE
        if (citemIDs != null && !actorData.data.istemplate) {
            for (let n = citemIDs.length - 1; n >= 0; n--) {

                let cItemTest = await auxMeth.getcItem(citemIDs[n].id, citemIDs[n].ciKey);
                if (cItemTest != null) {

                    //MANAGE CITEM USES & MAXUSES
                    let citemObj = cItemTest.data.data;
                    let citmAttr = citemIDs[n].attributes;
                    let citmNum = citemIDs[n].number;
                    let myMaxuses = await auxMeth.autoParser(citemObj.maxuses, attributes, citmAttr, false);
                    let finalmaxuses = parseInt(citmNum * myMaxuses);
                    citemIDs[n].maxuses = finalmaxuses;
                    if (citemIDs[n].uses > finalmaxuses)
                        citemIDs[n].uses = finalmaxuses;

                    //Calculate autos of citems  *** TEST **********************************
                    let citemGroups = citemObj.groups;

                    for (let z = 0; z < citemGroups.length; z++) {
                        let citemGr = citemGroups[z];

                        //let cigroup = game.items.get(citemGr.id);
                        let cigroup = await auxMeth.getTElement(citemGr.id, "group", citemGr.ikey);

                        let groupprops = [];

                        if (cigroup != null)
                            groupprops = cigroup.data.data.properties;


                        for (let x = 0; x < groupprops.length; x++) {
                            //let propdata = game.items.get(groupprops[x].id);
                            let propdata = await auxMeth.getTElement(groupprops[x].id, "property", groupprops[x].ikey);
                            if (propdata == null)
                                break;
                            let propKey = propdata.data.data.attKey;
                            let propauto = propdata.data.data.auto;

                            if (propauto != "") {
                                propauto = await propauto.replace(/\#{name}/g, citemIDs[n].name);
                                propauto = await propauto.replace(/\#{active}/g, citemIDs[n].isactive);
                                propauto = await propauto.replace(/\#{uses}/g, citemIDs[n].uses);
                                let rawvalue = await auxMeth.autoParser(propauto, attributes, citmAttr, false, false, citmNum);

                                if (isNaN(rawvalue) && propdata.data.data.datatype != "simpletext") {
                                    //console.log(rawvalue);
                                    let afinal = new Roll(rawvalue);
                                    await afinal.evaluate({ async: true });
                                    if (!isNaN(afinal.total))
                                        rawvalue = afinal.total;

                                }
                                //console.log(propKey + " of " + citemIDs[n].name + " is " + rawvalue);
                                citmAttr[propKey].value = rawvalue;
                            }
                        }

                    }



                    //*************************************************************************

                    if (citemIDs[n].isactive) {
                        if (citemObj.usetype == "CON") {
                            citemIDs[n].isactive = false;
                            for (let j = 0; j < citemIDs[n].mods.length; j++) {

                                citemIDs[n].mods[j].exec = false;
                            }

                            if (!citemIDs[n].rechargable && citemIDs[n].number <= 0) {
                                //console.log("deleting " + citemIDs[n].name);
                                actorData = await this.deletecItem(citemIDs[n].id, true, actorData);
                            }

                        }

                        else {
                            citemIDs[n].ispermanent = false;

                        }

                    }
                    else {
                        citemIDs[n].isreset = true;
                    }

                    if (citemObj.usetype == "PAS") {
                        if (citemIDs[n].number <= 0) {
                            //console.log("deleting " + citemIDs[n].name);
                            actorData = await this.deletecItem(citemIDs[n].id, true, actorData);
                        }

                    }



                    if (citemIDs[n] != null)
                        //Self destructible items
                        if (citemIDs[n].selfdestruct != null)
                            if (citemIDs[n].selfdestruct) {
                                //console.log("self destructing " + citemIDs[n].name);
                                actorData = await this.deletecItem(citemIDs[n].id, true, actorData);
                            }



                }

            }
        }

        //FREE TABLES autos of items  *** TEST **********************************

        for (var tabAProp in attributes) {
            if (attributes[tabAProp].istable) {

                let t_Prop = attributes[tabAProp];

                //let tableObj = game.items.get(t_Prop.id);
                let tableObj = await auxMeth.getTElement(t_Prop.id, "property", tabAProp);

                if (tableObj == null)
                    continue;

                let totalGroupID = tableObj.data.data.group.id;
                let totalGroupIKey = tableObj.data.data.group.ikey;
                //FREE TABLE AUTO PROP CALCULATION
                if (t_Prop.tableitems != null) {

                    //let groupObj = game.items.get(totalGroupID);
                    let groupObj = await auxMeth.getTElement(totalGroupID, "group", totalGroupIKey);
                    if (groupObj == null)
                        continue;
                    let groupProps = groupObj.data.data.properties;
                    for (let k = 0; k < groupProps.length; k++) {
                        //let tableProp = game.items.get(groupProps[k].id);
                        let tableProp = await auxMeth.getTElement(groupProps[k].id, "property", groupProps[k].ikey);
                        if (tableProp == null)
                            break;
                        let propauto = tableProp.data.data.auto;
                        let freepropKey = tableProp.data.data.attKey;
                        let freevalue;
                        if (propauto != "") {
                            for (let d = 0; d < t_Prop.tableitems.length; d++) {
                                freevalue = await auxMeth.autoParser(propauto, attributes, t_Prop.tableitems[d].attributes, false, false);
                                t_Prop.tableitems[d].attributes[freepropKey].value = freevalue;
                            }

                        }


                    }
                }


                //TOTAL CALCULATION

                let gcitems;

                if (!tableObj.data.data.isfreetable) {
                    gcitems = await citemIDs.filter(y => y.groups.some(x => x.ikey == totalGroupIKey));
                }
                else {
                    gcitems = t_Prop.tableitems;
                }


                for (var propKey in t_Prop.totals) {
                    let newtotal = 0;

                    for (let q = 0; q < gcitems.length; q++) {
                        let total_citem = gcitems[q].attributes[propKey];
                        if (total_citem != null)
                            newtotal += Number(total_citem.value);
                    }

                    t_Prop.totals[propKey].total = newtotal;
                }



            }

        }

        //CHECK FINAL AUTO VALUES -- IS THERE A BETTER WAY???
        //console.log("aqui");
        //ithaschanged = await this.autoCalculateAttributes(actorData, attributearray, attributes, true, true);

        //Execute selfdestruct items
        if (citemIDs != null) {
            for (let n = citemIDs.length - 1; n >= 0; n--) {
                let cItemTest = await auxMeth.getcItem(citemIDs[n].id, citemIDs[n].ciKey);
                if (cItemTest != null) {
                    //let citemObj = game.items.get(citemIDs[n].id).data.data;
                    //let citemObjfinder = await auxMeth.getcItem(citemIDs[n].id,citemIDs[n].ciKey);
                    let citemObj = cItemTest.data.data;
                    if (citemObj.usetype == "PAS" && citemObj.selfdestruct) {

                        for (let i = 0; i < citemObj.mods.length; i++) {
                            console.log("adding before selfdestruct");

                            let mymod = citemObj.mods[i];
                            let attProp = "value";
                            let modAtt = mymod.attribute;
                            if (modAtt.includes(".max")) {
                                modAtt = modAtt.replace(".max", "");
                                attProp = "max";
                            }
                            if (mymod.type == "ADD") {
                                let value = mymod.value;
                                let finalvalue;
                                if (isNaN(value)) {
                                    if (value.charAt(0) == "|") {
                                        value = value.replace("|", "");
                                        finalvalue = await auxMeth.autoParser(value, attributes, citem.attributes, true, false, parseInt(citem.number));
                                    }
                                    else {
                                        finalvalue = await auxMeth.autoParser(value, attributes, citem.attributes, false, false, parseInt(citem.number));
                                    }
                                }

                                else {
                                    finalvalue = value;
                                }

                                const myAtt = actorData.data.attributes[modAtt];

                                if (attProp == "value")
                                    myAtt.value += Number(finalvalue);
                                if (attProp == "max")
                                    myAtt.max += Number(finalvalue);
                            }

                        }

                    }
                }
            }
        }


        let checkmods = await this.getMods(originalcIDs);

        if (checkmods.length != mods.length && !repeat) {
            //console.log("repeating");
            actorData = await this.checkPropAuto(actorData, true);
        }


        //console.log(citemIDs);
        //console.log(actorData);
        return actorData;

    }

    async autoCalculateAttributes(actorData, attributearray, attributes, checker = false, secondround) {
        //Checking AUTO ATTRIBUTES -- KEEP DEFAULT VALUE EMPTY THEN!!
        //console.log("check auto attributes");
        let ithaschanged = false;
        var parser = new DOMParser();

        let htmlcode = await auxMeth.getTempHTML(this.data.data.gtemplate);

        if (htmlcode == null) {
            ui.notifications.warn("Please rebuild character sheet before assigning, a-entity");
            return;
        }


        var form = await parser.parseFromString(htmlcode, 'text/html').querySelector('form');
        var inputs = await form.querySelectorAll('input,select,textarea,.radio-input');
        let sheetAtts = [];
        for (let i = 0; i < inputs.length; i++) {
            let newAtt = inputs[i];
            //console.log(newAtt);
            let attId = newAtt.getAttribute("attId");
            let attKey = newAtt.getAttribute("name");
            attKey = attKey.replace("data.attributes.", '');
            attKey = attKey.replace(".value", '');
            let properKey;
            if (attId != null) {
                //properKey = game.items.get(attId);
                properKey = await auxMeth.getTElement(attId, "property", attKey);
            }

            if (properKey != null)
                sheetAtts.push(properKey.data.data.attKey);

        }
        //console.log(sheetAtts);
        //console.log("PNUMD= " + attributes["pnum_d"].value);
        for (let i = 0; i < attributearray.length; i++) {
            let attribute = attributearray[i];
            let findme = sheetAtts.filter(y => y == attribute);
            //console.log("setting: " + attribute + " findme " + findme.length);
            if (actorData.data.attributes[attribute] != null) {
                let attID = actorData.data.attributes[attribute].id;
                //console.log("setting: " + attribute);
                ithaschanged = await this.setAutoProp(attID, attributes, attribute, findme, ithaschanged, secondround);
            }
            else {
                if (findme.length > 0)
                    ui.notifications.warn("Please rebuild/reload template, attribute " + attribute + " not found in actor");
            }

        }

        return ithaschanged;
    }

    async setAutoProp(attID, attributes, attribute, findme, ithaschanged, secondround = false) {
        //console.log(attribute);
        //console.log(findme);
        if ((attribute != null || attribute != undefined) && findme.length > 0) {
            let attdata = attributes[attribute];
            let rawexp = "";
            //let property = await game.items.get(attID);
            let property = await auxMeth.getTElement(attID, "property", attribute);
            const actorAtt = attributes[attribute];


            //Check the Auto value
            if (property != null) {
                let exprmode = false;
                if (property.data.data.datatype != "simplenumeric" && property.data.data.datatype != "radio") {
                    exprmode = true;
                }

                rawexp = property.data.data.auto;

                if (rawexp.includes(".totals")) {
                    actorAtt.hastotals = true;
                }

                //console.log("autochecking " + attribute + " isset:" + actorAtt.isset + " rawexp: " + rawexp);
                //console.log("PNUMD= " + attributes["pnum_d"].value);
                var prop_check = rawexp.match(/(?<=\@\{).*?(?=\})/g);
                if (prop_check != null) {
                    for (let n = 0; n < prop_check.length; n++) {
                        let _rawattname = prop_check[n];
                        let _attProp = "value";
                        let _attvalue;
                        let attTotal;
                        if (_rawattname.includes(".max")) {
                            _rawattname = _rawattname.replace(".max", "");
                            _attProp = "max";
                        }
                        if (_rawattname.includes(".totals.")) {
                            let splitter = _rawattname.split('.');
                            _rawattname = splitter[0];
                            attTotal = splitter[2];
                            _attProp = "total";
                        }
                        //console.log(_rawattname);
                        let _myatt = attributes[_rawattname];
                        //console.log(_myatt);


                        if (_myatt != null) {
                            if (attTotal != null && attTotal != "")
                                _myatt = attributes[_rawattname].totals[attTotal];

                            //                            if(!_myatt.isset){
                            //                                actorAtt.isset = false;
                            //                            }
                        }

                    }
                }

                // ALONDAAR lookupj now works in auto properties !!
                // TODO: I have no idea if this is optimal or in the correct location however... 
                /*let getLookupJ = rawexp.match(/(?<=\blookupj\b\().*?(?=\))/g);
                if (getLookupJ != null) {
                    for (let i = 0; i < getLookupJ.length; i++) {
                        let tochange = "lookupj(" + getLookupJ[i] + ")";

                        let blocks = getLookupJ[i].split(";");
                        let parseprop = await auxMeth.autoParser(blocks[0], attributes, null, exprmode);
                        let parseCol = await auxMeth.autoParser(blocks[1], attributes, null, exprmode);
                        let parseRow = await auxMeth.autoParser(blocks[2], attributes, null, exprmode);
                        let parseDefault = blocks[3];
                        if (parseDefault == undefined)
                            parseDefault = 0;
                        else
                            parseDefault = await auxMeth.autoParser(blocks[3], attributes, null, exprmode);
                        let replaceValue = parseDefault;

                        var myJournal = game.journal.getName(parseprop);
                        if (myJournal != null) {
                            var myContent = myJournal.data.content;
                            var doc = new DOMParser().parseFromString(myContent, "text/html");
                            let myTable = doc.getElementsByTagName("TABLE")[0];
                            if (myTable != null) {
                                if (myTable.rows.length > 1) {
                                    let foundcol = null;

                                    for (var j = 0, col; col = myTable.rows[0].cells[j]; j++) {
                                        let colchecker = col.innerText.match(parseCol);
                                        if (colchecker != null) {
                                            foundcol = j;
                                            break;
                                        }
                                    }

                                    if (foundcol != null)
                                        for (var k = 1, row; row = myTable.rows[k]; k++) {
                                            let rowchecker = row.cells[0].innerText.match(parseRow);
                                            if (rowchecker != null) {
                                                replaceValue = row.cells[foundcol].innerText;
                                                break;
                                            }
                                        }
                                }
                                else
                                    ui.notifications.error('lookupj() -- Journal with the name "' + parseprop + '" needs a table with at least 2 rows');
                            }
                            else
                                ui.notifications.error('lookupj() -- Journal with the name "' + parseprop + '" does not contain a valid HTML table.');
                        } else
                            ui.notifications.error('lookupj() -- Journal with the name "' + parseprop + '" does not exist.');

                        rawexp = rawexp.replace(tochange, replaceValue);
                    }
                }*/

                if (rawexp !== "") {
                    //console.log(rawexp);
                    //console.log(exprmode);
                    let newvalue = actorAtt.value;
                    rawexp = await this.expandPropsP(rawexp, attributes);

                    if (!actorAtt.isset) {
                        newvalue = await auxMeth.autoParser(rawexp, attributes, null, exprmode);
                        //console.log(attribute + " " + newvalue);
                        if (actorAtt.value != newvalue)
                            ithaschanged = true;
                        actorAtt.default = true;
                    }




                    //TEST TO REINSTATE
                    actorAtt.value = newvalue;
                    //TEST TO DELETE
                    //if (property.data.data.datatype != "simpletext" && !secondround)
                    if (property.data.data.datatype != "simpletext") {
                        actorAtt.value = Number(newvalue) + Number(actorAtt.autoadd);
                        if (!secondround)
                            actorAtt.autoadd = 0;
                    }



                    //console.log("defaulting " + attribute + " to " + actorAtt.value + " isset: " + actorAtt.isset);
                    //console.log("defaulting " + attribute + " to " + actorAtt.value + " after adding: " + actorAtt.autoadd);
                }

                if (property.data.data.automax !== "") {

                    rawexp = property.data.data.automax;

                    rawexp = await this.expandPropsP(rawexp, attributes);

                    let maxval = actorAtt.max;

                    if (!actorAtt.maxblocked && !actorAtt.maxset)
                        maxval = await auxMeth.autoParser(rawexp, attributes, null, false);


                    //TEST TO DELETE
                    if (property.data.data.datatype != "simpletext") {

                        maxval = Number(maxval) + Number(actorAtt.maxadd);

                    }

                    //console.log("Changing " + attribute + " max to " + maxval);

                    if (!actorAtt.maxexec) {
                        actorAtt.maxexec = true;

                        if (actorAtt.max == "" || !actorAtt.maxblocked) {
                            actorAtt.max = parseInt(maxval);
                            actorAtt.maxblocked = false;
                            ithaschanged = true;

                            //console.log(attribute + " max: " + actorAtt.maxblocked);

                        }

                    }


                    if (parseInt(actorAtt.value) > actorAtt.max && property.data.data.maxtop) {
                        actorAtt.value = actorAtt.max;
                    }

                }
            }
        }
        return ithaschanged;
    }

    async expandPropsP(rawexp, attributes) {
        rawexp = await this.parseRegs(rawexp, attributes);

        //console.log(attributes);
        var prop_check = rawexp.match(/(?<=\@\{).*?(?=\})/g);
        if (prop_check != null) {
            //console.log("expanding rawexp: " + rawexp);
            for (let n = 0; n < prop_check.length; n++) {

                let _rawattname = prop_check[n];
                let tochange = "@{" + _rawattname + "}"
                let _attProp = "value";
                let _attAuto = "auto";
                let _attvalue;

                if (_rawattname.includes(".max")) {
                    _rawattname = _rawattname.replace(".max", "");
                    _attProp = "max";
                    _attAuto = "automax";
                }

                //console.log("calculating auto " + _rawattname + " " + _attAuto);

                //let propertybase = await game.items.filter(y => y.data.type == "property" && y.data.data.attKey == _rawattname);
                let property = await auxMeth.getTElement(null, "property", _rawattname);
                //let property = propertybase[0];

                //                if(attributes[_rawattname]==null)
                //                    ui.notifications.warn("Attribute " + _rawattname + " used in expression not found in actor");

                //console.log(property);

                if (property != null && attributes[_rawattname] != null) {
                    let exchanger = attributes[_rawattname][_attProp];
                    let attAutoAdd = Number(attributes[_rawattname]["autoadd"]);
                    //console.log(property);
                    if (property.data.data[_attAuto] != "") {
                        //console.log("expanding: " + _rawattname + " = " + property.data.data[_attAuto]);
                        if (property.data.data[_attAuto].includes("$<"))
                            rawexp = await this.parseRegs(rawexp, attributes);
                        //console.log("isset?: " + this.data.data.attributes[_rawattname].isset);
                        if (!attributes[_rawattname].isset) {
                            exchanger = await this.expandPropsP(property.data.data[_attAuto], attributes);
                        }
                        else {
                            exchanger = attributes[_rawattname].value;
                        }

                    }

                    if (property.data.data.datatype != "simpletext" && attAutoAdd != null && attAutoAdd != 0)
                        exchanger = "((" + exchanger + ")+(" + attAutoAdd + "))";

                    rawexp = rawexp.replace(tochange, exchanger);

                }

            }
        }

        //console.log(rawexp);
        return rawexp;
    }

    async parseRegs(expr, attributes) {
        let regArray = [];
        let expreg = expr.match(/(?<=\$\<).*?(?=\>)/g);
        if (expreg != null) {
            //console.log("reg expr: " + expr);
            //Substitute string for current value
            for (let i = 0; i < expreg.length; i++) {
                let attname = "$<" + expreg[i] + ">";
                let attvalue = "";

                let regblocks = expreg[i].split(";");

                let regobject = {};
                regobject.index = regblocks[0];
                regobject.expr = expreg[i].replace(regblocks[0] + ";", '');
                //console.log(regobject.expr);
                let internalvBle = regobject.expr.match(/(?<=\$)[0-9]+/g);
                if (internalvBle != null) {
                    for (let k = 0; k < internalvBle.length; k++) {
                        let regindex = internalvBle[k];
                        let regObj = await regArray.find(y => y.index == regindex);
                        let vbvalue = "";
                        if (regObj != null)
                            vbvalue = regObj.result;
                        regobject.expr = regobject.expr.replace("$" + regindex, vbvalue);
                    }

                }
                //console.log(regobject.expr);
                //TO REVERT HAS METIDO ESTO!!!!

                regobject.expr = await this.expandPropsP(regobject.expr, attributes);
                regobject.expr = await auxMeth.autoParser(regobject.expr, attributes, null, false);

                //                let parseexp = /\if\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bfloor\(|\bceil\(|\bcount[E|L|H]\(/g;
                //                let parsecheck = regobject.expr.match(parseexp);
                //                let numbexp = /^[0-9]*$/g;
                //                let numbcheck = regobject.expr.match(numbexp);
                //
                //                if(!parsecheck && numbcheck){
                //                    regobject.expr = eval(regobject.expr);
                //                }

                regobject.result = regobject.expr;
                await regArray.push(regobject);

                expr = expr.replace(attname, attvalue);

            }

            let exprparse = expr.match(/(?<=\$)[0-9]+/g);
            if (exprparse != null) {
                for (let i = 0; i < exprparse.length; i++) {
                    let regindex = exprparse[i];

                    let attname = "$" + regindex;
                    let regObj = regArray.find(y => y.index == regindex);

                    let attvalue = "";
                    if (regObj != null)
                        attvalue = regObj.result;

                    //console.log(attvalue);
                    expr = expr.replace(attname, attvalue);
                }
            }

        }
        return expr;
    }

    async actorUpdater(data = null) {
        //console.log("checking auto calcs for actor");
        //console.log(data);
        //        if(!this.owner)
        //            return;

        let newData = data;

        if (newData == null)
            data = this.data;

        if (!data.data.istemplate)
            newData = await this.checkPropAuto(data);
        //newData = await this.checkPropAuto(data);

        //console.log("finished auto propr");
        //console.log(newData);
        return newData;

    }

    // ALONDAAR - Processes Target/Self 'property update' expressions (ADD/SET)
    // PARAM 'mode' accepts: "add" or "set"
    // PARAM 'target' accepts: target or "SELF"
    async parseAddSet(expArray, mode, target, actorattributes, citemattributes, number, rolltotal) {
        if (expArray != null) {
            for (let i = 0; i < expArray.length; i++) {
                let blocks = expArray[i].split(";");
                let parseprop = await auxMeth.autoParser(blocks[0], actorattributes, citemattributes, true, false, number);
                if (parseprop.match("self.")) {
                    parseprop = parseprop.replace("self.", "");
                    target = "SELF";
                }

                blocks[1] = blocks[1].replace(/\btotal\b/g, rolltotal); // TODO: Make this regexp smarter? maybe enforce parenthesis
                let parsevalue = await auxMeth.autoParser(blocks[1], actorattributes, citemattributes, false, false, number);

                if (target != null) {
                    let targetattributes = null;
                    if (target != "SELF")
                        targetattributes = target.actor.data.data.attributes;
                    else
                        targetattributes = this.data.data.attributes;

                    if (targetattributes != null && targetattributes[parseprop] != null) {
                        let attvalue = targetattributes[parseprop].value;
                        if (mode == "add") {
                            if (!isNaN(attvalue) && !isNaN(parsevalue)) {
                                attvalue = parseInt(attvalue);
                                attvalue += parseInt(parsevalue);
                            }
                            else {
                                console.warn("(" + expArray[i] + ") NaN detected.");
                                continue;
                            }
                        }

                        if (mode == "set") {
                            //let dataType = game.items.find(y => y.id == targetattributes[parseprop].id).data.data.datatype;
                            let propData = await auxMeth.getTElement(targetattributes[parseprop].id, "property", parseprop);
                            if (propData == null || propData == undefined) {
                                attvalue = parsevalue;
                                continue;
                            }
                            let dataType = propData.data.data.datatype;
                            if (dataType == "checkbox") {
                                if (parsevalue != "false" && parsevalue != "0")
                                    attvalue = "true";
                                else
                                    attvalue = "false";
                            }
                            else if (dataType == "simplenumeric" || dataType == "badge" || dataType == "radio") { //TODO: BUG: Set on Badge type ignore a max value..?
                                if (isNaN(parsevalue)) {
                                    console.warn("(" + expArray[i] + ") NaN detected.");
                                    continue;
                                }
                                attvalue = parseInt(parsevalue);
                            }
                            else
                                attvalue = parsevalue;
                        }

                        if (target != "SELF")
                            await this.requestToGM(this, target.id, parseprop, attvalue);
                        else
                            await this.update({ [`data.attributes.${parseprop}.value`]: attvalue });
                    }
                    else {
                        console.warn("Property key: '" + parseprop + "' not found on target.");
                        continue;
                    }
                }
                else {
                    console.warn("No target found for " + mode + "()");
                    continue;
                }
            }
        }
    }

    // ALONDAAR - Extracts a specified expression, eg str = "add" extracts all "add(...)"s
    // And replaces found-exp with blanks, DO NOT USE FOR SUM() or in-line parsing at this time!
    async extractExpression(str, rollexp, rollformula) {
        //console.log("Looking for " + str + "() expressions");
        let re = new RegExp(`(?<=\\b${str}\\b\\().*?(?=\\))`, 'gi');
        let expArray = rollexp.match(re);
        if (expArray != null) {
            for (let i = 0; i < expArray.length; i++) {
                let tochange = `${str}(${expArray[i]})`;
                rollexp = rollexp.replace(tochange, "");
                rollformula = rollformula.replace(tochange, "");
            }
        }

        return [expArray, rollexp, rollformula];
    }

    async rollSheetDice(rollexp, rollname, rollid, actorattributes, citemattributes, number = 1, isactive = null, ciuses = null, target = null, rollcitemID = null, tokenID = null) {

        //console.log(rollexp);
        //console.log(rollid);
        //console.log(citemattributes);
        //console.log("rolling");
        //console.log(rollcitemID);

        let initiative = false;
        let gmmode = false;
        let blindmode = false;
        let nochat = false;
        let initrollexp = rollexp;
        let showResult = true;

        if (rollexp.includes("~blind~"))
            blindmode = true;

        //Check roll ids
        if (rollid == null || rollid == "")
            rollid = [];

        //Checking Roll ID's
        for (let n = 0; n < rollid.length; n++) {
            //console.log(rollid[n]);
            if (rollid[n] == "init")
                initiative = true;

            if (rollid[n] == "gm")
                gmmode = true;

            if (rollid[n] == "blind")
                blindmode = true;

            if (rollid[n] == "nochat")
                nochat = true;

            if (rollid[n] == "noresult")
                showResult = false;
        }

        let linkmode = false;

        if (rollcitemID)
            linkmode = true;

        let ToGM = false;
        let rolltotal = 0;
        let conditionalText = "";
        let diff = await game.settings.get("sandbox", "diff");
        if (diff == null)
            diff = 0;
        if (isNaN(diff))
            diff = 0;
        //console.log(diff);
        let rollformula = rollexp;

        //Roll modifiers generated by MODs of ROLL type
        let actorrolls = this.data.data.rolls;

        //Rolls defined by expression
        let subrolls = [];

        //Check roll mode
        let rollmode = this.data.data.rollmode;
        if (citemattributes != null) {
            rollname = rollname.replace(/\#{name}/g, citemattributes.name);
            rollname = rollname.replace(/\#{active}/g, isactive);
            rollname = rollname.replace(/\#{uses}/g, ciuses);
        }


        //Parse roll difficulty in name, and general atts
        rollname = rollname.replace(/\#{diff}/g, diff);
        rollname = await auxMeth.autoParser(rollname, actorattributes, citemattributes, true, false, number);

        //Parse roll difficulty
        rollexp = rollexp.replace(/\#{diff}/g, diff);
        if (citemattributes != null) {
            rollexp = await rollexp.replace(/\#{name}/g, citemattributes.name);
            rollexp = await rollexp.replace(/\#{active}/g, isactive);
            rollexp = await rollexp.replace(/\#{uses}/g, ciuses);
        }

        // ALONDAAR -- Parse citem reference
        // Syntax: ci(citemName;citemKey;optDefault) -- Optional Default is 0
        /*let findCitem = rawexp.match(/(?<=\bci\b\().*?(?=\))/g);
        if (findCitem != null) {
            for (let j = 0; j < findCitem.length; j++) {
                let idtoreplace = "ci(" + findCitem[j] + ")";
                let replacewith = 0;
                let blocks = findCitem[j].split(";");

                if (blocks[2] != null)
                    replacewith = blocks[2];

                let mycitem = this.data.data.citems.find(ci => ci.name == blocks[0]);
                if (mycitem != null) {
                    let citemAtt = mycitem.attributes[blocks[1]];
                    if (citemAtt != null) {
                        let citemAttValue = citemAtt.value;
                        if (citemAttValue != null)
                            replacewith = citemAttValue;
                    }
                    else
                        console.warn("citem key: '" + blocks[1] + "' on citem named: '" + blocks[0] + "'  not found.");
                }
                else
                    console.warn("citem named: '" + blocks[0] + "' not possessed by actor.");

                rawexp = rawexp.replace(idtoreplace, replacewith);
            }
        }*/

        //Parse target attributes
        let targetexp = rollexp.match(/(?<=\#{target\|)\S*?(?=\})/g);
        if (targetexp != null) {
            for (let j = 0; j < targetexp.length; j++) {
                let idexpr = targetexp[j];
                let idtoreplace = "#{target|" + targetexp[j] + "}";
                let newid;
                if (target != null) {
                    let targetattributes = target.actor.data.data.attributes;
                    newid = await auxMeth.autoParser("__" + idexpr + "__", targetattributes, null, true);
                }

                if (newid == null)
                    newid = 0;

                rollexp = rollexp.replace(idtoreplace, newid);
                rollformula = rollformula.replace(idtoreplace, newid);
            }
        }

        //Preparsing TO CHECK IF VALID EXPRESSION!!!
        rollexp = await auxMeth.autoParser(rollexp, actorattributes, citemattributes, true, false, number);

        // Early check for ~nochat~ so to prevent 3D Dice from rolling
        if (rollexp.includes("~nochat~"))
            nochat = true;

        // Check and parse roll() expressions
        while (rollexp.match(/(?<=\broll\b\().*?(?=\))/g) != null) {

            let rollmatch = /\broll\(/g;
            var rollResultResultArray;
            var rollResult = [];

            while (rollResultResultArray = rollmatch.exec(rollexp)) {
                let suba = rollexp.substring(rollmatch.lastIndex, rollexp.length);
                let subb = auxMeth.getParenthesString(suba);
                rollResult.push(subb);
            }

            let subrollsexpb = rollResult;

            //Parse Roll
            let tochange = "roll(" + subrollsexpb[0] + ")";
            let blocks = subrollsexpb[0].split(";");

            //Definition of sub Roll
            let sRoll = {};

            sRoll.name = blocks[0];
            sRoll.numdice = await auxMeth.autoParser(blocks[1], actorattributes, citemattributes, false, false, number);
            sRoll.numdice = parseInt(sRoll.numdice);
            sRoll.faces = await auxMeth.autoParser(blocks[2], actorattributes, citemattributes, false, false, number);
            sRoll.color = blocks[4] || "";
            sRoll.exploding = blocks[3];

            if (parseInt(sRoll.numdice) > 0) {
                let exploder = "";
                if (sRoll.exploding === "true" || sRoll.exploding === "add") {
                    exploder = "x" + sRoll.faces;
                }

                sRoll.expr = sRoll.numdice + "d" + sRoll.faces + exploder + sRoll.color;

                if (sRoll.numdice < 1)
                    sRoll.expr = "0";

                //1d0 roll protection
                sRoll.expr = sRoll.expr.replace(/[0-9]+d0/g, "0");
                sRoll.expr = sRoll.expr.replace(/(?<![0-9])0x\d+/g, "0");
                let partroll = new Roll(sRoll.expr);

                let finalroll = await partroll.evaluate({ async: true });

                finalroll.extraroll = true;

                if (game.dice3d != null && !nochat) {

                    await game.dice3d.showForRoll(partroll, game.user, true, ToGM, blindmode);
                }

                sRoll.results = finalroll;

                await subrolls.push(sRoll);
            }

            rollexp = rollexp.replace(tochange, "");
            rollformula = rollformula.replace(tochange, sRoll.numdice + "d" + sRoll.faces);

            let exptochange = '\\?\\[\\b' + sRoll.name + '\\]';

            var re = new RegExp(exptochange, 'g');

            let mysubRoll = subrolls.find(y => y.name == sRoll.name);
            let finalvalue = "";

            if (sRoll.results != null) {

                for (let j = 0; j < sRoll.results.dice.length; j++) {

                    let dicearray = sRoll.results.dice[j].results;

                    for (let k = 0; k < dicearray.length; k++) {
                        if (k > 0)
                            finalvalue += ",";

                        let rollvalue = dicearray[k].result;

                        if (mysubRoll.exploding === "add") {
                            while (dicearray[k].exploded && k < dicearray.length) {
                                k += 1;
                                rollvalue += dicearray[k].result;
                            }
                        }

                        finalvalue += rollvalue;


                    }

                }

                if (sRoll.results.dice.length == 0)
                    finalvalue += "0";
            }
            else {
                finalvalue = 0;
            }

            rollformula = rollformula.replace(re, sRoll.numdice + "d" + sRoll.faces);
            rollexp = rollexp.replace(re, finalvalue);
            rollexp = await auxMeth.autoParser(rollexp, actorattributes, citemattributes, true, false, number);
            rollformula = rollexp;
            //}
        }

        // Check and parse rollp() expressions
        ///////////////ALONDAAR/////////////// BEGIN rollp() test implementation
        // DOCUMENTATION:
        // This new and simplified rollp() function is BEST SUITED for singular dice rolls.
        // However, I believe any Foundry dice notation is valid, further improvements can be made.
        // ?[roll] will still return a comma-separated list of ALL dice terms, regardless of operation
        // ?[roll.total] will return the SINGLE fully parsed TOTAL VALUE of the roll (good for expected results when using special modifiers)
        // New feature: "xa" -- the previously supported "Explode Adds" option. LIMIT: It will "add" any exploded dice, regardless of dice pools.
        // New Feature "im" -- supports exploding on results of 1, or more if a number is specified.
        while (rollexp.match(/(?<=\brollp\b\().*?(?=\))/g) != null) {
            let rollmatch = /\brollp\(/g;
            var rollResultResultArray;
            var rollResult = [];

            while (rollResultResultArray = rollmatch.exec(rollexp)) {
                let suba = rollexp.substring(rollmatch.lastIndex, rollexp.length);
                let subb = auxMeth.getParenthesString(suba);
                rollResult.push(subb);
            }

            let subrollsexpb = rollResult;

            //Split Roll
            let tochange = "rollp(" + subrollsexpb[0] + ")";
            let blocks = subrollsexpb[0].split(";");

            //Definition of sub Roll
            let sRoll = {};
            sRoll.name = blocks[0];
            // Makes auxMeth NOT parse the roll into a singluar value
            blocks[1] = "|" + blocks[1];
            sRoll.expr = await auxMeth.autoParser(blocks[1], actorattributes, citemattributes, false, false, number);
            //TODO: This might be tricky if a property key used in the expression contains xa?
            //TODO: Can probably do similar to "im" and make it "xa" on only specific rolls...
            sRoll.addexploding = blocks[1].match(/xa/g);
            if (sRoll.exploding != null)
                blocks[1] = blocks[1].replace(/xa/g, "x");

            //1d0 roll protection //This might not be needed anymore?
            sRoll.expr = sRoll.expr.replace(/[0-9]+d0/g, "0");
            sRoll.expr = sRoll.expr.replace(/(?<![0-9])0x\d+/g, "0");

            //Add ROLL MODS to rollp() ALONDAAR
            if (blocks[2] != null) {
                let rollpid = blocks[2].split(",");
                /*console.log("==ALON rollp IDs");
                console.log(rollpid);*/
                for (let k = 0; k < rollpid.length; k++) {
                    if (rollpid[k] != "" && hasProperty(actorrolls, rollpid[k])) {
                        let actorRollMod = actorrolls[rollpid[k]].value;
                        if (actorRollMod == "" || actorRollMod == null || actorRollMod == undefined)
                            continue;
                        let rollMODvalue = await auxMeth.autoParser(actorRollMod, actorattributes, citemattributes, false, false, number);
                        /*console.log("==ALON actor-roll-mod");
                        console.log(actorRollMod);
                        console.log("==ALON parsed roll-mod-value");
                        console.log(rollMODvalue);*/
                        if (!isNaN(rollMODvalue))
                            sRoll.expr += "+(" + rollMODvalue + ")";
                    }
                }
                /*console.log("==ALON sRoll.expr");
                console.log(sRoll.expr);*/
            }

            let partroll = new Roll(sRoll.expr);
            let keepImpMod = [];
            for (let i = 0; i < partroll.dice.length; i++) {
                keepImpMod.push({});
                for (let k = 0; k < partroll.dice[i].modifiers.length; k++)
                    if (partroll.dice[i].modifiers[k].includes("im"))
                        keepImpMod[i]["mod"] = partroll.dice[i].modifiers[k];
            }

            let finalroll = await partroll.evaluate({ async: true });
            finalroll.extraroll = true;
            for (let i = 0; i < finalroll.dice.length; i++)
                if (keepImpMod[i].mod)
                    finalroll.dice[i].modifiers.push(keepImpMod[i].mod);

            if (game.dice3d != null && !nochat) //Dice So Nice Module
                await game.dice3d.showForRoll(partroll, game.user, true, ToGM, blindmode);

            sRoll.results = finalroll;
            await subrolls.push(sRoll);

            rollexp = rollexp.replace(tochange, "");
            rollformula = rollformula.replace(tochange, sRoll.expr);

            // Get the dice terms of the parsed roll
            let exptochange = '\\?\\[\\b' + sRoll.name + '\\]';
            var re = new RegExp(exptochange, 'g');

            // Get the TOTAL associated with the roll
            let totaltochange = '\\?\\[\\b' + sRoll.name + '.total\\]';
            var reTotal = new RegExp(totaltochange, 'g');

            let mysubRoll = subrolls.find(y => y.name == sRoll.name);
            let finalvalue = "";
            let impTotal = 0;

            if (sRoll.results != null) {
                let currentDice = sRoll.results.dice;
                for (let j = 0; j < currentDice.length; j++) {
                    let dicearray = currentDice[j].results;
                    let diceNumber = currentDice[j].number
                    let diceMods = currentDice[j].modifiers

                    // Handle Implosions on natural 1, ignores exploded dice results
                    // Is there a way to use ".find()" method here?
                    // Documentation: suffix "im" optional value "im2"
                    // Causes that dice to be rolled again when a 1 OR (optional value or lower, ie "im2" implodes on 1-2)
                    // And added to the end of the dice-array that is replaced via ?[roll] as a negative value.
                    // currently IGNORES exploded dice results, and also does not recursively implode with further results of 1
                    for (let m = 0; m < diceMods.length; m++) {
                        if (diceMods[m].includes("im")) {
                            let impValue = diceMods[m].match(/\d+/g);
                            if (impValue == null)
                                impValue = 1;

                            let implodeCount = 0;
                            //TODO: Set implode range to logical value (ie im2 implodes only on 2, but im<2 is 1 and 2)?
                            for (let k = 0; k < diceNumber; k++) {
                                if (dicearray[k].result <= impValue)
                                    implodeCount++;
                            }

                            let subImplodingRoll = {};
                            subImplodingRoll.name = "impl." + j;
                            subImplodingRoll.expr = implodeCount + "d" + currentDice[j].faces;
                            let impRoll = new Roll(subImplodingRoll.expr);
                            let impRollFinal = await impRoll.evaluate({ async: true });
                            impRollFinal.extraroll = true;
                            subImplodingRoll.results = impRollFinal;
                            await subrolls.push(subImplodingRoll);
                            impTotal = impRollFinal.total;
                        }
                    }

                    // Handle ADD explosions
                    if (mysubRoll.addexploding != null) {
                        // Count upwards from the original number of dice thrown to tally explosions
                        let explodeCounter = diceNumber;
                        for (let k = 0; k < diceNumber; k++) {
                            if (k > 0)
                                finalvalue += ",";

                            let rollvalue = 0;
                            if (dicearray[k].active && !dicearray[k].discarded)
                                rollvalue = dicearray[k].result;

                            // More testing required if this works properly or not
                            if (dicearray[k].exploded) {
                                rollvalue += dicearray[explodeCounter].result;
                                while (dicearray[explodeCounter].exploded)
                                    rollvalue += dicearray[++explodeCounter].result;
                                explodeCounter++;
                            }

                            finalvalue += rollvalue;
                        }
                    } else {
                        for (let k = 0; k < dicearray.length; k++) {
                            if (k > 0)
                                finalvalue += ",";

                            let rollvalue = 0;
                            if (dicearray[k].active && !dicearray[k].discarded)
                                rollvalue = dicearray[k].result;

                            finalvalue += rollvalue;
                        }
                    }

                    // Necessary if the user inputs multile dice, such as "1d4 + 2d4"
                    if (j != currentDice.length - 1)
                        finalvalue += ",";
                }
                if (currentDice.length == 0)
                    finalvalue += "0";
            }
            else
                finalvalue = 0;

            //Subtract the imploded total at the end
            if (finalvalue != 0 && impTotal != 0)
                finalvalue += ",-" + impTotal;

            console.log(finalvalue);

            rollformula = rollformula.replace(re, sRoll.expr);
            rollexp = rollexp.replace(re, finalvalue);
            rollformula = rollformula.replace(reTotal, sRoll.expr);
            rollexp = rollexp.replace(reTotal, sRoll.results.total);
            rollexp = await auxMeth.autoParser(rollexp, actorattributes, citemattributes, true, false, number);
            rollformula = rollexp;
        }
        ////////////////////////////// END rollp() text implementation

        rollexp = await auxMeth.autoParser(rollexp, actorattributes, citemattributes, true, false, number);

        //PARSING FOLL FORMULA, TO IMPROVE!!!
        var sumResult = rollformula.match(/(?<=\bsum\b\().*?(?=\))/g);
        if (sumResult != null) {
            //Substitute string for current value        
            for (let i = 0; i < sumResult.length; i++) {
                let splitter = sumResult[i].split(";");
                let comparer = splitter[0];
                let tochange = "sum(" + sumResult[i] + ")";
                rollformula = rollformula.replace(tochange, comparer);
            }
        }
        rollformula = rollformula.replace(/\bsum\b\(.*?\)/g, "");

        var countHResult = rollformula.match(/(?<=\bcountH\b\().*?(?=\))/g);
        if (countHResult != null) {
            //Substitute string for current value        
            for (let i = 0; i < countHResult.length; i++) {
                let splitter = countHResult[i].split(";");
                let comparer = splitter[0];
                let tochange = "countH(" + countHResult[i] + ")";
                rollformula = rollformula.replace(tochange, comparer);
            }
        }
        rollformula = rollformula.replace(/\bcountH\b\(.*?\)/g, "");

        var countLResult = rollformula.match(/(?<=\bcountL\b\().*?(?=\))/g);
        if (countLResult != null) {
            //Substitute string for current value        
            for (let i = 0; i < countLResult.length; i++) {
                let splitter = countLResult[i].split(";");
                let comparer = splitter[0];
                let tochange = "countL(" + countLResult[i] + ")";
                rollformula = rollformula.replace(tochange, comparer);
            }
        }
        rollformula = rollformula.replace(/\bcountL\b\(.*?\)/g, "");

        var countEResult = rollformula.match(/(?<=\bcountE\b\().*?(?=\))/g);
        if (countEResult != null) {
            //Substitute string for current value        
            for (let i = 0; i < countEResult.length; i++) {
                let splitter = countEResult[i].split(";");
                let comparer = splitter[0];
                let tochange = "countE(" + countEResult[i] + ")";
                rollformula = rollformula.replace(tochange, comparer);
            }
        }
        rollformula = rollformula.replace(/\bcountE\b\(.*?\)/g, "");

        //Remove rollIDs and save them
        let parseid = rollexp.match(/(?<=\~)\S*?(?=\~)/g);

        //ADV & DIS to rolls
        var findIF = rollexp.search("if");
        var findADV = rollexp.search("~ADV~");;
        var findDIS = rollexp.search("~DIS~");

        //Checks if it is an IF and does not have any ADV/DIS modifier in the formula
        if (findADV == -1 && findDIS == -1) {
            //In this case it allows to parse the manual MOD in case there is any  
            findIF = -1;

        }

        if (parseid != null) {
            for (let j = 0; j < parseid.length; j++) {
                let idexpr = parseid[j];
                let idtoreplace = "~" + parseid[j] + "~";
                let newid = await auxMeth.autoParser(idexpr, actorattributes, citemattributes, true, number);

                if (newid != "")
                    rollid.push(newid);

                if (parseid[j] == "init")
                    initiative = true;

                if (parseid[j] == "gm")
                    gmmode = true;

                if (parseid[j] == "blind") // TODO: This is checked early... Remove?
                    blindmode = true;

                if (parseid[j] == "nochat") // TODO: This is checked early... Remove?
                    nochat = true;

                if (parseid[j] == "noresult")
                    showResult = false;

                if (findIF != -1) {
                    //We don't do anything - We will parse this into the IF function inside autoParser   
                } else {
                    if (parseid[j] == "ADV")
                        rollmode = "ADV";

                    if (parseid[j] == "DIS")
                        rollmode = "DIS";

                    rollexp = rollexp.replace(idtoreplace, "");
                    rollformula = rollformula.replace(idtoreplace, "");
                }

            }
        }

        //Set ADV or DIS
        if (findIF != -1) {
            //We don't do anything - We will parse this into the IF function inside autoParser   
        } else {

            if (rollmode == "ADV") {
                rollexp = rollexp.replace(/1d20/g, "2d20kh");
            }

            if (rollmode == "DIS") {
                rollexp = rollexp.replace(/1d20/g, "2d20kl");
            }
        }

        if (gmmode)
            ToGM = ChatMessage.getWhisperRecipients('GM');

        //Parse Roll
        rollexp = await auxMeth.autoParser(rollexp, actorattributes, citemattributes, true, false, number);

        //Remove conditionalexp and save it
        let condid = rollexp.match(/(?<=\&\&)(.*?)(?=\&\&)/g);
        if (condid != null) {
            for (let j = 0; j < condid.length; j++) {
                let condidexpr = condid[j];
                if (condidexpr.length > 2) {
                    //console.log(condidexpr);
                    let conddtoreplace = "&&" + condid[j] + "&&";
                    let separador = ""
                    if (j < condid.length - 1)
                        separador = "|"
                    conditionalText += condidexpr + separador;

                    rollexp = rollexp.replace(conddtoreplace, "");
                }

            }
        }

        rollformula = rollformula.replace(/\&\&.*?\&\&/g, "");
        rollexp = rollexp.trim();

        let roll;
        let multiroll = [];

        //PARSE SUBROLLS
        var attpresult = rollexp.match(/(?<=\·\·\!)\S*?(?=\!)/g);
        if (attpresult != null) {

            //Substitute string for current value
            for (let i = 0; i < attpresult.length; i++) {
                //                let debugname = attpresult[i];
                //                console.log(debugname);
                let attname = "··!" + attpresult[i] + "!";
                let attindex = attpresult[i];
                let attvalue = subrolls[parseInt(attindex)].total;

                rollexp = rollexp.replace(attname, attvalue);
                rollformula = rollformula.replace(attname, subrolls[parseInt(attindex)].expr);
            }

        }

        //Add ROLL MODS
        let extramod = 0;
        let extramodstring = "";
        for (let k = 0; k < rollid.length; k++) {
            if (rollid[k] != "" && hasProperty(actorrolls, rollid[k])) {
                rollformula += actorrolls[rollid[k]].value;
                rollexp += actorrolls[rollid[k]].value;
            }
        }

        // ALONDAAR -- EXPRESSION CATCHERS, REMOVE ANYTHING THAT DOES NOT NEED TO BE PARSED FOR RESULT
        //ADDer to target implementation - add(property;value)
        let addArray = null;
        [addArray, rollexp, rollformula] = await this.extractExpression("add", rollexp, rollformula);

        let addSelfArray = null;
        [addSelfArray, rollexp, rollformula] = await this.extractExpression("addself", rollexp, rollformula);

        //SETer to target implementation - set(property;value)
        let setArray = null;
        [setArray, rollexp, rollformula] = await this.extractExpression("set", rollexp, rollformula);

        let setSelfArray = null;
        [setSelfArray, rollexp, rollformula] = await this.extractExpression("setself", rollexp, rollformula);

        // Rollable Table from expression: table(table_name;optional_value)
        let tableArray = null;
        [tableArray, rollexp, rollformula] = await this.extractExpression("table", rollexp, rollformula);

        //ALONDAAR -- Table Lookup from expression: lookupj(journalName;column;row;optionalDefault)
        // JOURNAL NAME SHOULD BE UNIQUE FROM OTHER JOURNALS!
        // ONLY ONE TABLE PER JOURNAL!
        // LIMIT: This only applies to rolls, not auto-calc props... Can use the same logic elsewehre though?
        /*let getLookupJ = rollexp.match(/(?<=\blookupj\b\().*?(?=\))/g);
        if (getLookupJ != null) {
            for (let i = 0; i < getLookupJ.length; i++) {
                let tochange = "lookupj(" + getLookupJ[i] + ")";

                let blocks = getLookupJ[i].split(";");
                let parseprop = await auxMeth.autoParser(blocks[0], actorattributes, citemattributes, true, false, number);
                let parseCol = await auxMeth.autoParser(blocks[1], actorattributes, citemattributes, false, false, number);
                let parseRow = await auxMeth.autoParser(blocks[2], actorattributes, citemattributes, false, false, number);
                let parseDefault = blocks[3];
                if (parseDefault == undefined)
                    parseDefault = 0;
                else
                    parseDefault = await auxMeth.autoParser(blocks[3], actorattributes, citemattributes, false, false, number);
                let replaceValue = parseDefault;

                var myJournal = game.journal.getName(parseprop);
                if (myJournal != null) {
                    var myContent = myJournal.data.content;
                    var doc = new DOMParser().parseFromString(myContent, "text/html");
                    let myTable = doc.getElementsByTagName("TABLE")[0];
                    if (myTable != null) {
                        if (myTable.rows.length > 1) {
                            let foundcol = null;

                            for (var j = 0, col; col = myTable.rows[0].cells[j]; j++) {
                                let colchecker = col.innerText.match(parseCol);
                                if (colchecker != null) {
                                    foundcol = j;
                                    break;
                                }
                            }

                            if (foundcol != null)
                                for (var k = 1, row; row = myTable.rows[k]; k++) {
                                    let rowchecker = row.cells[0].innerText.match(parseRow);
                                    if (rowchecker != null) {
                                        replaceValue = row.cells[foundcol].innerText;
                                        break;
                                    }
                                }
                        }
                        else
                            ui.notifications.error('lookupj() -- Journal with the name "' + parseprop + '" needs a table with at least 2 rows');
                    }
                    else
                        ui.notifications.error('lookupj() -- Journal with the name "' + parseprop + '" does not contain a valid HTML table.');
                } else
                    ui.notifications.error('lookupj() -- Journal with the name "' + parseprop + '" does not exist.');

                rollexp = rollexp.replace(tochange, replaceValue);
                rollformula = rollformula.replace(tochange, replaceValue);
            }
        }*/

        //FIX FORMULA
        rollformula = await auxMeth.autoParser(rollformula, actorattributes, citemattributes, true, false, number);
        let formula = rollformula.replace(/\s[0]\s\+/g, "");
        formula = formula.replace(/(?<=\~)(.*)(?=\~)/g, "");
        formula = formula.replace(/\~/g, "");

        //ROLL EXPRESSION - ROLL TOTAL
        let partroll = new Roll(rollexp);
        roll = await partroll.evaluate({ async: true });
        if (game.dice3d != null && !nochat) {
            let rollblind = blindmode;
            let noshow = true;
            if (game.user.isGM)
                rollblind = false;
            if (blindmode)
                noshow = false;
            await game.dice3d.showForRoll(partroll, game.user, noshow, ToGM, rollblind);
        }

        rolltotal = roll.total;
        if (this.data.data.mod == "" || this.data.data.mod == null)
            this.data.data.mod = 0;

        rolltotal = parseInt(rolltotal) + parseInt(this.data.data.mod) + extramod;

        if (roll.formula.charAt(0) != "-" || roll.formula.charAt(0) != "0")
            multiroll.push(roll);

        // Alondaar -- Actually parse the ADD/SETs that were found earlier
        await this.parseAddSet(addArray, "add", target, actorattributes, citemattributes, number, rolltotal);
        await this.parseAddSet(addSelfArray, "add", "SELF", actorattributes, citemattributes, number, rolltotal);
        await this.parseAddSet(setArray, "set", target, actorattributes, citemattributes, number, rolltotal);
        await this.parseAddSet(setSelfArray, "set", "SELF", actorattributes, citemattributes, number, rolltotal);

        //CHECK CRITS AND FUMBLES TO COLOR THE ROLL
        let hascrit = false;
        let hasfumble = false;
        let rolldice;
        //console.log(multiroll);
        for (let j = 0; j < multiroll.length; j++) {
            let multirolldice = multiroll[j].dice;
            //console.log(multirolldice);
            if (!hasProperty(multiroll[j], "extraroll") && multirolldice.length > 0) {
                if (rolldice == null) {
                    rolldice = multirolldice;
                }
                else {
                    rolldice.push(multirolldice[0]);
                }

            }

            for (let i = 0; i < multirolldice.length; i++) {
                let maxres = multirolldice[i].faces;

                let _hascrit = multirolldice[i].results.includes(maxres);
                let _hasfumble = multirolldice[i].results.includes(1);

                if (_hascrit)
                    hascrit = true;
                if (_hasfumble)
                    hasfumble = true;

            }
        }

        //TEXT MANAGMENET
        let convalue = "";
        //console.log(conditionalText)
        if (conditionalText != "") {
            let blocks = conditionalText.split("|");

            for (let i = 0; i < blocks.length; i++) {
                let thiscond = blocks[i];
                if (thiscond.length > 1) {
                    thiscond = thiscond.replace(/(?<=[\s|;|+|\-|*|\/\(|&|:])total(?=[\s|;|+|\-|*|\/\)])/g, rolltotal);

                    let condblocks = thiscond.split(";");
                    let checktype = condblocks[0];
                    let mycondition = 0;
                    checktype = checktype.replace(/(?<=[\s|;|+|\-|*|\/\(|&|:])total(?=[\s|;|+|\-|*|\/\)])/g, rolltotal);
                    //console.log(checktype);
                    if (checktype === "total") {
                        mycondition += rolltotal;
                    }
                    else {
                        mycondition = await auxMeth.autoParser(checktype, actorattributes, citemattributes, false, false, number);
                    }
                    let myeval = "";
                    for (let j = 1; j < condblocks.length; j++) {
                        let comma = "";
                        if (j < condblocks.length - 1)
                            comma = ",";
                        myeval += condblocks[j] + comma;
                    }

                    //console.log(myeval);
                    //console.log(mycondition);

                    let finaleval = "%[" + mycondition + "," + myeval + "]";
                    //console.log(finaleval);




                    let finalevalvalue = await auxMeth.autoParser(finaleval, actorattributes, citemattributes, false, false, number);
                    //console.log(finalevalvalue);

                    //REMOVES ARITHMETICAL EXPRESSION IN CONDITIONAL TEXTS!!!
                    var parmatch = /\(/g;
                    var parArray;
                    var parresult = [];

                    while (parArray = parmatch.exec(finalevalvalue)) {
                        let suba = finalevalvalue.substring(parmatch.lastIndex, finalevalvalue.length);
                        let subb = auxMeth.getParenthesString(suba);
                        parresult.push(subb);
                    }

                    if (parresult != null) {
                        //Substitute string for current value        
                        for (let i = 0; i < parresult.length; i++) {
                            let hasletters = /[A-Za-z]+/g;
                            let hassubfunctions = parresult[i].match(hasletters);

                            if (!hassubfunctions) {
                                let parsedres = eval(parresult[i]);
                                let tochax = "(" + parresult[i] + ")";
                                finalevalvalue = finalevalvalue.replace(tochax, parsedres);
                            }
                        }
                    }

                    finalevalvalue = await auxMeth.autoParser(finalevalvalue, actorattributes, citemattributes, false, false, number);

                    //console.log(parresult);

                    convalue += finalevalvalue + " ";
                    //console.log(convalue);
                }


            }

        }

        //console.log(rolldice);
        //console.log(subrolls);
        //console.log(convalue);

        //PREPARE TYE ROLL TEMPLATE
        let rollData = {
            token: {
                img: this.img,
                name: this.name
            },
            actor: this.name,
            flavor: rollname,
            formula: formula + extramodstring,
            mod: this.data.data.mod,
            result: rolltotal,
            dice: rolldice,
            subdice: subrolls,
            user: game.user.name,
            conditional: convalue,
            iscrit: hascrit,
            isfumble: hasfumble,
            blind: blindmode,
            link: linkmode,
            rollexp: initrollexp,
            actorid: this.id,
            msgid: null,
            showresult: showResult
        };



        if (!nochat) {
            let newhtml = await renderTemplate("systems/sandbox/templates/dice.html", rollData);
            let rolltype = document.getElementsByClassName("roll-type-select");
            let rtypevalue = rolltype[0].value;
            let rvalue = 0;
            if (rtypevalue == "gmroll")
                rvalue = 1;

            var wrapper = document.createElement('div');
            wrapper.innerHTML = newhtml;
            let cilink = wrapper.querySelector(".roll-citemlink");

            if (cilink != null)
                cilink.setAttribute('id', rollcitemID);

            //console.log(cilink);

            let messageData = {
                content: wrapper.innerHTML,
                type: rvalue,
                blind: blindmode
            };

            if (gmmode)
                messageData.whisper = ChatMessage.getWhisperRecipients('GM');

            //console.log(blindmode);

            let newmessage = await ChatMessage.create(messageData);
            rollData.msgid = newmessage.id;

            //if(game.user.isGM){
            auxMeth.rollToMenu(newhtml);

            //}
        }

        //console.log(initiative);
        if (initiative) {
            await this.setInit(rollData.result, tokenID);
        }

        //ALONDAAR -- Find and roll on the rollable table(s)
        if (tableArray != null) {
            for (let i = 0; i < tableArray.length; i++) {
                let blocks = tableArray[i].split(";");
                const table = game.tables.getName(blocks[0]);

                let rmode = "";
                if (gmmode)
                    rmode += "gmroll";
                if (blindmode)
                    rmode += "blindroll";

                //If an optional value is supplied, use that instead of the Default Table Roll
                if (blocks[1] != null) {
                    let parsevalue = 0;
                    if (blocks[1].includes("total"))
                        blocks[1] = blocks[1].replaceAll(/total/ig, rolltotal);
                    parsevalue = await auxMeth.autoParser(blocks[1], actorattributes, citemattributes, false, false, number);
                    parsevalue = Number(parsevalue);
                    if (isNaN(parsevalue))
                        break;
                    const table_roll = await new Roll(`${parsevalue}`);

                    table.draw({ roll: table_roll, rollMode: rmode });
                } else {
                    table.draw({ rollMode: rmode });
                }
            }
        }

        //TEST SERE FOR BETTER ROLL RESULTS
        //return rollData.result;
        return rollData;
    }

    sendMsgChat(flavor, msg, submsg) {
        let rollData = {
            token: {
                img: this.img,
                name: this.name
            },
            actor: this.name,
            flavor: flavor,
            msg: msg,
            user: game.user.name,
            submsg: submsg
        };


        renderTemplate("systems/sandbox/templates/msg.html", rollData).then(html => {
            ChatMessage.create({
                content: html
            });

            //if(game.user.isGM){
            auxMeth.rollToMenu(html);
            //}
        });
    }

    async requestToGM(myactor, tokenId, attkey, attvalue) {
        let mytoken = canvas.tokens.get(tokenId);
        if (mytoken == null)
            return;

        if (game.user.isGM) {
            //console.log(attkey);
            //console.log(attvalue);
            //console.log(myactor);
            if (myactor.istoken) {
                await mytoken.update({ [`actorData.data.attributes.${attkey}.value`]: attvalue });
            }
            else {
                //console.log("updating linked token");
                //let actorref = game.actors.get(myactor.data.id);
                await mytoken.actor.update({ [`data.attributes.${attkey}.value`]: attvalue });
                //actorref.data.data.attributes[attkey].value = attvalue;
                //await actorref.update(actorref.data,{diff:false});
            }

        }
        else {
            console.log("requesting to GM");

            game.socket.emit("system.sandbox", {
                op: 'target_edit',
                user: game.user.id,
                scene: canvas.scene.id,
                actorId: mytoken.actor.id,
                tokenId: tokenId,
                attkey: attkey,
                attvalue: attvalue,
                istoken: myactor.istoken
            });
        }

    }

    async requestTransferToGM(actorID, ownerID, citemID, number) {
        console.log("requiesting to GM");
        game.socket.emit("system.sandbox", {
            op: 'transfer_edit',
            user: game.user.id,
            actorID: actorID,
            ownerID: ownerID,
            citemID: citemID,
            number: number
        });
    }

    async handleTransferEdit(data) {
        console.log("handleing transfer");
        if (!game.user.isGM)
            return;
        let actorOwner = game.actors.get(data.ownerID);
        let ownercItems = duplicate(actorOwner.data.data.citems);
        let cItem = ownercItems.find(y => y.id == data.citemID);
        cItem.number -= data.number;

        let actorReceiver = game.actors.get(data.actorID);
        let receivercItems = duplicate(actorReceiver.data.data.citems);


        try {
            await actorOwner.update({ "data.citems": ownercItems });
            return true;
        }
        catch (err) {
            let cItemRec = receivercItems.find(y => y.id == data.citemID);

            if (cItemRec != null) {
                cItemRec.number -= data.number;
            }

            await actorReceiver.update({ "data.citems": receivercItems });
        }


    }

    async handleTargetRequest(data) {
        if (!game.user.isGM)
            return;
        console.log("request obtained");

        let mytoken = canvas.tokens.get(data.tokenId);
        //console.log(mytoken);
        if (data.istoken) {
            await mytoken.update({ [`actorData.data.attributes.${data.attkey}.value`]: data.attvalue });
        }
        else {
            await mytoken.actor.update({ [`data.attributes.${data.attkey}.value`]: data.attvalue });
        }

    }

    async setInit(roll, tokenID = null) {
        //console.log("setting init");
        const tokens = canvas.tokens.ownedTokens;

        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            let tokenactor = token.actor;
            let myactor = this;

            if (myactor.id == tokenactor.id) {

                if (!tokenactor.isToken && tokenID == null) {
                    tokenID = token.id;
                }

                //The following is for initiative
                let combatants = game.combat.combatants;
                for (let combatKey of combatants.keys()) {
                    let _combatant = await combatants.get(combatKey);
                    if (_combatant.token.id == tokenID) {
                        //console.log(_combatant);
                        game.combat.updateEmbeddedDocuments("Combatant", [{ _id: _combatant.id, initiative: roll }]);
                        //_combatant.rollInitiative(roll);
                    }

                }
            }



        }

        //THIS IS THE MACRO FOR NPCS ROLLS/INITIATIVE!!!
        //        ( async () => {
        //        let rollexp = "ROLEXPRESION";
        //        let rollname = "INICIATIVA";
        //            const selected = canvas.tokens.controlledTokens;
        //
        //            for(let i=0;i<selected.length;i++){
        //                let token = selected[i];
        //                const actor = token.actor;
        //                let result = await actor.rollSheetDice(rollexp,rollname,null,actor.data.data.attributes,null);
        //                //The following is for initiative
        //                const combatants = game.combat.combatants;
        //                for(let j=0;j<combatants.length;j++){
        //                    let _combatant = game.combat.combatants[j];
        //
        //                    if(_combatant.tokenId == token.data.id){
        //
        //                        game.combat.updateCombatant({_id: _combatant.id, initiative: result});
        //                    }
        //
        //                }
        //
        //            }
        //        }
        //        )();

        //THIS IS THE MACRO FOR CITEM NPCS ROLLS!!!
        //        ( async () => {
        //            let propKey = "tiradaataquepnj";
        //            let citemname = "Ataque 1";
        //            
        //            let property = game.items.find(y=>y.type=="property" && y.data.data.attKey==propKey);
        //            let citemattributes;
        //            const selected = canvas.tokens.controlledTokens;
        //
        //            for(let i=0;i<selected.length;i++){
        //                let token = selected[i];
        //                const actor = token.actor;
        //
        //                let citem = actor.data.data.citems.find(y=>y.name == citemname);
        //                if(citem==null)
        //                    return;
        //
        //                citemattributes = citem.attributes;
        //                
        //                let rollexp = property.data.data.rollexp;
        //                let rollname = property.data.data.rollname;
        //                rollname = rollname.replace("#{name}",citem.name);
        //                let result = await actor.rollSheetDice(rollexp,rollname,null,actor.data.data.attributes,citemattributes);
        //
        //            }
        //        }
        //        )();

        //THIS IS THE MACRO FOR NPC ATTRIBUTE ROLLS!
        //        ( async () => {
        //            let propKey = "punteria";
        //            
        //            let property;
        //            let citemattributes;
        //            const selected = canvas.tokens.controlled;
        //
        //            for(let i=0;i<selected.length;i++){
        //                let token = selected[i];
        //                const actor = token.actor;
        //
        //                property = game.items.find(y=>y.type=="property" && y.data.data.attKey==propKey);
        //                if(property==null)
        //                    return;
        //
        //                let rollexp = property.data.data.rollexp;
        //                let rollname = property.data.data.rollname;
        //                rollname = rollname.replace("#{name}",citem.name);
        //                let result = await actor.rollSheetDice(rollexp,rollname,null,actor.data.data.attributes,citemattributes);
        //
        //            }
        //        }
        //        )();

    }
}
