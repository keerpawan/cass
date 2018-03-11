// config
// remove elements (timestamp and email) for each row
var removeColumnNumbers = [0, 1];
var nameColumnNumber = 0;
var headingRow = 0;
var scoreMapper = {
    "strongly agree": 5,
    "slightly agree": 4,
    "neutral": 3,
    "slightly disagree": 2,
    "strongly disagree": 1,
    "na": null
};

// globals
const I = "INDI";
const T = "TEAM";
var iData;
var tData;

// Helper functions ---->

function scrubData(rows) {
    for (var i = 0; i < rows.length; i++) {
        for (var j = 0; j < removeColumnNumbers.length; j++) {
            rows[i].splice(removeColumnNumbers[j] - j, 1);
        }

        // skip of the current row is the heading
        if (i === headingRow) {
            continue;
        }

        for (var j = 0; j < rows[i].length; j++) {
            // skip if column is name column
            if (j !== nameColumnNumber) {
                // convert score text to number
                if (scoreMapper[rows[i][j].trim().toLowerCase()] !== undefined) {
                    rows[i][j] = scoreMapper[rows[i][j].trim().toLowerCase()]
                }
            }
        }
    }
    return rows;
}

function showDownloadOptions() {
    console.log("Preparing links");

    // Reset the output div
    document.getElementById('output').innerHTML = "<br/><br/>Ready to export<br/>";

    for (var i = 1; i < iData.length; i++) {
        var link = document.createElement("a");
        link.innerText = iData[i][nameColumnNumber];
        link.setAttribute('href', '#');
        link.setAttribute('onclick', 'downloadFile(' + i + ')');
        document.getElementById('output').appendChild(document.createElement('br'));
        document.getElementById('output').appendChild(link);
        document.getElementById('output').appendChild(document.createElement('br'));
    }
}

function aggregateData(index) {
    var iPerson = iData[index];
    console.log("Preparing data for: " + iPerson[nameColumnNumber]);
    var finalData = [];
    finalData.push(iData[headingRow]);
    finalData.push(iPerson);

    for (var i = 0; i < tData.length; i++) {
        if (tData[i][nameColumnNumber] === iPerson[nameColumnNumber]) {
            finalData.push(tData[i]);
        }
    }
    return finalData;
}

function exportToCsv(filename, rows) {
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            }

            var result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ',';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    var csvFile = '';
    for (var i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], {type: 'text/csv;charset=utf-8;'});
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// from https://stackoverflow.com/questions/33155999/converting-a-csv-file-into-a-2d-array
function CSVParse(csvString, delimiter) {
    if (!csvString || !csvString.length)
        return [];

    const pattern = new RegExp(
        ("(\\" + delimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + delimiter + "\\r\\n]*))"
        ), "gi"
    );

    var rows = [[]];
    var matches = false;

    while (matches = pattern.exec(csvString)) {

        const matched_delimiter = matches[1];
        const matched_cellQuote = matches[2];
        const matched_cellNoQuote = matches[3];

        /*
         * Edge case: Data that starts with a delimiter
         */
        if (matches.index == 0 && matched_delimiter)
            rows[rows.length - 1].push("");

        if (matched_delimiter.length && matched_delimiter !== delimiter)
            rows.push([]);

        const matched_value = (matched_cellQuote)
            ? matched_cellQuote.replace(
                new RegExp("\"\"", "g"), "\""
            )
            : matched_cellNoQuote;

        rows[rows.length - 1].push(matched_value);

    }

    return rows;
}

// functions called from the html ---->

var openFile = function (event, type) {
    var input = event.target;

    var reader = new FileReader();
    reader.onload = function () {
        console.log(CSVParse(reader.result, ","));
        var rows = scrubData(CSVParse(reader.result, ","));
        console.log(rows);
        if (type === T) {
            tData = rows;
        } else {
            iData = rows;
        }

        if (tData && iData) {
            showDownloadOptions();
        }
    };
    reader.readAsText(input.files[0]);
};

var downloadFile = function (index) {
    console.log("Download file called with index: " + index);
    var exportData = aggregateData(index);
    exportToCsv(iData[index][nameColumnNumber] + '.csv', exportData);
};