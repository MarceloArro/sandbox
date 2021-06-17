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
            scrollY: [".sheet-body",".scrollable",".tab"],
            width: 650,
            height: 600,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
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

    async maximize(){
        let _mytemplate = await game.actors.find(y=>y.data.data.istemplate && y.data.data.gtemplate==this.actor.data.data.gtemplate);
        if(_mytemplate!=null)
            this.position.height = _mytemplate.data.data.setheight;
        super.maximize();
    }

    async _renderInner(data, options) {
        let templateHTML = await auxMeth.getTempHTML(this.actor.data.data.gtemplate,this.actor.data.data.istemplate);

        //IMPORTANT!! ANY CHECKBOX IN TEMPLATE NEEDS THIS!!!
        templateHTML = templateHTML.replace('{{checked="" actor.data.biovisible}}=""','{{checked actor.data.biovisible}}');
        templateHTML = templateHTML.replace('{{checked="" actor.data.resizable}}=""','{{checked actor.data.resizable}}');
        templateHTML = templateHTML.replace('{{checked="" actor.data.istemplate}}=""','{{checked actor.data.istemplate}}');

        const template = await Handlebars.compile(templateHTML);

        const html = template(duplicate(data));
        this.form = $(html)[0];

        if ( html === "" ) throw new Error(`No data was returned from template`);
        return $(html);
    }

    async getTemplateHTML(_html){
        if(this.actor.data.data.istemplate && this.actor.data.data.gtemplate!="Default"){
            let _template = game.actors.find(y=>y.data.data.istemplate && y.data.data.gtemplate==this.actor.data.data.gtemplate);
            let html = _template.data.data._html;
            return html;
        }

        else{
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
                for(let i=0;i<alltabs.length;i++){
                    let tab = alltabs[i];
                    let datatab = tab.getAttribute("data-tab");
                    if(datatab==clicked.data("tab")){
                        actor.data.flags.selectedtab = i;
                    }

                }

            }
        });

        html.find('.tab-button').click(ev => {
            event.preventDefault();

            const tabs = $(this._element)[0].getElementsByClassName("tab-button");

            for(let x=0;x<tabs.length;x++){
                if(tabs[x].classList.contains("underlined"))
                    tabs[x].className = tabs[x].className.replace("underlined","");

            }

            let thistab = $(ev.currentTarget);
            //console.log(thistab);
            thistab[0].className += " underlined";

        });

        html.find('.badge-click').click(async (ev) => {
            event.preventDefault();
            const attributes = this.actor.data.data.attributes;

            let attKey = $(ev.currentTarget).attr("attKey");
            let attId = $(ev.currentTarget).attr("attId");
            let property = game.items.get(attId);

            let oldvalue = parseInt(attributes[attKey].value);

            if (oldvalue<1)
                return;

            let newvalue = oldvalue-1;

            if(newvalue <0)
                newvalue=0;

            if(newvalue>attributes[attKey].max){
                newvalue = attributes[attKey].max;
            }

            let stringvalue = "";
            stringvalue = newvalue.toString();

            await this.actor.update({[`data.attributes.${attKey}.value`] : stringvalue});

            this.actor.sendMsgChat("USES 1 ",property.data.data.tag, "TOTAL: " + newvalue);
            //this.actor.sendMsgChat("Utiliza 1",property.data.data.tag, "Le quedan " + newvalue); to  this.actor.sendMsgChat("Uses 1",property.data.data.tag, "Remains " + newvalue);

        });

        html.find('.badge-clickgm').click(async (ev) => {
            event.preventDefault();
            const attributes = this.actor.data.data.attributes;

            let attKey = $(ev.currentTarget).attr("attKey");

            let newvalue = await parseInt(attributes[attKey].value)+1;

            if(newvalue>attributes[attKey].max){
                newvalue = attributes[attKey].max;
            }

            let stringvalue = "";
            stringvalue = newvalue.toString();

            await this.actor.update({[`data.attributes.${attKey}.value`] : stringvalue});

        });

        html.find('.rollable').click(ev => {
            event.preventDefault();

            let attId = $(ev.currentTarget).attr("attid");
            let citemId = $(ev.currentTarget).attr("attid");
            this._onRollCheck(attId,citemId,false);

        });

        html.find('.roll-mode').click(ev => {
            event.preventDefault();
            const elemCode = $(ev.currentTarget)[0].children[0];

            const actorData=this.actor.data.data;

            if(elemCode.textContent=="1d20"){
                actorData.rollmode = "ADV";
            }

            else if(elemCode.textContent=="ADV"){
                actorData.rollmode = "DIS";
            }
            else{
                actorData.rollmode = "1d20";
            }

            this.actor.update({"data.rollmode":actorData.rollmode},{diff:false});

        });


        html.find('.tab-prev').click(ev => {
            event.preventDefault();
            this.displaceTabs(true);
        });

        html.find('.tab-next').click(ev => {
            event.preventDefault();
            this.displaceTabs(false);
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
                            let finalroll = this.actor.rollSheetDice(diceexpr[0].value,"Free Roll","",this.actor.data.data.attributes,null);
                            //let finalroll = this.actor.rollSheetDice(rollexp,rollname,rollid,actorattributes,citemattributes,number,tokenid);
                        }
                    },
                    two: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => {console.log("canceling dice");}
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
            let allselitems = citems.filter(y=>y.selection!=null);
            let selectcitems = allselitems.find(y=>y.selection.find(x=>!x.selected));
            if(selectcitems==null)
                return;

            let citemplate = game.items.get(selectcitems.id);
            let acitem = selectcitems.selection.find(y=>!y.selected);

            let modindex = acitem.index;
            let mod = citemplate.data.data.mods.find(y=>y.index==modindex);

            //Right Content
            let newList = document.createElement("DIV");
            newList.className = "item-dialog";
            newList.setAttribute("actorId",this.actor.id);

            //Fill options
            if(mod.type=="ITEM"){
                let finalnum = await auxMeth.autoParser(mod.selectnum,this.actor.data.data.attributes,acitem.attributes,false);
                newList.setAttribute("selectnum",finalnum);
                let text = document.createElement("DIV");

                text.className = "centertext";
                text.textContent = "Please select " + finalnum + " items:";
                newList.appendChild(text);

                for(let n=0;n<mod.items.length;n++){

                    let ispresent = citems.some(y=>y.id==mod.items[n].id);

                    if(!ispresent){
                        let newItem = document.createElement("DIV");
                        newItem.className = "flexblock-center-nopad";

                        let newcheckBox= document.createElement("INPUT");
                        newcheckBox.className = "dialog-check";
                        newcheckBox.setAttribute("type","checkbox");
                        newcheckBox.setAttribute("itemId",mod.items[n].id);

                        let itemDescription=document.createElement("LABEL");
                        itemDescription.textContent = mod.items[n].name;

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
                            for(let i=0;i<flags.selection.length;i++){
                                let citemId = this.actor.data.flags.selection[i];
                                acitem.selected = true;
                                let selcitem = game.items.get(citemId);
                                subitems = await this.actor.addcItem(selcitem,selectcitems.id);
                            }
                            if(subitems)
                                await this.updateSubItems(false, subitems);
                        }
                    },
                    two: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => {console.log("canceling selection");}
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
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            const tab = stabs[li.data("itemId")];
            const item = game.items.get(tab.id);
            item.sheet.render(true);
        });

        // Delete tab Item
        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            let todelete = li.data("itemId");
            const prop = stabs.splice(todelete,1);

            this.actor.update({"data.tabs":stabs});
            li.slideUp(200, () => this.render(false));
        });

        // Edit citem
        html.find('.citem-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            const tab = citems[li.data("itemId")];
            const item = game.items.get(tab.id);
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
            if(itemindex>0)
                stabs.splice(itemindex-1, 0, stabs.splice(itemindex, 1)[0]);
            this.updateSubItems(true,stabs);
        });

        // Bottom Item
        html.find('.item-bottom').click(ev => {
            const li = $(ev.currentTarget).parents(".property");
            let itemindex = li.data("itemId");
            if(itemindex<stabs.length-1)
                stabs.splice(itemindex+1, 0, stabs.splice(itemindex, 1)[0]);
            this.updateSubItems(true,stabs);
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
            this.setTemplate(li[0].value,actorData);

            //this.refreshSheet(li[0].value);
            //this.actor.update({"data.gtemplate": li[0].value});

        });

        html.find('.sheet-reload').click(ev => {
            event.preventDefault();
            this.setTemplate(this.actor.data.data.gtemplate,null);

        });

    }

    async _onRollCheck(attrID, citemID,ciRoll=false) {
        //console.log("rolling att " + attrID + " item " + citemID);

        let actorattributes = this.actor.data.data.attributes;

        let citemattributes;
        let rollexp;
        let rollname;
        let rollid = [];
        let citem;
        let property;
        let initiative=false;

        let findcitem;
        let number;

        if(citemID!=null){
            citem = await game.items.get(citemID);
            findcitem = this.actor.data.data.citems.find(y=>y.id == citemID);
            if(findcitem!=null)
                citemattributes= findcitem.attributes;

            //console.log(citem);
        }

        if(!ciRoll){
            property = await game.items.get(attrID);
            rollexp = property.data.data.rollexp;
            rollname = property.data.data.rollname;
            rollid.push(property.data.data.rollid);
        }
        else{
            rollexp = citem.data.data.roll;
            rollname = citem.data.data.rollname;
            rollid.push(citem.data.data.rollid);
        }

        let targets = game.user.targets.ids;
        let finalroll;

        if (findcitem!=null)
            number = findcitem.number;

        if(targets.length>0 && (rollexp.includes("#{target|") || rollexp.includes("add(")) || rollexp.includes("set(")){
            for(let i=0;i<targets.length;i++){
                let tokenid = canvas.tokens.placeables.find(y=>y.id==targets[i]);
                finalroll = await this.actor.rollSheetDice(rollexp,rollname,rollid,actorattributes,citemattributes,number,tokenid);
            }
        }

        else{
            finalroll = await this.actor.rollSheetDice(rollexp,rollname,rollid,actorattributes,citemattributes,number);
        }

        //console.log(finalroll);

        return finalroll;

    }

    //Creates the attributes the first time a template is chosen for a character
    async refreshSheet(gtemplate){
        //Gets all game properties

        //console.log(gtemplate);

        //Finds master property
        await this.actor.update({"data.gtemplate": gtemplate});


        //await this.actor.update(this.actor.data);
        //await this.actor.actorUpdater();

    }

    async setTemplate(gtemplate,actorData){
        console.log("setting sheet");
        //console.log(actorData);

        const propitems = game.items.filter(y=>y.data.type=="property");

        if(actorData==null)
            actorData=duplicate(this.actor.data);

        const attData = actorData.data.attributes;
        if(gtemplate=="" || gtemplate==null)
            gtemplate="Default";
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

        if(form==null)
            ui.notifications.warn("Please rebuild character sheet before assigning");

        var inputs = await form.querySelectorAll('input,select,textarea');
        for(let i = 0; i < inputs.length; i++){
            let newAtt = inputs[i];

            let attId = newAtt.getAttribute("attId");
            if(attId!=null)
                await this.setAttributeValues(attId,attData);

        }

        //For special case of radioinputs
        let radioinputs = form.getElementsByClassName("radio-input");
        for(let i = 0; i < radioinputs.length; i++){
            let newAtt = radioinputs[i];
            let attId = newAtt.getAttribute("attId");
            await this.setAttributeValues(attId,attData);
        }

        //For special cases of badges
        let badgeinputs = form.getElementsByClassName("badge-click");
        for(let i = 0; i < badgeinputs.length; i++){
            let newAtt = badgeinputs[i];
            let attId = newAtt.getAttribute("attId");
            await this.setAttributeValues(attId,attData);
        }

        //For special cases of tables
        let tableinputs = form.getElementsByClassName("sbtable");
        for(let i = 0; i < tableinputs.length; i++){
            let newAtt = tableinputs[i];
            let attId = newAtt.getAttribute("attId");
            await this.setAttributeValues(attId,attData);
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
        if(biovisible==="false")
            biovisible=false;
        if(biovisible==="true")
            biovisible=true;
        if(resizable==="false")
            resizable=false;
        if(resizable==="true")
            resizable=true;
        actorData.data.biovisible = biovisible;
        actorData.data.resizable = resizable;
        actorData.data.visitabs = parseInt(visitabs);
        //console.log(actorData);
        let mytoken = await this.setTokenOptions(actorData);

        await this.actor.update({"data":actorData.data,"token":mytoken});
    }

    async setAttributeValues(attID,attData){

        //reference to attribute
        //console.log(attID);
        //const attData = this.actor.data.data.attributes;
        const property = await game.items.get(attID);

        const attribute = property.data.data.attKey;
        let idkey = attData[attribute];
        let populate = false;
        if(idkey==null){
            populate = true;
        }
        else{
            if(idkey.id==null){
                populate = true;
            }

            if(property.data.data.datatype=="radio" && (idkey.max==null || idkey.max=="" || idkey.value=="" || idkey.value==null)){
                populate=true;
            }
        }


        console.log(property.data.data.attKey + " " + property.data.data.datatype + " " + populate);
        if(!hasProperty(attData,attribute) || Object.keys(attData[attribute]).length == 0 || populate){
            console.log("populating prop");
            attData[attribute] = {};
            setProperty(attData[attribute],"id", "");
            attData[attribute].id =  attID;

            //Sets id and auto
            if(property.data.data.datatype!="table"){

                setProperty(attData[attribute],"value", "");
                setProperty(attData[attribute],"prev", "");
                await setProperty(attData[attribute],"isset", false);

                //Sets auto, auto max, and max
                if(property.data.data.automax!="" || property.data.data.datatype=="radio"){

                    setProperty(attData[attribute],"max", "");

                }
            }
            else{
                //console.log("setting table");
                let tablegroup = property.data.data.group;
                let groupObj = await game.items.get(tablegroup.id);
                let groupprops = groupObj.data.data.properties;
                //console.log(groupprops);
                setProperty(attData[attribute],"istable", true);
                setProperty(attData[attribute],"totals", {});
                const attTableKey = attData[attribute];
                for(let i = 0; i < groupprops.length; i++){
                    let propId = groupprops[i].id;
                    let propData = game.items.get(propId);
                    let propKey = propData.data.data.attKey;
                    setProperty(attTableKey.totals,propKey, {});
                    const tableAtt = attTableKey.totals[propKey];
                    setProperty(tableAtt,"id", propId);
                    if(propData.data.data.totalize){

                        setProperty(tableAtt,"total", "");
                        setProperty(tableAtt,"prev", "");
                    }

                }
            }


        }

        //return attData;

    }

    async checkTabsExisting(){

        //Check Tabs
        let tabs = this.actor.data.flags.tabarray;
        let changed = false;
        const items = game.items;

        if(tabs!=null){
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

        if(changed)
            this.updateTabs();

    }

    /* -------------------------------------------- */

    /**
   * HTML Editors
   */

    async addNewTab(newHTML,tabitem,index){
        console.log("adding Tabs");

        var wrapper= document.createElement('div');

        if(newHTML==null){
            wrapper.innerHTML= this.actor.data.data._html;
        }

        else{
            wrapper.innerHTML= newHTML;
        }

        let deftemplate= wrapper;
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
        newElement.setAttribute('id', "tab-"+index);
        newElement.setAttribute("data-tab", tabKey);
        newElement.textContent = tabname;
        p.insertBefore(newElement,p.children[cindex]);
        p.setAttribute("tabs",totaltabs+1);

        //ADD VISIBILITY RULES TO TAB
        if(tabitem.data.condop!="NON"){
            let attProp = ".value";
            if(tabitem.data.condat!=null){
                if(tabitem.data.condat.includes("max")){
                    attProp = "";
                }
            }


            if(tabitem.data.condop=="EQU"){
                if(tabitem.data.condvalue == "true" || tabitem.data.condvalue == "false" || tabitem.data.condvalue==true || tabitem.data.condvalue==false){
                    newElement.insertAdjacentHTML( 'beforebegin', "{{#if actor.data.attributes." + tabitem.data.condat + attProp + "}}" );
                    newElement.insertAdjacentHTML( 'afterend', "{{/if}}" );
                }
                else{
                    newElement.insertAdjacentHTML( 'afterbegin', "{{#ifCond actor.data.attributes." + tabitem.data.condat + attProp + " '" + tabitem.data.condvalue + "'}}" );
                    newElement.insertAdjacentHTML( 'beforeend', "{{/ifCond}}" );
                }

            }

            else if(tabitem.data.condop=="HIH"){
                newElement.insertAdjacentHTML( 'afterbegin', "{{#ifGreater actor.data.attributes." + tabitem.data.condat + attProp + " '" + tabitem.data.condvalue + "'}}" );
                newElement.insertAdjacentHTML( 'beforeend', "{{/ifGreater}}" );
            }

            else if(tabitem.data.condop=="LOW"){
                newElement.insertAdjacentHTML( 'afterbegin', "{{#ifLess actor.data.attributes." + tabitem.data.condat + attProp + " '" + tabitem.data.condvalue + "'}}" );
                newElement.insertAdjacentHTML( 'beforeend', "{{/ifLess}}" );
            }
        }

        if(tabitem.data.controlby=="gamemaster"){
            newElement.insertAdjacentHTML( 'afterbegin', "{{#isGM}}" );
            newElement.insertAdjacentHTML( 'beforeend', "{{/isGM}}" );
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
        div9.className = "new-column";
        div9.setAttribute('id', tabKey + "Body");
        div5.appendChild(div9);

        //Set token mode
        let tokenbar = deftemplate.getElementsByClassName("token-bar1");
        let tokenshield = deftemplate.getElementsByClassName("token-shieldstat");
        let tokenname = deftemplate.getElementsByClassName("token-displayName");

        let displayName = this.actor.data.data.displayName;
        console.log(displayName);
        if(displayName==null)
            displayName ="NONE";

        tokenbar[0].setAttribute("tkvalue",this.actor.data.data.tokenbar1);
        tokenname[0].setAttribute("tkvalue",displayName);
        tokenshield[0].setAttribute("tkvalue",this.actor.data.data.shieldstat);

        let biovisiblefield = deftemplate.getElementsByClassName("check-biovisible");
        let resizablefield = deftemplate.getElementsByClassName("check-resizable");
        console.log(biovisiblefield);
        biovisiblefield[0].setAttribute("biovisible",this.actor.data.data.biovisible);
        resizablefield[0].setAttribute("resizable",this.actor.data.data.resizable);

        let visitabfield = deftemplate.getElementsByClassName("token-visitabs");
        visitabfield[0].setAttribute("visitabs",this.actor.data.data.visitabs);

        let finalreturn = new XMLSerializer().serializeToString(deftemplate);
        return finalreturn;
    }

    async addNewPanel(newHTML,tabpanel,tabKey,tabname,firstmrow, multiID=null,multiName=null,_paneldata=null){
        //Variables
        console.log("adding Panel " + tabpanel.name + " in " + tabKey);
        console.log(tabpanel);

        //        if(tabpanel.data==null)
        //            return;

        var wrapper= document.createElement('div');
        if(newHTML==null){
            wrapper.innerHTML= this.actor.data.data._html;
        }

        else{
            wrapper.innerHTML= newHTML;
        }

        //let deftemplate= wrapper;
        let deftemplate = new DOMParser().parseFromString(newHTML, "text/html")
        const actor = this.actor;
        const flags = this.actor.data.flags;        
        const parentNode = deftemplate.querySelector('#' + tabKey + 'Body');
        //console.log(tabpanel);
        //console.log(deftemplate);

        let fontgroup ="";
        let inputgroup="";

        if(tabpanel.data.fontgroup!=null)
            fontgroup = tabpanel.data.fontgroup;

        if(tabpanel.data.inputgroup!=null)
            inputgroup = tabpanel.data.inputgroup;

        //        let fontgroup = tabpanel.data.fontgroup;
        //        let inputgroup = tabpanel.data.inputgroup;

        let initial = false;
        let div6;


        if(multiID==null){
            console.log("INITIAL _ " + tabpanel.name + " width: " + flags.rwidth + " rows: " + flags.rows);
        }
        else{
            console.log("INITIAL _ " + tabpanel.name + " maxrows: " + flags.maxrows + " multiwidth: " + flags.multiwidth +  "maxwidth: " + flags.maxwidth); 
        }   

        if(flags.rwidth>=1){
            if(multiID==null){
                flags.rows +=1;
                flags.rwidth=0;
            }
            else{
                if(firstmrow){
                    flags.rwidth=0;
                    flags.rows +=1;
                }

            }

        }

        if(flags.multiwidth>=flags.maxwidth){
            console.log("newmultirow");
            flags.multiwidth==0;
        }

        if(flags.multiwidth==0 && multiID!=null){
            flags.maxrows +=1;
            initial = true;
        }



        div6 = deftemplate.createElement("DIV");

        if(firstmrow){

            if(flags.rwidth==0 || flags.rwidth==1 || (flags.multiwidth==0 && multiID!=null)){

                initial = true;

            }

        }

        let labelwidth;
        var columns = tabpanel.data.columns;

        //Set panel width
        if(tabpanel.data.width==="1"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-1-1';
            if(multiID==null){
                flags.rwidth += 1;
            }
            else{
                flags.multiwidth += 1;
                div6.className = this.getmultiWidthClass(tabpanel.data.width);
            }

        }

        else if(tabpanel.data.width==="1/3"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-1-3';
            if(multiID==null){
                flags.rwidth += 0.333;
            }
            else{
                flags.multiwidth += 0.333;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if(tabpanel.data.width==="2/3"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-2-3';
            if(multiID==null){
                flags.rwidth += 0.666;
            }
            else{
                flags.multiwidth += 0.666;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if(tabpanel.data.width==="3/4"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-3-4';
            if(multiID==null){
                flags.rwidth += 0.75;
            }
            else{
                flags.multiwidth += 0.75;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if(tabpanel.data.width==="5/6"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-5-6';
            if(multiID==null){
                flags.rwidth += 0.833;
            }
            else{
                flags.multiwidth += 0.833;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if(tabpanel.data.width==="1/2"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-1-2';
            if(multiID==null){
                flags.rwidth += 0.5;
            }
            else{
                flags.multiwidth += 0.5;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if(tabpanel.data.width==="1/4"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-1-4';
            if(multiID==null){
                flags.rwidth += 0.25;
            }
            else{
                flags.multiwidth += 0.25;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else if(tabpanel.data.width==="1/6"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-1-6';
            if(multiID==null){
                flags.rwidth += 0.166;
            }
            else{
                flags.multiwidth += 0.166;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }        

        else if(tabpanel.data.width==="1/8"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-1-8';
            if(multiID==null){
                flags.rwidth += 0.125;
            }
            else{
                flags.multiwidth += 0.125;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }
        else if(tabpanel.data.width==="5/8"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-5-8';
            if(multiID==null){
                flags.rwidth += 0.625;
            }
            else{
                flags.multiwidth += 0.625;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }
        else if(tabpanel.data.width==="3/8"){
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-3-8';
            if(multiID==null){
                flags.rwidth += 0.375;
            }
            else{
                flags.multiwidth += 0.375;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        else{
            if((firstmrow && multiID==null)||(multiID!=null))
                div6.className = 'col-1-1';
            if(multiID==null){
                flags.rwidth += 1;
            }
            else{
                flags.multiwidth += 1;
                div6.className = this.getmultiWidthClass(tabpanel.data.width)
            }

        }

        if(multiID==null){
            console.log("PRE _ " + tabpanel.name + " width: " + flags.rwidth + " rows: " + flags.rows);
        }
        else{
            console.log("PRE _ " + tabpanel.name + " maxrows: " + flags.maxrows + " multiwidth: " + flags.multiwidth + "maxwidth: " + flags.maxwidth); 
        } 

        if(flags.rwidth>0.95 && flags.rwidth<=1)
            flags.rwidth = 1.015;


        console.log("firstmrow: " + firstmrow);
        if(flags.rwidth>1.015){
            flags.rwidth -= 1;
            if(flags.rwidth<0.1)
                flags.rwidth = 0;
            if(firstmrow && multiID==null){
                flags.rows +=1;
                initial = true;
            }

        }

        //console.log("rows: " + flags.rows);

        if(flags.multiwidth>0.95 && flags.multiwidth<=1)
            flags.multiwidth = 1;

        if(multiID!=null){

            if(flags.multiwidth>flags.maxwidth){
                flags.multiwidth -= flags.maxwidth;
                if(flags.multiwidth<0.1)
                    flags.multiwidth = 0;
                flags.maxrows +=1;
                initial = true;
            }

        }

        if(multiID==null){
            console.log("POST _ " + tabpanel.name + " width: " + flags.rwidth + " rows: " + flags.rows + " initial:" + initial);
        }
        else{
            console.log("POST _ " + tabpanel.name + " maxrows: " + flags.maxrows + " multiwidth: " + flags.multiwidth + "maxwidth: " + flags.maxwidth); 
        } 

        if(initial){
            console.log("creating row initial true");
        }
        else{
            console.log("getting multirow");
        }


        //console.log(tabpanel.name + "post  width: " +flags.rwidth + " rows:" + flags.rows);

        if(tabpanel.data.title!=""){
            var new_header = deftemplate.createElement("DIV");

            if(tabpanel.data.backg=="T"){
                new_header.className = "panelheader-t";
            }
            else{
                new_header.className = "panelheader";
            }

            if(tabpanel.data.headergroup!="")
                new_header.className += " " + tabpanel.data.headergroup;

            new_header.textContent = tabpanel.data.title;
            div6.appendChild(new_header);
        }

        let properties = tabpanel.data.properties;

        var count=0;
        var divtemp;
        var new_row = deftemplate.createElement("DIV");

        //LOAD THE PROPERTIES INPUT FIELDS
        await properties.forEach(function(rawproperty) {



            //label alignment
            if(tabpanel.data.alignment=="right"){
                labelwidth = "righttext";
            }
            else if(tabpanel.data.alignment=="center"){
                labelwidth = "centertext";
            }

            else{
                labelwidth="";
            }

            console.log(rawproperty);
            let propertybase = game.items.get(rawproperty.id);



            if(propertybase==null){
                ui.notifications.warn("The property " + rawproperty.name + " in panel " + tabpanel.name + " does not exist anymore. Please remove the reference to it");
                throw new Error("No property!");
                return "noproperty";
            }

            else{



                let property = propertybase.data;

                if(property.data.attKey==null || property.data.attKey==""){
                    ui.notifications.warn("The property " + rawproperty.name + " in panel " + tabpanel.name + " does not have a key");
                    throw new Error("No property Key!");
                    return "noproperty";
                }


                fontgroup = tabpanel.data.fontgroup;
                inputgroup = tabpanel.data.inputgroup;

                if(property.data.fontgroup!="")
                    fontgroup=property.data.fontgroup;

                if(property.data.inputgroup!="")
                    inputgroup=property.data.inputgroup;

                if(fontgroup ==null)
                    fontgroup = tabpanel.data.fontgroup;
                if(inputgroup ==null)
                    inputgroup = tabpanel.data.inputgroup;

                if(count==0){

                    new_row.className = "new-row";
                    divtemp = deftemplate.createElement("DIV");

                    if(tabpanel.data.contentalign=="center"){
                        divtemp.className = "flexblock-center";
                    }
                    else{
                        divtemp.className = "flexblock-left";
                    }


                    div6.appendChild(new_row);
                    new_row.appendChild(divtemp);
                }

                //Attribute input
                var sInput;
                var sInputMax;

                //Set Label
                if(property.data.haslabel && property.data.datatype!="table"  && property.data.datatype!="badge"){
                    //Attribute label
                    var sLabel = deftemplate.createElement("H3");

                    if(property.data.labelsize=="F"){
                        labelwidth += " label-free";
                    }

                    else if(property.data.labelsize=="S"){
                        labelwidth += " label-small";
                    }

                    else if(property.data.labelsize=="M"){
                        labelwidth += " label-med";
                    }

                    else if(property.data.labelsize=="L"){
                        labelwidth += " label-medlarge";
                    }

                    sLabel.className = labelwidth;
                    sLabel.textContent = property.data.tag;

                    if(property.data.tooltip !=null)
                        if(property.data.tooltip !="")
                            if(property.data.tooltip.length>0)
                                sLabel.title = property.data.tooltip;

                    divtemp.appendChild(sLabel);

                    //Adds identifier
                    sLabel.setAttribute("id", property.data.attKey);
                    sLabel.setAttribute("attid", rawproperty.id);

                    if(property.data.labelformat=="B"){
                        sLabel.className += " boldtext";
                    }

                    else if(property.data.labelformat=="D"){
                        sLabel.textContent = "";

                        let dieContainer = deftemplate.createElement("DIV");
                        dieContainer.setAttribute("title",property.data.tag);

                        let dieSymbol = deftemplate.createElement('i');
                        dieSymbol.className = "fas fa-dice-d20";
                        dieContainer.appendChild(dieSymbol);

                        sLabel.appendChild(dieContainer);

                    }

                    else if(property.data.labelformat=="S"){
                        sLabel.className += " smalltext";

                    }

                    //Sets class required for rolling
                    if(property.data.hasroll){
                        sLabel.className += " rollable";
                    }


                    if(fontgroup!="")
                        sLabel.className += " " + fontgroup;

                    console.log(sLabel.className + " " + sLabel.textContent);


                }

                //Check property type
                if(property.data.datatype==="checkbox"){

                    sInput = deftemplate.createElement("INPUT");
                    sInput.className = "input-small";
                    sInput.setAttribute("name", "data.attributes." + property.data.attKey + ".value");
                    sInput.setAttribute("type", "checkbox");
                    sInput.setAttribute("toparse", "{{checked actor.data.attributes." + property.data.attKey + ".value}}~~");
                }

                //Check property type
                else if(property.data.datatype==="radio"){

                    sInput = deftemplate.createElement("DIV"); 
                    sInput.className = "radio-input";
                    sInput.setAttribute("name", property.data.attKey);

                }

                else if(property.data.datatype==="textarea"){

                    sInput = deftemplate.createElement("TEXTAREA");
                    if(property.data.inputsize=="S"){
                        sInput.className = "texteditor-small";
                    }

                    else if(property.data.inputsize=="L"){
                        sInput.className = "texteditor-large";
                    }
                    else{
                        sInput.className = "texteditor-med";
                    }

                    sInput.setAttribute("name", "data.attributes." + property.data.attKey + ".value");
                    sInput.textContent = "{{" + "data.data.attributes." + property.data.attKey + ".value}}";

                }

                else if(property.data.datatype==="badge"){

                    sInput = deftemplate.createElement("DIV");
                    sInput.className = "badge-block centertext";
                    sInput.setAttribute("name", property.data.attKey);

                    let badgelabel = deftemplate.createElement("LABEL");
                    badgelabel.className = "badgelabel";
                    badgelabel.textContent = property.data.tag;

                    if(property.data.tooltip !=null)
                        if(property.data.tooltip !="")
                            if(property.data.tooltip.length>0)
                                badgelabel.title = property.data.tooltip;

                    sInput.appendChild(badgelabel);

                    let extraDiv = deftemplate.createElement("DIV");
                    extraDiv.className = "badge-container";

                    let badgea = deftemplate.createElement('a');
                    badgea.className = "badge-image";
                    badgea.className += " badge-" + property.data.attKey;

                    let badgei = deftemplate.createElement('i');
                    badgei.className = "badge-click";
                    badgei.setAttribute("attKey",property.data.attKey);
                    badgei.setAttribute("attId", property._id);
                    badgea.appendChild(badgei);

                    extraDiv.appendChild(badgea);

                    if(game.user.isGM){
                        let gmbadgea = deftemplate.createElement('a');
                        gmbadgea.setAttribute("attKey",property.data.attKey);
                        gmbadgea.setAttribute("attId", property._id);
                        gmbadgea.className = "badge-clickgm";

                        let gmbadgei = deftemplate.createElement('i');
                        gmbadgei.className = "fas fa-plus-circle";

                        gmbadgea.appendChild(gmbadgei);
                        extraDiv.appendChild(gmbadgea);
                    }

                    sInput.appendChild(extraDiv);
                }

                else if(property.data.datatype==="list"){

                    sInput = deftemplate.createElement("SELECT");
                    sInput.className = "input-med";
                    sInput.setAttribute("name", "data.attributes." + property.data.attKey + ".value");
                    sInput.insertAdjacentHTML( 'beforeend', "{{#select data.data.attributes." + property.data.attKey + ".value}}" );

                    //IM ON IT
                    var rawlist = property.data.listoptions;
                    var listobjects = rawlist.split(',');

                    for(var i=0;i<listobjects.length;i++){
                        let n_option = deftemplate.createElement("OPTION");
                        n_option.setAttribute("value", listobjects[i]);
                        n_option.textContent = listobjects[i];
                        sInput.appendChild(n_option);
                    }



                    sInput.insertAdjacentHTML( 'beforeend', "{{/select}}" );
                }

                else if(property.data.datatype==="table"){
                    new_row.className = "table-row";

                    //TABLE LAYOUT
                    sInput = deftemplate.createElement("TABLE");
                    if(property.data.tableheight=="S"){
                        sInput.className = "table-small";
                    }
                    else if(property.data.tableheight=="M"){
                        sInput.className = "table-med";
                    }
                    else if(property.data.tableheight=="T"){
                        sInput.className = "table-tall";
                    }
                    else{
                        sInput.className = "table-free";
                    }

                    sInput.className += " sbtable";

                    sInput.setAttribute("name", "data.attributes." + property.data.attKey);
                    sInput.setAttribute("inputgroup", inputgroup);
                    sInput.setAttribute("value", "{{data.data.attributes." + property.data.attKey + ".value}}");

                    sInput.innerHTML = '';

                    //get group
                    const group = game.items.get(property.data.group.id);

                    //Create header
                    let header = deftemplate.createElement("THEAD");
                    if(!property.data.hasheader)
                        header.style.display = "none";
                    sInput.appendChild(header);
                    let header_row = deftemplate.createElement("TR");
                    header_row.className += " " + fontgroup;
                    header.appendChild(header_row);

                    //Add name ta
                    if(property.data.onlynames=="DEFAULT" || property.data.onlynames=="ONLY_NAMES"){
                        if (!property.data.namecolumn) {
                            property.data.namecolumn = "Item";
                        }

                        let hnameCell = deftemplate.createElement("TH");
                        //hnameCell.className = "input-free";
                        hnameCell.className = "label-large";
                        //hnameCell.textContent = "Item";
                        hnameCell.textContent = property.data.namecolumn;
                        header_row.appendChild(hnameCell);
                    }


                    if(property.data.onlynames!="ONLY_NAMES"){
                        if(property.data.hasactivation){
                            let hactiveCell = deftemplate.createElement("TH");
                            hactiveCell.className = "input-min";
                            hactiveCell.textContent = "Active";
                            header_row.appendChild(hactiveCell);
                        }

                        if(property.data.hasunits){
                            let hnumberCell = deftemplate.createElement("TH");
                            hnumberCell.className = "input-min";
                            hnumberCell.textContent = "Num";
                            header_row.appendChild(hnumberCell);
                        }

                        //REMOVE USES WORKSTREAM
                        if(property.data.hasuses && property.data.hasactivation){
                            let husesCell = deftemplate.createElement("TH");
                            husesCell.className = "input-med";
                            husesCell.textContent = "Uses";
                            header_row.appendChild(husesCell);
                        }

                        if(group!=null){

                            const groupprops = group.data.data.properties;

                            for(let i=0;i<groupprops.length;i++){
                                let propTable = game.items.get(groupprops[i].id);
                                let hCell = deftemplate.createElement("TH");

                                if(propTable.data.data.datatype=="simplenumeric"){
                                    hCell.className ="input-min";

                                    if(propTable.data.data.inputsize=="M"){
                                        hCell.className = "label-med";
                                    }
                                }

                                else {
                                    hCell.className ="input-med";

                                    if(propTable.data.data.labelsize=="F"){
                                        hCell.className = "label-free";
                                    }
                                    else if(propTable.data.data.labelsize=="S"){
                                        hCell.className = "label-small";
                                    }
                                    else if(propTable.data.data.labelsize=="L" && propTable.data.data.inputsize=="M"){
                                        hCell.className = "label-medlarge";
                                    }
                                    else if(propTable.data.data.labelsize=="L" && propTable.data.data.inputsize=="L"){
                                        hCell.className = "label-big";
                                    }
                                    else if(propTable.data.data.labelsize=="L"){
                                        hCell.className = "label-large";
                                    }
                                    else {
                                        hCell.className = "label-med";
                                    }

                                }

                                hCell.textContent = propTable.data.data.tag;

                                if(!propTable.data.data.ishidden)
                                    header_row.appendChild(hCell);
                            }
                        }
                    }



                    //Add name ta
                    let deleteCell = deftemplate.createElement("TH");
                    deleteCell.className = "cell-empty";
                    header_row.appendChild(deleteCell);

                    let tbody = deftemplate.createElement("TBODY");
                    tbody.className = "table";
                    tbody.className += " " + inputgroup;
                    tbody.setAttribute("id", property._id);
                    sInput.appendChild(tbody);

                }

                else {

                    sInput = deftemplate.createElement("INPUT");

                    sInput.setAttribute("name", "data.attributes." + property.data.attKey  + ".value");
                    sInput.setAttribute("value", "{{data.data.attributes." + property.data.attKey + ".value}}");

                    if(property.data.datatype==="simplenumeric"){

                        sInput.setAttribute("type", "text");
                        sInput.className = "input-min";

                        if(property.data.inputsize=="M"){
                            sInput.className = "input-med";
                        }

                        if(!hasProperty(property.data,"maxvisible")){
                            property.data.maxvisible=true;
                        }

                        if(property.data.automax!="" && property.data.maxvisible){
                            sInputMax = deftemplate.createElement("INPUT");
                            sInputMax.setAttribute("type", "text");
                            sInput.className = "input-ahalf ";
                            sInputMax.className = "input-bhalf input-disabled inputGM " + property.data.attKey + ".max";
                            sInputMax.setAttribute("name", "data.attributes." + property.data.attKey  + ".max");
                            sInputMax.setAttribute("value", "{{data.data.attributes." + property.data.attKey + ".max}}");
                        }


                    }

                    else if(property.data.datatype=="label"){
                        sInput.setAttribute("type", "text");
                        sInput.className = "input-free";
                        sInput.style.display = "none";
                    }

                    else {
                        sInput.setAttribute("type", "text");
                        sInput.className = "";
                        if(property.data.inputsize!=null){
                            if(property.data.inputsize=="F"){
                                sInput.className = "input-free";
                            }

                            else if(property.data.inputsize=="S"){
                                sInput.className = "input-small";
                            }

                            else if(property.data.inputsize=="M"){
                                sInput.className = "input-med";
                            }

                            else if(property.data.inputsize=="L"){
                                sInput.className = "input-large";
                            }
                        }
                        else{
                            sInput.className = "input-free";
                        }
                    }

                    if(property.data.auto!=""){
                        sInput.setAttribute("readonly", "true");
                        sInput.className += " input-disabled";
                    }

                }

                //Adds identifier
                sInput.className += " " + property.data.attKey;
                if(property.data.datatype!="table")
                    sInput.className += " " + inputgroup;
                console.log(property);
                sInput.setAttribute("attId", property._id);

                if(!property.data.editable)
                    sInput.className += " inputGM";

                if(property.data.ishidden){
                    sInput.style.display = "none";
                    if(sLabel!=null)
                        sLabel.style.display = "none";
                }


                if(property.data.datatype!="label")
                    divtemp.appendChild(sInput);

                if(sInputMax!=null){
                    sInputMax.className += " " + inputgroup;
                    divtemp.appendChild(sInputMax);
                }



                count++;

                if(count == columns){
                    count=0;
                }

            }
        },this);

        //GEt final HTML
        var parentRow;
        //console.log("rwidth: " + flags.rwidth + " rows: " + flags.rows);
        if(multiID==null){
            console.log(tabpanel.name + " width: " + flags.rwidth + " rows: " + flags.rows + " initial: " + initial);
        }
        else{
            console.log(tabpanel.name + " rwidth: " + flags.rwidth + " multiwidth: " + flags.multiwidth  + " initial: " + initial + " maxrows " + flags.maxrows); 
        }

        let checktest = deftemplate.getElementById(tabname + "row" + flags.rows);

        if((flags.rwidth==0 || initial) && (firstmrow || checktest==null)){
            console.log("setting new row attribute");
            parentRow = deftemplate.createElement("DIV");
            parentRow.className = 'new-block';

            if(multiID==null){
                parentRow.setAttribute('id', tabname + "row" + flags.rows );
                await parentNode.appendChild(parentRow);
            }
            else{
                let multiwclass = flags.multiwclass;
                console.log("MultiPanel Container " + multiwclass );
                let parentRoot;
                let parentGranda = deftemplate.createElement("DIV");
                parentGranda.setAttribute('id', multiID + "multi");
                parentGranda.className=multiwclass + "-col";

                //If has header:
                if(multiName!=null && multiName!=""){
                    let new_header = document.createElement("DIV");

                    if(tabpanel.data.backg=="T"){
                        new_header.className = "panelheader-t";
                    }
                    else{
                        new_header.className = "panelheader";
                    }         

                    new_header.textContent = multiName;
                    parentGranda.appendChild(new_header);
                }



                console.log("MultiRow Container: " + multiID + "multirow" + flags.maxrows);
                parentRow.setAttribute('id', multiID + "multirow" + flags.maxrows);

                if(flags.rwidth==0){
                    parentRoot = document.createElement("DIV");
                    parentRoot.className = 'new-block';
                    console.log("creating row: " + flags.rows );
                    parentRoot.setAttribute('id', tabname + "row" + flags.rows );
                    parentNode.appendChild(parentRoot);
                    parentRoot.appendChild(parentGranda);
                }

                else{
                    parentRoot = deftemplate.getElementById(tabname + "row" + flags.rows );
                    parentNode.appendChild(parentRoot);
                    parentRoot.appendChild(parentGranda);
                }

                parentGranda.appendChild(parentRow);

                //parentGranda conditional visibility, to reorganize in method with previous ones
                if(_paneldata.condop!="NON"){
                    let attProp = ".value";
                    if(_paneldata.condat!=null){
                        if(_paneldata.condat.includes("max")){
                            attProp = "";
                        }
                    }


                    if(_paneldata.condop=="EQU"){
                        if(_paneldata.condvalue == "true"||_paneldata.condvalue == "false" || typeof _paneldata.condvalue ==="boolean"){
                            parentGranda.insertAdjacentHTML( 'beforebegin', "{{#if actor.data.attributes." + _paneldata.condat + attProp + "}}" );
                            parentGranda.insertAdjacentHTML( 'afterend', "{{/if}}" );
                        }
                        else{
                            parentGranda.insertAdjacentHTML( 'beforebegin', "{{#ifCond actor.data.attributes." + _paneldata.condat + attProp + " '" + _paneldata.condvalue + "'}}" );
                            parentGranda.insertAdjacentHTML( 'afterend', "{{/ifCond}}" );
                        }

                    }

                    else if(_paneldata.condop=="HIH"){
                        parentGranda.insertAdjacentHTML( 'beforebegin', "{{#ifGreater actor.data.attributes." + _paneldata.condat + attProp + " '" + _paneldata.condvalue + "'}}" );
                        parentGranda.insertAdjacentHTML( 'afterend', "{{/ifGreater}}" );
                    }

                    else if(_paneldata.condop=="LOW"){
                        parentGranda.insertAdjacentHTML( 'beforebegin', "{{#ifLess actor.data.attributes." + _paneldata.condat + attProp + " '" + _paneldata.condvalue + "'}}" );
                        parentGranda.insertAdjacentHTML( 'afterend', "{{/ifLess}}" );
                    }
                }

            }


        }

        else{

            if(multiID==null){
                console.log("getting existing row id " + tabname + "row" + flags.rows);
                parentRow = deftemplate.getElementById(tabname + "row" + flags.rows);
            }
            else{
                if(initial){
                    //parentRow = deftemplate.getElementById(multiID + "multi");
                    parentRow = document.createElement("DIV");
                    parentRow.className = 'new-multiblock';

                    let parentRoot;
                    let parentGranda = deftemplate.getElementById(multiID + "multi");

                    console.log("Creating multiRow Container: " + multiID + "multirow" + flags.maxrows);
                    parentRow.setAttribute('id', multiID + "multirow" + flags.maxrows);

                    if(flags.rwidth==0){
                        parentRoot = docudeftemplatement.createElement("DIV");
                        parentRoot.className = 'new-block';
                        console.log("creating row: " + flags.rows );
                        parentRoot.setAttribute('id', tabname + "row" + flags.rows );
                    }

                    else{
                        parentRoot = deftemplate.getElementById(tabname + "row" + flags.rows );

                    }

                    parentNode.appendChild(parentRoot);
                    parentRoot.appendChild(parentGranda);
                    parentGranda.appendChild(parentRow);
                }
                else{
                    parentRow = deftemplate.getElementById(multiID + "multirow" + flags.maxrows);
                }

            }

        }
        console.log("almost there");
        await parentRow.appendChild(div6);
        //console.log(parentRow);

        //ADD VISIBILITY RULES TO PANEL
        if(tabpanel.data.condop!="NON"){
            let attProp = ".value";
            if(tabpanel.data.condat!=null){
                if(tabpanel.data.condat.includes("max")){
                    attProp = "";
                }
            }


            if(tabpanel.data.condop=="EQU"){
                console.log(div6);
                if((tabpanel.data.condvalue === "true"||tabpanel.data.condvalue === "false" || tabpanel.data.condvalue===true || tabpanel.data.condvalue===false )){
                    div6.insertAdjacentHTML( 'beforebegin', "{{#if actor.data.attributes." + tabpanel.data.condat + attProp + "}}" );
                    div6.insertAdjacentHTML( 'afterend', "{{/if}}" );
                }
                else{
                    div6.insertAdjacentHTML( 'afterbegin', "{{#ifCond actor.data.attributes." + tabpanel.data.condat + attProp + " '" + tabpanel.data.condvalue + "'}}" );
                    div6.insertAdjacentHTML( 'beforeend', "{{/ifCond}}" );
                }

            }

            else if(tabpanel.data.condop=="HIH"){
                div6.insertAdjacentHTML( 'afterbegin', "{{#ifGreater actor.data.attributes." + tabpanel.data.condat + attProp + " '" + tabpanel.data.condvalue + "'}}" );
                div6.insertAdjacentHTML( 'beforeend', "{{/ifGreater}}" );
            }

            else if(tabpanel.data.condop=="LOW"){
                div6.insertAdjacentHTML( 'afterbegin', "{{#ifLess actor.data.attributes." + tabpanel.data.condat + attProp + " '" + tabpanel.data.condvalue + "'}}" );
                div6.insertAdjacentHTML( 'beforeend', "{{/ifLess}}" );
            }
        }

        if(tabpanel.data.isimg){
            div6.setAttribute("img",tabpanel.data.imgsrc);
            div6.className += " isimg";

            if(tabpanel.data.contentalign == "center")
                div6.className += " centertext";
        }

        console.log("almost there 2");
        let finalreturn = new XMLSerializer().serializeToString(deftemplate);
        return finalreturn;
        //this.actor.data.data._html = deftemplate.innerHTML;

    }

    async exportHTML(htmlObject, filename) {
        const data = new FormData();
        const blob = new Blob([htmlObject], {type: 'text/html'});

        data.append('target', 'worlds/'+ game.data.world.name + "/");
        data.append('upload', blob, filename + '.html');
        data.append('source', 'data');
        console.log(data);

        fetch('upload', {method: 'POST', body: data});

    };

    /* -------------------------------------------- */

    /**
   * Builds the character sheet template based on the options included
   */

    async buildSheet(){
        const actor = this.actor;
        const tabs = actor.data.data.tabs;
        const flags = this.actor.data.flags;

        let newhtml = await auxMeth.buildSheetHML();
        let stringHTML = new XMLSerializer().serializeToString(newhtml)
        //console.log(stringHTML);
        await this.actor.update({"data._html": stringHTML});

        setProperty(flags,"rows",0);
        setProperty(flags,"rwidth",0);
        setProperty(flags,"multiwidth",0);
        setProperty(flags,"maxwidth",0);
        setProperty(flags,"maxrows",0);
        setProperty(flags,"multiwclass","");

        console.log(actor);

        let keychecker = await this.checkTemplateKeys(tabs);
        await this.actor.update({"data.buildlog": keychecker.checkerMsg});
        console.log(keychecker);
        if(keychecker.hasissue){
            ui.notifications.warn("Template actor has consistency problems, please check Config Tab");
            return;
        }
        else{
            await this.buildHTML(tabs);
            this.actor.update({"data.flags": flags},{diff:false});
        }


    }

    async checkConsistency(){

        let gamecItems = game.items.filter(y=>y.data.type=="cItem");
        for(let i=0;i<gamecItems.length;i++){
            const mycitem = gamecItems[i];
            const mycitemmods = mycitem.data.data.mods;
            for(let j=0;j<mycitemmods.length;j++){
                let mymod = mycitemmods[j];
                setProperty(mymod,"citem",mycitem.data.id);
                if(!hasProperty(mymod,"index"))
                    setProperty(mymod,"index",j);

            }
            await mycitem.update({"data":mycitem.data.data});
        }

        let gameactors = game.actors;
        for(let i=0;i<gameactors.entities.length;i++){

            const myactor = gameactors.entities[i];
            const myactorcitems = myactor.data.data.citems;
            //console.log("checking actor " + myactor.name);
            //console.log(myactorcitems);
            if(!myactor.data.data.istemplate){
                if(myactorcitems!=null){
                    for(let j=myactorcitems.length-1;j>=0;j--){
                        let mycitem = myactorcitems[j];
                        //console.log(mycitem);
                        if(mycitem!=null){
                            let templatecItem = game.items.get(mycitem.id);
                            //console.log(templatecItem);

                            if(templatecItem!=null){
                                let isconsistent = true;
                                let mymods = mycitem.mods;
                                if(mymods!=null){
                                    for(let r=0;r<mymods.length;r++){
                                        if(mycitem.id!=mymods[r].citem)
                                            mymods[r].citem=mycitem.id;
                                        if(!hasProperty(mymods[r],"index"))
                                            setProperty(mymods[r],"index",0);

                                        if(templatecItem.data.data.mods[mymods[r].index] == null){
                                            //console.log(templatecItem.name);
                                            //isconsistent = false;
                                        }

                                        else{
                                            if(mymods[r].expr != templatecItem.data.data.mods[mymods[r].index].value)
                                                isconsistent = false;
                                        }


                                    }
                                }

                                //MOD change consistency checker
                                if(!isconsistent){
                                    //console.log(templatecItem.name + " is fucked in " + myactor.name);
                                    let newData = await myactor.deletecItem(templatecItem.id,true);
                                    await this.actor.update({"data": newData.data});
                                    let subitems = await myactor.addcItem(templatecItem);
                                    if(subitems)
                                        this.updateSubItems(false, subitems);
                                    //await myactor.update(myactor.data);
                                }

                            }

                            else{
                                delete myactorcitems[j];
                            }

                        }

                        else{
                            //myactorcitems.split(myactorcitems[j],1);
                            delete myactorcitems[j];
                        }


                    }
                }

                try{
                    await myactor.update({"data":myactor.data.data},{stopit:true});
                }
                catch (err) {
                    ui.notifications.warn("Character " + myactor.name + " has consistency problems");
                }
            }


        }
    }

    async checkTemplateKeys(tabs){
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
        for (let y = 0; y < tabs.length; y++){
            let titem = game.items.get(tabs[y].id);
            let tabitempanels=[];
            if(titem!=null){
                tabitempanels = titem.data.data.panels;
                allTabs.push(titem.data.data.tabKey);
            }
            else{
                allTabs.push(tabs[y].name + "_TAB_NONEXISTING");
                hasissue=true;
            }

            if(tabitempanels==null)
                tabitempanels = [];

            for (let i = 0; i < tabitempanels.length; i++){
                let tabpanel = game.items.get(tabitempanels[i].id);
                let panelproperties;
                if(tabpanel!=null){
                    panelproperties = tabpanel.data.data.properties;
                    allPanels.push(tabpanel.data.data.panelKey);
                }
                else{
                    allPanels.push(tabitempanels[i].name + "_PANEL_NONEXISTING");
                    hasissue=true;
                }

                if(panelproperties==null)
                    panelproperties = [];

                for (let j = 0; j < panelproperties.length; j++){
                    let property = game.items.get(panelproperties[j].id);
                    if(property!=null){
                        allProps.push(property.data.data.attKey);
                    }
                    else{
                        allProps.push(panelproperties[j].name + "_PROP_NONEXISTING");
                        hasissue=true;
                    }

                }

            }
        }

        //CHECK FOR DUPLICATES
        let duplicateProps = allProps.filter((e, i, a) => a.indexOf(e) !== i);
        console.log(duplicateProps);
        for(let n=0;n<duplicateProps.length;n++){
            compilationMsg += "property key " + duplicateProps[n] + " is duplicated,";
            hasissue=true;
        }

        let duplicatePanels = allPanels.filter((e, i, a) => a.indexOf(e) !== i);
        for(let m=0;m<duplicatePanels.length;m++){
            compilationMsg += "panel key " + duplicatePanels[m] + " is duplicated, ";
            hasissue=true;
        }

        let duplicateTabs = allTabs.filter((e, i, a) => a.indexOf(e) !== i);
        for(let s=0;s<duplicateTabs.length;s++){
            compilationMsg += "panel key " + duplicateTabs[s] + " is duplicated, ";
            hasissue=true;
        }

        //CHECK FOR INCORRECT KEYS
        for(let checkPrKey in allProps){
            if(/\s/.checkPrKey){
                compilationMsg += "property key " + checkPrKey + " includes blank space, ";
                hasissue=true;
            }

        }

        for(let checkPaKey in allPanels){
            if(/\s/.checkPaKey){
                compilationMsg += "panel key " + checkPaKey + " includes blank space, ";
                hasissue=true;
            }

        }

        for(let checkTaKey in allTabs){
            if(/\s/.checkTaKey){
                compilationMsg += "tab key " + checkTaKey + " includes blank space, ";
                hasissue=true;
            }

        }

        //CHECK NONEXISTING TEMPLATE ELEMENTS
        let nonEmsg = ", the following elements do not exist in world (type included after _):"
        let checkNonE = allProps.concat(allPanels,allTabs);
        let nonE = checkNonE.filter(y=>y.includes("_NONEXISTING"));
        for(let nonElement in nonE){
            let noneKey = nonElement.replace("_NONEXISTING","");
            nonEmsg += noneKey + ", ";
        }

        //IF NOTHING WRONG
        compilationMsg += " SUCCESFULLY REBUILT"

        myreturn.hasissue = hasissue;
        myreturn.checkerMsg = compilationMsg;

        return myreturn;

    }

    find_duplicate_in_array(myarray) {
        let result = [];
        for(let i=0;i<myarray.length;i++){
            let myelement = myarray[i];
            let timespresent = myarray.filter((v) => (v === myelement)).length;
            if(timespresent>0 && !result.includes(myelement))
                result.push(myelement);
        }
        return result;
    }

    async buildHTML(tabs){
        console.log("building HTML");

        let newHTML;

        if(game.settings.get("sandbox", "consistencycheck")!=""){
            await this.checkConsistency();
        }


        const flags = this.actor.data.flags;
        for (let y = 0; y < tabs.length; y++){

            const titem = game.items.get(tabs[y].id).data;

            flags.rwidth=0;
            newHTML = await this.addNewTab(newHTML,titem,y+1);
            //console.log(newHTML);
            let tabname = titem.data.tabKey;

            //let gtabitem = JSON.parse(titem.data.panels);
            let tabitempanels = titem.data.panels;
            //console.log(tabitempanels);

            flags.maxrows = 0;


            for (let i = 0; i < tabitempanels.length; i++) {
                let tabpanel = game.items.get(tabitempanels[i].id);
                //console.log(tabpanel);


                if(tabpanel.type=="panel")
                    newHTML = await this.addNewPanel(newHTML,tabpanel.data,titem.data.tabKey,tabname,true);

                //                if(newpanelHTML!=null)
                //                    break;
                //console.log(newHTML);

                if(tabpanel.data.type=="multipanel"){
                    console.log("hay multi!");

                    let multipanels= tabpanel.data.data.panels;
                    let multiwidth = this.freezeMultiwidth(tabpanel.data);
                    let newtotalwidth = flags.rwidth + multiwidth;

                    flags.maxwidth = multiwidth;
                    flags.multiwidth = 0;
                    flags.multiwclass = this.getmultiWidthClass(tabpanel.data.data.width);

                    //console.log(multipanels);
                    let firstmrow =true;
                    let ismulti =true;
                    for (let j = 0; j < multipanels.length; j++){
                        let singlepanel = game.items.get(multipanels[j].id);
                        //console.log(multipanels[j]);
                        //LAst argument is only to pass the conditionals. Poorly done, to fix in the future.
                        newHTML = await this.addNewPanel(newHTML,singlepanel.data,titem.data.tabKey,tabname,firstmrow,tabpanel.data.data.panelKey,tabpanel.data.data.title,tabpanel.data.data);
                        if(firstmrow)
                            flags.rwidth += multiwidth;
                        firstmrow = false;

                    }
                }

            }
            //            if(newpanelHTML!=null)
            //                break;
        }

        if(newHTML==null)
            newHTML = this.actor.data.data._html;

        console.log("panels built");
        await this.hideTabsinTemplate();
        //console.log(newHTML);

        var wrapper= document.createElement('div');
        wrapper.innerHTML= newHTML;
        this.actor.data.data._html = newHTML;
        let deftemplate= wrapper;
        //console.log(deftemplate);

        await this.registerHTML(deftemplate.querySelector("#sheet").outerHTML);
    }

    hideTabsinTemplate(){
        var wrapper= document.createElement('div');
        wrapper.innerHTML= this.actor.data.data._html;
        let deftemplate= wrapper;

        //Tab selector
        let p = deftemplate.querySelector("#tab-0");
        let c = deftemplate.querySelector("#tab-last");
        p.insertAdjacentHTML( 'beforebegin', "{{#if actor.data.istemplate}}" );
        p.insertAdjacentHTML( 'beforebegin', "{{else}}" );
        c.insertAdjacentHTML( 'afterend', "{{/if}}" );


    }

    freezeMultiwidth(tabpanel){
        let newidth=0;
        if(tabpanel.data.width==="1"){
            newidth = 1;
        }

        else if(tabpanel.data.width==="1/3"){
            newidth = 0.333;
        }

        else if(tabpanel.data.width==="2/3"){
            newidth = 0.666;
        }

        else if(tabpanel.data.width==="5/6"){
            newidth = 0.833;
        }

        else if(tabpanel.data.width==="3/4"){
            newidth = 0.75;
        }

        else if(tabpanel.data.width==="1/2"){
            newidth = 0.5;
        }

        else if(tabpanel.data.width==="1/4"){
            newidth = 0.25;
        }

        else if(tabpanel.data.width==="1/6"){
            newidth = 0.166;
        }        

        else if(tabpanel.data.width==="1/8"){
            newidth = 0.125;
        }
        else if(tabpanel.data.width==="5/8"){
            newidth= 0.625;
        }
        else if(tabpanel.data.width==="3/8"){
            newidth= 0.375;
        }

        else{
            newidth= 1;
        }
        return newidth;
    }

    getmultiWidthClass(width){
        let wclass = "";
        if(width==="1"){
            wclass = "multi-1-1";
        }

        else if(width==="1/3"){
            wclass = "multi-1-3";
        }

        else if(width==="2/3"){
            wclass = "multi-2-3";
        }

        else if(width==="5/6"){
            wclass = "multi-5-6";
        }

        else if(width==="1/2"){
            wclass = "multi-1-2";
        }

        else if(width==="1/4"){
            wclass = "multi-1-4";
        }

        else if(width==="3/4"){
            wclass = "multi-3-4";
        }

        else if(width==="1/6"){
            wclass = "multi-1-6";
        }        

        else if(width==="1/8"){
            wclass = "multi-1-8";
        }
        else if(width==="5/8"){
            wclass = "multi-5-8";
        }
        else if(width==="3/8"){
            wclass = "multi-3-8";
        }

        else{
            wclass = "multi-1-1";
        }
        return wclass;
    }



    async registerHTML(htmlObject){
        console.log("registering HTML");

        let stringed = htmlObject.replace('=""','');

        stringed = stringed.replace(/toparse="/g,'');
        stringed = stringed.replace(/~~"/g,'');

        //this.actor.data.data.gtemplate = this.actor.name;
        this.refreshSheet(this.actor.name);
        //this.actor.data.data._html = stringed;

        await this.actor.update({"data._html": stringed});
        //console.log(stringed);

        //THIS IS THE LIMITANT CHANGE:
        //await this.actor.update(this.actor.data);

        await this.actor.update();

        await auxMeth.getSheets();

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

        try {
            let dropdata = JSON.parse(event.dataTransfer.getData('text/plain'));
            dropitem = game.items.get(dropdata.id);

            if ( dropitem.data.type !== "sheettab" && dropitem.data.type !== "cItem") {
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

        let subitemsTag;
        let isTab = true;
        let subiDataKey;
        let isUnique = true;

        if(dropitem.data.type == "sheettab"){
            subitemsTag = "tabs";
            subiDataKey = "tabKey";
        }
        else if(dropitem.data.type == "cItem"){
            subitemsTag = "citems";
            isTab = false;
            subiDataKey = "ciKey";

            if(!dropitem.data.data.isUnique){
                isUnique = false;
            }
        }

        //Add tab id to panel
        let subitems = duplicate(this.actor.data.data[subitemsTag]);
        let increaseNum = false;

        for (let i=0;i<subitems.length;i++) {
            if (subitems[i].id == dropitem.id) {
                if(isUnique){
                    console.log("item is unique, can not double");
                    return;
                }
                else{
                    subitems[i].number = parseInt(subitems[i].number) + 1;
                    subitems[i].uses = parseInt(subitems[i].uses) + parseInt(dropitem.data.data.maxuses);
                    increaseNum = true;
                    //await this.updateSubItems(isTab,subitems);
                    //await this.actor.actorUpdater();
                    //return;
                }

            }
        }

        if(!increaseNum){
            if(dropitem.data.type == "cItem"){
                //console.log("adding cItem");
                subitems = await this.actor.addcItem(dropitem);
            }
            else{
                let itemKey = dropitem.data.data[subiDataKey];
                let newItem={};
                console.log(dropitem);
                setProperty(newItem,itemKey,{});
                newItem[itemKey].id=dropitem.id;
                newItem[itemKey].ikey=itemKey;
                newItem[itemKey].name=dropitem.data.name;
                console.log(newItem);


                subitems.push(newItem[itemKey]);
                //await this.scrollbarSet();
            }
        }

        //console.log(subitems);
        await this.updateSubItems(isTab,subitems);

    }

    async updateSubItems(isTab, subitems){

        //await this.actor.update();

        if(isTab){
            //await this.actor.update({"data.tabs": subitems}, {diff: false});
            this.actor.data.data.tabs= subitems;
            await this.actor.update({"data.tabs": subitems});
        }

        else {

            //this.actor.data.data.citems= subitems;
            //await this.actor.update(this.actor.data);
            if(this.actor.isToken){
                let myToken = canvas.tokens.get(this.actor.token.id);
                await myToken.update({"actorData.data.citems": subitems});
            }

            else{
                //console.log(subitems);
                await this.actor.update({"data.citems": subitems});
            }
        }
        console.log("updating after drop");


        return subitems;
    }


    /* -------------------------------------------- */

    async refreshCItems(basehtml){
        //console.log("refreshingCItems");
        //TEST
        var parser = new DOMParser();
        let htmlcode = await auxMeth.getTempHTML(this.actor.data.data.gtemplate);
        var _basehtml = await parser.parseFromString(htmlcode, 'text/html').querySelector('form');
        if(_basehtml==null){
            ui.notifications.warn("Please rebuild character sheet before assigning");
            return;
        }

        //console.log(basehtml);
        //GET CITEMS
        let myactor = this.actor.data.data;
        if(this.actor.isToken){
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
        const propitems = game.items.filter(y=>y.data.type=="property" && y.data.data.datatype == "table");
        //console.log(propitems);
        let totalTables = [];

        for(let y=0;y<html.length;y++){
            let tableID = html[y].id;
            let tableVisible = true;
            let newElement = {tableID,tableVisible};
            totalTables.push(newElement);
        }

        for(let y=0;y<_html.length;y++){
            let tableID = _html[y].getAttribute("attid");
            let tableVisible = false;
            let existingTable = totalTables.find(y=>y.tableID==tableID);
            let newElement = {tableID,tableVisible};
            if(existingTable==null){
                totalTables.push(newElement);
            }

        }

        //console.log(totalTables);

        for(let i=0;i<totalTables.length;i++){
            //console.log(html);
            let tableID = totalTables[i].tableID;
            let table = html[i];
            let inputgroup

            //let table = html.find(y=>y.id==tableID);
            //console.log(tableID);

            if(table!=null){
                table.innerHTML = '';
                inputgroup = table.getAttribute("inputgroup");
            }

            const propTable = await propitems.find(y=>y.id == tableID);

            //const propTable = await propitems.find(y=>y.id == html[i].getAttribute("attid"));
            let group;
            let groupID;
            let tableKey;

            if(propTable!=null){
                groupID = propTable.data.data.group;
                group = game.items.get(groupID.id);
                tableKey = propTable.data.data.attKey;
            }

            if(group!=null){

                let groupprops = group.data.data.properties;
                let groupcitems = await citems.filter(y=>y.groups.find(item=>item.id==groupID.id));
                groupcitems = groupcitems.sort(auxMeth.dynamicSort("name"));

                for (let n=0;n<groupcitems.length;n++){
                    let ciObject = groupcitems[n];
                    let ciTemplate = game.items.get(ciObject.id);
                    //console.log(ciObject.name);
                    let new_row = document.createElement("TR");
                    new_row.className="table-row";

                    new_row.setAttribute("name", ciObject.name);
                    new_row.setAttribute("id", ciObject.id);
                    if(table!=null)
                        table.appendChild(new_row);

                    if(ciObject!=null && ciTemplate!=null){
                        //Link Element
                        if(propTable.data.data.onlynames=="DEFAULT" || propTable.data.data.onlynames=="ONLY_NAMES"){
                            let firstcell = document.createElement("TD");
                            firstcell.className = "input-free linkable";
                            firstcell.className += " " + inputgroup;
                            firstcell.textContent = ciObject.name;
                            firstcell.setAttribute("item_id", ciObject.id);
                            firstcell.addEventListener("click", this.linkCItem,false);
                            new_row.appendChild(firstcell);  
                        }


                        if(propTable.data.data.onlynames!="ONLY_NAMES"){
                            if(propTable.data.data.hasactivation){
                                let activecell = document.createElement("TD");
                                activecell.className = "input-min centertext";                   
                                activecell.className += " " + inputgroup;                   
                                new_row.appendChild(activecell);

                                if(ciObject.usetype=="ACT"){
                                    let activeinput = document.createElement("INPUT");
                                    activeinput.className = "centertext";
                                    activeinput.className += " " + inputgroup;
                                    activeinput.type = "checkbox";
                                    activeinput.checked = ciObject.isactive;

                                    activeinput.addEventListener("change", (event) => this.activateCI(ciObject.id,ciObject.isactive));

                                    activecell.appendChild(activeinput);
                                }

                                else if(ciObject.usetype=="CON"){
                                    let inputwrapper = document.createElement('a');
                                    let torecharge = false;

                                    if(ciObject.uses>0 || ciObject.maxuses==0){   
                                        inputwrapper.addEventListener("click", (event) => this.activateCI(ciObject.id,false,true));
                                    }

                                    else{
                                        if(ciObject.rechargable){
                                            torecharge = true;
                                        }

                                        else{
                                            inputwrapper = document.createElement("DIV"); 
                                        }

                                    }

                                    inputwrapper.className = "consumable-button";
                                    inputwrapper.title = "Use item";
                                    activecell.appendChild(inputwrapper);

                                    let activeinput = document.createElement('i');
                                    if(ciObject.icon=="BOOK"){
                                        activeinput.className = "fas fa-book";
                                    }
                                    else if(ciObject.icon=="VIAL"){
                                        activeinput.className = "fas fa-vial";
                                    }
                                    else{
                                        activeinput.className = "fas fa-star";
                                    }

                                    if (torecharge){
                                        activeinput.className = "fas fa-recycle";
                                        inputwrapper.addEventListener("click", (event) => this.rechargeCI(ciObject.id));
                                    }


                                    inputwrapper.appendChild(activeinput);
                                }

                            }

                            if(propTable.data.data.hasunits){
                                let numcell = document.createElement("TD");
                                numcell.className = "input-min centertext";                   
                                numcell.className += " " + inputgroup;                  
                                new_row.appendChild(numcell);

                                let numinput = document.createElement("INPUT");
                                numinput.className = "table-input table-free centertext";
                                numinput.className += " " + inputgroup;

                                let ciNumber = ciObject.number;

                                numinput.value = ciObject.number;
                                numinput.addEventListener("change", (event) => this.changeCINum(ciObject.id,event.target.value));

                                numcell.appendChild(numinput);
                            }

                            //REMOVE USES WORKSTREAM
                            if(propTable.data.data.hasuses && propTable.data.data.hasactivation){
                                let usescell = document.createElement("TD");
                                usescell.className = "tabblock-center";                   
                                usescell.className += " " + inputgroup;                  
                                new_row.appendChild(usescell);

                                let usevalue = document.createElement("INPUT");
                                usevalue.className = "table-input table-small centertext";
                                usevalue.className += " " + inputgroup;  

                                usescell.appendChild(usevalue);

                                if(!game.user.isGM){
                                    //usevalue.setAttribute("readonly", "true");  
                                    usevalue.className += " inputGM";
                                }

                                if(ciObject.usetype=="CON"){

                                    let maxuses = ciObject.maxuses;


                                    maxuses = await auxMeth.autoParser(ciTemplate.data.data.maxuses,attributes,ciObject.attributes,false);
                                    maxuses = parseInt(maxuses);

                                    //console.log(ciTemplate.name);

                                    let ciuses = ciObject.uses;

                                    if(isNaN(ciuses))
                                        ciObject.uses = await auxMeth.autoParser(ciuses,attributes,ciObject.attributes,false);
                                    usevalue.value = parseInt(ciObject.uses);

                                    if(maxuses == 0){
                                        usescell.className = " table-empty";
                                        usevalue.className = " table-empty-small";
                                        usevalue.value = "∞";
                                        usevalue.setAttribute("readonly", "true");
                                    }

                                    else{
                                        let maxusevalue = document.createElement("DIV");

                                        let numberuses = ciObject.number;
                                        if(numberuses==0)
                                            numberuses = 1;

                                        maxusevalue.className = "table-num";
                                        maxusevalue.textContent =  "/ " + parseInt(numberuses * maxuses);
                                        usevalue.addEventListener("change", (event) => this.changeCIUses(ciObject.id,event.target.value));
                                        usescell.appendChild(maxusevalue);
                                    }



                                }

                                else{
                                    usescell.className = " table-empty";
                                    usevalue.className = " table-empty-small";
                                    usevalue.value = " ";
                                    usevalue.setAttribute("readonly", "true"); 
                                }

                            }

                            for(let k=0;k<groupprops.length;k++){
                                let propRef = groupprops[k].id;
                                let propObj = game.items.get(groupprops[k].id);
                                let propdata = propObj.data.data;
                                let propKey = propObj.data.data.attKey;
                                let new_cell = document.createElement("TD");
                                let isconstant = groupprops[k].isconstant;

                                new_cell.className = "centertext";
                                new_cell.className += " " + inputgroup;

                                if(((ciObject.attributes[propKey]!=null && propdata.datatype!="label")||(propdata.datatype=="label")) && !propdata.ishidden){
                                    if(propdata.datatype=="textarea"){

                                        let textiContainer = document.createElement('a');

                                        let textSymbol = document.createElement('i');
                                        textSymbol.className = "far fa-file-alt";
                                        textiContainer.appendChild(textSymbol);

                                        new_cell.appendChild(textiContainer);
                                        new_row.appendChild(new_cell);
                                        let isdisabled = false;
                                        if(isconstant)
                                            isdisabled = true;
                                        textiContainer.addEventListener("click", (event) => {
                                            this.showTextAreaDialog(ciObject.id,propKey,isdisabled);
                                        }); 
                                        //}

                                    }

                                    else if(propdata.datatype!="radio" && propdata.datatype!="table"){

                                        let constantvalue;
                                        if(propdata.datatype!="label")
                                            constantvalue = ciTemplate.data.data.attributes[propKey].value;

                                        if(isconstant){

                                            let cContent = constantvalue;
                                            //console.log(propdata);
                                            if(propdata.datatype=="label"){
                                                if(propdata.labelformat=="D"){
                                                    cContent = "";
                                                    //console.log("adding roll");
                                                    let dieContainer = document.createElement("DIV");
                                                    dieContainer.setAttribute("title",propdata.tag);

                                                    let dieSymbol = document.createElement('i');
                                                    dieSymbol.className = "fas fa-dice-d20";
                                                    dieContainer.appendChild(dieSymbol);

                                                    new_cell.appendChild(dieContainer);
                                                }
                                                else{
                                                    cContent = propdata.tag; 
                                                    new_cell.textContent = cContent;
                                                }

                                            }

                                            else{

                                                if(propdata.datatype==="checkbox"){
                                                    //console.log("checkbox");
                                                    let cellvalue = document.createElement("INPUT");
                                                    //cellvalue.className = "table-input centertext";


                                                    cellvalue = document.createElement("INPUT");
                                                    cellvalue.className = "input-small";
                                                    cellvalue.setAttribute("type", "checkbox");
                                                    let setvalue= false;
                                                    //console.log(ciObject.attributes[propKey].value);
                                                    if(ciObject.attributes[propKey].value===true || ciObject.attributes[propKey].value==="true"){
                                                        setvalue = true;
                                                    }

                                                    if(ciObject.attributes[propKey].value===false || ciObject.attributes[propKey].value==="false"){
                                                        ciObject.attributes[propKey].value=false;
                                                    }

                                                    //console.log(setvalue);

                                                    cellvalue.checked = setvalue;
                                                    cellvalue.setAttribute("disabled", "disabled");
                                                    //console.log("lol");
                                                    new_cell.appendChild(cellvalue);

                                                }
                                                else{
                                                    new_cell.textContent = cContent;
                                                }



                                            }

                                            if(propdata.hasroll){
                                                new_cell.className += " rollable";
                                                new_cell.addEventListener('click',this._onRollCheck.bind(this,groupprops[k].id,ciObject.id,false),false);
                                            }
                                        }

                                        else{
                                            //console.log(propdata);
                                            let cellvalue = document.createElement("INPUT");
                                            //cellvalue.className = "table-input centertext";

                                            if(propdata.datatype==="checkbox"){

                                                cellvalue = document.createElement("INPUT");
                                                cellvalue.className = "input-small";
                                                cellvalue.className += " " + inputgroup;
                                                cellvalue.setAttribute("type", "checkbox");
                                                let setvalue= false;

                                                if(ciObject.attributes[propKey].value===true || ciObject.attributes[propKey].value==="true"){
                                                    setvalue = true;
                                                }

                                            }

                                            else if(propdata.datatype==="list"){

                                                cellvalue = document.createElement("SELECT");
                                                cellvalue.className = "table-input table-free centertext";
                                                cellvalue.className += " " + inputgroup;

                                                //IM ON IT
                                                var rawlist = propdata.listoptions;
                                                var listobjects = rawlist.split(',');
                                                //console.log(ciObject.attributes[propKey].value);
                                                for(let y=0;y<listobjects.length;y++){
                                                    let n_option = document.createElement("OPTION");
                                                    n_option.setAttribute("value", listobjects[y]);
                                                    n_option.textContent = listobjects[y];
                                                    cellvalue.appendChild(n_option);
                                                }

                                            }

                                            else if(propdata.datatype==="simpletext" || propdata.datatype==="label"){
                                                cellvalue = document.createElement("INPUT");
                                                cellvalue.setAttribute("type", "text");

                                                cellvalue.className = "table-input table-free";
                                                cellvalue.className += " " + inputgroup;
                                                if(propdata.inputsize!=null){
                                                    if(propdata.inputsize=="F"){

                                                    }

                                                    else if(propdata.inputsize=="S"){
                                                        cellvalue.className += " input-small";
                                                    }

                                                    else if(propdata.inputsize=="M"){
                                                        cellvalue.className += " input-med";
                                                    }

                                                    else if(propdata.inputsize=="L"){
                                                        cellvalue.className += " input-large";
                                                    }
                                                }

                                                if(propdata.datatype==="label"){
                                                    cellvalue.setAttribute("readonly", "true");
                                                }

                                            }

                                            else if(propdata.datatype==="simplenumeric"){
                                                cellvalue = document.createElement("INPUT");
                                                cellvalue.setAttribute("type", "text");
                                                cellvalue.className = "table-input centertext";
                                                cellvalue.className += " " + propTable.data.data.inputgroup;


                                                if(propdata.inputsize=="M"){
                                                    cellvalue.className += " input-med";
                                                }

                                                else{
                                                    cellvalue.className += " table-small";
                                                }

                                            }

                                            if(!propdata.editable && !game.user.isGM)
                                                cellvalue.setAttribute("readonly", true);

                                            if(propdata.datatype!="checkbox"){
                                                cellvalue.value = ciObject.attributes[propKey].value;

                                                if(ciObject.attributes[propKey].value==""){
                                                    cellvalue.value=constantvalue;
                                                }

                                                if(propdata.auto!=""){

                                                    cellvalue.setAttribute("readonly", true);
                                                }

                                            }

                                            else{
                                                let setvalue= false;
                                                //console.log(ciObject.attributes[propKey].value);
                                                if(ciObject.attributes[propKey].value===true || ciObject.attributes[propKey].value==="true"){
                                                    setvalue = true;
                                                }

                                                cellvalue.checked = setvalue;

                                            }

                                            new_cell.addEventListener("change", (event) => this.saveNewCIAtt(ciObject.id,groupprops[k].id,event.target.value));

                                            new_cell.appendChild(cellvalue);

                                        }


                                    }

                                    new_row.appendChild(new_cell);
                                }

                            }
                        }


                        //Delete Element
                        if(propTable.data.data.editable || game.user.isGM){
                            let deletecell = document.createElement("TD");
                            deletecell.className = "ci-delete"; 
                            let wrapdeleteCell = document.createElement('a');
                            wrapdeleteCell.className = "ci-delete";
                            wrapdeleteCell.className += " " + inputgroup;
                            wrapdeleteCell.title = "Delete Item";
                            deletecell.appendChild(wrapdeleteCell);

                            let wrapdeleteBton = document.createElement('i');
                            wrapdeleteBton.className = "fas fa-times-circle";
                            wrapdeleteBton.addEventListener('click',this.deleteCItem.bind(this,ciObject.id,false),false);
                            wrapdeleteCell.appendChild(wrapdeleteBton);

                            new_row.appendChild(deletecell);
                        }
                    }

                }

                if(groupcitems.length==0){
                    //Empty row;

                    let new_row = document.createElement("TR");
                    new_row.className="empty-row";
                    new_row.className += " " + inputgroup;

                    let headercells = document.getElementsByTagName("table");

                    for(let x=0;x<headercells.length;x++){
                        if(headercells[x].classList.contains(propTable.data.data.attKey)){
                            let columns = headercells[x].getElementsByTagName("th");
                            for(let w=0;w<columns.length;w++){
                                let empty_cell = document.createElement("TD");
                                new_row.appendChild(empty_cell);
                            }
                        }

                    }
                    if(table!=null)
                        table.appendChild(new_row);

                }

                if(propTable.data.data.hastotals && table!=null){
                    let new_row = document.createElement("TR");
                    new_row.className="totals-row";

                    let headercells = document.getElementsByTagName("table");
                    let counter = groupcitems.length;

                    let lastRow = table.children[table.children.length-1];
                    let cellTotal = lastRow.children.length;
                    let cellcounter = 0;

                    if(propTable.data.data.onlynames!="ONLY_NAMES"){

                        if(propTable.data.data.onlynames!="NO_NAMES"){
                            let empty_cell = document.createElement("TD");
                            empty_cell.textContent = "TOTAL";
                            empty_cell.className = lastRow.children[cellcounter].className;
                            empty_cell.className += " boldtext";
                            empty_cell.className = empty_cell.className.replace("linkable","");
                            new_row.appendChild(empty_cell);
                            cellcounter +=1;
                        }

                        if(propTable.data.data.hasactivation){
                            let empty_cell = document.createElement("TD");
                            empty_cell.className = lastRow.children[cellcounter].className;
                            new_row.appendChild(empty_cell);
                            cellcounter +=1;
                        }

                        if(propTable.data.data.hasactivation){
                            let empty_cell = document.createElement("TD");
                            empty_cell.className = lastRow.children[cellcounter].className;
                            new_row.appendChild(empty_cell);
                            cellcounter +=1;
                        }

                        if(propTable.data.data.hasunits){
                            let empty_cell = document.createElement("TD");
                            empty_cell.className = lastRow.children[cellcounter].className;
                            new_row.appendChild(empty_cell);
                            cellcounter +=1;
                        }


                        for(let k=0;k<groupprops.length;k++){

                            let propRef = groupprops[k].id;
                            let propObj = game.items.get(groupprops[k].id);
                            let propdata = propObj.data.data;
                            let propKey = propObj.data.data.attKey;
                            if(propdata.totalize && !propdata.ishidden){
                                let total_cell = document.createElement("TD");
                                let newtotal;
                                if(myactor.attributes[tableKey]!=null){
                                    let totalvalue = myactor.attributes[tableKey].totals[propKey];
                                    newtotal = totalvalue.total;
                                }

                                if(newtotal==null || isNaN(newtotal))
                                    newtotal = 0;
                                total_cell.className = lastRow.children[cellcounter].className;
                                total_cell.textContent = newtotal;
                                new_row.appendChild(total_cell);
                                cellcounter +=1;
                            }
                            else{
                                let empty_cell = document.createElement("TD");
                                empty_cell.className = lastRow.children[cellcounter].className;
                                new_row.appendChild(empty_cell);
                                cellcounter +=1;
                            }

                        }

                        if(propTable.data.data.editable || game.user.isGM){
                            let empty_cell = document.createElement("TD");
                            if(lastRow.children[cellcounter])
                                empty_cell.className = lastRow.children[cellcounter].className;
                            new_row.appendChild(empty_cell);
                            cellcounter +=1;
                        }


                        if(table!=null)
                            table.appendChild(new_row);
                    }


                }

            }

        }
        //console.log("refreshcItem finished");
    }

    showTextAreaDialog(citemID,citemAttribute,disabled){
        let citem = this.actor.data.data.citems.find(y=>y.id == citemID);
        let isdisabled = ""
        if(disabled)
            isdisabled = "disabled";


        let d = new Dialog({
            title: citem.name + "-" + citemAttribute,
            content: '<textarea id="dialog-textarea" class="texteditor-large"' + isdisabled + '>' + citem.attributes[citemAttribute].value + '</textarea>',
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Save",
                    callback: async (html) => {
                        if(!disabled){
                            citem.attributes[citemAttribute].value = d.data.dialogValue;
                            await this.actor.update({"data.citems":this.actor.data.data.citems}, {diff: false});
                        }

                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => {console.log("canceling text edition");}
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

    async saveNewCIAtt(ciId,propId, value){
        console.log("changing citem");
        let cItemsID = duplicate(this.actor.data.data.citems);
        let citem = cItemsID.find(y=>y.id==ciId);
        let propObj = game.items.get(propId);
        //console.log(value);

        if(propObj.data.data.datatype !="checkbox"){
            citem.attributes[propObj.data.data.attKey].value=value; 
        }

        else{

            let setvalue = true;
            if(citem.attributes[propObj.data.data.attKey].value){
                setvalue=false; 
            }
            citem.attributes[propObj.data.data.attKey].value=setvalue; 
        }

        if(!this.actor.isToken){
            this.actor.update({"data.citems":cItemsID});
        }
        else{
            let tokenId = this.id.split("-")[2];
            let mytoken = canvas.tokens.get(tokenId);
            await mytoken.update({"data.citems":cItemsID});
        }


    }

    linkCItem(evt){
        //console.log();
        let item = game.items.get(evt.currentTarget.getAttribute("item_id"));
        item.sheet.render(true);
    }

    async activateCI(itemId,value,iscon=false){
        const actorData = duplicate(this.actor.data.data);
        const citems = actorData.citems;
        const citem = citems.find(y=>y.id==itemId);
        const attributes = this.actor.data.data.attributes;
        const citemObj = game.items.get(itemId).data.data;

        if(value){
            citem.isactive = false;
        }

        else{
            citem.isactive = true;
            citem.isreset = false;
        }
        //console.log(citem.maxuses);
        if(iscon && citem.maxuses>0){
            citem.uses -=1;

            if(citem.uses>=0){
                let actualItems = Math.ceil(parseInt(citem.uses)/citem.maxuses);
                //if(citemObj.ispermanent){
                if(!citemObj.rechargable)
                    citem.number = actualItems;
                //}
            }


        }

        if(citemObj.roll!=""){
            citem.attributes._lastroll = await this._onRollCheck(null,itemId,true);
        }

        //console.log(citem);

        this.actor.data.flags.haschanged=true;

        //await this.scrollbarSet(false);

        await this.actor.update({"data.citems": citems});
    }

    async rechargeCI(itemId){
        const citems = duplicate(this.actor.data.data.citems);
        const citem = citems.find(y=>y.id==itemId);
        const citemObj = game.items.get(itemId).data.data;

        let totalnumber = citem.number;
        if(totalnumber==0)
            totalnumber = 1;

        citem.uses = parseInt(citemObj.maxuses * totalnumber);
        await this.actor.update({"data.citems": citems});
    }

    async deleteCItem(itemID, cascading=false){
        //get Item
        //console.log("deleting");
        let subitems = await this.actor.deletecItem(itemID, cascading);
        //console.log(subitems);
        if(this.actor.isToken){
            let myToken = canvas.tokens.get(this.actor.token.id);

            await myToken.actor.update({"data": subitems.data});
            //await myToken.update({"data.citems": this.actor.data.data.citems});
        }

        else{
            await this.actor.update({"data": subitems.data});
            //await this.actor.update(this.actor.data);
        }


        //await this.actor.update(this.actor.data);

    }

    handleGMinputs(basehtml){
        //SET TABLES INFO
        const gminputs = basehtml.find(".inputGM");
        for(let i=0;i<gminputs.length;i++){
            let input = gminputs[i];

            if(!game.user.isGM){
                input.setAttribute("readonly",true);

                if(input.type=="select-one")
                    input.className += " list-noneditable";
            }
        }
    }

    async changeCINum(itemID, value){

        let citemIDs = duplicate(this.actor.data.data.citems);
        let citem = this.actor.data.data.citems.find(y=>y.id==itemID);
        let citemNew = citemIDs.find(y=>y.id==itemID);

        if(value==0){
            value=1;
        }

        if(value<0 || isNaN(value)){
            value = citem.number;
        }



        citemNew.number = value; 
        //await this.scrollbarSet(false);
        //this.actor.update(this.actor.data);

        await this.actor.update({"data.citems":citemIDs});

    }

    async changeCIUses(itemID, value){
        let citemIDs = duplicate(this.actor.data.data.citems);
        let citem = citemIDs.find(y=>y.id==itemID);
        let myindex = citemIDs.indexOf(citem);

        citem.uses = value;
        console.log("changing");
        if(parseInt(citem.uses)>= parseInt(citem.maxuses)){
            citem.maxuses = parseInt(citem.uses);
        }

        //await this.scrollbarSet(false);
        //await this.actor.update(this.actor.data);
        await this.actor.update({"data.citems":citemIDs});

    }


    async refreshBadge(basehtml){
        const html = await basehtml.find(".badge-click");
        for(let i=0;i<html.length;i++){
            let badgeNode = html[i];
            let propKey = badgeNode.getAttribute("attKey");
            const att = this.actor.data.data.attributes[propKey];
            if(att!=null)
                badgeNode.textContent = att.value;
        }
    }

    async scrollBarLoad(basehtml){
        //console.log("load Scroll pos");

        let html = $(this._element[0]);
        let wcontent = html.find(".window-content").height();
        let sheader = html.find(".sheet-header").height();
        let atabs = html.find(".atabs").height();
        let sbodyheight = html.find(".sheet-body").height();
        let newheight = wcontent - (sheader + atabs);

        const htmltab = html.find(".scrollable");
        for(let i=0;i<htmltab.length;i++){
            let scrollNode = htmltab[i];
            $(scrollNode).height(newheight);

            if(scrollNode.classList.contains("active")){
                //console.log(scrollNode.style.height);
                let myuser = game.user.id;
                let newscrollTop = 0;
                if(hasProperty(this.actor.data.flags.sandbox,"scrolls_" + myuser + "_" + this.actor.id))
                    newscrollTop =this.actor.data.flags.sandbox["scrolls_" + myuser + "_" + this.actor.id]

                $(scrollNode).scrollTop(newscrollTop);

            }

            //console.log($(scrollNode));

        }

    }

    async scrollbarSet(noupdate = true){
        //console.log("setting scroll");
        if(this._element==null)
            return;
        let scrolls = this._element[0].getElementsByClassName("scrollable");
        let scrollTop = 0;

        for(let i=0;i<scrolls.length;i++){
            if(scrolls[i].classList.contains("active")){
                //console.log("setting");
                scrollTop = (scrolls[i].scrollTop);

            }

        }

        let userScrollId = "scrolls_" + game.user.id + "_" + this.actor.id;
        //this.actor.setFlag("sandbox",userScrollId,scrollTop);
        //console.log(scrollTop);
        return scrollTop;


    }

    async populateRadioInputs(basehtml){
        //console.log("reinput");
        const html = await basehtml.find(".radio-input");
        for(let i=0;i<html.length;i++){

            let radioNode = html[i];

            const attributes = this.actor.data.data.attributes;
            let value = 0;
            let propId = radioNode.getAttribute("attId");
            let property = game.items.get(propId);
            let attKey = property.data.data.attKey;
            let radiotype = property.data.data.radiotype;

            if(attributes[attKey]!=null){
                let maxRadios = attributes[attKey].max;
                value = attributes[attKey].value;

                radioNode.innerHTML='';
                //console.log(value);
                if(maxRadios>0){
                    for(let j=0;j<=parseInt(maxRadios);j++){
                        let radiocontainer = document.createElement('a');
                        let clickValue = j;
                        radiocontainer.setAttribute("clickValue",clickValue);
                        radiocontainer.className = "radio-element";
                        radiocontainer.style = "font-size:14px;";
                        if(radiotype=="S")
                            radiocontainer.style = "font-size:16px;";


                        let radiobutton = document.createElement('i');

                        if(j==0){
                            radiobutton.className = "far fa-times-circle";
                        }

                        else if(value>=clickValue){
                            radiobutton.className = "fas fa-circle";
                            if(radiotype=="S"){

                                radiobutton.className = "fas fa-square";
                            }


                        }
                        else{
                            radiobutton.className = "far fa-circle";
                            if(radiotype=="S"){
                                radiobutton.className = "far fa-square";
                            }


                        }

                        radiocontainer.appendChild(radiobutton);

                        radiobutton.addEventListener("click", (event) => this.clickRadioInput(clickValue,propId,event.target));

                        await radioNode.appendChild(radiocontainer);

                    }

                } 
            }

        }
    }

    async setImages(basehtml){
        const html = await basehtml.find(".isimg");
        for(let i=0;i<html.length;i++){
            let imgNode = html[i];
            let imgPath = imgNode.getAttribute("img");

            let imgEl = document.createElement('img');
            imgEl.className = "isimg";
            imgEl.src = imgPath;

            imgNode.appendChild(imgEl);
        }
    }

    async clickRadioInput(clickValue,propId,target){
        let property = game.items.get(propId);
        let radiotype = property.data.data.radiotype;
        let attKey = property.data.data.attKey;
        const attributes = this.actor.data.data.attributes;
        //attributes[attKey].value =  clickValue;
        await this.actor.update({[`data.attributes.${attKey}.value`] : clickValue});
        //await this.actor.actorUpdater();
        //await this.actor.update({"data.attributes":attributes}, {diff: false});
        if(clickValue>0){
            target.className="fas fa-circle";
            target.style = "font-size:14px;";
            if(radiotype=="S"){
                target.style = "font-size:16px;";
                target.className = "fas fa-square";
            }
        }

        //await this.scrollbarSet();

    }

    displaceTabs(prev){
        //console.log("retabbing");
        const flags = this.actor.data.flags;

        if (!hasProperty(flags, "activetab")){
            setProperty(flags,"activetab", 0);
        }

        if (!hasProperty(flags, "selectedtab")){
            setProperty(flags,"selectedtab", 0);
        }

        const tabs = $(this._element)[0].getElementsByClassName("tab-button");

        const sheettabs = [];
        var oneactive = false;
        for(let x=0;x<tabs.length;x++){
            let tabid = tabs[x].getAttribute("id");
            let tabtext = tabs[x].textContent;

            if(tabtext==""){
                tabs[x].style.display='none';
            }

            if(tabid!="tab-last" && tabtext!=""){

                if(tabs[x].classList.contains("active")){
                    flags.selectedtab = x;
                }

                if(tabid=="tab-0" && !this.actor.data.data.biovisible){
                    tabs[x].style.display='none';
                    if(tabs[x].classList.contains("active")){
                        oneactive=true;
                    }

                }
                else{
                    sheettabs.push(tabs[x]);  
                }

            }

        }

        if (oneactive){
            sheettabs[0].click();
            this.displaceTabs(1)
            return;
        }

        if(!this.actor.data.data.biovisible)
            flags.selectedtab -= 1;

        let visibletab = flags.selectedtab;

        const totaltabs = sheettabs.length;

        let newtab = 0;

        if(flags.activetab!=null)
            newtab = flags.activetab;

        let maxtabs = this.actor.data.data.visitabs;
        if(maxtabs==null)
            maxtabs = 3;

        if(prev!=null){
            if(prev){
                newtab -= 1;
                if(newtab<0){
                    newtab=0;

                }
            }
            else{
                newtab += 1;
                if(newtab>totaltabs-maxtabs){
                    newtab -=1;

                }
            }
        }

        //console.log("selected " + flags.selectedtab);


        flags.activetab = newtab;

        for(let n=0;n<totaltabs;n++){
            sheettabs[n].style.display='none';
        }

        //console.log(sheettabs);


        for(let i=0;i<maxtabs;i++){
            let newnumber = parseInt(newtab) + i;
            if(sheettabs[parseInt(newnumber)]!=null)
                sheettabs[parseInt(newnumber)].style.display="";

        }

    }

    async setSheetStyle(){
        //console.log(this.actor.data.data.gtemplate);

        let _mytemplate = await game.actors.find(y=>y.data.data.istemplate && y.data.data.gtemplate==this.actor.data.data.gtemplate);
        if(_mytemplate==null)
            return;
        let basehtml = this.element;

        if(this.actor.data.data.gtemplate == "Default")
            return;

        let bground = await basehtml.find(".window-content");
        let sheader = await basehtml.find(".sheet-header");
        let wheader = await basehtml.find(".window-header");
        let stabs = await basehtml.find(".atabs");

        //Set Height
        if(_mytemplate.data.data.setheight!="" && !_mytemplate.data.data.resizable){
            basehtml[0].style.height = _mytemplate.data.data.setheight + "px";
            let tabhandler = await basehtml.find(".tab");
            for(let j=0;j<tabhandler.length;j++){
                let mytab = tabhandler[j];

                let totalheight = parseInt(_mytemplate.data.data.setheight) - parseInt(wheader[0].clientHeight) - parseInt(sheader[0].clientHeight)-parseInt(stabs[0].clientHeight)-15;
                mytab.style.height= totalheight+"px";
            }
        }


        //Set Background
        if(_mytemplate.data.data.backg!=""){
            bground[0].style.background = "url(" + _mytemplate.data.data.backg + ") no-repeat";
        }


        if(!_mytemplate.data.data.resizable){
            let sizehandler = await basehtml.find(".window-resizable-handle");
            sizehandler[0].style.visibility = "hidden";
        }
    }

    async checkAttributes(formData){
        for(let att in formData){
            if(att.includes("data.attributes.")){
                let thisatt = formData[att];
                if(Array.isArray(formData[att]))
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
                imageform[0].setAttribute("src",path);
                //myactor.data.img = path;

                //myactor.update(myactor.data);

                let mytoken = await this.setTokenOptions(myactor.data,path);

                if(mytoken)
                    await myactor.update({"token":mytoken,"img":path});

                this._onSubmit(event);
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        }).browse(current);

    }

    async setTokenOptions(myactorData,path=null){

        //console.log(myactorData.token);

        if(path==null)
            path = myactorData.img;

        let mytoken = await duplicate(myactorData.token);

        if(!myactorData.data.istemplate){
            if(mytoken.dimLight==null)
                mytoken.dimLight = 0;

            if(mytoken.dimSight==null)
                mytoken.dimSight = 0;

            if(mytoken.brightLight==null)
                mytoken.brightLight = 0;

            mytoken.img = path;

            //mytoken.name = myactorData.name;

            if(game.settings.get("sandbox", "tokenOptions")){

                let displayName = myactorData.data.displayName;

                if(myactorData.token){

                    mytoken.displayName = displayName;

                    mytoken.displayBars = displayName;

                    if(myactorData.data.tokenbar1!=null)
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

        if(event.target == null && !game.user.isGM && !formData["data.biography"])
            return;

        if(event.target)
            if(event.target.name=="")
                return;


        //console.log(event);

        if(formData["data.gtemplate"]=="")
            formData["data.gtemplate"]=this.actor.data.data.gtemplate;


        formData = await this.checkAttributes(formData);


        //console.log("User: " + game.user.id + " is updating actor: " + this.actor.name + " target: " + event.target.name);

        if(event.target!=null){
            let target = event.target.name;
            let escapeForm = false;
            //console.log(target);

            if(target=="data.gtemplate")
                return;

            //if(!escapeForm){
            //console.log("form changed");
            //console.log(event.target.name);
            let property;
            let modmax = false;
            if (target.includes(".max")){
                modmax=true;
            }
            if(target!=null){


                target = target.replace(".value","");
                target = target.replace(".max","");


                let attri = target.split(".")[2];
                //console.log(attri);
                property = game.items.find(y=>y.data.type=="property" && y.data.data.attKey==attri);
                //console.log(property);
            }



            if(property!=null){
                if(property.data.data.datatype != "checkbox"){
                    formData[event.target.name] = event.target.value;
                }
                else{

                    formData[event.target.name] = event.target.checked;
                }

                let attrimodified = target + ".modified";
                let attrimodmax = target + ".modmax";
                if(!modmax){

                    formData[attrimodified] = true;

                }
                else{

                    formData[attrimodmax] = true;
                }

            }
            else{
                if(target=="data.biovisible"){
                    formData["data.biovisible"]=event.target.checked;
                }

                else if(target=="data.resizable"){
                    formData["data.resizable"]=event.target.checked;
                }

                else if(target=="data.istemplate"){
                    formData["data.istemplate"]=event.target.checked;
                }

                else{
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

