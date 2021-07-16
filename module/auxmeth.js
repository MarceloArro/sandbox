import { SBOX } from "./config.js";

export class auxMeth {

    /** Gets Sheets */
    static async getSheets(){
        //console.log("getting sheets");

        let templates = [];


        templates.push("Default");

        let templatenames = game.actors.filter(y=>y.data.data.istemplate);

        for(let i=0;i<templatenames.length;i++){

            templates.push(templatenames[i].name);
        }

        //console.log(templates);
        return templates;

    }

    static async getTempHTML(gtemplate,istemplate=false){

        let html="";

        let mytemplate = gtemplate;
        if(gtemplate!="Default"){

            let _template = await game.actors.find(y=>y.data.data.istemplate && y.data.data.gtemplate==gtemplate);

            if(_template!=null){
                html=_template.data.data._html;
            }

        }

        if(html===null || html===""){
            //console.log("defaulting template");
            gtemplate="Default";
            html = await fetch(this.getHTMLPath(gtemplate)).then(resp => resp.text());

        }

        return html;
    }

    static getHTMLPath(gtemplate){
        let path = "worlds/" + game.data.world.name ;
        //        const path = "systems/sandbox/templates/" + game.data.world + "/";
        var gtemplate = "";

        if(gtemplate==="" || gtemplate==="Default"){
            gtemplate = "character";
            path = "systems/sandbox/templates/";
        }

        let templatepath = `${path}/${gtemplate}.html`;
        //console.log(templatepath);

        return templatepath;
    }

    /* -------------------------------------------- */

    static async retrieveBTemplate(){

        var form = await fetch("systems/sandbox/templates/character.html").then(resp => resp.text());

        return form;

    }

    static async buildSheetHML(){
        console.log("building base html");
        var parser = new DOMParser();
        var htmlcode = await auxMeth.retrieveBTemplate();
        let html = parser.parseFromString(htmlcode, 'text/html');
        return html;
    }

