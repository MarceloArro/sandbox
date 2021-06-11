export class sToken extends TokenDocument{

    getBarAttribute(barName, options) {
        const attr = super.getBarAttribute(barName, options);
        if ( attr !== null ) attr.editable = true;
        return attr;
    }

}