class CalendarView {
    constructor(sheet, startRow, startCol, daterange, configs) {
        configs = configs || {};
        this.sheet = sheet;
        this.startRow = startRow;
        this.startCol = startCol;
        this.daterange = daterange;
        this.borderBGColor = configs.borderBGColor;
        this.weekdayBGColor = configs.weekdayBGColor;
        this.weekendBGColor = configs.weekendBGColor;
        this.highlightBGColor = configs.highlightBGColor;
        this.monthBGColors = configs.monthBGColors;
        this.monthLabels = configs.monthLabels;
        this.weekdayLabels = configs.weekdayLabels;
        this.transaction = new Transaction();
    }

    getMonthLabel(month) {
        return this.monthLabels[month];
    }

    getMonthBGColor(month) {
        return this.monthBGColors[month % this.monthBGColors.length];
    }
    
    get firstRow() {
        return this.startRow + 3
    }
    
    /**
     * Clears the background and readies for repainting.
     */
    clear(numRows) {
        var maxCol = this.sheet.getMaxColumns();
        if (maxCol >= this.startCol) {
            this.sheet.getRange(this.startRow, this.startCol, numRows, 1 + maxCol - this.startCol).clear()
        }
    }
    
    repaint(numRows) {
        this.renderBackground(0, Math.max(numRows, 3) , true);
        this.renderWeekends(0, Math.max(numRows, 3));
        this.renderHeader();
    }

    /**
     * Renders the background of the calendar for a given number of rows starting from a particular row.
     */
    renderBackground(firstRowOffset, numRows, paintBorder) {
        var transaction = this.transaction;
        var startRow = this.startRow + firstRowOffset;
        transaction
        .withRange(new CellRange(startRow, this.startCol + 1, numRows, this.daterange.numDays + 1))
        .clearContent()
        .setBackground(this.weekdayBGColor);

        if (paintBorder) {
            transaction
            .withRange(new CellRange(startRow, this.startCol, numRows, 1))
            .setBackground(this.borderBGColor)
            .clearContent()
            transaction
            .withRange(new CellRange(startRow, this.startCol + this.daterange.numDays + 2, numRows, 1))
            .setBackground(this.borderBGColor)
            .clearContent()
        }
    }
    
    get numDays() {
        return this.daterange.numDays;
    }
    
    get startDate() {
        return this.daterange.startDate;
    }
    
    get endDate() {
        return this.daterange.endDate;
    }

    /**
     * Highlights the weekends
     */
    renderWeekends(firstRowOffset, numRows) {
        var transaction = this.transaction;
        var startDay = this.daterange.startingDayOfWeek;
        var startRow = this.startRow + firstRowOffset;
        
        for (var i = 0;i <= this.numDays;i++) {
            var currDay = (i + startDay) % 7;
            if (currDay == 0 || currDay == 6) {
                transaction.withRange(new CellRange(startRow, 1 + this.startCol + i, numRows, 1))
                .setBackground(this.weekendBGColor);
            }
        }
    }


    /**
     * Renders the header of this DateRange as a "Calendar"
     */
    renderHeader() {
        var transaction = this.transaction;
        var calMonthRow = this.startRow;
        var calDayOfWeekRow = this.startRow + 1;
        var calDayOfMonthRow = this.startRow + 2;
        
        var currDate = new Date(this.startDate);
        Logger.log("Start Date: ", currDate);
        var col = 1;
        var numColumns = this.numDays;
        var currCol = this.startCol + 1;
        var lastMonthStartCol = currCol;
        var month = currDate.getMonth();
        
        transaction.withRange(new CellRange(calDayOfMonthRow, 1 + this.startCol, 2, numColumns + 1))
        .setHorizontalAlignment("center");
        
        for (;col <= numColumns;col++, currCol++) {    
            var dayOfMonth = currDate.getDate();
            var dayOfWeek = currDate.getDay();
            month = currDate.getMonth();
            
            transaction.withRange(new CellRange(calDayOfMonthRow, currCol)).setValue(dayOfMonth);
            transaction.withRange(new CellRange(calDayOfWeekRow, currCol)).setValue(this.weekdayLabels[dayOfWeek]);
            
            // Set month label
            if (col == 0 || dayOfMonth == 1) {
                transaction.withRange(new CellRange(calMonthRow, currCol))
                .setValue(this.getMonthLabel(month))
                .setHorizontalAlignment("left")
                // r.setTextStyle(new TextStyle().setBold(true));
            }
            
            // Set BG color for month labels
            if (dayOfMonth == 1 && currCol > lastMonthStartCol) {
                var monthBG = this.monthBGColors[month % this.monthBGColors.length];
                // Logger.log("Month: " + month + ", MonthBG: "+ monthBG);
                transaction.withRange(new CellRange(calMonthRow, lastMonthStartCol, 1, currCol - lastMonthStartCol))
                .setBackground(monthBG);
            }
            
            if (dayOfMonth == 1) {
                lastMonthStartCol = currCol;
            }
            
            if (dayOfWeek == 0 || dayOfWeek == 6) {
                //dayOfWeekCell.setBackground("RED");
                //dayOfMonthCell.setBackground("RED");
            }
            currDate.setDate(currDate.getDate() + 1)
        }
        // Set BG color for last month
        if (currCol > lastMonthStartCol) {
            var month = currDate.getMonth();
            var monthBG = this.getMonthBGColor(month);
            transaction.withRange(new CellRange(calMonthRow, lastMonthStartCol, 1, currCol - lastMonthStartCol))
            .setBackground(monthBG);
        }
    }
    
    commit() {
        var d1 = new Date();
        this.transaction.apply(this.sheet);
        this.transaction = new Transaction();
        return new Date() - d1;
    }
    
    rollback() {
        this.transaction = new Transaction();
    }
    
    highlightRange(range, rowOffset) {
        if (range == null || typeof(range) === "undefined") return;
        var startDate = range.startDate;
        var endDate = range.endDate;
        if (startDate >= endDate) return ;
        if (startDate > this.endDate) return ;
        if (endDate < this.startDate) return ;
        if (startDate <= this.startDate) startDate = this.startDate;
        if (endDate >= this.endDate) endDate = this.endDate;
        
        var startRow = this.firstRow + rowOffset;
        var startCol = 1 + this.startCol + this.daterange.offsetForDate(startDate)
        var endCol   = 1 + this.startCol + this.daterange.offsetForDate(endDate)
        this.transaction.withRange(new CellRange(startRow, startCol, 1, 1 + endCol - startCol))
        .setBackground(this.highlightBGColor);
    }
}
