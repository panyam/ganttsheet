
var DefaultProperties = {
  "taskStartDateCol": 5,
  "taskEndDateCol": 6,

  "borderBGColor": "black",
  "weekdayBGColor": "#d9ffcc",
  "weekendBGColor": "RED",
  "highlightBGColor": "YELLOW",
  
  "weekdayLabels": [ "S", "M", "T", "W", "T", "F", "S" ],
  "monthLabels": [ "January", "February", "March", "April", "May", "June", "July", 
              "August", "September", "October", "November", "December"],
  "monthBGColors": [ "#e6e6e6", "#ffffcc" ],
  
  "calendarStartRow": 1,
  "calendarStartCol": 1,
  "calendarEndRow": 1,
  "calendarEndCol": 2,
  "calendarDisplayRow": 1,
  "calendarDisplayCol": 8,
  "maxDaterangeDays": 180,
  
  "projectHeaderRow": 3,
  "projectHeaderCol": 1,
}

var TRACKERS_BY_SHEET = {};

class Tracker {
    constructor(sheet) {
        this.sheet = sheet;
        this.sheetId = sheet.getSheetId();
        this._calendarView = null;
        this._daterange = null;
        this._properties = null;
    }

    isDaterangeCell(row, col) {
        var properties = this.properties;
        return ((row == properties.calendarStartRow + 1 && col == properties.calendarStartCol) || 
            (row == properties.calendarEndRow + 1 && col == properties.calendarEndCol));
    }

    taskRowsInRange(row, col, numRows, numCols) {
        var updatedTaskRows = {}
        var stop = false;
        var properties = this.properties;
        for (var i = 0;i < numRows && !stop;i++) {
            for (var j = 0;j < numCols && !stop;j++) {
                var currRow = row + i;
                var currCol = col + j;
                if (currCol == properties.taskStartDateCol || currCol == properties.taskEndDateCol) {
                    updatedTaskRows[currRow] = true
                    
                    // if one task then modify all tasks - not that many anyway
                    // TODO - Make this optimal
                    stop = true;
                }
            }
        }

        var firstRow = this.calendarView.firstRow;
        var lastRow = this.sheet.getLastRow();
        Logger.log("LastRow: ", lastRow);
        for (var k = lastRow;k > firstRow;k--) {
            updatedTaskRows[k] = true
        }
        return updatedTaskRows;
    }

    highlightTaskRows(updatedTaskRows) {
        var calendarView = this.calendarView
        if (calendarView == null) return ;

        var firstRow = this.calendarView.firstRow;
        var lastRow = this.sheet.getLastRow();

        for (var currRow in updatedTaskRows) {
            currRow = parseInt(currRow);
            var rowOffset = currRow - calendarView.startRow;
            calendarView.renderBackground(rowOffset, 1);
            calendarView.renderWeekends(rowOffset, 1);
        }
        calendarView.commit();

        var updatedTaskDates = this.sheet.getRange(calendarView.firstRow,
                                                   properties.taskStartDateCol,
                                                   1 + lastRow - firstRow, 2).getValues()
        for (var currRow in updatedTaskRows) {
            currRow = parseInt(currRow);
            var rowOffset = currRow - firstRow;
            var taskRange = valuesToDateRange(updatedTaskDates[rowOffset][0],
                                              updatedTaskDates[rowOffset][1]);
            calendarView.highlightRange(taskRange, rowOffset);
        }
        calendarView.commit();
    }

    getTaskRange(row) {
        var properties = this.properties;
        var taskStartValue = this.sheet.getRange(row, properties.taskStartDateCol).getValue();
        var taskEndValue = this.sheet.getRange(row, properties.taskEndDateCol).getValue();
        return valuesToDateRange(taskStartValue, taskEndValue);
    }

    get properties() {
        if (this._properties == null) {
            this._properties = {}
            var docProps = PropertiesService.getDocumentProperties();
            for (var key in DefaultProperties) {
                var sheetKey = this.sheetId + ":" + key;
                var value = docProps.getProperty(sheetKey);
                if (value || null) {
                    value = JSON.parse(value);
                }
                this._properties[key] = value || DefaultProperties[key];
            }
        }
        return this._properties;
    }

    saveProperties() {
        var properties = this.properties;
        out = {};
        for (var key in DefaultProperties) {
            var sheetKey = this.sheetId + ":" + key;
            var value = properties[key];
            out[key] = JSON.stringify(value)
        }
        var docProps = PropertiesService.getDocumentProperties();
        docProps.setProperties(out);
    }

    /**
     * Extracts the calendar date range to be rendered in the given sheet.
     */
    get daterange() {
        if (this._daterange == null) {
            var calStartValue = this.sheet.getRange(this.properties.calendarStartRow + 1,
                                                    this.properties.calendarStartCol).getValue();
            var calEndValue = this.sheet.getRange(this.properties.calendarEndRow + 1,
                                                  this.properties.calendarEndCol).getValue();
            var calStartDate = new Date(calStartValue);
            var calEndDate = new Date(calEndValue);
            Logger.log("StartVal: " + calStartValue + ", Date: " + calStartDate);
            Logger.log("EndVal: " + calEndValue + ", Date: " + calEndDate);
            var daterange = new DateRange(calStartDate, calEndDate);
            if (daterange.numDays > this.properties.maxDaterangeDays) {
                var ui = SpreadsheetApp.getUi();
                var result = ui.alert('Invalid date range',
                                      "The date range is too large.  " +
                                      "The calendar (for now) can only show " + 
                                      this.properties.maxDaterangeDays + ' days', ui.ButtonSet.OK);
                return null;
            }
            this._daterange = daterange;
        }
        return this._daterange;
    }

