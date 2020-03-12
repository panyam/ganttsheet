var TRACKERS_BY_SHEET = {};

var Tracker = function(sheet) {
    this.sheet = sheet;
    this.sheetId = sheet.getSheetId();
    this._calendarView = null;
    this._daterange = null;
    this._properties = null;

    this.isDaterangeCell = function(row, col) {
        var properties = this.properties();
        return ((row == properties.calendarStartRow + 1 && col == properties.calendarStartCol) || 
            (row == properties.calendarEndRow + 1 && col == properties.calendarEndCol));
    }

    this.taskRowsInRange = function(row, col, numRows, numCols) {
        var updatedTaskRows = {}
        var stop = false;
        var properties = this.properties();
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

    this.highlightTaskRows = function(updatedTaskRows) {
        var calendarView = this.calendarView
        if (calendarView == null) return ;

        var firstRow = this.calendarView.firstRow;
        var lastRow = this.sheet.getLastRow();

        for (var currRow in updatedTaskRows) {
            currRow = parseInt(currRow);
            var rowOffset = currRow - calendarView.startRow;
            calendarView.renderBackground(rowOffset, 1, true);
            calendarView.renderWeekends(rowOffset, 1);
        }
        calendarView.commit();

        var properties = this.properties();
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

    this.getTaskRange = function(row) {
        var properties = this.properties();
        var taskStartValue = this.sheet.getRange(row, properties.taskStartDateCol).getValue();
        var taskEndValue = this.sheet.getRange(row, properties.taskEndDateCol).getValue();
        return valuesToDateRange(taskStartValue, taskEndValue);
    }

    this.properties = function() {
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

    this.saveProperties = function() {
        var properties = this.properties();
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
    this.daterange = function() {
        if (this._daterange == null) {
            var properties = this.properties();
            var calStartValue = this.sheet.getRange(properties.calendarStartRow + 1,
                                                    properties.calendarStartCol).getValue();
            var calEndValue = this.sheet.getRange(properties.calendarEndRow + 1,
                                                  properties.calendarEndCol).getValue();
            var calStartDate = new Date(calStartValue);
            var calEndDate = new Date(calEndValue);
            Logger.log("StartVal: " + calStartValue + ", Date: " + calStartDate);
            Logger.log("EndVal: " + calEndValue + ", Date: " + calEndDate);
            var daterange = new DateRange(calStartDate, calEndDate);
            if (daterange.numDays > properties.maxDaterangeDays) {
                var ui = SpreadsheetApp.getUi();
                var result = ui.alert('Invalid date range',
                                      "The date range is too large.  " +
                                      "The calendar (for now) can only show " + 
                                      properties.maxDaterangeDays + ' days', ui.ButtonSet.OK);
                return null;
            }
            this._daterange = daterange;
        }
        return this._daterange;
    }

    this.calendarView = function() {
        if (this._calendarView == null) {
            var properties = this.properties()
            var daterange = this.daterange()
            this._calendarView = new CalendarView(this.sheet,
                                                  properties.calendarDisplayRow,
                                                  properties.calendarDisplayCol,
                                                  daterange, 
                                                  properties);
        }
        return this._calendarView;
    }

    this.redrawCalendar = function() {
        var calendarView = this.calendarView;
        var sheet = this.sheet;
        var lastRow = sheet.getLastRow(); 

        if (calendarView == null) {
            throw new Error("Calendar view not found");
        }

        // update all tasks
        Logger.log("Last Row: " + lastRow, "Calendar: ", calendarView);
        calendarView.clear(lastRow);

        var properties = this.properties();
        var numRows = lastRow - (properties.calendarDisplayRow + 3);
        calendarView.repaint(numRows);
        Logger.log("Repaint Commint Time: ", calendarView.commit());
        sheet.setColumnWidths(calendarView.startCol, calendarView.daterange().numDays + 3, 20)

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

    this.redrawProject = function() {
        var sheet = this.sheet;
        var lastRow = sheet.getLastRow(); 
        var properties = this.properties();
        sheet.getRange(1, 1, 2, 2).setFontWeight("bold").setHorizontalAlignment("center")
        sheet.getRange(properties.projectHeaderRow, properties.projectHeaderCol, 1, 6)
            .setValues([[
                "Project/Track", "Task", "Owner", "Status", "Start Date", "End Date"
            ]])
            .setHorizontalAlignment("center")
            .setFontWeight("bold")
    }
}

function getActiveTracker() {
    var ss=SpreadsheetApp.getActiveSpreadsheet()
    var activeSheet=ss.getActiveSheet();
    return getTrackerForSheet(activeSheet);
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

