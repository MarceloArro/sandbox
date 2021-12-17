import { SBOX } from "./config.js";
import { auxMeth } from "./auxmeth.js";

export class gItem extends Item {

    prepareData() {
        super.prepareData();

        // Get the Actor's data object
        const itemData = this.data;
        const data = itemData.data;
        const flags = itemData.flags;

        if (!hasProperty(data.attributes, "name") && itemData.type == "cItem") {
            setProperty(data.attributes, "name", itemData.name);
        }
        if (!hasProperty(flags, "scrolls")) {
            setProperty(flags, "scrolls", {});
        }

    }

    //Overrides update method
    async update(data, options = {}) {
        //console.log(data);
        // Get the Actor's data object
        return super.update(data, options);

    }

    async _preUpdate(updateData, options, userId) {
        //console.log(updateData);
        if (updateData.name) {
            setProperty(updateData, "data", {});
            setProperty(updateData.data, "attributes", {});
            setProperty(updateData.data.attributes, "name", updateData.name);
        }
    }

    async _preCreate(createData, options, userId) {
        await super._preCreate(createData, options, userId);
        let image = "";
        if (this.data.img == 'icons/svg/item-bag.svg') {
            if (this.type == "cItem") {
                image = "systems/sandbox/docs/icons/sh_citem_icon.png";


            }

            if (this.type == "sheettab") {
                image = "systems/sandbox/docs/icons/sh_tab_icon.png";
            }

            if (this.type == "group") {
                image = "systems/sandbox/docs/icons/sh_group_icon.png";
            }

            if (this.type == "panel") {
                image = "systems/sandbox/docs/icons/sh_panel_icon.png";
            }

            if (this.type == "multipanel") {
                image = "systems/sandbox/docs/icons/sh_panel_icon.png";
            }

            if (this.type == "property") {
                image = "systems/sandbox/docs/icons/sh_prop_icon.png";
            }

            if (image != "")
                this.data.update({ img: image });
        }

        if (createData.type == "cItem")
            if (createData.data != null)
                if (createData.data.ciKey != null)
                    if (createData.data.ciKey != "") {
                        let is_here = game.items.filter(y => Boolean(y.data.data.ciKey)).find(y => y.data.data.ciKey == createData.data.ciKey && y.data.name != createData.name);

                        if (is_here) {

                            await this.data.update({ "data.ciKey": "" });
                        }

                    }

    }



}