    static async registerIfHelper(){
        Handlebars.registerHelper('ifCond', function(v1, v2, options) {

            if(auxMeth.isNumeric(v1))
                v1 = Number(v1);

            if(auxMeth.isNumeric(v2))
                v2 = Number(v2);

            if(v1 === v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    static async registerIfGreaterHelper(){
        Handlebars.registerHelper('ifGreater', function(v1, v2, options) {
            if(parseInt(v1) > parseInt(v2)) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    static async registerIfLessHelper(){
        Handlebars.registerHelper('ifLess', function(v1, v2, options) {
            if(v1 < v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    static async registerIfNotHelper(){
        Handlebars.registerHelper('ifNot', function(v1, v2, options) {
            if(v1 !== v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    static async registerIsGM(){
        Handlebars.registerHelper('isGM', function(options) {
            if(game.user.isGM) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    static async registerShowMod(){
        Handlebars.registerHelper('advShow', function(options) {
            if(game.settings.get("sandbox", "showADV")) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    static async registerShowSimpleRoll(){
        Handlebars.registerHelper('showRoller', function(options) {
            if(game.settings.get("sandbox", "showSimpleRoller")) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    static async registerShowRollMod(){
        Handlebars.registerHelper('rollMod', function(options) {
            if(game.settings.get("sandbox", "rollmod")) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    static async isNumeric(str) {
        if (typeof str != "string") return false // we only process strings!  
        return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
            !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
    }

    static async regParser(expr,attributes,itemattributes){
        let regArray =[];
        let expreg = expr.match(/(?<=\$\<).*?(?=\>)/g);
        if(expreg!=null){

            //Substitute string for current value
            for (let i=0;i<expreg.length;i++){
                let attname = "$<" + expreg[i]+ ">";
                let attvalue="";

                let regblocks = expreg[i].split(";");

                let regobject = {};
                regobject.index = regblocks[0];
                regobject.expr = regblocks[1];
                regobject.result = await auxMeth.autoParser(regblocks[1],attributes,itemattributes,false,true);
                regArray.push(regobject);

                expr = expr.replace(attname,attvalue);

            }

            let exprparse = expr.match(/(?<=\$)[0-9]+/g);

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

        return expr;
    }

    static async autoParser(expr,attributes,itemattributes,exprmode,noreg=false,number=1){
        var toreturn = expr;
        //console.log("autoparsing");
        //console.log(expr);


        if(typeof(expr)!="string")
            return expr;

        let diff = await game.settings.get("sandbox", "diff");
        if(diff==null)
            diff = 0;
        if(isNaN(diff))
            diff = 0;
        expr = expr.replace(/\#{diff}/g,diff);
        //console.log(itemattributes);
        //console.log(number);
        //console.log(exprmode);

        //PARSE TO TEXT
        let textexpr = expr.match(/[|]/g);
        if(textexpr!=null && (expr.charAt(0)=="|")){
            //console.log("has | ");
            expr = expr.substr(1,expr.length);
            exprmode=true;
        }

        //console.log(exprmode);

        //Expression register. Recommended to avoid REgex shennanigans
        let regArray =[];
        let expreg;
        if(!noreg)
            expreg = expr.match(/(?<=\$\<).*?(?=\>)/g);
        if(expreg!=null){

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

                regobject.result = await auxMeth.autoParser(regobject.expr,attributes,itemattributes,false,true);
                //console.log(regobject.result);

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

                    //console.log(regindex);
                    //console.log(attvalue);

                    expr = expr.replace(attname,attvalue);
                    expr = expr.trimStart();
                }
            }

            //console.log(expr);

        }

        //console.log(expr);
        //console.log(regArray);

        //Parses last roll
        if(itemattributes!=null && expr.includes("#{roll}")){
            expr=expr.replace(/\#{roll}/g,itemattributes._lastroll);
        }

        //Parses number of citems
        if(itemattributes!=null && expr.includes("#{num}")){
            expr=expr.replace(/\#{num}/g,number);
        }

        if(itemattributes!=null && expr.includes("#{name}")){
            //console.log("has name");
            expr=expr.replace(/\#{name}/g,itemattributes.name);
        }

        //console.log(expr);
        expr=expr.toString();

        //PARSE ITEM ATTRIBUTES
        var itemresult = expr.match(/(?<=\#\{).*?(?=\})/g);
        if(itemresult!=null && itemattributes!=null){

            //Substitute string for current value
            for (let i=0;i<itemresult.length;i++){
                let attname = "#{" + itemresult[i]+ "}";
                let attvalue;

                if(itemattributes[itemresult[i]]!=null)
                    attvalue = itemattributes[itemresult[i]].value;
                else{
                    //ui.notifications.warn("cItem property " + itemresult[i] + " of cItem " + itemattributes.name +" does not exist");
                    attvalue=0;
                }

                if((attvalue!==false)&&(attvalue!==true)){
                    if((attvalue=="" || attvalue ==null))
                        attvalue=0;
                }

                if(attvalue == null)
                    attvalue=0;

                if(!itemresult[i].includes("#{target|"))
                    expr = expr.replace(attname,attvalue);

            }      

        }
        //console.log(expr);
        //PARSE ACTOR ATTRIBUTES

        var result = expr.match(/(?<=\@\{).*?(?=\})/g);
        if(result!=null){

            //Substitute string for current value
            for (let i=0;i<result.length;i++){
                let rawattname = result[i];
                let attProp = "value";
                let attTotal;
                if(rawattname.includes(".max")){
                    rawattname = rawattname.replace(".max","");
                    attProp = "max";
                }

                if(rawattname.includes(".totals.")){
                    let splitter = rawattname.split('.');
                    rawattname = splitter[0];
                    attTotal = splitter[2];
                    attProp = "total";
                }

                let attname = "@{" + result[i]+ "}";
                let attvalue;

                if(attributes!=null){
                    let myatt = attributes[rawattname];


                    if(myatt!=null){
                        if(attTotal!=null && attTotal!="")
                            myatt = attributes[rawattname].totals[attTotal];
                        attvalue = myatt[attProp];
                    }
                    else{
                        let fromcItem = false;
                        let mycitem="";
                        if(itemattributes!=null){
                            fromcItem = true;
                            mycitem = " from citem: " + itemattributes.name;
                        }

                        ui.notifications.warn("Property " + rawattname + mycitem + " does not exist");
                        //console.log(expr);
                    }

                    if((attvalue!==false)&&(attvalue!==true)){
                        if((attvalue=="" || attvalue ==null))
                            attvalue=0;
                    }

                    if(attvalue == null)
                        attvalue=0;

                }
                else{
                    attvalue=0;
                }

                expr = expr.replace(attname,attvalue);
            }         

        }

        //PARSE ITEM ATTRIBUTE
        //console.log(expr);
        var attcresult = expr.match(/(?<=\-\-)\S*?(?=\-\-)/g);
        if(attcresult!=null){

            //Substitute string for current value
            for (let i=0;i<attcresult.length;i++){
                let attname = "--" + attcresult[i]+ "--";
                let attvalue;
                if(itemattributes[attcresult[i]]!=null)
                    attvalue = itemattributes[attcresult[i]].value;
                if(attvalue=="" || attvalue ==null)
                    attvalue=0;
                //console.log(attname + " " + attvalue);
                let nonvalid = /\,|\[|\]|\(|\)|\;/g;
                let nonvalidexpr = attcresult[i].match(nonvalid);

                if(!nonvalidexpr)
                    expr = expr.replace(attname,attvalue);
            }         

        }

        //console.log(expr);

        //PARSE ACTOR ATTRIBUTE
        var attpresult = expr.match(/(?<=\_\_)\S*?(?=\_\_)/g);
        if(attpresult!=null){

            //Substitute string for current value
            for (let i=0;i<attpresult.length;i++){
                let debugname = attpresult[i];
                //console.log(debugname);
                let attname = "__" + attpresult[i]+ "__";
                let attvalue=0;
                if(attributes!=null){
                    if(attributes[attpresult[i]]!=null)
                        attvalue = attributes[attpresult[i]].value;

                    //                    if(attvalue=="")
                    //                        attvalue = 0;
                }

                let nonvalid = /\,|\[|\]|\(|\)|\;/g;
                let nonvalidexpr = attpresult[i].match(nonvalid);
                //console.log(attvalue);

                if(!nonvalidexpr)
                    expr = expr.replace(attname,attvalue);
            }         

        }

        //console.log(expr);

        //NEW SMART PARSING
        let sums_are_num = false;
        let safety_break = 0;

        while(!sums_are_num){
            //console.log(expr);
            sums_are_num = true;
            if(safety_break>7)
                break;

            //console.log(expr);

            //PARSE CEIL
            let ceilmatch = /\bceil\(/g;
            var ceilResultArray;
            var ceilResult = [];

            while (ceilResultArray = ceilmatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(ceilmatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                ceilResult.push(subb);
            }

            if(ceilResult!=null){
                //Substitute string for current value        
                for (let i=0;i<ceilResult.length;i++){
                    let ceilExpr = ceilResult[i];
                    let tochange = "ceil(" + ceilExpr+ ")";

                    let maxpresent = /\bif\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bfloor\(|\bceil\(|\bcount[E|L|H]\(|\?\[|[a-zA-Z]/g;
                    let maxpresentcheck = ceilExpr.match(maxpresent);

                    if(!maxpresentcheck){
                        //if(isNaN(ceilExpr)){
                        //                            let roll = new Roll(ceilExpr).roll();
                        //                            let finalvalue = roll.total;
                        //                            expr = expr.replace(tochange,parseInt(finalvalue));


                        let test = eval(ceilExpr);
                        let finalstring = "ceil(" + test+ ")";
                        let roll = new Roll(finalstring);
                        await roll.evaluate({async: true});
                        finalstring = roll.total;
                        expr = expr.replace(tochange,finalstring);
                        //}

                    }

                }
            }

            //console.log(expr);

            //PARSE FLOOR
            let floormatch = /\bfloor\(/g;
            var floorResultArray;
            var floorResult = [];

            while (floorResultArray = floormatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(floormatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                floorResult.push(subb);
            }

            if(floorResult!=null){
                //Substitute string for current value        
                for (let i=0;i<floorResult.length;i++){
                    let floorExpr = floorResult[i];
                    let tochange = "floor(" + floorExpr+ ")";

                    let maxpresent = /\bif\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bfloor\(|\bceil\(|\bcount[E|L|H]\(|\?\[|[a-zA-Z]/g;
                    let maxpresentcheck = floorExpr.match(maxpresent);

                    if(!maxpresentcheck){
                        if(isNaN(floorExpr)){
                            //                            let roll = new Roll(floorExpr).roll();
                            //                            let finalvalue = roll.total;
                            //                            expr = expr.replace(tochange,parseInt(finalvalue)); 
                            //console.log(floorExpr);

                            let test = eval(floorExpr);
                            //console.log(test);
                            let finalstring = "floor(" + test+ ")";
                            let roll = new Roll(finalstring);
                            await roll.evaluate({async: true});
                            finalstring = roll.total;
                            expr = expr.replace(tochange,finalstring);
                        }

                    }

                }
            }

            //console.log(expr);

            //PARSE MAX ROLL
            //var maxresult = expr.match(/(?<=\maxdie\().*?(?=\))/g);
            let mxmatch = /\bmaxdie\(/g;
            var maxdieArray;
            var maxDie = [];

            while (maxdieArray = mxmatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(mxmatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                maxDie.push(subb);
            }

            if(maxDie!=null){
                for (let i=0;i<maxDie.length;i++){
                    let tochange = "maxdie(" + maxDie[i]+ ")";


                    let newroll = new Roll(maxDie[i]);
                    await newroll.evaluate({async: true});

                    let attvalue = 0;
                    for(let j=0;j<newroll.dice.length;j++){
                        let diceexp = newroll.dice[j];
                        attvalue += parseInt(diceexp.results.length)*parseInt(diceexp.faces);
                    }


                    expr = expr.replace(tochange,attvalue);
                }
            }

            //console.log(expr);

            //MAXOF
            //var maxResult = expr.match(/(?<=\max\().*?(?=\))/g);
            let mrmatch = /\bmax\(/g;
            var maxResultArray;
            var maxResult = [];

            while (maxResultArray = mrmatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(mrmatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                maxResult.push(subb);
            }

            if(maxResult!=null){
                //Substitute string for current value        
                for (let i=0;i<maxResult.length;i++){
                    //console.log(maxResult[i]);
                    let ifpresent = /\bif\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bceil\(|\bfloor\(|\bcount[E|L|H]\(|\?\[/g;
                    let ifpresentcheck = maxResult[i].match(ifpresent);

                    if(!ifpresentcheck){
                        let blocks = maxResult[i].split(",");
                        let finalvalue=0;
                        let valueToMax = Array();
                        let nonumber=false;
                        for (let n=0;n<blocks.length;n++){
                            let pushblock = blocks[n];
                            let nonumsum = /[#@]{|\%\[|\if\[|\?\[/g;
                            let checknonumsum = blocks[n].match(nonumsum);
                            //console.log(pushblock);
                            if(!checknonumsum){
                                if(isNaN(pushblock)){
                                    let roll = new Roll(blocks[n]);
                                    await roll.evaluate({async: true});
                                    pushblock = roll.total;
                                }

                                valueToMax.push(parseInt(pushblock));
                            }
                            else{
                                //console.log("nonumber");
                                nonumber=true;
                            }
                        }
                        if(!nonumber){
                            finalvalue = Math.max.apply(Math, valueToMax);
                            let tochange = "max(" + maxResult[i]+ ")";
                            expr = expr.replace(tochange,parseInt(finalvalue)); 
                        }

                        else{
                            sums_are_num = false;
                        }
                    }

                    else{
                        sums_are_num = false;
                    }


                }
            }

            //console.log(expr);

            //MINOF
            //var minResult = expr.match(/(?<=\min\().*?(?=\))/g);
            let minmatch = /\bmin\(/g;
            var minResultArray;
            var minResult = [];

            while (minResultArray = minmatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(minmatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                minResult.push(subb);
            }
            if(minResult!=null){
                //Substitute string for current value        
                for (let i=0;i<minResult.length;i++){
                    let ifpresent = /\bif\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bceil\(|\bfloor\(|\bcount[E|L|H]\(|\?\[/g;
                    let ifpresentcheck = minResult[i].match(ifpresent);

                    if(!ifpresentcheck){
                        let blocks = minResult[i].split(",");
                        let finalvalue;
                        let valueToMin = Array();
                        let nonumber=false;
                        for (let n=0;n<blocks.length;n++){
                            let pushblock = blocks[n];
                            //console.log(pushblock);
                            let nonumsum = /[#@]{|\%\[|\if\[|\?\[/g;
                            let checknonumsum = blocks[n].match(nonumsum);
                            if(!checknonumsum){
                                if(isNaN(pushblock)){
                                    let roll = new Roll(blocks[n]);
                                    await roll.evaluate({async: true});
                                    pushblock = roll.total;
                                }

                                valueToMin.push(parseInt(pushblock));
                            }
                            else{
                                nonumber=true;
                            }
                        }
                        if(!nonumber){
                            finalvalue = Math.min.apply(Math, valueToMin);
                            let tochange = "min(" + minResult[i]+ ")";
                            expr = expr.replace(tochange,parseInt(finalvalue)); 
                        }

                        else{
                            sums_are_num = false;
                        }
                    }

                    else{
                        sums_are_num = false;
                    }


                }
            }

            //console.log(expr);
            //console.log(sums_are_num);

            //COUNTIF
            //console.log(expr);
            //var countIfResult = expr.match(/(?<=\bcountE\b\().*?(?=\))/g);
            let cifmatch = /\bcountE\(/g;
            var countIfResultArray;
            var countIfResult = [];

            while (countIfResultArray = cifmatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(cifmatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                countIfResult.push(subb);
            }
            if(countIfResult!=null){
                //Substitute string for current value        
                for (let i=0;i<countIfResult.length;i++){
                    //                let debugname = attpresult[i];


                    let splitter = countIfResult[i].split(";");
                    let comparer = countIfResult[i].replace(splitter[0] + ";",'');
                    let blocks = splitter[0].split(",");
                    let finalvalue=0;
                    let valueIf = Array();
                    let nonumber=false;

                    for (let n=0;n<blocks.length;n++){
                        if(!isNaN(blocks[n])){
                            valueIf.push(parseInt(blocks[n]));
                        }
                        else{
                            nonumber=true;
                        }

                    }

                    if(!nonumber){
                        for(let j=0;j<valueIf.length;j++){
                            //console.log(valueIf[j] + " " + comparer)
                            if(parseInt(valueIf[j])==parseInt(comparer))
                                finalvalue+=1;
                        }

                        let tochange = "countE(" + countIfResult[i]+ ")";
                        expr = expr.replace(tochange,parseInt(finalvalue)); 
                    }

                    else{
                        sums_are_num = false;
                    }


                }
            }
            //console.log(expr);

            //COUNTHIGHER
            //var countHighResult = expr.match(/(?<=\bcountH\b\().*?(?=\))/g);
            let chimatch = /\bcountH\(/g;
            var countHighResultArray;
            var countHighResult = [];

            while (countHighResultArray = chimatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(chimatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                countHighResult.push(subb);
            }
            if(countHighResult!=null){
                //Substitute string for current value        
                for (let i=0;i<countHighResult.length;i++){
                    //                let debugname = attpresult[i];


                    let splitter = countHighResult[i].split(";");
                    //let comparer = splitter[1];
                    let comparer = countHighResult[i].replace(splitter[0] + ";",'');
                    let blocks = splitter[0].split(",");
                    let finalvalue=0;
                    let valueIf = Array();
                    let nonumber=false;
                    for (let n=0;n<blocks.length;n++){
                        if(!isNaN(blocks[n])){
                            valueIf.push(parseInt(blocks[n]));
                        }
                        else{
                            nonumber=true;
                        }
                    }
                    if(!nonumber){
                        for(let j=0;j<valueIf.length;j++){
                            if(valueIf[j]>comparer)
                                finalvalue+=1;
                        }

                        let tochange = "countH(" + countHighResult[i]+ ")";
                        expr = expr.replace(tochange,parseInt(finalvalue));
                    }

                    else{
                        sums_are_num = false;
                    }


                }
            }

            //COUNTLOWER
            //var countLowResult = expr.match(/(?<=\bcountL\b\().*?(?=\))/g);
            let clomatch = /\bcountL\(/g;
            var countLowResultArray;
            var countLowResult = [];

            while (countLowResultArray = clomatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(clomatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                countLowResult.push(subb);
            }

            if(countLowResult!=null){
                //Substitute string for current value        
                for (let i=0;i<countLowResult.length;i++){
                    //                let debugname = attpresult[i];


                    let splitter = countLowResult[i].split(";");
                    //let comparer = parseInt(splitter[1]);
                    let comparer = countLowResult[i].replace(splitter[0] + ";",'');
                    let blocks = splitter[0].split(",");
                    let finalvalue=0;
                    let valueIf = Array();

                    let nonumber=false;
                    for (let n=0;n<blocks.length;n++){

                        if(!isNaN(blocks[n])){
                            valueIf.push(parseInt(blocks[n]));
                        }
                        else{
                            nonumber=true;
                        }
                    }
                    if(!nonumber){
                        for(let j=0;j<valueIf.length;j++){
                            if(valueIf[j]<comparer)
                                finalvalue+=1;
                        }

                        let tochange = "countL(" + countLowResult[i]+ ")";
                        expr = expr.replace(tochange,parseInt(finalvalue));
                    }

                    else{
                        sums_are_num = false;
                    }


                }
            }

            //console.log(expr);

            //SUM
            //var sumResult = expr.match(/(?<=\bsum\b\().*?(?=\))/g);
            let summatch = /\bsum\(/g;
            var sumResultResultArray;
            var sumResult = [];

            while (sumResultResultArray = summatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(summatch.lastIndex, expr.length);
                let subb = auxMeth.getParenthesString(suba);
                sumResult.push(subb);
            }
            if(sumResult!=null){
                //Substitute string for current value        
                for (let i=0;i<sumResult.length;i++){
                    //                let debugname = attpresult[i];


                    let splitter = sumResult[i].split(";");
                    let comparer = splitter[1];
                    let blocks = splitter[0].split(",");
                    let finalvalue=0;
                    let valueIf = Array();
                    let nonumber=false;
                    let nonumsum = /\bif\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bceil\(|\bfloor\(|\bcount[E|L|H]\(|\?\[/g;
                    let hassubfunctions = sumResult[i].match(nonumsum);

                    if (!hassubfunctions){
                        for (let n=0;n<blocks.length;n++){

                            let checknonumsum = blocks[n].match(nonumsum);
                            //console.log(blocks[n])
                            if((checknonumsum==null)){
                                let sumExpr = blocks[n];
                                //console.log(sumExpr);
                                if(isNaN(blocks[n])){
                                    sumExpr = eval(sumExpr);
                                }
                                finalvalue += parseInt(sumExpr);
                            }
                            else{
                                //console.log("nonumber");
                                nonumber=true;
                            }

                        }
                    }
                    else{
                        nonumber=true;
                    }

                    if(!nonumber){
                        //console.log("replacing")
                        let tochange = "sum(" + sumResult[i]+ ")";
                        expr = expr.replace(tochange,parseInt(finalvalue));
                    }

                    else{
                        sums_are_num = false;
                    }


                }
            }

            //console.log(expr);

            //PARSE SCALED AUTO VALUES
            //var scaleresult = expr.match(/(?<=\%\[).*?(?=\])/g);
            let scmatch = /\%\[/g;
            var scaleresultArray;
            var scaleresult = [];

            while (scaleresultArray = scmatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(scmatch.lastIndex, expr.length);
                let subb = auxMeth.getBracketsString(suba);
                scaleresult.push(subb);
            }
            //console.log(scaleresult);
            if(scaleresult!=null && scaleresult.length>0){
                //console.log(expr);
                //Substitute string for current value
                for (let i=scaleresult.length-1;i>=0;i--){
                    let nonvalidscale = /\bif\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bceil\(|\bfloor\(|\bcount[E|L|H]\(|\?\[/g;
                    let nonvalidscalecheck = scaleresult[i].match(nonvalidscale);
                    //console.log(scaleresult[i]);
                    if(!nonvalidscalecheck){
                        let limits = scaleresult[i].split(",");
                        //console.log(limits[0]);
                        let value = limits[0];
                        if(isNaN(value) && !value.includes("$") && !value.includes("min") && !value.includes("max") ){
                            let roll = new Roll(limits[0]);
                            await roll.evaluate({async: true});
                            value = roll.total;
                        }

                        let valuemod=0;

                        let limitArray = [];

                        for(let j=1;j<limits.length;j++){
                            let splitter = limits[j].split(":");
                            let scale = splitter[0];
                            //console.log(scale);

                            let noncondition = /\bif\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bfloor\(|\bceil\(|\bcount[E|L|H]\(|\?\[|[\+\-\*\/]/g;
                            let nonconditioncheck = scale.match(noncondition);

                            if(nonconditioncheck){
                                //console.log("no number");
                                //
                                //                            }
                                //
                                //                            if(isNaN(scale)  && !scale.includes("$") && !scale.includes("min") && !scale.includes("max") ){
                                //if(isNaN(scale) || scale.includes('+')|| scale.includes('-')|| scale.includes('/')|| scale.includes('*')){
                                let newroll = new Roll(scale);
                                await newroll.evaluate({async: true});
                                //expr = expr.replace(scale,newroll.total);
                                scale = newroll.total;

                            }

                            let limitEl = {};
                            limitEl.scale = scale;
                            limitEl.value = splitter[1];
                            await limitArray.push(limitEl);
                        }

                        await limitArray.sort(function (x, y) {
                            return x.scale - y.scale;
                        });
                        //console.log(limitArray);
                        //console.log(value);
                        valuemod= limitArray[0].value;

                        for(let k=0;k<limitArray.length;k++){
                            let checker = limitArray[k];
                            let checkscale = Number(checker.scale);
                            //console.log(checkscale);
                            if(value>=checkscale){
                                valuemod=checker.value;
                            }
                        }
                        //console.log(valuemod);
                        if(isNaN(valuemod)){
                            //console.log(valuemod);
                            let nonum = /[#@]{|\%\[|\if\[/g;
                            let checknonum = valuemod.match(nonum);

                            if(checknonum!=null){
                                sums_are_num = false;
                            }
                        }


                        let attname = "%[" + scaleresult[i]+ "]";
                        //console.log(attname);
                        expr = expr.replace(attname,valuemod);

                        //console.log(expr);
                    }

                    else{
                        sums_are_num = false;
                    }


                }
                //console.log(expr);

            }

            //console.log(expr);

            //PARSE CONDITIONAL
            //var ifresult = expr.match(/(?<=\if\[).*?(?=\])/g);
            var ifmatch = /\if\[/g;
            var ifresultArray;
            var ifresult = [];

            while (ifresultArray = ifmatch.exec(expr)) {
                //console.log(maxResultArray.index + ' ' + mrmatch.lastIndex);
                let suba = expr.substring(ifmatch.lastIndex, expr.length);
                let subb = auxMeth.getBracketsString(suba);
                ifresult.push(subb);
            }
            if(ifresult!=null){

                //Substitute string for current value
                for (let i=ifresult.length-1;i>=0;i--){

                    let nonvalidif = /\if\[|\bmax\(|\bmin\(|\bsum\(|\%\[|\bceil\(|\bfloor\(|\bcount[E|L|H]\(|\?\[/g;
                    let nonvalidifcheck = ifresult[i].match(nonvalidif);

                    if(!nonvalidifcheck){
                        var nonumber = false;
                        let limits = ifresult[i].split(",");
                        let general_cond = limits[0];
                        let truevalue = limits[1];
                        let falsevalue = limits[2];
                        let dontparse = false;
                        falsevalue = falsevalue.replace("ELSE ","");
                        let checknonumcond;
                        let nonumcond;

                        let finalvalue = falsevalue;

                        var findOR = general_cond.search(" OR "); 
                        var findAND = general_cond.search(" AND ");

                        let orconditions;
                        let andconditions;

                        if (findOR != -1){
                            //console.log("OR");
                            orconditions = general_cond.split(" OR ");
                            for(let j=0;j<orconditions.length;j++){
                                let conditions = orconditions[j].split(":");
                                let thiscondition = conditions[0];
                                let checker = conditions[1];

                                if (thiscondition === "true" || thiscondition === "false") {
                                    thiscondition = (thiscondition === "true");
                                }

                                if (checker === "true" || checker === "false") {
                                    checker = (checker === "true");
                                }

                                if(isNaN(checker)){
                                    try{
                                        let newroll = new Roll(checker);
                                        await newroll.evaluate({async: true});
                                        checker = newroll.total;
                                    }
                                    catch(err){

                                    }
                                }

                                if(isNaN(thiscondition)){
                                    nonumcond = /\+|\-|\\|\*/g;
                                    checknonumcond = thiscondition.match(nonumcond);
                                }


                                if(isNaN(thiscondition) || checknonumcond!=null){
                                    try{
                                        let newroll = new Roll(thiscondition);
                                        await newroll.evaluate({async: true});
                                        thiscondition = newroll.total;
                                    }
                                    catch(err){

                                    }
                                }

                                if(thiscondition==checker)
                                    finalvalue = truevalue;
                            }
                        }

                        else if (findAND != -1){
                            //console.log("AND");
                            andconditions = general_cond.split(" AND ");
                            finalvalue = truevalue;
                            for(let j=0;j<andconditions.length;j++){
                                let conditions = andconditions[j].split(":");
                                let thiscondition = conditions[0];
                                let checker = conditions[1];

                                if (thiscondition === "true" || thiscondition === "false") {
                                    thiscondition = (thiscondition === "true");
                                }

                                if (checker === "true" || checker === "false") {
                                    checker = (checker === "true");
                                }

                                if(isNaN(checker)){
                                    try{
                                        let newroll = new Roll(checker);
                                        await newroll.evaluate({async: true});
                                        checker = newroll.total;
                                    }
                                    catch(err){
                                        dontparse = true;

                                    }
                                }

                                if(isNaN(thiscondition)){
                                    nonumcond = /\+|\-|\\|\*/g;
                                    checknonumcond = thiscondition.match(nonumcond);
                                }

                                if(isNaN(thiscondition) || checknonumcond!=null){
                                    try{
                                        let newroll = new Roll(thiscondition);
                                        await newroll.evaluate({async: true});
                                        thiscondition = newroll.total;
                                    }
                                    catch(err){
                                        dontparse = true;
                                    }
                                }

                                //console.log(thiscondition + " " + checker);

                                if(thiscondition!=checker)
                                    finalvalue = falsevalue;
                            }
                        }

                        else {
                            //console.log("NONE");

                            let conditions = general_cond.split(":");
                            let thiscondition = conditions[0];
                            let checker = conditions[1];
                            //console.log(conditions);
                            //console.log(checker);

                            if (thiscondition === "true" || thiscondition === "false") {
                                thiscondition = (thiscondition === "true");
                            }

                            if (checker === "true" || checker === "false") {
                                checker = (checker === "true");
                            }

                            //console.log(thiscondition + " " + checker);

                            if(isNaN(checker)){
                                try{
                                    let newroll = new Roll(checker);
                                    await newroll.evaluate({async: true});
                                    checker = newroll.total;
                                }
                                catch(err){
                                    dontparse = true;
                                }
                            }

                            if(isNaN(thiscondition)){
                                nonumcond = /\+|\-|\\|\*/g;
                                checknonumcond = thiscondition.match(nonumcond);
                            }
                            //console.log(thiscondition + " " + checker);

                            if(isNaN(thiscondition) || checknonumcond!=null){
                                try{
                                    let newroll = new Roll(thiscondition);
                                    await newroll.evaluate({async: true});
                                    thiscondition = newroll.total;
                                }
                                catch(err){
                                    dontparse = true;
                                }
                            }

                            //console.log(thiscondition + " " + checker);

                            if(thiscondition.toString() === checker.toString()){
                                finalvalue = truevalue;
                            }
                        }

                        //console.log(finalvalue);

                        let attname = "if[" + ifresult[i]+ "]";

                        let nonum = /[#@]{|\%\[|\if\[|\?\[/g;
                        let checknonumtrue = falsevalue.match(nonum);
                        let checknonumfalse = truevalue.match(nonum);

                        if(checknonumtrue!=null || checknonumfalse!=null){
                            sums_are_num = false;
                        }

                        else{
                            expr = expr.replace(attname,finalvalue);
                        }
                    }

                    else{
                        sums_are_num = false;
                    }


                }         

            }

            //console.log(expr);
            //MATH and ARITHMETIC CORRECTIONS
            let plusmin = /\+\-/g;
            expr = expr.replace(plusmin,"-");
            let minmin = /\-\-/g;
            expr = expr.replace(minmin,"+");
            let commazero = /\,\s\-\b0|\,\-\b0/g;
            expr = expr.replace(commazero,",0");
            let pluszero = /\+\s\b0|\+\b0/g;
            expr = expr.replace(pluszero,"");
            let minuszero = /\-\s\b0|\-\b0/g;
            expr = expr.replace(minuszero,"");
            //console.log(expr);

            safety_break += 1;

        }

        //console.log(expr);
        //console.log(exprmode);

        //console.log("finished parsed")
        //console.log(expr);

        toreturn = expr;

        if(isNaN(expr)){
            //console.log("nonumber");
            if(!exprmode){
                //console.log("exprmode=false")
                try{
                    let final = new Roll(expr);
                    await final.evaluate({async: true});

                    //final.roll();
                    //console.log(final);

                    if(isNaN(final.total)||final.total==null||final.total===false)
                    {
                        toreturn = expr;
                    }
                    else{
                        toreturn = final.total;
                    }

                    //console.log(toreturn);
                }
                catch(err){
                    //console.log("Following Roll expression can not parse to number. String returned");
                    //console.log(expr);
                    //ui.notifications.warn("Roll expression can not parse to number");
                    toreturn = expr;
                }

            }

            else{

                //PARSE BOOL
                if(expr == "false"){
                    expr=false;
                }

                if(expr=="true"){
                    expr=true;
                }

                toreturn = expr;
            }   
        }
        else{
            if(exprmode)
                toreturn = expr;
        }
        //console.log(toreturn);
        return toreturn;
    }

    static getParenthesString(expr){
        let openpar = 0;
        let closedpar = -1;
        let parsed = false;
        let finalexpr = "";

        for(let i=0;i<expr.length;i++){
            if(!parsed){
                if(expr.charAt(i)==='(')
                    openpar +=1;
                if(expr.charAt(i)===')')
                    closedpar +=1;

                if(openpar == closedpar){
                    parsed = true;
                }
                else{
                    finalexpr += expr.charAt(i);
                }

            }

        }

        return finalexpr;
    }

    static getBracketsString(expr){
        let openpar = 0;
        let closedpar = -1;
        let parsed = false;
        let finalexpr = "";

        for(let i=0;i<expr.length;i++){
            if(!parsed){
                if(expr.charAt(i)==='[')
                    openpar +=1;
                if(expr.charAt(i)===']')
                    closedpar +=1;

                if(openpar == closedpar){
                    parsed = true;
                }
                else{
                    finalexpr += expr.charAt(i);
                }

            }

        }

        return finalexpr;
    }

    static dynamicSort(property){
        var sortOrder = 1;
        if(property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a,b) {
            /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        }
    }

    static async rollToMenu(html=null){

        if(!game.settings.get("sandbox", "showLastRoll"))
            return;

        //console.log("rolling to menu");
        let hotbar = await document.getElementsByClassName("dcroll-bar");

        if (hotbar[0]==null)
            return;

        //hotbar[0].className = "flexblock-left-nopad";

        let prevmenu = $(hotbar).find(".roll-menu");

        if(prevmenu!=null)
            prevmenu.remove();

        let tester = document.createElement("DIV");

        if(html==null){
            let lastmessage;
            let found = false;

            for(let i=game.messages.size-1;i>=0;i--){
                let amessage = game.messages.contents[i];
                if(!found){
                    if(amessage.data.content.includes("roll-template")){
                        found=true;
                        lastmessage =amessage;
                    }

                }

            }


            if(lastmessage==null)
                return;
            let msgContent = lastmessage.data.content;

            tester.innerHTML = msgContent;
        }

        else{
            tester.innerHTML = html;
        }

        let trashcan = await tester.getElementsByClassName("roll-delete-button");
        if(trashcan!=null)
            if(trashcan.style!=null)
                trashcan[0].style.display="none";

        let rollextra = tester.querySelector(".roll-extra");
        rollextra.style.display="none";


        let rollMenu = document.createElement("DIV");
        rollMenu.className = "roll-menu";
        rollMenu.innerHTML = tester.innerHTML;
        //console.log("appending");

        hotbar[0].appendChild(rollMenu);
    }

}

