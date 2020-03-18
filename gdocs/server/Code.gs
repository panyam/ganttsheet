
function onChange(e) {
  Logger.log("On Change: ", e);
}

function onInstall(e) {
    onOpen();
}

function onOpen() {
//    SpreadsheetApp.getUi()
//    .createMenu('Project Plan')
//    .addItem("Refresh Calendar", "redrawCalendar")
//    .addToUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    Logger.log("Active Sheet: ", activeSheet);
    SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem("Start", "showStartDialog")
    .addItem("Refresh", "refreshTracker")
    .addItem("Reset", "clearCurrentSheet")
    .addToUi();
}

/**
 * Called when a cell is edited.
 */
function onEdit(e) {
    var tracker = getActiveTracker()
    if (tracker == null) {
      Logger.log("Active Tracker not found: ", tracker, TRACKERS_BY_SHEET);
      return ;
    }
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

function refreshTracker() {
    var tracker = getActiveTracker()
    if (tracker == null) {
      SpreadsheetApp.getUi().alert("You have not yet created a tracker for this sheet.  Click on Add-ons > Gantt Sheet > Start");
    } else {
      tracker.redrawProject();
      tracker.redrawCalendar();
    }
}

/**
 * Clear the current sheet erasing everythign.  The tracker associated with the current sheet is also removed.
 */
function clearCurrentSheet() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert("All data, formulas and formatting will be reset.  Are you sure?", ui.ButtonSet.YES_NO);
  if (result == ui.Button.NO) {
    return ;
  }
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  removeTrackerForSheet(sheet);
  sheet.clear();
}

function showStartDialog() {
  var html = HtmlService.createTemplateFromFile("main")
    .evaluate()
    .setTitle("Gantt Sheet - Options"); // The title shows in the sidebar
  SpreadsheetApp.getUi().showModalDialog(html, "Start Tracker in this Sheet"); // userInterface, title)showSidebar(html);
}
