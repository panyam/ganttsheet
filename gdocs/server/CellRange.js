
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