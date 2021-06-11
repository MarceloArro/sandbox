import { SBOX } from "./config.js";
import { auxMeth } from "./auxmeth.js";

export class gItem extends Item{

    prepareData(){     
        super.prepareData();

        // Get the Actor's data object
        const itemData = this.data;
        const data = itemData.data;
        const flags = itemData.flags;

        if(!hasProperty(data.attributes,"name") && itemData.type=="cItem"){
            setProperty(data.attributes,"name",itemData.name);
        }
        if (!hasProperty(flags, "scrolls")){
            setProperty(flags,"scrolls", {});
        }

    }

    //Overrides update method
    async update(data, options={}) {
        //console.log(data);
        // Get the Actor's data object
        return super.update(data, options);

    }

    async _preCreate(createData, options, userId) {
        await super._preCreate(createData, options, userId);
        let image="";
        if (this.data.img == 'icons/svg/item-bag.svg') {
            if(this.type=="cItem"){
                image="systems/sandbox/docs/icons/sh_citem_icon.png";


            }

            if(this.type=="sheettab"){
                image="systems/sandbox/docs/icons/sh_tab_icon.png";
            }

            if(this.type=="group"){
                image="systems/sandbox/docs/icons/sh_group_icon.png";
            }

            if(this.type=="panel"){
                image="systems/sandbox/docs/icons/sh_panel_icon.png";
            }

            if(this.type=="multipanel"){
                image="systems/sandbox/docs/icons/sh_panel_icon.png";
            }

            if(this.type=="property"){
                image="systems/sandbox/docs/icons/sh_prop_icon.png";
            }

            if(image!="")
                this.data.update({ img: image });
        }
    }

}