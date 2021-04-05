import { SBOX } from "./config.js";
import { auxMeth } from "./auxmeth.js";

export class gActor extends Actor{

    prepareData(){     
        super.prepareData();

        // Get the Actor's data object
        const actorData = this.data;
        const data = actorData.data;
        const flags = actorData.flags;

        if (!hasProperty(flags, "ischeckingauto")){
            setProperty(flags,"ischeckingauto", false);
        }

        if (!hasProperty(flags, "hasupdated")){
            setProperty(flags,"hasupdated", true);
        }

        if (!hasProperty(flags, "scrolls")){
            setProperty(flags,"scrolls", {});
        }

        // Prepare Character data
        //console.log("preparing data");
        if(data.istemplate){

            if (!hasProperty(flags, "tabarray")){
                setProperty(flags,"tabarray", []);
            }

            if (!hasProperty(flags, "rows")){
                setProperty(flags,"rows", 0);
                setProperty(flags,"rwidth", 0);
            }


        }

        if(!hasProperty(flags,"sandbox")){
            setProperty(flags,"sandbox", {});
        }

        if(!hasProperty(flags.sandbox,"scrolls_" + game.user._id + "_" + this.id)){
            setProperty(flags.sandbox,"scrolls_" + game.user._id + "_" + this.id, 0);
        }




        //console.log(this);

    }

    prepareDerivedData(){
        //console.log("llo");



        if (!hasProperty(this.data.flags, "sbupdated")){
            setProperty(this.data.flags,"sbupdated", 0);
        }

        if (!hasProperty(this.data.data, "biovisible")){
            setProperty(this.data.data,"biovisible", false);
        }
    }

    async listSheets(){

        let templates = await auxMeth.getSheets();
        this.data.data.sheets = templates;

        //let charsheet = document.getElementById("actor-"+this._id);

        let charsheet;
        if(this.token==null){
            charsheet = document.getElementById("actor-"+this._id);
        }
        else{
            charsheet = document.getElementById("actor-"+this._id+"-"+this.token.data._id);
        }
        let sheets = charsheet.getElementsByClassName("selectsheet");

        if(sheets==null)
            return;

        let selector = sheets[0];

        if(selector==null)
            return;

        var length = selector.options.length;

        for (let j = length-1; j >= 0; j--) {
            selector.options[j] = null;
        }

        for(let k=0;k<templates.length;k++){
            var opt = document.createElement('option');
            opt.appendChild(document.createTextNode(templates[k]));
            opt.value = templates[k];
            selector.appendChild(opt);
        }

        selector.value = this.data.data.gtemplate;
    }

    async updateModifiedData(originaldata, extradata){

        let existingData = await duplicate(originaldata);
        for(let prop in extradata){
            if(extradata[prop]===null || extradata[prop]===undefined)
                delete extradata[prop];
            existingData[prop] = extradata[prop];
        }
        let newData = await this.actorUpdater(existingData);
        //console.log(newData);
        return newData;
    }

    //Overrides update method
    async update(data, options={}) {

        //console.log("updating");
        //console.log("alla");
        //console.log(data);
        //console.log(options);
        let newdata;
        let scrollTop;

        if(data!=null){
            scrollTop = await this.sheet.scrollbarSet();
            if (data["data.citems"]!=null){
                newdata = {};
                setProperty(newdata,"data",{});
                newdata.data.citems = data["data.citems"];
            }
            else{
                newdata  = data;
            }

            if(data.biovisible!=null){
                options.diff = false;
            }

            //newdata["flags.sandbox." + "scrolls_" + game.user._id + "_" + this.id] = await this.sheet.scrollbarSet;


        }

        if(!options.stopit){

            if(!newdata.flags){
                newdata["flags.sandbox." + "scrolls_" + game.user._id + "_" + this.id] = scrollTop;
            }

            else{
                newdata.flags.sandbox["scrolls_" + game.user._id + "_" + this.id] = scrollTop;
            }
        }

        //console.log(newdata);

        return super.update(newdata, options);

    }

    async addcItem(ciTem,addedBy = null,data = null){
        //console.log("adding citems");

        if(data == null){
            data = this.data;
        }

        const citems = data.data.citems;
        const attributes = data.data.attributes;

        let itemKey = "";
        let newItem={};
        //console.log(ciTem.data.data.groups);
        setProperty(newItem,itemKey,{});
        newItem[itemKey].id=ciTem.data._id;
        newItem[itemKey].ikey=itemKey;
        newItem[itemKey].name=ciTem.data.name;

        if(!data.data.istemplate){
            newItem[itemKey].number = 1;
            newItem[itemKey].isactive = false;
            newItem[itemKey].isreset = true;

            let isunik = ciTem.data.data.isUnique;

            for(let j=0;j<ciTem.data.data.groups.length;j++){

                let _groupcheck = await game.items.get(ciTem.data.data.groups[j].id);
                let groupID = ciTem.data.data.groups[j].id;
                if (_groupcheck.data.data.isUnique){
                    for(let i=citems.length-1;i>=0;i--){
                        let citemObj = game.items.get(citems[i].id);
                        let hasgroup = citemObj.data.data.groups.some(y=>y.id==groupID);
                        if(hasgroup){
                            await this.deletecItem(citems[i].id, true);
                            //await  citems.splice(i,1);
                        }

                    }
                }

            }

            //newItem[itemKey].attributes = ciTem.data.data.attributes;
            //newItem[itemKey].attributes = {};
            newItem[itemKey].attributes = await duplicate(ciTem.data.data.attributes);
            newItem[itemKey].attributes.name = ciTem.data.name;
            newItem[itemKey].rolls = {};
            newItem[itemKey].lastroll = 0;

            newItem[itemKey].groups = ciTem.data.data.groups;
            newItem[itemKey].usetype = ciTem.data.data.usetype;
            newItem[itemKey].ispermanent = ciTem.data.data.ispermanent;
            newItem[itemKey].rechargable = ciTem.data.data.rechargable;
            let maxuses = ciTem.data.data.maxuses;
            if(isNaN(maxuses))
                maxuses = await auxMeth.autoParser(maxuses,attributes,ciTem.data.data.attributes,false);
            newItem[itemKey].maxuses = maxuses;
            newItem[itemKey].uses = parseInt(maxuses);
            newItem[itemKey].icon = ciTem.data.data.icon;
            newItem[itemKey].selfdestruct = ciTem.data.data.selfdestruct;
            newItem[itemKey].mods = [];
            for(let i=0;i<ciTem.data.data.mods.length;i++){
                let _mod = ciTem.data.data.mods[i];
                await newItem[itemKey].mods.push({
                    index:_mod.index,
                    citem: ciTem.data._id,
                    once:_mod.once,
                    exec:false,
                    attribute:_mod.attribute,
                    expr:_mod.value,
                    value:null
                });
            }


            newItem[itemKey].disabledmods = [];

            if(addedBy){
                newItem[itemKey].addedBy = addedBy;
            }
        }



        await citems.push(newItem[itemKey]);

        data.flags.haschanged = true;

    }

