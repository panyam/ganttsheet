
//////////// Helper utility functions

var CURRENT_USER_TZ_OFFSET = new Date().getTimezoneOffset();
var CALENDAR_TIMEZONE = CalendarApp.getDefaultCalendar().getTimeZone();

function loadSheetProperties(sheetId) {
  var properties = null;
  var docProps = PropertiesService.getDocumentProperties();
  var allProperties = docProps.getProperties();
  // Logger.log("All Properties: ", allProperties);
  for (var key in DefaultProperties) {
    var sheetKey = sheetId + ":" + key;
    var value = allProperties[sheetKey] || null; // docProps.getProperty(sheetKey) || null;
    if (value != null) {
      value = JSON.parse(value);
      if (properties == null) properties = {};
      properties[key] = value || DefaultProperties[key];
    }
  }
  return properties;
}

function saveSheetProperties(sheetId, newProperties) {
  var out = {};
  for (var key in newProperties) {
    var sheetKey = sheetId + ":" + key;
    var value = newProperties[key];
    out[sheetKey] = JSON.stringify(value)
  }
  var docProps = PropertiesService.getDocumentProperties();
  docProps.setProperties(out, false);
}

/**
 * Converts two date values into a date range.
 */
function valuesToDateRange(startValue, endValue, log) {
    var startDate = new Date(startValue);
    var endDate = new Date(endValue);
    if (log) {
      Logger.log("StartVal: ", startValue, ", Date: ", startDate, "UTCString: ", startValue.toUTCString(), "3/5/2020: ", new Date("3/5/2020"));
      Logger.log("UTC Start D/M/Y: ", startDate.getUTCDay(), startDate.getUTCMonth(), startDate.getUTCFullYear());
      Logger.log("EndVal: " + endValue + ", Date: " + endDate);
      Logger.log("User TZO: ",CURRENT_USER_TZ_OFFSET, "CalZone: ", CALENDAR_TIMEZONE);
      Logger.log("Start/End TZO: ",startDate.getTimezoneOffset(), endDate.getTimezoneOffset());
    }
    if (startDate.getTime() !== startDate.getTime()) return null;
    if (endDate.getTime() !== endDate.getTime()) return null;
    return new DateRange(startDate, endDate);
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