    get calendarView() {
        if (this._calendarView == null) {
            this._calendarView = new CalendarView(this.sheet,
                                                  this.properties.calendarDisplayRow,
                                                  this.properties.calendarDisplayCol,
                                                  this.daterange, 
                                                  this.properties);
        }
        return this._calendarView;
    }

    redrawCalendar() {
        var calendarView = this.calendarView;
        var sheet = this.sheet;
        var lastRow = sheet.getLastRow(); 

        if (calendarView == null) {
            throw new Error("Calendar view not found");
        }

        // update all tasks
        Logger.log("Last Row: " + lastRow, "Calendar: ", calendarView);
        calendarView.clear(lastRow);

        var properties = this.properties;
        var numRows = lastRow - (properties.calendarDisplayRow + 3);
        calendarView.repaint(numRows);
        Logger.log("Repaint Commint Time: ", calendarView.commit());
        sheet.setColumnWidths(calendarView.startCol - 1, calendarView.daterange.numDays + 3, 20)

        if (numRows > 0) {
            var readtime = 0;
            var d1 = new Date();
            var taskCells = sheet.getRange(properties.projectHeaderRow + 1,
                                           properties.taskStartDateCol,
                                           lastRow - properties.projectHeaderRow - 1,
                                           2).getValues();
            Logger.log("Num Rows: ", taskCells.length);
            for (var i = 0;i < taskCells.length;i++) {
                var taskRange = valuesToDateRange(taskCells[i][0], taskCells[i][1]);
                calendarView.highlightRange(taskRange, i);
            }
            Logger.log("Highlight Commit Time: ", calendarView.commit());
        }
    }

    redrawProject() {
        var sheet = this.sheet;
        var lastRow = sheet.getLastRow(); 
        var properties = this.properties;
        sheet.getRange(1, 1, 2, 2).setFontWeight("bold").setHorizontalAlignment("center")
        sheet.getRange(properties.projectHeaderRow, properties.projectHeaderCol, 1, 6)
            .setValues([[
                "Project/Track", "Task", "Owner", "Status", "Start Date", "End Date"
            ]])
            .setHorizontalAlignment("center")
            .setFontWeight("bold")
    }
}

class CellRange {
    constructor() {
        this.entries = [];
        if (arguments.length == 1) {    // A single A1 notation cell
            this.entries.push(arguments[0])
        } else if (arguments.length == 2) {    // A single row,col pair
            this.entries.push(rc2name(arguments[0], arguments[1]));
        } else if (arguments.length == 4) {    // A row, col, nRows, nCols range
            var row = arguments[0];
            var col = arguments[1];
            var numRows = arguments[2];
            var numCols = arguments[3];
            this.entries.push(rc2name(row, col) + ":" + rc2name(row + numRows - 1, col + numCols - 1));
        } else if (arguments.length > 0) {
            throw new Error("Invalid number of arguments to Range constructor: ", arguments);
        }
    }
    
    addCell(row, col) {
        this.entries.push([row, col]);
    }
    
    addCells(row, col, numRows, numCols) {
        this.entries.push([row, col, numRows, numCols]);
    }

    addA1Cells() {
        for (var i = 0;i < arguments.length;i++) {
            this.entries.push(arguments[i]);
        }
    }
    
    extend(another) {
        this.entries = this.entries.concat(another.entries);
    }
}

class Transaction {
    constructor() {
        this.reset();
    }
    
    rollback() {
        this.reset();
    }
    
    reset() {
        this.currentRange = null;
        this.commands = {
            "clearContent": new CellRange(),
            "setBGByColor": {},
            "setHorizontalAlignment": {},
            "setValue": {},
        }
    }
    
    withRange(newRange) {
        this.currentRange = newRange;
        return this;
    }

    setBackground(color) {
        return this.ensureAndPush("setBGByColor", color)
    }
    
    setHorizontalAlignment(align) {
        return this.ensureAndPush("setHorizontalAlignment", align)
    }
    
    clearContent() {
        this.commands["clearContent"].extend(this.currentRange);
        return this;
    }
    
    setValue(value) {
        return this.ensureAndPush("setValue", value)
    }
    
    ensureAndPush(cmd, key) {
        if (!(key in this.commands[cmd]))
            this.commands[cmd][key] = new CellRange();
        this.commands[cmd][key].extend(this.currentRange);
        return this;
    }
    
    forEach(sheet, cmd, callback) {
        var entries = this.commands[cmd];
        for (var key in entries) {
            var value = entries[key].entries;
            if (value.length > 0) {
                var ranges = sheet.getRangeList(value);
                callback(key, ranges);
            }
        }
    }
    