    async deletecItem(itemID, cascading=false){
        //get Item
        //console.log("deleting");
        const newdata = this.data;
        const attributes = newdata.data.attributes;
        let citems = newdata.data.citems;
        let toRemove = citems.find(y=>y.id==itemID);
        let remObj = game.items.get(itemID);
        //console.log(remObj);

        if(remObj!=null){
            let toRemoveObj = remObj.data.data;

            //Remove values added to attributes
            let addsetmods = toRemoveObj.mods.filter(y => y.type=="ADD");
            for(let i=0;i<addsetmods.length;i++){
                let modID = addsetmods[i].index;
                const _basecitem = await citems.find(y=>y.id==itemID && y.mods.find(x=>x.index==modID));
                if(_basecitem!=null){
                    const _mod = await _basecitem.mods.find(x=>x.index==modID);

                    let myAtt = _mod.attribute;
                    let myAttValue = _mod.value;
                    let attProp = "value";

                    if(myAtt!=null){
                        if(myAtt.includes(".max")){
                            attProp="max";
                            myAtt = myAtt.replace(".max","");
                        }
                        const actorAtt = attributes[myAtt];

                        if(actorAtt!=null){
                            if(addsetmods[i].type=="ADD"){
                                let jumpmod = await this.checkModConditional(this.data,addsetmods[i]);
                                if(((toRemove.isactive && !toRemoveObj.ispermanent) || (toRemoveObj.usetype=="PAS" && !toRemoveObj.selfdestruct)) && !jumpmod){
                                    actorAtt[attProp] -= myAttValue;
                                }

                            }
                        }

                    }
                }

            }

            let createmods = toRemoveObj.mods.filter(y => y.type=="CREATE");
            for(let h=0;h<createmods.length;h++){
                let ccmodID = createmods[h].index;
                let _ccitem = await citems.find(y=>y.id==itemID && y.mods.find(x=>x.index==ccmodID));
                if(_ccitem!=null){
                    let ccmod = await _ccitem.mods.find(x=>x.index==ccmodID);
                    let ccAtt = ccmod.attribute;

                    attributes[ccAtt].value = attributes[ccAtt].prev;

                }
            }

            let itemsadded = citems.filter(y=>y.addedBy==itemID);
            for(let j=0;j<itemsadded.length;j++){

                if(!toRemoveObj.ispermanent)
                    await this.deletecItem(itemsadded[j].id,true);
            }

        }

        citems.splice(citems.indexOf(toRemove),1);
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

    async updateCItems(){
        const citems = this.data.data.citems;
        for(let i=0;i<citems.length;i++){
            let citem = citems[i];
            let citemTemplate = game.items.get(citems[i].id);

            if(citemTemplate!=null){
                for(let j=0;j<citemTemplate.data.data.groups.length;j++){
                    let groupID = citemTemplate.data.data.groups[j];
                    let group = game.items.get(groupID.id);

                    if(group!=null){
                        for(let y=0;y<group.data.data.properties.length;y++){
                            let property = group.data.data.properties[y];
                            if(property.isconstant && citem.attributes[property.ikey]){
                                //console.log(property.ikey);
                                if(citem.attributes[property.ikey].value != citemTemplate.data.data.attributes[property.ikey].value){
                                    citem.attributes[property.ikey].value = citemTemplate.data.data.attributes[property.ikey].value;
                                }
                            }
                        }
                    }


                }
            }

            else{
                citems.splice(citems.indexOf(citem),1);
            }



        }

    }

    async checkAttConsistency(attributes,mods){

        let attArray=[];
        //const attributes = this.data.data.attributes;
        //console.log(data.attributes);

        for(let k=0;k<mods.length;k++){
            let mod = mods[k];
            if(!attArray.includes(mods.attribute) && mod.attribute!=""){
                let moat = mod.attribute.replace(".max","");
                await attArray.push(moat);
            }



        }
        //console.log(attArray);

        for(let i=0;i<attArray.length;i++){

            let attribute = attArray[i];
            let attID;
            //console.log(attribute);
            let propertypool = await game.items.filter(y=>y.data.type=="property" && y.data.data.attKey==attribute);
            let property = propertypool[0];

            if(property!=null){

                if(!hasProperty(attributes,attribute)){
                    //console.log("noatt");
                    await setProperty(attributes,attribute,{});
                }

                if(!hasProperty(attributes[attribute],"id")){

                    await setProperty(attributes[attribute],"id",property.data._id);
                    attID = property.data._id;

                }

                let defvalue = await auxMeth.autoParser(property.data.data.defvalue,attributes,null,false);

                if(!hasProperty(attributes[attribute],"value")){
                    //console.log("novalue");
                    await setProperty(attributes[attribute],"value",defvalue);
                }

                if(!hasProperty(attributes[attribute],"max")){
                    //console.log("nomax");
                    await setProperty(attributes[attribute],"max","");
                }

                if(!hasProperty(attributes[attribute],"prev")){
                    //console.log("noprev");
                    await setProperty(attributes[attribute],"prev",defvalue);
                }
            }

        }

        //console.log(attributes);

    }

    async getMods(data){
        //console.log(data);
        const citemIDs = data.data.citems;
        const attributes = data.data.attributes;

        let mods=[];
        let newcitem=false;
        let updatecItem=true;
        for(let n=0;n<citemIDs.length;n++){

            let ciID = citemIDs[n].id;

            let citemObjBase = await game.items.get(ciID);

            if(citemObjBase!=null){
                let citemObj = citemObjBase.data.data;

                for(let i=0;i<citemObj.mods.length;i++){

                    await mods.push(citemObj.mods[i]);
                }
            }

        }

        //console.log(mods);

        //ADD CI ITEMS 
        const itemmods = mods.filter(y=>y.type=="ITEM");

        data.data.selector=false;
        for(let i=0;i<itemmods.length;i++){
            let mod = itemmods[i];
            let _citem = game.items.get(mod.citem).data.data;
            let citem = citemIDs.find(y=>y.id==mod.citem);
            let jumpmod=false;

            jumpmod = await this.checkModConditional(data,mod);
            //console.log("Not add mod " + mod.name + " from Citem " + citem.name + " " + jumpmod);

            if(!jumpmod){
                if(mod.selectnum==0){
                    for(let k=0;k<mod.items.length;k++){

                        let itemtoadd = mod.items[k];
                        let toadd = game.items.get(itemtoadd.id);

                        let ispresent = citemIDs.some(y=>y.id==itemtoadd.id);

                        const _basecitem = await citemIDs.find(y=>y.id==mod.citem && y.mods.find(x=>x.index==mod.index));
                        const _mod = await _basecitem.mods.find(x=>x.index==mod.index);


                        if(_citem.usetype=="PAS" || citem.isactive){

                            if(!ispresent && !_mod.exec){
                                //console.log("adding " + toadd.name);
                                let newItem= game.items.get(itemtoadd.id);
                                await this.addcItem(newItem,mod.citem,data);



                                newcitem = true;
                                if(mod.once)
                                    _mod.exec = true;
                            }
                        }

                        else{
                            if(ispresent && !_citem.ispermanent){
                                newcitem = true;
                                let citemmod = citemIDs.find(y=>y.id==itemtoadd.id);
                                let cindex = citemIDs.indexOf(citemmod);
                                //console.log("deleting " + toadd.name);
                                await citemIDs.splice(cindex,1);
                                _mod.exec = false;
                            }
                        }

                    }
                }

                else{

                    let thiscitem = citemIDs.find(y=>y.id==mod.citem);

                    if(!hasProperty(thiscitem,"selection")){
                        setProperty(thiscitem,"selection",[]);
                    }

                    let selindex = thiscitem.selection.find(y=>y.index==mod.index);

                    if(selindex==null){
                        let newindex = {};
                        newindex.index = mod.index;
                        newindex.selected = false;
                        thiscitem.selection.push(newindex);
                        data.data.selector=true;
                    }

                    else{
                        if(!selindex.selected){
                            data.data.selector=true;
                        }
                    }

                }
            }

        }

        //console.log(mods);

        if(newcitem){
            mods = await this.getMods(data);
        }

        return mods;
    }

    async setInputColor(){

        const citemIDs = this.data.data.citems;

        for(let j=0;j<citemIDs.length;j++){
            const mods = citemIDs[j].mods;
            if(mods!=null){
                for (let i=0;i<mods.length;i++){
                    if(mods[i].exec){
                        const thismod = mods[i];

                        let charsheet;
                        if(this.token==null){
                            charsheet = document.getElementById("actor-"+this._id);
                        }
                        else{
                            charsheet = document.getElementById("actor-"+this._id+"-"+this.token.data._id);
                        }

                        if(charsheet!=null){
                            let attinput = charsheet.getElementsByClassName(thismod.attribute);

                            if (attinput[0]!=null){
                                if(parseInt(thismod.value)<0){
                                    attinput[0].className += " input-red";
                                }
                                else{
                                    attinput[0].className += " input-green";
                                }
                            }
                        }

                    }
                }
            }

        }

    }

    async checkModConditional(data,mod){
        const citemIDs = data.data.citems;
        const attributes = data.data.attributes;
        let condAtt = mod.condat;
        let jumpmod = false;
        //console.log(condAtt);

        let citem = citemIDs.find(y=>y.id==mod.citem);

        if (condAtt!=null && condAtt!="" && mod.condat!=""){
            let condValue = await auxMeth.autoParser(mod.condvalue,attributes,citem.attributes,false);
            let attIntValue;
            if(condAtt.includes("#{")|| condAtt.includes("@{")){

                attIntValue = await auxMeth.autoParser(condAtt,attributes,citem.attributes,false);
            }

            else{
                if(attIntValue==false || attIntValue==true){
                    attIntValue = attributes[condAtt].value;
                }
                else{
                    if(!isNaN(attIntValue)){
                        attIntValue = parseInt(attributes[condAtt].value);
                    }
                    else{
                        attIntValue = attributes[condAtt].value;
                    }
                }



            }

            //console.log("Comparing " + condAtt + " " + attIntValue + " " + condValue);

            if(mod.condop=="EQU"){
                if(attIntValue.toString()!=mod.condvalue.toString()){
                    jumpmod=true;
                }
            }

            else if(mod.condop=="HIH"){
                if(!isNaN(attIntValue) && !isNaN(condValue)){
                    if(Number(attIntValue)<=Number(condValue)){
                        jumpmod=true;
                    }
                }

            }

            else if(mod.condop=="LOW"){
                if(!isNaN(attIntValue) && !isNaN(condValue))
                    if(Number(attIntValue)>=Number(condValue)){
                        jumpmod=true;
                    }
            }
        }


        //console.log(jumpmod);
        return jumpmod;
    }

    async setdefcItems(actorData){
        //ADDS defauls CITEMS
        const citemIDs = actorData.data.citems;

        let mytemplate = actorData.data.gtemplate;
        if(mytemplate!="Default"){
            let _template = await game.actors.find(y=>y.data.data.istemplate && y.data.data.gtemplate==mytemplate);

            for(let k=0;k<_template.data.data.citems.length;k++){
                let mycitemId = _template.data.data.citems[k].id;
                let mycitem = game.items.get(mycitemId);
                let citeminActor = await citemIDs.find(y=>y.id == mycitemId);

                if(!citeminActor && mycitem!=null){
                    await this.addcItem(mycitem);
                }
            }

        }

        return citemIDs;
    }

    async compareValues(data1,data2){
        var result = {};
        var keys = Object.keys(data1);
        for (var key in data2) {
            //console.log(data1[key].value + " vs " + data2[key].value);
            if (!keys.includes(key) || data1[key].value!== data2[key].value) {
                result[key] = {};
                result[key].value = data2[key].value;
            }
        }

        return result;
    }
    async comparecItems(data1,data2){
        var result = [];
        var keys = Object.keys(data1);

        for (let i = 0; i<data2.length; i++) {
            if (!data1.includes(data2[i])) {
                result.push(data2[i]);
            }

        }

        return result;
    }

    async checkPropAuto(actorData,repeat=false){
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
        //console.log(attributes);
        //console.log(sheetAtts);

        for(let attribute in attributes){
            let attdata = attributes[attribute];

            if(Array.isArray(attdata.value))
                attdata.value = attdata.value[0];
            //console.log(attdata.name + " " + attdata.value + " isset " + attdata.isset);
            setProperty(attdata,"isset",false);
            setProperty(attdata,"maxset",false);
            setProperty(attdata,"default",false);

            //TEST TO DELETE
            setProperty(attdata,"autoadd",0);
            setProperty(attdata,"maxadd",0);

            attributearray.push(attribute);

            //}

        }

        //CHECKING CI ITEMS
        actorData.data.citems = await this.setdefcItems(actorData);

        const citemIDs = actorData.data.citems;

        let mods=[];
        if(citemIDs!=null){
            let initlength =citemIDs.length;
            mods = await this.getMods(actorData);
            if(initlength<citemIDs.length){
                newcitem=true;
                ithaschanged = true;
            }
        }

        //console.log(mods);

        await this.updateCItems();
        if(mods.length>0)
            await this.checkAttConsistency(attributes,mods);

        const rolls = actorData.data.rolls;

        //CREATE MODS
        const createmods = mods.filter(y=>y.type=="CREATE");
        for(let i=0;i<createmods.length;i++){
            let mod = createmods[i];
            //console.log(mod);
            let modAtt = mod.attribute;
            let mod_defvalue = mod.value;
            if(!hasProperty(attributes,modAtt)){
                setProperty(attributes,modAtt,{});
                setProperty(attributes[modAtt],"id",mod.citem + "_" + mod.index);
                setProperty(attributes[modAtt],"value",mod_defvalue);
                setProperty(attributes[modAtt],"prev",mod_defvalue);
                setProperty(attributes[modAtt],"autoadd",0);
                setProperty(attributes[modAtt],"isset",false);
                setProperty(attributes[modAtt],"created",true);
                setProperty(attributes[modAtt],"hastotals",false);
            }

        }

        //CHECK DEFVALUES IF IS NOT AUTO!!
        for (let i=0;i<attributearray.length;i++){
            let attribute = attributearray[i];
            let attdata = attributes[attribute];
            let property = await game.items.get(actorData.data.attributes[attribute].id);
            const actorAtt = actorData.data.attributes[attribute];
            if(property!=null){
                if(actorAtt.value==="" && property.data.data.auto=="" && !property.data.data.defvalue.includes(".max}")){
                    if(property.data.data.defvalue!="" || (property.data.data.datatype == "checkbox")){

                        //console.log("defaulting " + attribute);

                        //console.log(property.data.data.defvalue);
                        let exprmode = false;
                        if(property.data.data.datatype == "simpletext" || property.data.data.datatype == "textarea")
                            exprmode = true;
                        let newValue = await auxMeth.autoParser(property.data.data.defvalue,attributes,null,exprmode);
                        if(property.data.data.datatype == "checkbox"){

                            if(newValue==null){
                                newValue = false;
                            }
                            else if(newValue=="" || newValue==0 || newValue === "false"){
                                newValue=false;
                            }

                            else{
                                newValue=true;
                            }

                        }
                        //console.log("defaulting " + attribute + " to " + newValue);
                        if(actorAtt.value!=newValue)
                            ithaschanged = true;

                        actorAtt.value = newValue;

                    }

                }
                //console.log(property.data.data);
                //TODO DEFVALUE PARA MAX

                if(attdata.modmax)
                    attdata.maxblocked = true;

                if(actorAtt.max==null || actorAtt.max=="")
                    attdata.maxblocked = false;

                if(property.data.data.automax!=null){
                    if(property.data.data.automax!=""){
                        //console.log(property.data.data.automax);
                        if(!hasProperty(attdata,"maxblocked"))
                            attdata.maxblocked = false;
                        if(!attdata.maxblocked){
                            actorAtt.max = await auxMeth.autoParser(property.data.data.automax,attributes,null,false);
                            //console.log(attribute +" max to " + actorAtt.max);
                        }

                    }
                }

                if(actorAtt.max==null || actorAtt.max=="")
                    attdata.maxblocked = false;


            }

        }

        //console.log(attributes);

        //CI SET MODS
        const setmods = mods.filter(y=>y.type=="SET");
        for(let i=0;i<setmods.length;i++){
            let mod = setmods[i];
            //console.log(mod);
            let modAtt = mod.attribute;
            let attProp = "value";
            let modvable = "modified";
            let setvble = "isset";
            if(modAtt.includes(".max")){
                modAtt = modAtt.replace(".max","");
                attProp = "max";
                modvable = "modmax";
                setvble = "maxset";
            }

            let jumpmod=false;
            if(mod.condop!="NON" && mod.condop!=null){
                jumpmod = await this.checkModConditional(actorData,mod);
            }

            if(hasProperty(attributes,modAtt)){
                let value = mod.value;

                let finalvalue =value;

                //console.log(mod.name + " " + mod.citem + " " + mod.index + " " + mod.value);

                let citem = citemIDs.find(y=>y.id==mod.citem);

                let _citem = await game.items.get(mod.citem).data.data;

                finalvalue = await auxMeth.autoParser(value,attributes,citem.attributes,true,false,citem.number);
                //console.log(finalvalue);

                const myAtt = attributes[modAtt];
                //console.log(mod.name + " " + mod.citem + " " + mod.index);

                const _basecitem = await citemIDs.find(y=>y.id==mod.citem && y.mods.find(x=>x.index==mod.index));
                const _mod = await _basecitem.mods.find(x=>x.index==mod.index);

                //                console.log(mod.name);
                //                console.log(value);
                //                
                //                console.log(_mod.expr);
                //                console.log(_mod.exec);

                if(_mod==null)
                    console.log(citem);

                //Checks if mod has not changed. TODO METHOD TO CHECK THIS AND MOD EXISTING IN BETTER WAY
                //if(_mod.exec && (_mod.value!=finalvalue || _mod.attribute!=modAtt)){
                if(_mod.exec && (_mod.attribute!=modAtt)){
                    _mod.exec = false;
                }

                if(_mod.expr!=null){
                    if(finalvalue != _mod.expr){
                        _mod.exec = false;
                    }

                }

                _mod.expr = finalvalue;

                let textexpr = value.match(/[|]/g);
                if(textexpr==null && (value.charAt(0)!="|")){
                    finalvalue = await auxMeth.autoParser(finalvalue,attributes,citem.attributes,false,false,citem.number);
                }



                if((_citem.usetype=="PAS" || citem.isactive) && !jumpmod){

                    if(attProp!="max" || (attProp=="max" && !myAtt.maxblocked)){
                        //console.log("Setting" + modAtt + " to " + finalvalue);
                        myAtt.prev= myAtt[attProp];
                        _mod.exec = true;
                        _mod.value=finalvalue;
                        _mod.attribute=mod.attribute;
                        ithaschanged = true;
                        myAtt[attProp]= finalvalue;
                        myAtt[setvble]= true;

                    }



                }

                else{

                    _mod.exec = false;

                }

            }

        }
        //console.log("PNUMD= " + attributes["pnum_d"].value);

        //CI ADD TO NON AUTO ATTR
        const addmods = mods.filter(y=>y.type=="ADD");
        for(let i=0;i<addmods.length;i++){
            let mod = addmods[i];
            let modAtt = mod.attribute;
            let attProp = "value";
            let modvable = "modified";
            let setvble = "isset";
            if(modAtt.includes(".max")){
                modAtt = modAtt.replace(".max","");
                attProp = "max";
                modvable = "modmax";
                setvble = "maxset";
            }
            //console.log(modAtt);
            let jumpmod=false;
            if(mod.condop!="NON" && mod.condop!=null){
                jumpmod = await this.checkModConditional(actorData,mod);
            }
            //console.log(jumpmod);
            let citem = await citemIDs.find(y=>y.id==mod.citem);
            let _citem = await game.items.get(mod.citem).data.data;

            if(hasProperty(attributes,modAtt)){

                const myAtt = attributes[modAtt];

                let seedprop = game.items.get(myAtt.id);
                let checker = false;
                if(seedprop!=null){
                    if(seedprop!=null && ((seedprop.data.data.automax=="" && attProp=="max") || (seedprop.data.data.auto=="" && attProp=="value")) && (seedprop.data.data.datatype=="simplenumeric" || seedprop.data.data.datatype=="radio")){
                        checker = true;
                    }
                }


                if(myAtt.created || checker){

                    let value =mod.value;
                    if(value==null)
                        value=0;
                    let finalvalue=value;
                    if(value!=null){
                        if(isNaN(value)){
                            if(value.charAt(0)=="|"){
                                value = value.replace("|","");
                                finalvalue = await auxMeth.autoParser(value,attributes,citem.attributes,true,false,citem.number);
                            }
                            else{
                                finalvalue = await auxMeth.autoParser(value,attributes,citem.attributes,false,false,citem.number);
                            }
                        }
                    }


                    finalvalue = Number(finalvalue);

                    //console.log(mod.index);

                    const _basecitem = await citemIDs.find(y=>y.id==mod.citem && y.mods.find(x=>x.index==mod.index));
                    const _mod = await _basecitem.mods.find(x=>x.index==mod.index);

                    if(citem.selfdestruct){
                        if(citem.usetype=="PAS"){
                            citem.ispermanent = true;

                        }

                    }

                    //console.log(_basecitem.name + " " + _mod.exec);
                    //console.log(_mod.expr);
                    let exprcheck = _mod.expr;
                    let checkroll = exprcheck.match(/d[%@(]|d+/g);
                    if(_mod.exec && ((_mod.value!=finalvalue && checkroll==null) || _mod.attribute!=modAtt)){
                        //console.log("resetting " + _mod.attribute);
                        if(!citem.ispermanent){
                            if(!_mod.attribute.includes(".max")){
                                attributes[_mod.attribute].value = Number(attributes[_mod.attribute].value) - _mod.value;
                            }
                            else{
                                attributes[_mod.attribute].max = Number(attributes[_mod.attribute].max) - _mod.value;
                            }
                        }

                        _mod.exec = false;
                    }

                    //console.log(myAtt[attProp]);
                    //console.log(mod.name + " exec: " + _mod.exec + " to att:" + modAtt + " isactive " + citem.isactive + " ignoreCond " + jumpmod);
                    if((_citem.usetype=="PAS" || citem.isactive) && !jumpmod){

                        if(!_mod.exec || (myAtt[modvable] && !mod.once)){
                            //console.log("executing " + mod.name + "=" + myAtt[attProp] + " + " + finalvalue);
                            myAtt.prev= myAtt[attProp];
                            myAtt[attProp] = parseInt(Number(myAtt[attProp]) + finalvalue);

                            ithaschanged = true;

                            _mod.exec=true;
                            _mod.value=finalvalue;
                            _mod.attribute=modAtt;

                            if(seedprop!=null){
                                if(attProp=="value" && myAtt.max!="" && seedprop.data.data.automax!=""){

                                    if(myAtt[attProp]>myAtt.max){
                                        myAtt[attProp]=myAtt.max;
                                        ithaschanged = true;
                                    }

                                }
                            }


                        }


                    }
                    else{
                        //console.log("isreset:" + citem.isreset + " isactive:" + citem.isactive + " jumpmod: " + jumpmod + " default:" + myAtt.default + " _exec:" + _mod.exec + " ispermanent: " + citem.ispermanent);
                        if((!citem.isreset || _citem.usetype=="PAS") && _mod.exec &&((citem.isactive && jumpmod) || !citem.isactive) && !myAtt.default && !citem.ispermanent){
                            //console.log("removing add");
                            _mod.exec=false;
                            myAtt[attProp] = Number(myAtt[attProp]) - Number(finalvalue);
                            ithaschanged = true;
                        }
                    }

                }

            }
        }

        //AUTO PROPERTIES PRE CALCULATIONS
        //ithaschanged = await this.autoCalculateAttributes(actorData,attributearray,attributes,true);

        //console.log(addmods);
        //CI ADD TO AUTO ATTR
        for(let i=0;i<addmods.length;i++){
            let mod = addmods[i];
            let modAtt = mod.attribute;
            let attProp = "value";
            let modvable="modified";
            let setvble = "isset";
            if(modAtt.includes(".max")){
                modAtt = modAtt.replace(".max","");
                attProp = "max";
                modvable = "modmax";
                setvble = "maxset";
            }
            let jumpmod=false;
            if(mod.condop!="NON" && mod.condop!=null){
                jumpmod = await this.checkModConditional(actorData,mod);
            }

            let citem = citemIDs.find(y=>y.id==mod.citem);
            let _citem = game.items.get(mod.citem).data.data;

            //console.log("entering " + mod.name + " " + jumpmod + " for" + modAtt);
            if(hasProperty(attributes,modAtt)){

                const myAtt = attributes[modAtt];

                let seedprop = game.items.get(myAtt.id);
                let checker = false;
                if(seedprop!=null){
                    if((((seedprop.data.data.automax!="" && attProp=="max") || (seedprop.data.data.auto!="" && attProp=="value")) && (seedprop.data.data.datatype=="simplenumeric" || seedprop.data.data.datatype=="radio")))
                        checker =true;
                }


                if(checker){
                    let value =mod.value;
                    let finalvalue=value;

                    if(isNaN(value)){
                        if(value.charAt(0)=="|"){
                            value = value.replace("|","");
                            finalvalue = await auxMeth.autoParser(value,attributes,citem.attributes,true,false,parseInt(citem.number));
                        }
                        else{
                            finalvalue = await auxMeth.autoParser(value,attributes,citem.attributes,false,false,parseInt(citem.number));
                        }
                    }



                    const _basecitem = await citemIDs.find(y=>y.id==mod.citem && y.mods.find(x=>x.index==mod.index));
                    //console.log(_basecitem);

                    if(_basecitem!=null){
                        const _mod = await _basecitem.mods.find(x=>x.index==mod.index);

                        //console.log(_basecitem.name + " _mod.exec:" + _mod.exec + " toadd:" + finalvalue);

                        //if(_mod.exec && (_mod.value!=finalvalue || _mod.attribute!=modAtt)){
                        //console.log(_mod.expr);


                        let exprcheck = _mod.expr;
                        let checkroll = exprcheck.match(/d[%@(]|d+/g);

                        if(_mod.exec && checkroll!=null){
                            //console.log("die expression")
                            finalvalue = _mod.value;
                        }


                        if(_mod.exec && ((_mod.value!=finalvalue && checkroll==null) || _mod.attribute!=modAtt)){
                            //console.log("resetting " + _mod.attribute);

                            let special = attributes[modAtt];
                            //console.log(special);
                            if(!citem.ispermanent){
                                if(!_mod.attribute.includes(".max")){
                                    special.value = Number(special.value) - _mod.value;
                                }
                                else{
                                    special.max = Number(special.max) - _mod.value;
                                }
                            }

                            _mod.exec = false;
                        }

                        //console.log(myAtt);
                        if(myAtt[setvble]){
                            _mod.exec=false;
                        }

                        //
                        //                        console.log("finalvalue:" + finalvalue);
                        //                        console.log("expr:" + _mod.expr);
                        //                        console.log("value:" + _mod.value);

                        //console.log("current value:" + attributes[_mod.attribute].value);

                        //console.log("Previo exec:" + _mod.exec + " name:" + citem.name + " to att:" + modAtt + " finalvalue:" + finalvalue + " isset:" + myAtt.isset + " autoadd: " + myAtt["autoadd"]);
                        if((_citem.usetype=="PAS" || citem.isactive) && !jumpmod){

                            //console.log(attProp + " :att/Prop - auto: " + seedprop.data.data.auto);
                            //if(!_mod.exec || (myAtt[modvable] && !mod.once)){
                            //if((seedprop.data.data.automax!="" && attProp=="max") || (seedprop.data.data.auto!="" && attProp=="value")){
                            //console.log("activating mod");
                            ithaschanged = true;

                            _mod.value=finalvalue;
                            _mod.attribute=mod.attribute;

                            //TEST TO REINSTATE
                            //myAtt.isset = true;
                            //myAtt[attProp] = await Number(myAtt[attProp]) + Number(finalvalue);

                            //console.log(rawexp);
                            //console.log(exprmode);



                            //TEST TO DELETE

                            if(attProp=="value")
                                myAtt["autoadd"] += Number(finalvalue);
                            if(attProp=="max")
                                myAtt["maxadd"] += Number(finalvalue);

                            //console.log("adding auto Add to " + modAtt + " autoadd " + myAtt["autoadd"]);

                            if(seedprop!=null){
                                if(attProp=="value" && myAtt.max!="" && seedprop.data.data.automax!=""){
                                    //console.log("changemax");
                                    if(myAtt[attProp]>myAtt.max){
                                        myAtt[attProp]=myAtt.max;
                                        ithaschanged = true;
                                    }

                                }
                            }


                            _mod.exec=true;

                            //}

                        }

                        else{
                            //REMOVE PAS IF IT DOES NOT WORK
                            if((!citem.isreset || _citem.usetype=="PAS" || jumpmod) && !_citem.isactive){

                                if(!myAtt.default && _mod.exec && !citem.ispermanent){

                                    //myAtt[attProp] = Number(myAtt[attProp]) - Number(finalvalue);
                                    console.log("Previous in " + modAtt + " autoadd: " + myAtt["autoadd"]);
                                    //TEST TO DELETE
                                    //                                    if(attProp=="value")
                                    //                                        myAtt["autoadd"] -= Number(finalvalue);
                                    //                                    if(attProp=="max")
                                    //                                        myAtt["maxadd"] -= Number(finalvalue);
                                    ithaschanged = true;

                                    console.log("removing auto Add to " + modAtt + " finalvalue: " + finalvalue + " autoadd: " + myAtt["autoadd"]);
                                }

                                _mod.exec=false;
                                myAtt[setvble] = false;

                            }
                        }
                    }
                    else{
                        //Error on citem,just remove it
                        citemIDs.splice(citemIDs.indexOf(citem),1);
                    }

                    //console.log("exec:" + _mod.exec + " name:" + citem.name + " default:" + myAtt.default + " isreset:" + citem.isreset + " value:" + finalvalue + " isset:" + myAtt.isset);

                }

            }
        }

        ithaschanged = await this.autoCalculateAttributes(actorData,attributearray,attributes,true);

        //ADD ROLLS
        const rollmods = mods.filter(y=>y.type=="ROLL");
        //
        for(let roll in rolls){
            //ithaschanged = true;

            rolls[roll].modified = false;
            setProperty(rolls[roll],"value","");


        }

        //console.log(rolls);

        for(let i=0;i<rollmods.length;i++){
            let mod = rollmods[i];
            //console.log(mod);
            let rollID = mod.attribute;
            let rollvaluemod = mod.value;
            //console.log(mod);
            let citem = citemIDs.find(y=>y.id==mod.citem);
            let _citem = game.items.get(mod.citem).data.data;

            let jumpmod=false;
            if(mod.condop!="NON" && mod.condop!=null){
                jumpmod = await this.checkModConditional(actorData,mod);
            }

            if(!jumpmod){

                if(!hasProperty(rolls,rollID)){
                    setProperty(rolls,rollID,{});
                    setProperty(rolls[rollID],"value","");
                    //ithaschanged = true;
                }



                let toadd = await auxMeth.autoParser(rollvaluemod,attributes,citem.attributes,false,false,citem.number);
                //console.log(toadd);
                let r_exp = "+(" + toadd + ")";
                const _basecitem = await citemIDs.find(y=>y.id==citem.id && y.mods.find(x=>x.index==mod.index));
                //console.log(mod.name);
                const _mod = await _basecitem.mods.find(x=>x.index==mod.index);
                rolls[rollID].modified = true;

                if((_citem.usetype=="PAS" || citem.isactive)){

                    //if(!_mod.exec){
                    _mod.exec=true;
                    ithaschanged = true;
                    //rolls[rollID].value += parseInt(toadd);
                    //console.log(rollID + " previo " + rolls[rollID].value)
                    rolls[rollID].value += r_exp;

                    //console.log("adding " + rollID + toadd +  " total: " + rolls[rollID].value);
                    //}

                }

            }
        }
        let counter=0;

        //PARSE VALUES TO INT
        for (let i=0;i<attributearray.length;i++){
            let attribute = attributearray[i];
            let attdata = attributes[attribute];
            let property = await game.items.get(actorData.data.attributes[attribute].id);
            const actorAtt = actorData.data.attributes[attribute];
            if(property!=null){

                let mydefvalue = 0;

                if((property.data.data.datatype=="simplenumeric" || property.data.data.datatype=="radio") && property.data.data.defvalue!="")
                    mydefvalue = property.data.data.defvalue;

                if(property.data.data.datatype=="simplenumeric" || property.data.data.datatype=="radio"){

                    if(property.data.data.auto=="" && actorAtt.value===""){
                        ithaschanged = true;
                        actorAtt.value = await auxMeth.autoParser(mydefvalue,attributes,null,false);
                    }

                    actorAtt.value = parseInt(actorAtt.value);
                    actorAtt.max = parseInt(actorAtt.max);
                }

                if(property.data.data.datatype=="checkbox"){

                    if(actorAtt.value === true || actorAtt.value === false){

                    }
                    else{
                        if(actorAtt.value === "false"){
                            actorAtt.value = false;
                        }

                        if(actorAtt.value === "true"){
                            actorAtt.value = true;
                        }
                    }

                }





            }

            else{
                if(!attdata.created){
                    delete actorData.data.attributes[attribute];

                    ithaschanged = true;
                }
                else{
                    actorAtt.value = parseInt(actorAtt.value);
                }

            }
            if(attributearray[i]!="biography"){
                attdata.modified = false;
                attdata.modmax = false;

            }

        }
        //console.log(citemIDs);
        //CONSUMABLES ACTIVE TURN BACK INTO INACTIVE, AND DELETE SELFDESTRUCTIBLE
        if(citemIDs!=null){
            for(let n=citemIDs.length-1;n>=0;n--){
                let citemObj = game.items.get(citemIDs[n].id).data.data;
                let citmAttr = citemIDs[n].attributes;
                let citmNum = citemIDs[n].number;

                //Calculate autos of citems  *** TEST **********************************
                let citemGroups = citemObj.groups;

                for(let z=0;z<citemGroups.length;z++){
                    let citemGr = citemGroups[z];

                    let cigroup = game.items.get(citemGr.id);
                    let groupprops = cigroup.data.data.properties;
                    //console.log(groupprops);
                    for(let x=0;x<groupprops.length;x++){
                        let propdata = game.items.get(groupprops[x].id);
                        let propKey = propdata.data.data.attKey;
                        let propauto = propdata.data.data.auto;

                        //                        if(propdata.data.data.datatype != "simpletext" && propdata.data.data.datatype != "textarea"){
                        //                            citemObj.attributes[propKey].value = Number(citemObj.attributes[propKey].value);
                        //                        }

                        if(propauto!=""){
                            let rawvalue = await auxMeth.autoParser(propauto,attributes,citmAttr,false,false,citmNum);

                            if(isNaN(rawvalue) && propdata.data.data.datatype != "simpletext"){
                                //console.log(rawvalue);
                                let afinal = new Roll(rawvalue).roll();
                                if(!isNaN(afinal.total))
                                    rawvalue = afinal.total;

                            }

                            citmAttr[propKey].value = rawvalue;
                        }
                    }

                }



                //*************************************************************************

                if(citemIDs[n].isactive){
                    if(citemObj.usetype == "CON"){
                        citemIDs[n].isactive =false;
                        for(let j=0;j<citemIDs[n].mods.length;j++){

                            citemIDs[n].mods[j].exec=false;
                        }

                        if(!citemIDs[n].rechargable && citemIDs[n].number<=0){
                            //await citemIDs.splice(n,1);
                            await this.deletecItem(citemIDs[n].id,true);
                        }

                    }

                    else{

                        citemIDs[n].ispermanent =false;

                    }

                }
                else{
                    citemIDs[n].isreset =true;
                }

                if(citemIDs[n]!=null)
                    //Self destructible items
                    if(citemIDs[n].selfdestruct!=null)
                        if(citemIDs[n].selfdestruct)
                            await this.deletecItem(citemIDs[n].id,true);


            }  
        }

        //TABLE TOTALS CALCULATION
        for(var tabAProp in attributes){
            if(attributes[tabAProp].istable){

                let t_Prop = attributes[tabAProp];
                let tableObj = game.items.get(t_Prop.id);
                let totalGroupID = tableObj.data.data.group.id;
                let gcitems = await citemIDs.filter(y=>y.groups.filter(x=>x.id==totalGroupID));

                for(var propKey in t_Prop.totals){
                    let newtotal = 0;

                    for(let q=0;q<gcitems.length;q++){
                        let total_citem = gcitems[q].attributes[propKey];
                        if(total_citem!=null)
                            newtotal += Number(total_citem.value);
                    }

                    t_Prop.totals[propKey].total = newtotal;
                }



            }

        }

        //CHECK FINAL AUTO VALUES -- IS THERE A BETTER WAY???
        //console.log("aqui");
        ithaschanged = await this.autoCalculateAttributes(actorData,attributearray,attributes,true);

        let checkmods = await this.getMods(actorData);

        if(checkmods.length != mods.length && !repeat){
            console.log("repeating");
            actorData = this.checkPropAuto(actorData,true); 
        }


        return actorData;

    }

    async autoCalculateAttributes(actorData,attributearray,attributes,checker=false){
        //Checking AUTO ATTRIBUTES -- KEEP DEFAULT VALUE EMPTY THEN!!
        //console.log("check auto attributes");
        let ithaschanged = false;
        var parser = new DOMParser();
        //        console.log(actorData);
        //        console.log(this.data);
        let htmlcode = await auxMeth.getTempHTML(this.data.data.gtemplate);

        if(htmlcode==null){
            ui.notifications.warn("Please rebuild character sheet before assigning, a-entity");
            return;
        }


        var form = await parser.parseFromString(htmlcode, 'text/html').querySelector('form');
        var inputs = await form.querySelectorAll('input,select,textarea,.radio-input');
        let sheetAtts =[];
        for(let i = 0; i < inputs.length; i++){
            let newAtt = inputs[i];
            //console.log(newAtt);
            let attId = newAtt.getAttribute("attId");
            let properKey;
            if(attId!=null)
                properKey = game.items.get(attId);
            if(properKey!=null)
                sheetAtts.push(properKey.data.data.attKey);

        }
        //console.log(sheetAtts);
        //console.log("PNUMD= " + attributes["pnum_d"].value);
        for (let i=0;i<attributearray.length;i++) {
            let attribute = attributearray[i];
            let findme = sheetAtts.filter(y=>y==attribute);
            //console.log("setting: " + attribute);
            if(actorData.data.attributes[attribute]!=null){
                let attID = actorData.data.attributes[attribute].id;
                //console.log("setting: " + attribute);
                ithaschanged = await this.setAutoProp(attID,attributes,attribute,findme,ithaschanged);
            }
            else{
                ui.notifications.warn("Please rebuild/reload template, attribute " + attribute + " not found in actor");
            }

        }

        return ithaschanged;
    }

    async setAutoProp(attID,attributes,attribute,findme,ithaschanged){
        //console.log(attribute);
        //console.log(findme);
        if((attribute!=null || attribute!=undefined)&&findme.length>0){
            let attdata = attributes[attribute];
            let rawexp="";
            let property = await game.items.get(attID);
            const actorAtt = attributes[attribute];


            //Check the Auto value
            if(property!=null){
                let exprmode = false;
                if(property.data.data.datatype!="simplenumeric" && property.data.data.datatype!="radio"){
                    exprmode = true;
                }

                rawexp = property.data.data.auto;

                if(rawexp.includes(".totals")){
                    actorAtt.hastotals = true;
                }

                //console.log("autochecking " + attribute + " isset:" + actorAtt.isset + " rawexp: " + rawexp);
                //console.log("PNUMD= " + attributes["pnum_d"].value);
                var prop_check = rawexp.match(/(?<=\@\{).*?(?=\})/g);
                if(prop_check!=null){
                    for (let n=0;n<prop_check.length;n++){
                        let _rawattname = prop_check[n];
                        let _attProp = "value";
                        let _attvalue;
                        let attTotal;
                        if(_rawattname.includes(".max")){
                            _rawattname = _rawattname.replace(".max","");
                            _attProp = "max";
                        }
                        if(_rawattname.includes(".totals.")){
                            let splitter = _rawattname.split('.');
                            _rawattname = splitter[0];
                            attTotal = splitter[2];
                            _attProp = "total";
                        }
                        //console.log(_rawattname);
                        let _myatt = attributes[_rawattname];
                        //console.log(_myatt);


                        if(_myatt!=null){
                            if(attTotal!=null && attTotal!="")
                                _myatt = attributes[_rawattname].totals[attTotal];

                            //                            if(!_myatt.isset){
                            //                                actorAtt.isset = false;
                            //                            }
                        }

                    }
                }

                if(rawexp !==""){
                    //console.log(rawexp);
                    //console.log(exprmode);
                    let newvalue = actorAtt.value;
                    //console.log(newvalue);
                    //console.log(this.data.data.attributes[attribute]);
                    rawexp = await this.expandPropsP(rawexp,attributes);
                    //console.log(rawexp);

                    if(!actorAtt.isset){
                        newvalue = await auxMeth.autoParser(rawexp,attributes,null,exprmode);

                        if(actorAtt.value!=newvalue)
                            ithaschanged = true;
                        actorAtt.default= true;
                    }




                    //TEST TO REINSTATE
                    actorAtt.value = newvalue;
                    //TEST TO DELETE
                    if(property.data.data.datatype!="simpletext")
                        actorAtt.value = Number(newvalue) + Number(actorAtt.autoadd);


                    //console.log("defaulting " + attribute + " to " + actorAtt.value + " isset: " + actorAtt.isset);
                }

                if(property.data.data.automax !=="" && !actorAtt.maxset){
                    rawexp = property.data.data.automax;

                    rawexp = await this.expandPropsP(rawexp,attributes);

                    let maxval = await auxMeth.autoParser(rawexp,attributes,null,false);
                    //TEST TO DELETE
                    if(property.data.data.datatype!="simpletext")
                        maxval = Number(maxval) + Number(actorAtt.maxadd);

                    //console.log("Changing " + attribute + " max to " + maxval);

                    //if(actorAtt.max!=maxval){
                    if(actorAtt.max=="" || !actorAtt.maxblocked){
                        actorAtt.max = parseInt(maxval);
                        actorAtt.maxblocked = false;
                        ithaschanged = true;

                        //console.log(attribute + " max: " + actorAtt.maxblocked);
                        if(parseInt(actorAtt.value)>actorAtt.max){
                            actorAtt.value=actorAtt.max;
                        }
                    }
                }
            }
        }
        return ithaschanged;
    }

    async expandPropsP(rawexp,attributes){
        rawexp = await this.parseRegs(rawexp,attributes);

        //console.log(attributes);
        var prop_check = rawexp.match(/(?<=\@\{).*?(?=\})/g);
        if(prop_check!=null){
            //console.log("expanding rawexp: " + rawexp);
            for (let n=0;n<prop_check.length;n++){

                let _rawattname = prop_check[n];
                let tochange = "@{" + _rawattname + "}" 
                let _attProp = "value";
                let _attAuto = "auto";
                let _attvalue;

                if(_rawattname.includes(".max")){
                    _rawattname = _rawattname.replace(".max","");
                    _attProp = "max";
                    _attAuto = "automax";
                }

                //console.log("calculating auto " + _rawattname + " " + _attAuto);

                let propertybase = await game.items.filter(y=>y.data.type == "property" && y.data.data.attKey == _rawattname);
                let property = propertybase[0];

                //console.log(property);

                if(property!=null){
                    let exchanger = attributes[_rawattname][_attProp];
                    let attAutoAdd = Number(attributes[_rawattname]["autoadd"]);
                    //console.log(property);
                    if(property.data.data[_attAuto]!=""){
                        //console.log("expanding: " + _rawattname + " = " + property.data.data[_attAuto]);
                        if(property.data.data[_attAuto].includes("$<"))
                            rawexp = await this.parseRegs(rawexp,attributes);
                        //console.log("isset?: " + this.data.data.attributes[_rawattname].isset);
                        if(!attributes[_rawattname].isset){
                            exchanger = await this.expandPropsP(property.data.data[_attAuto],attributes);
                        }
                        else{
                            exchanger = attributes[_rawattname].value;
                        }

                    }

                    if(property.data.data.datatype!="simpletext" && attAutoAdd!=null && attAutoAdd!=0)
                        exchanger = "((" + exchanger + ")+(" + attAutoAdd + "))";

                    rawexp = rawexp.replace(tochange,exchanger);

                }

            }
        }

        //console.log(rawexp);
        return rawexp;
    }

    async parseRegs(expr,attributes){
        let regArray =[];
        let expreg = expr.match(/(?<=\$\<).*?(?=\>)/g);
        if(expreg!=null){
            console.log("reg expr: " + expr);
            //Substitute string for current value
            for (let i=0;i<expreg.length;i++){
                let attname = "$<" + expreg[i]+ ">";
                let attvalue="";

                let regblocks = expreg[i].split(";");

                let regobject = {};
                regobject.index = regblocks[0];
                regobject.expr = expreg[i].replace(regblocks[0]+";",'');
                //console.log(regobject.expr);
                let internalvBle = regobject.expr.match(/(?<=\$)[0-9]+/g);
                if(internalvBle!=null){
                    for (let k=0;k<internalvBle.length;k++){
                        let regindex = internalvBle[k];
                        let regObj = await regArray.find(y=>y.index==regindex);
                        let vbvalue="";
                        if(regObj!=null)
                            vbvalue = regObj.result;
                        regobject.expr = regobject.expr.replace("$"+regindex,vbvalue);
                    }

                }
                //console.log(regobject.expr);
                //TO REVERT HAS METIDO ESTO!!!!

                regobject.expr = await this.expandPropsP(regobject.expr,attributes);
                regobject.expr = await auxMeth.autoParser(regobject.expr,attributes,null,false);

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

                expr = expr.replace(attname,attvalue);

            }

            let exprparse = expr.match(/(?<=\$)[0-9]+/g);
            if(exprparse!=null){
                for (let i=0;i<exprparse.length;i++){
                    let regindex = exprparse[i];

                    let attname = "$" + regindex;
                    let regObj = regArray.find(y=>y.index==regindex);

                    let attvalue="";
                    if(regObj!=null)
                        attvalue = regObj.result;

                    //console.log(attvalue);
                    expr = expr.replace(attname,attvalue);
                }
            }

        }
        return expr;
    }

    async actorUpdater(data=null){
        //console.log("checking auto calcs for actor");
        //console.log(data);
        //        if(!this.owner)
        //            return;

        let newData = data;

        if(newData == null)
            newData = this.data;

        newData.flags.ischeckingauto = true;

        if(!newData.data.istemplate)
            newData = await this.checkPropAuto(data);

        newData.flags.ischeckingauto = false;
        //console.log(newData);
        return newData;

    }


    async rollSheetDice(rollexp,rollname,rollid,actorattributes,citemattributes,number=1,target=null){

        //console.log(rollexp);
        //console.log(rollid);
        //console.log(citemattributes);

        let initiative=false;
        let rolltotal=0;
        let conditionalText="";
        //let diff = SBOX.diff[game.data.world.name];
        let diff = await game.settings.get("sandbox", "diff");
        if(diff==null)
            diff = 0;
        if(isNaN(diff))
            diff = 0;
        //console.log(diff);
        let rollformula = rollexp;

        //Roll modifiers generated by MODs of ROLL type
        let actorrolls = this.data.data.rolls;

        //Rolls defined by expression
        let subrolls =[];

        //Check roll mode
        let rollmode = this.data.data.rollmode;
        if(citemattributes!=null)
            rollname = rollname.replace(/\#{name}/g,citemattributes.name);

        //Parse roll difficulty in name, and general atts
        rollname = rollname.replace(/\#{diff}/g,diff);
        rollname = await auxMeth.autoParser(rollname,actorattributes,citemattributes,true,false,number);

        //Parse roll difficulty
        rollexp = rollexp.replace(/\#{diff}/g,diff);
        if(citemattributes!=null){
            rollexp = await rollexp.replace(/\#{name}/g,citemattributes.name);
        }


        //Parse target attribute
        //console.log(rollexp);
        //console.log(target);
        let targetexp = rollexp.match(/(?<=\#{target\|)\S*?(?=\})/g);
        if(targetexp!=null){
            for (let j=0;j<targetexp.length;j++){
                let idexpr = targetexp[j];
                let idtoreplace = "#{target|" + targetexp[j]+ "}";
                let newid;
                if(target!=null){
                    let targetattributes = target.actor.data.data.attributes;
                    newid = await auxMeth.autoParser("__"+idexpr+"__",targetattributes,null,true);
                }

                if(newid==null)
                    newid=0;

                rollexp = rollexp.replace(idtoreplace,newid);
                rollformula = rollformula.replace(idtoreplace,newid);
            }  
        }

        //Preparsing TO CHECK IF VALID!!!

        //console.log(rollexp);
        rollexp = await auxMeth.autoParser(rollexp,actorattributes,citemattributes,true,false,number);
        //console.log(rollexp);

        //let subrollsexpbc = rollexp.match(/(?<=\broll\b\().*?(?=\))/g);

        while(rollexp.match(/(?<=\broll\b\().*?(?=\))/g)!=null){

            let rollmatch = /\broll\(/g;
            var rollResultResultArray;
            var rollResult = [];

            while (rollResultResultArray = rollmatch.exec(rollexp)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = rollexp.substring(rollmatch.lastIndex, rollexp.length);
                let subb = auxMeth.getParenthesString(suba);
                rollResult.push(subb);
            }

            //let subrollsexpb = rollexp.match(/(?<=\broll\b\().*?(?=\))/g);
            let subrollsexpb = rollResult;

            //Parse Roll
            //for (let i=0;i<subrollsexpb.length;i++){
            //console.log(subrollsexpb[i]);

            //console.log(rollexp);
            let tochange = "roll(" + subrollsexpb[0]+ ")";
            let blocks = subrollsexpb[0].split(";");
            //console.log(blocks);



            //Definition of sub Roll
            let sRoll = {};

            sRoll.name = blocks[0];
            sRoll.numdice = await auxMeth.autoParser(blocks[1],actorattributes,citemattributes,false,false,number);
            sRoll.faces = await auxMeth.autoParser(blocks[2],actorattributes,citemattributes,false,false,number);
            sRoll.exploding = blocks[3];

            //console.log(sRoll);

            if(parseInt(sRoll.numdice)>0){
                //console.log(sRoll.numdice);
                let exploder = "";
                if(sRoll.exploding==="true" || sRoll.exploding==="add"){
                    exploder = "x" + sRoll.faces;
                }


                sRoll.expr = sRoll.numdice+"d"+sRoll.faces+exploder;

                if(sRoll.numdice<1)
                    sRoll.expr = "0";

                let partroll = new Roll(sRoll.expr);
                let finalroll = await partroll.roll();
                finalroll.extraroll=true;

                if(game.dice3d!=null){
                    await game.dice3d.showForRoll(partroll,game.user,true);
                }

                sRoll.results = finalroll;
                await subrolls.push(sRoll);
            }



            //rollexp = rollexp.replace(tochange,sRoll.total);
            rollexp = rollexp.replace(tochange,"");
            rollformula = rollformula.replace(tochange,sRoll.numdice+"d"+sRoll.faces);

            let exptochange = '\\?\\[\\b' + sRoll.name + '\\]';

            var re = new RegExp(exptochange, 'g');

            let mysubRoll = subrolls.find(y=>y.name==sRoll.name);
            let finalvalue = "";



            if(sRoll.results!=null){

                for(let j=0;j<sRoll.results.dice.length;j++){

                    let dicearray = sRoll.results.dice[j].results;

                    for(let k=0;k<dicearray.length;k++){
                        if(k>0)
                            finalvalue += ",";

                        let rollvalue=dicearray[k].result;

                        if(mysubRoll.exploding==="add"){
                            while(dicearray[k].exploded && k<dicearray.length){
                                k+=1;
                                rollvalue += dicearray[k].result;
                            }
                        }

                        finalvalue += rollvalue;


                    }

                }
            }
            else{
                finalvalue = 0;
            }

            rollformula = rollformula.replace(re,sRoll.numdice+"d"+sRoll.faces);


            rollexp = rollexp.replace(re,finalvalue);
            rollexp = await auxMeth.autoParser(rollexp,actorattributes,citemattributes,true,false,number);
            rollformula = rollexp;
            //}
        }
        //console.log(rollexp);
        rollexp = await auxMeth.autoParser(rollexp,actorattributes,citemattributes,true,false,number);
        //console.log(rollexp);
        //console.log(rollformula);

        //PARSING FOLL FORMULA, TO IMPROVE!!!
        var sumResult = rollformula.match(/(?<=\bsum\b\().*?(?=\))/g);
        if(sumResult!=null){
            //Substitute string for current value        
            for (let i=0;i<sumResult.length;i++){
                let splitter = sumResult[i].split(";");
                let comparer = splitter[0];
                let tochange = "sum(" + sumResult[i]+ ")";
                rollformula = rollformula.replace(tochange,comparer); 
            }
        }
        rollformula = rollformula.replace(/\bsum\b\(.*?\)/g,"");

        var countHResult = rollformula.match(/(?<=\bcountH\b\().*?(?=\))/g);
        if(countHResult!=null){
            //Substitute string for current value        
            for (let i=0;i<countHResult.length;i++){
                let splitter = countHResult[i].split(";");
                let comparer = splitter[0];
                let tochange = "countH(" + countHResult[i]+ ")";
                rollformula = rollformula.replace(tochange,comparer); 
            }
        }
        rollformula = rollformula.replace(/\bcountH\b\(.*?\)/g,"");

        var countLResult = rollformula.match(/(?<=\bcountL\b\().*?(?=\))/g);
        if(countLResult!=null){
            //Substitute string for current value        
            for (let i=0;i<countLResult.length;i++){
                let splitter = countLResult[i].split(";");
                let comparer = splitter[0];
                let tochange = "countL(" + countLResult[i]+ ")";
                rollformula = rollformula.replace(tochange,comparer); 
            }
        }
        rollformula = rollformula.replace(/\bcountL\b\(.*?\)/g,"");

        var countEResult = rollformula.match(/(?<=\bcountE\b\().*?(?=\))/g);
        if(countEResult!=null){
            //Substitute string for current value        
            for (let i=0;i<countEResult.length;i++){
                let splitter = countEResult[i].split(";");
                let comparer = splitter[0];
                let tochange = "countE(" + countEResult[i]+ ")";
                rollformula = rollformula.replace(tochange,comparer); 
            }
        }
        rollformula = rollformula.replace(/\bcountE\b\(.*?\)/g,"");

        //console.log(rollexp);
        //console.log(subrolls);
        //console.log(rollformula);

        //Check roll ids
        if (rollid==null)
            rollid=[];

        for(let n=0;n<rollid.length;n++){
            if(rollid[n]=="init")
                initiative = true;
        }

        //Remove rollIDs and save them
        let parseid = rollexp.match(/(?<=\~)\S*?(?=\~)/g);

        /************************************ H3LSI - 09/11/2020 *********************************************/

        var findIF = rollexp.search("if");
        var findADV = rollexp.search("~ADV~");;
        var findDIS = rollexp.search("~DIS~");

        //Checks if it is an IF and does not have any ADV/DIS modifier in the formula
        if(findADV == -1 && findDIS == -1){
            //In this case it allows to parse the manual MOD in case there is any  
            findIF = -1;

        }
        /*************************************************************************************************** */
        if(parseid!=null){
            for (let j=0;j<parseid.length;j++){
                let idexpr = parseid[j];
                let idtoreplace = "~" + parseid[j]+ "~";
                let newid = await auxMeth.autoParser(idexpr,actorattributes,citemattributes,true,number);

                if(newid!="")
                    rollid.push(newid);

                if(parseid[j]=="init")
                    initiative=true;


                /************************************ H3LSI - 09/11/2020 *********************************************/
                if (findIF != -1){    
                    //We don't do anything - We will parse this into the IF function inside autoParser   
                }else{
                    if(parseid[j]=="ADV")
                        rollmode = "ADV";

                    if(parseid[j]=="DIS")
                        rollmode = "DIS";

                    rollexp = rollexp.replace(idtoreplace,"");
                    rollformula = rollformula.replace(idtoreplace,"");
                }

            }  
        }

        //console.log(rollexp);
        //console.log(rollid);


        //Set ADV or DIS
        if (findIF != -1){    
            //We don't do anything - We will parse this into the IF function inside autoParser   
        }else{

            if(rollmode=="ADV"){
                rollexp = rollexp.replace(/1d20/g,"2d20kh");
            }

            if(rollmode=="DIS"){
                rollexp = rollexp.replace(/1d20/g,"2d20kl");
            }
        }
        /*************************************************************************************************** */

        //console.log(rollexp);

        //Parse Roll
        rollexp = await auxMeth.autoParser(rollexp,actorattributes,citemattributes,true,false,number);

        //console.log(rollexp);

        //ADDer to target implementation - add(property, value)
        let is_adding = false
        let addblock = {};
        let adder = rollexp.match(/(?<=\badd\b\().*?(?=\))/g);
        if(adder!=null){
            is_adding = true;
            for (let i=0;i<adder.length;i++){
                let tochange = "add(" + adder[i]+ ")";
                let blocks = adder[i].split(";");
                addblock.addprop = await auxMeth.autoParser(blocks[0],actorattributes,citemattributes,true,false,number);
                addblock.addvalue = 0;
                addblock.addvalue = await auxMeth.autoParser(blocks[1],actorattributes,citemattributes,false,false,number);
                addblock.addvalue = Number(addblock.addvalue);
                //console.log(addblock.addprop + " " + addblock.addvalue);

                rollexp = rollexp.replace(tochange,"");
                rollformula = rollformula.replace(tochange,"");
            }

        }

        // ADDER implementatin
        if(target!=null && is_adding){

            //console.log(addblock.addprop);
            //console.log(targetattributes);

            let targetattributes = target.actor.data.data.attributes;
            if(targetattributes[addblock.addprop]!=null){
                let attvalue = parseInt(targetattributes[addblock.addprop].value);
                attvalue += parseInt(addblock.addvalue);
                //console.log("changing token prop " + addblock.addprop + " to " + attvalue);

                let tokenId = target.id;
                //let mytoken = canvas.tokens.get(tokenId);
                //console.log(tokenId);

                this.requestToGM(this,tokenId,addblock.addprop,attvalue);
                //await mytoken.update({"data.attributes":targetattributes},{diff:false});
            }


        }

        //console.log(addblock);

        //SETer to target implementation - set(property, value)
        let is_seting = false
        let setblock = {};
        let setter = rollexp.match(/(?<=\bset\b\().*?(?=\))/g);
        if(setter!=null){
            is_seting = true;
            for (let i=0;i<setter.length;i++){
                let tochange = "set(" + setter[i]+ ")";
                let blocks = setter[i].split(";");
                setblock.setprop = await auxMeth.autoParser(blocks[0],actorattributes,citemattributes,true,false,number);
                setblock.setvalue = 0;
                setblock.setvalue = await auxMeth.autoParser(blocks[1],actorattributes,citemattributes,false,false,number);
                setblock.setvalue = Number(setblock.setvalue);

                rollexp = rollexp.replace(tochange,"");
                rollformula = rollformula.replace(tochange,"");
            }

        }

        //console.log(is_seting);
        //console.log(target);

        // SETER implementatin
        if(target!=null && is_seting){

            let targetattributes = target.actor.data.data.attributes;
            if(targetattributes[setblock.setprop]!=null){
                //targetattributes[setblock.setprop].value = setblock.setvalue;
                //console.log("changing token prop " + setblock.setprop + " to " + targetattributes[setblock.setprop].value);

                let tokenId = target.id;
                //let mytoken = canvas.tokens.get(tokenId);
                this.requestToGM(this,tokenId,setblock.setprop,setblock.setvalue);
                //await mytoken.update({"data.attributes":targetattributes},{diff:false});
            }

        }

        //console.log(setblock);

        //console.log(rollexp);
        //Remove conditionalexp and save it
        let condid = rollexp.match(/(?<=\&\&)(.*?)(?=\&\&)/g);
        if(condid!=null){
            for (let j=0;j<condid.length;j++){
                let condidexpr = condid[j];
                if(condidexpr.length>2){
                    //console.log(condidexpr);
                    let conddtoreplace = "&&" + condid[j]+ "&&";
                    let separador =""
                    if(j<condid.length-1)
                        separador ="|"
                    conditionalText += condidexpr + separador;

                    rollexp = rollexp.replace(conddtoreplace,"");
                }

            }  
        }

        rollformula = rollformula.replace(/\&\&.*?\&\&/g,"");

        rollexp = rollexp.trim();

        //console.log(rollexp);
        //console.log(subrolls);
        let roll;
        let multiroll=[];

        //PARSE SUBROLLS
        var attpresult = rollexp.match(/(?<=\·\·\!)\S*?(?=\!)/g);
        if(attpresult!=null){

            //Substitute string for current value
            for (let i=0;i<attpresult.length;i++){
                //                let debugname = attpresult[i];
                //                console.log(debugname);
                let attname = "··!" + attpresult[i]+ "!";
                let attindex = attpresult[i];
                let attvalue = subrolls[parseInt(attindex)].total;

                rollexp = rollexp.replace(attname,attvalue);
                rollformula = rollformula.replace(attname,subrolls[parseInt(attindex)].expr);
            }         

        }

        //Add ROLL MODS
        let extramod = 0;
        let extramodstring="";
        for (let k=0;k<rollid.length;k++){
            if(rollid[k]!="" && hasProperty(actorrolls,rollid[k])){
                rollformula += actorrolls[rollid[k]].value;
                rollexp += actorrolls[rollid[k]].value;
            }
        }


        //console.log(rollexp);
        //console.log(rollformula);

        //ROLL EXPRESSION
        //rollformula = await auxMeth.autoParser(rollformula,actorattributes,citemattributes,true,false,number);
        rollformula = await auxMeth.autoParser(rollformula,actorattributes,citemattributes,true,false,number);
        //console.log(rollexp);
        let partroll = new Roll(rollexp);
        roll = partroll.roll();

        if(game.dice3d!=null){
            await game.dice3d.showForRoll(partroll,game.user,true);
        }

        rolltotal = roll.total;
        if(roll.formula.charAt(0)!="-" || roll.formula.charAt(0)!="0")
            multiroll.push(roll);



        //        console.log(multiroll);
        //console.log(rollexp);
        //console.log(rollformula);

        let formula = rollformula.replace(/\s[0]\s\+/g,"");

        //CHECK CRITS AND FUMBLES TO COLOR THE ROLL
        let hascrit = false;
        let hasfumble = false;
        let rolldice;
        //console.log(multiroll);
        for(let j=0;j<multiroll.length;j++){
            let multirolldice = multiroll[j].dice;
            //console.log(multirolldice);
            if(!hasProperty(multiroll[j],"extraroll") && multirolldice.length>0){
                if(rolldice==null){
                    rolldice=multirolldice;
                }
                else{
                    rolldice.push(multirolldice[0]);
                }

            }

            for(let i=0;i<multirolldice.length;i++){
                let maxres = multirolldice[i].faces;

                let _hascrit = multirolldice[i].results.includes(maxres);
                let _hasfumble = multirolldice[i].results.includes(1);

                if(_hascrit)
                    hascrit = true;
                if(_hasfumble)
                    hasfumble = true;

            }
        }

        if(this.data.data.mod=="" || this.data.data.mod==null)
            this.data.data.mod = 0;

        rolltotal = parseInt(rolltotal) + parseInt(this.data.data.mod) + extramod;

        //TEXT MANAGMENET
        let convalue = "";
        //console.log(conditionalText)
        if(conditionalText!=""){
            let blocks = conditionalText.split("|");

            for(let i=0;i<blocks.length;i++){
                let thiscond = blocks[i];
                if(thiscond.length>1){
                    let condblocks = thiscond.split(";");
                    let checktype = condblocks[0];
                    let mycondition=0;
                    checktype = checktype.replace(/total/g, rolltotal);
                    //console.log(checktype);
                    if(checktype==="total"){
                        mycondition += rolltotal;
                    }
                    else{
                        mycondition = await auxMeth.autoParser(checktype,actorattributes,citemattributes,false,false,number);
                    }
                    let myeval="";
                    for(let j=1;j<condblocks.length;j++){
                        let comma="";
                        if(j<condblocks.length-1)
                            comma=",";
                        myeval += condblocks[j] + comma;
                    }

                    //console.log(myeval);
                    //console.log(mycondition);

                    let finaleval = "%[" + mycondition + "," + myeval + "]";
                    //console.log(finaleval);




                    let finalevalvalue = await auxMeth.autoParser(finaleval,actorattributes,citemattributes,false,false,number);
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

                    if(parresult!=null){
                        //Substitute string for current value        
                        for (let i=0;i<parresult.length;i++){
                            let hasletters= /[A-Za-z]+/g;
                            let hassubfunctions = parresult[i].match(hasletters);

                            if (!hassubfunctions){
                                let parsedres = eval(parresult[i]);
                                let tochax = "(" + parresult[i] + ")";
                                finalevalvalue = finalevalvalue.replace(tochax,parsedres);
                            }
                        }
                    }

                    finalevalvalue = await auxMeth.autoParser(finalevalvalue,actorattributes,citemattributes,false,false,number);

                    //console.log(parresult);

                    convalue += finalevalvalue + " ";
                    //console.log(convalue);
                }


            }

        }

        //console.log(rolldice);
        //console.log(subrolls);
        //console.log(convalue);


        let rollData = {
            token:{
                img:this.img,
                name:this.name
            },
            actor:this.name,
            flavor: rollname,
            formula: formula + extramodstring,
            mod: this.data.data.mod,
            result: rolltotal,
            dice: rolldice,
            subdice: subrolls,
            user: game.user.name,
            conditional: convalue,
            iscrit: hascrit,
            isfumble: hasfumble
        };

        renderTemplate("systems/sandbox/templates/dice.html", rollData).then(html => {
            let rolltype = document.getElementsByClassName("roll-type-select");
            let rtypevalue = rolltype[0].value;
            let rvalue = 0;
            if(rtypevalue=="gmroll")
                rvalue = 1;
            let newmessage = ChatMessage.create({
                content: html,
                type:rvalue
            });

            //if(game.user.isGM){
            auxMeth.rollToMenu(html);
            //}
        });

        if(initiative){
            await this.setInit(rollData.result);
        }

        return rollData.result;
    }

    sendMsgChat(flavor,msg,submsg){
        let rollData = {
            token:{
                img:this.img,
                name:this.name
            },
            actor:this.name,
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

    async requestToGM(myactor,tokenId,attkey,attvalue){
        let mytoken = canvas.tokens.get(tokenId);
        if(mytoken==null)
            return;

        if(game.user.isGM){
            //console.log(attkey);
            //console.log(attvalue);
            //console.log(myactor);
            if(myactor.istoken){
                await mytoken.update({[`actorData.data.attributes.${attkey}.value`] : attvalue});
            }
            else{
                //console.log("updating linked token");
                //let actorref = game.actors.get(myactor.data._id);
                await mytoken.actor.update({[`data.attributes.${attkey}.value`] : attvalue});
                //actorref.data.data.attributes[attkey].value = attvalue;
                //await actorref.update(actorref.data,{diff:false});
            }

        }
        else{
            console.log("requesting to GM");

            game.socket.emit("system.sandbox", {
                op: 'target_edit',
                user: game.user.id,
                scene: canvas.scene.id,
                tokenId: tokenId,
                attkey:attkey,
                attvalue:attvalue,
                istoken:myactor.istoken
                //                targetattributes: targetattributes
            });
        }

    }

    static async handleTargetRequest(data){
        if(!game.user.isGM)
            return;
        console.log("request obtained");

        let mytoken = canvas.tokens.get(data.tokenId);
        //console.log(mytoken);
        if(data.istoken){
            await mytoken.update({[`actorData.data.attributes.${data.attkey}.value`] : data.attvalue});
        }
        else{
            await mytoken.actor.update({[`data.attributes.${data.attkey}.value`] : data.attvalue});
        }

    }

    async setInit(roll){
        console.log("setting init");
        const tokens = canvas.tokens.ownedTokens;

        for(let i=0;i<tokens.length;i++){
            let token = tokens[i];
            const actor = token.actor;

            if(this.data._id == actor._id){
                //The following is for initiative
                const combatants = game.combat.combatants;
                for(let j=0;j<combatants.length;j++){
                    let _combatant = game.combat.combatants[j];

                    if(_combatant.tokenId == token.data._id){

                        game.combat.updateCombatant({_id: _combatant._id, initiative: roll});
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
        //                    if(_combatant.tokenId == token.data._id){
        //
        //                        game.combat.updateCombatant({_id: _combatant._id, initiative: result});
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