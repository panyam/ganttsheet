
/**
 * Holds info about date ranges.
 */
class DateRange {
    constructor(startDate, endDate) {
        this.startDate = startDate;
        this.endDate = endDate;
        
        this.startingDayOfWeek = startDate.getDay()
        
        var dayDiff = endDate.getTime() - startDate.getTime();
        this._numDays = Math.round((dayDiff / (1000 * 3600 * 24)));
        // this._numDays = endDate.getDate() - startDate.getDate();
    }
    
    get numDays() {
        return this._numDays;
    }
    
    offsetForDate(otherDate) {
        var offsetRange = new DateRange(this.startDate, otherDate);
        return offsetRange.numDays;
    }
}
