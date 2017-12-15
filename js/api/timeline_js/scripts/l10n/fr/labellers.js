/*==================================================
 *  Localization of labellers.js
 *==================================================
 */

Timeline.GregorianDateLabeller.monthNames["fr"] = [
    "Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Jui", "Aou", "Sep", "Oct", "Nov", "Dec"
];

Timeline.GregorianDateLabeller.dayNames["fr"] = [
    "Dim", "Lu", "Ma", "Me", "Je", "Ve", "Sa"
];

Timeline.GregorianDateLabeller.labelIntervalFunctions["fr"] = function(date, intervalUnit) {
    var text;
    var emphasized = false;

    var date2 = Timeline.DateTime.removeTimeZoneOffset(date, this._timeZone);
    
    switch(intervalUnit) {
	case Timeline.DateTime.HOUR:
	case Timeline.DateTime.TRIHOUR:
    case Timeline.DateTime.QUARTERDAY:
		var h = date.getUTCHours();
		if (h == 0){
			text = date2.getUTCDate() + " " + Timeline.GregorianDateLabeller.getMonthName(date2.getUTCMonth(), this._locale);
			//emphasized = true;
		}
		else{
			text = date.getUTCHours() + "h";
		}
        break;
    case Timeline.DateTime.DAY:
    case Timeline.DateTime.WEEK:
		text = date2.getUTCDate() + " " + Timeline.GregorianDateLabeller.getMonthName(date2.getUTCMonth(), this._locale);
        break;
    default:
        return this.defaultLabelInterval(date, intervalUnit);
    }
    
    return { text: text, emphasized: emphasized };
};
