// config
// remove elements (timestamp and email) for each row
const removeColumnNumbers = [0, 1];
const nameColumnNumber = 0;
const headingRow = 0;
const scoreMapper = {
    "strongly agree": 5,
    "slightly agree": 4,
    "neutral": 3,
    "slightly disagree": 2,
    "strongly disagree": 1,
    "na": null
};
const width = 400;
const height = 400;
const maxGraphLabel = 40;

// globals start
const I = "INDI";
const M = "MANA";
const T = "TEAM";
let iData;
let mData;
let tData;
// globals end

// Helper functions start ---->

Array.prototype.clean = function (deleteValue) {
    for (let i = 0; i < this.length; i++) {
        if (this[i] === deleteValue) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};

Array.prototype.removeNaN = function (pos) {
    for (let i = 0; i < this.length; i++) {
        if (isNaN(parseFloat(this[i][pos]))) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};

Array.prototype.zip = function (arr) {
    return this.map(function (e, i) {
        if (e instanceof Array) {
            e.push(arr[i]);
            return e;
        }
        return [e, arr[i]];
    })
};

Array.prototype.unzip = function () {
    let q = [];
    let s = [];
    for (let i = 0; i < this.length; i++) {
        q.push("(" + this[i][2] + ") " + this[i][0]);
        s.push(this[i][1])
    }
    return [q, s];
};

function scrubData(rows) {
    for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < removeColumnNumbers.length; j++) {
            rows[i].splice(removeColumnNumbers[j] - j, 1);
        }

        // skip of the current row is the heading
        if (i === headingRow) {
            continue;
        }

        for (let j = 0; j < rows[i].length; j++) {
            // skip if column is name column
            if (j !== nameColumnNumber) {
                if (rows[headingRow][j].indexOf(")") !== -1) {
                    // if the column is MCQ make any blanks to na
                    if (rows[i][j] === "") {
                        console.log("found blank in MCQ at " + i + " " + j);
                        rows[i][j] = "na";
                    }
                } else {
                    // if the column is not MCQ make any na to blank
                    if (rows[i][j].trim().toLowerCase() === "na") {
                        console.log("found na in non MCQ at " + i + " " + j);
                        rows[i][j] = "";
                    }
                }
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

    for (let i = 1; i < iData.length; i++) {
        let div = document.createElement("div");
        div.setAttribute("id", i.toString());
        document.getElementById("output").appendChild(document.createElement("br"));
        document.getElementById("output").appendChild(div);
        document.getElementById("output").appendChild(document.createElement("br"));

        let link = document.createElement("a");
        link.innerText = iData[i][nameColumnNumber];
        link.setAttribute("href", "#");
        link.setAttribute("onclick", "downloadFile(" + i + ")");
        div.appendChild(link);
    }
}

function aggregateData(index) {
    // extract person's info from individual file
    const iPerson = iData[index];
    console.log("Preparing data for: " + iPerson[nameColumnNumber]);
    let finalData = [];
    finalData.push(iData[headingRow]);
    finalData.push(iPerson);

    let tPerson = [];
    // extract person's info from team file
    for (let i = 0; i < tData.length; i++) {
        if (tData[i][nameColumnNumber] === iPerson[nameColumnNumber]) {
            // remove name column
            let temp = JSON.parse(JSON.stringify(tData[i]));
            temp.splice(nameColumnNumber, 1);
            tPerson.push(temp);
        }
    }

    // transpose array
    // console.log(tPerson);
    let t = [];
    for (let i = 0; i < tPerson[0].length; i++) {
        let r = [];
        for (let j = 0; j < tPerson.length; j++) {
            r.push(tPerson[j][i]);
        }
        t.push(r);
    }
    // console.log(t);

    let averageAll = ["Team Average"];
    let answeredAll = ["Answered count"];
    let unansweredAll = ["Unanswered count"];
    let totalAnswersAll = ["Number of reviewers"];
    let discrepancyAll = ["Discrepancy"];
    let accuracyAll = ["Accuracy"];

    // for each question
    for (let i = 0; i < t.length; i++) {
        let total = 0;
        let answered = 0;
        let totalAnswers = t[i].length;
        let isScore = true;

        // for each answer
        for (let j = 0; j < t[i].length; j++) {
            if (typeof t[i][j] === 'string') {
                isScore = false;
                break;
            }
            if (t[i][j] != null) {
                total += t[i][j];
                answered++;
            }
        }

        // if score then add avg to list with disc, else it is a comment, so concat and no disc
        if (isScore) {
            answeredAll.push(answered);
            unansweredAll.push(totalAnswers - answered);
            totalAnswersAll.push(totalAnswers);
            const avg = parseFloat((total / answered).toFixed(2));
            averageAll.push(avg);
            discrepancyAll.push(Math.abs(parseFloat((iPerson[i + 1] - avg)).toFixed(2)));
            accuracyAll.push(parseFloat((answered / totalAnswers).toFixed(2)))
        } else {
            averageAll.push(t[i].clean("").join(" |----| "));
            answeredAll.push("");
            unansweredAll.push("");
            totalAnswersAll.push("");
            discrepancyAll.push("");
            accuracyAll.push("");
        }
    }

    finalData.push(averageAll);
    // finalData.push(answeredAll);
    // finalData.push(unansweredAll);
    // finalData.push(totalAnswersAll);
    finalData.push(discrepancyAll);
    finalData.push(accuracyAll);

    // console.log(finalData);
    return finalData;
}

function exportToCsv(filename, rows) {
    let processRow = function (row) {
        let finalVal = '';
        for (let j = 0; j < row.length; j++) {
            let innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            }

            let result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ',';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    let csvFile = '';
    for (let i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }

    let blob = new Blob([csvFile], {type: 'text/csv;charset=utf-8;'});
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        let link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            let url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// more details on https://stackoverflow.com/questions/33155999/converting-a-csv-file-into-a-2d-array
function CSVParse(csvString, delimiter) {
    if (!csvString || !csvString.length)
        return [];

    const pattern = new RegExp(
        ("(\\" + delimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + delimiter + "\\r\\n]*))"
        ), "gi"
    );

    let rows = [[]];
    let matches = false;

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

function getBarChartData(label, labels, data) {
    let l = [];
    for (let i = 0; i < labels.length; i++) {
        if (labels[i].length > maxGraphLabel) {
            l.push(labels[i].substring(0, maxGraphLabel));
        } else {
            l.push(labels[i]);
        }
    }
    return {
        type: 'bar',
        data: {
            labels: l,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    }
}

function sortColumn(n, m) {
    return function (a, b) {
        if (a[n] === b[n]) {
            if (a[m] === b[m]) {
                return 0;
            }
            return (a[m] > b[m]) ? -1 : 1;
        } else {
            return (a[n] < b[n]) ? -1 : 1;
        }
    }
}

function drawBarGraphs(index, exportData) {
    // delete old graphs
    for (let i = 0; i < 4; i++) {
        const oldCanvas = document.getElementById("graph" + i);
        if (oldCanvas) {
            oldCanvas.parentElement.removeChild(oldCanvas);
        }
    }

    const self = exportData[0].zip(exportData[1]).zip(exportData[3]).removeNaN(1).sort(sortColumn(1, 2));
    const team = exportData[0].zip(exportData[2]).zip(exportData[3]).removeNaN(1).sort(sortColumn(1, 2));

    const [selfHighLables, selfHighData] = self.slice(Math.max(self.length - 3, 1)).unzip();
    const [selfLowLables, selfLowData] = self.slice(0, 3).unzip();

    const [teamHighLables, teamHighData] = team.slice(Math.max(team.length - 3, 1)).unzip();
    const [teamLowLables, teamLowData] = team.slice(0, 3).unzip();

    const selfHigh = ['Self Highest', selfHighLables, selfHighData];
    const selfLow = ['Self Lowest', selfLowLables, selfLowData];

    const teamHigh = ['Team Highest', teamHighLables, teamHighData];
    const teamLow = ['Team Lowest', teamLowLables, teamLowData];

    const allData = [selfHigh, teamHigh, selfLow, teamLow];

    // add new graphs
    for (let i = 0; i < allData.length; i++) {
        const canvas = document.createElement("canvas");
        canvas.setAttribute("id", "graph" + i);
        const ctx = canvas.getContext('2d');

        const [label, labels, data] = allData[i];

        new Chart(ctx, getBarChartData(label, labels, data));

        canvas.style.cssText = "display:block;width:" + width + "px;height:" + height + "px;";
        document.getElementById(index.toString()).appendChild(canvas);
    }
}

// Helper functions end ---->

// functions called from the html ---->

const openFile = function (event, type) {
    let input = event.target;

    let reader = new FileReader();
    reader.onload = function () {
        const rows = scrubData(CSVParse(reader.result, ","));
        if (type === T) {
            tData = rows;
        } else if (type === M) {
            mData = rows;
        } else {
            iData = rows;
        }

        if (tData && iData && mData) {
            tData = tData.concat(mData);
            showDownloadOptions();
        }
    };
    reader.readAsText(input.files[0]);
};

const downloadFile = function (index) {
    console.log("Download file called with index: " + index);
    const exportData = aggregateData(index);
    drawBarGraphs(index, exportData);
    exportToCsv(iData[index][nameColumnNumber] + '.csv', exportData);
};

const reset = function () {
    iData = undefined;
    mData = undefined;
    tData = undefined;
};