    apply(sheet) {
        if (this.commands["clearContent"].entries.length > 0) {
            sheet.getRangeList(this.commands["clearContent"].entries).clearContent();
        }
        this.forEach(sheet, "setBGByColor", function(color, ranges) {
            ranges.setBackground(color);
        });
        this.forEach(sheet, "setValue", function(value, ranges) {
            ranges.setValue(value);
        });
        this.forEach(sheet, "setHorizontalAlignment", function(value, ranges) {
            ranges.setHorizontalAlignment(value);
        });
    }
}

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
        if (maxCol > this.startCol) {
            this.sheet.getRange(this.startRow, this.startCol, numRows, maxCol - this.startCol).clear()
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
        .withRange(new CellRange(startRow, this.startCol, numRows, this.daterange.numDays + 1))
        .clearContent()
        .setBackground(this.weekdayBGColor);

        if (paintBorder) {
            var currCol = this.startCol + this.daterange.numDays + 1;
            transaction
            .withRange(new CellRange(startRow, currCol, numRows, 1))
            .setBackground(this.borderBGColor)
            .clearContent()
            transaction
            .withRange(new CellRange(startRow, this.startCol - 1, numRows, 1))
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
                transaction.withRange(new CellRange(startRow, this.startCol + i, numRows, 1))
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
        var col = 0;
        var numColumns = this.numDays;
        var currCol = this.startCol;
        var lastMonthStartCol = this.startCol;
        var month = currDate.getMonth();
        
        transaction.withRange(new CellRange(calDayOfMonthRow, this.startCol, 2, numColumns + 1))
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
        var startCol = this.startCol + this.daterange.offsetForDate(startDate)
        var endCol     = this.startCol + this.daterange.offsetForDate(endDate)
        this.transaction.withRange(new CellRange(startRow, startCol, 1, 1 + endCol - startCol))
        .setBackground(this.highlightBGColor);
    }
}


//////////// Helper utility functions

function valuesToDateRange(taskStartValue, taskEndValue) {
    var taskStartDate = new Date(taskStartValue);
    var taskEndDate = new Date(taskEndValue);
    if (taskStartDate.getTime() !== taskStartDate.getTime()) return null;
    if (taskEndDate.getTime() !== taskEndDate.getTime()) return null;
    return new DateRange(taskStartDate, taskEndDate);
}

function col2name(col) {
    var ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var out = "";
    
    while (col > 0) {
        var rem = col % 26;
        if (rem == 0) {
            out = "Z" + out;
            col = Math.floor(col / 26) - 1;
        } else {
            out = ALPHABETS[rem - 1] + out;
            col = Math.floor(col / 26);
        }
    }
    if (out == "") throw new Exception("Column must be > 0");
    return out;
}

function rc2name(row, col) {
    if (row < 0 || col < 0) {
        throw new Exception("Invalid row/col: " + row + ", " + col);
    }
    return col2name(col) + row;
}

/**
 * Return the Tracker for a particular sheet.
 */
function getTrackerForSheet(sheet) {
    var sheetId = sheet.getSheetId();
    if (!(sheetId in TRACKERS_BY_SHEET)) {
        TRACKERS_BY_SHEET[sheetId] = new Tracker(sheet);
    }
    return TRACKERS_BY_SHEET[sheetId];
}

//////////////


function onInstall() {
  onOpen();
}

function onOpen() {
//  SpreadsheetApp.getUi()
//  .createMenu('Project Plan')
//  .addItem("Refresh Calendar", "regenerateCalendar")
//  .addToUi();
  
  SpreadsheetApp.getUi()
  .createAddonMenu()
  .addItem("Show Options", "showSidebar")
  .addItem("Refresh Calendar", "regenerateCalendar")
  .addToUi();

}

/**
 * Called when a cell is edited.
 */
function onEdit(e) {
    var ss=SpreadsheetApp.getActiveSpreadsheet()
    var activeSheet=ss.getActiveSheet();
    var tracker = getTrackerForSheet(activeSheet);
    var col = e.range.getColumn();
    var row = e.range.getRow();
    var numRows = e.range.getNumRows();
    var numCols = e.range.getNumColumns();
    
    Logger.log("Curr Row: " + row + ", Curr Col: " + col);
    if (tracker.isDaterangeCell(row, col)) {
        tracker.redrawCalendar();
    } else {
        // var formulas = range.getFormulas();
        var updatedTaskRows = tracker.taskRowsInRange(row, col, numRows, numCols);
        tracker.highlightTaskRows(updatedTaskRows);
    }
}


function regenerateCalendar() {
    var ss=SpreadsheetApp.getActiveSpreadsheet()
    var activeSheet=ss.getActiveSheet();
    var tracker = getTrackerForSheet(activeSheet);
    tracker.redrawCalendar();
}

function showSidebar() {
  var html = HtmlService.createTemplateFromFile("main")
    .evaluate()
    .setTitle("Project Tracker - Options"); // The title shows in the sidebar
  SpreadsheetApp.getUi().showSidebar(html);
}

