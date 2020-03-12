
function onInstall() {
    onOpen();
}

function onOpen() {
//    SpreadsheetApp.getUi()
//    .createMenu('Project Plan')
//    .addItem("Refresh Calendar", "regenerateCalendar")
//    .addToUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    Logger.log("Active Sheet: ", activeSheet);
    SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem("Start", "showSidebar")
    .addSeparator()
    .addToUi();
}

/**
 * Called when a cell is edited.
 */
function onEdit(e) {
    var tracker = getActiveTracker()
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

function getActiveTracker() {
    var ss=SpreadsheetApp.getActiveSpreadsheet()
    var activeSheet=ss.getActiveSheet();
    return getTrackerForSheet(activeSheet);
}

function regenerateCalendar() {
    var tracker = getActiveTracker()
    tracker.redrawCalendar();
}

function showSidebar() {
  var html = HtmlService.createTemplateFromFile("main")
    .evaluate()
    .setTitle("Project Tracker - Options"); // The title shows in the sidebar
  SpreadsheetApp.getUi().showSidebar(html);
}

function createNewTracker() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var newSheet = ss.insertSheet();
    var tracker = getTrackerForSheet(newSheet);
    tracker.redrawCalendar();
}

