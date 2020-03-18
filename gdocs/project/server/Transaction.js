
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