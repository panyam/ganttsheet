var TRACKERS_BY_SHEET = {};

class Tracker {
    constructor(sheet, properties) {
        this.sheet = sheet;
        this.sheetId = sheet.getSheetId();
        this._calendarView = null;
        this._daterange = null;
        this._properties = properties || null;
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
            calendarView.renderBackground(rowOffset, 1, true);
            calendarView.renderWeekends(rowOffset, 1);
        }
        calendarView.commit();

        var properties = this.properties;
        var updatedTaskDates = this.sheet.getRange(calendarView.firstRow,
                                                   properties.taskStartDateCol,
                                                   1 + lastRow - firstRow, 2).getValues();
        Logger.log("UTD: ", updatedTaskDates);
        for (var currRow in updatedTaskRows) {
            currRow = parseInt(currRow);
            var rowOffset = currRow - firstRow;
            var taskRange = valuesToDateRange(updatedTaskDates[rowOffset][0],
                                              updatedTaskDates[rowOffset][1], true);
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
            this._properties = loadSheetProperties(this.sheetId);
          Logger.log("Loaded Properties: ", this._properties);
        }
        return this._properties;
    }

    /**
     * Extracts the calendar date range to be rendered in the given sheet.
     */
    get daterange() {
        if (this._daterange == null) {
            var properties = this.properties;
            var calStartValue = this.sheet.getRange(properties.calendarStartRow + 1,
                                                    properties.calendarStartCol).getValue();
            var calEndValue = this.sheet.getRange(properties.calendarEndRow + 1,
                                                  properties.calendarEndCol).getDisplayValue();
            var daterange = valuesToDateRange(calStartValue, calEndValue, true);
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

    get calendarView() {
        if (this._calendarView == null) {
            var properties = this.properties;
            var daterange = this.daterange;
            this._calendarView = new CalendarView(this.sheet,
                                                  properties.calendarDisplayRow,
                                                  properties.calendarDisplayCol,
                                                  daterange, 
                                                  properties);
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
        calendarView.clear(lastRow);

        var properties = this.properties;
        var numRows = lastRow - (properties.calendarDisplayRow + 3);
        calendarView.repaint(numRows);
        Logger.log("Repaint Commint Time: ", calendarView.commit());
        sheet.setColumnWidths(calendarView.startCol, calendarView.daterange.numDays + 3, 20)

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

    redrawProject(reset_dates) {
        var sheet = this.sheet;
        var lastRow = sheet.getLastRow(); 
        var properties = this.properties;
        sheet.getRange(1, 1).setFontWeight("bold").setHorizontalAlignment("center").setValue("Calendar Start");
        sheet.getRange(1, 2).setFontWeight("bold").setHorizontalAlignment("center").setValue("Calendar End");
      
        var startDate = new Date();
        startDate.setDate(1);
        var endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 5);
        endDate.setDate(endDate.getMonth() == 1 ? 28 : 30);

        var dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
        sheet.getRange(2, 1)
        .setHorizontalAlignment("center")
        .setValue(startDate)
        .setDataValidation(dateRule)
        .setNumberFormat("M/d/yy");
        sheet
        .getRange(2, 2)
        .setHorizontalAlignment("center")
        .setValue(endDate)
        .setDataValidation(dateRule)
        .setNumberFormat("M/d/yy");

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

function removeTrackerForSheet(sheet) {
    var sheetId = sheet.getSheetId();
    // SpreadsheetApp.getActiveSpreadsheet().deleteSheet(sheet);
    // remove all properties for this sheet
    // remove all properties
    delete TRACKERS_BY_SHEET[sheetId];
}

/**
 * Return the Tracker for a particular sheet.
 */
function getTrackerForSheet(sheet) {
  var sheetId = sheet.getSheetId();
  if (sheetId in TRACKERS_BY_SHEET) {
    return TRACKERS_BY_SHEET[sheetId];
  }
  var properties = loadSheetProperties(sheetId);
  if (properties == null) {
    return null;
  }
  var newTracker = new Tracker(sheet, properties);
  TRACKERS_BY_SHEET[sheetId] = newTracker;
  return newTracker;
}

function saveTrackerForSheet(sheet, properties) {
    var sheetId = sheet.getSheetId();
    var newTracker = getTrackerForSheet(sheet);
    var isNew = false;
    if (newTracker == null) {
        isNew = true;
        newTracker = new Tracker(sheet);
        TRACKERS_BY_SHEET[sheetId] = newTracker;
        saveSheetProperties(sheetId, DefaultProperties);
    }
    saveSheetProperties(sheetId, properties);
    newTracker._properties = null;
    newTracker.redrawProject(isNew)
    newTracker.redrawCalendar()
    return newTracker;
}

/**
 * Gets the properties of the active sheet.
 */
function loadTrackerProperties() {
  var tracker = getActiveTracker();
  if (tracker != null) {
      return tracker.properties;
  }
  else {
    return DefaultProperties;
  }
}

function saveActiveTrackerProperties(properties) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var tracker = saveTrackerForSheet(sheet, properties);
  Logger.log("TPBS: ", TRACKERS_BY_SHEET);
  return {'sheet': sheet.getSheetId(), 'properties': tracker.properties};
}

