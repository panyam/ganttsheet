
//////////// Helper utility functions

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
