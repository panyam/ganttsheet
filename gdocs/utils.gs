
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

