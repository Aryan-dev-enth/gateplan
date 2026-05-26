const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'weeklyPlan.json');
const weeklyPlan = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Verify if week-14 already exists
if (weeklyPlan.some(w => w.weekId === 'week-14')) {
  console.log('Week 14 already exists!');
  process.exit(0);
}

const newWeek = {
  "weekId": "week-14",
  "label": "25 May – 31 May 2026",
  "days": [
    {
      "date": "2026-05-25",
      "label": "25 May",
      "tasks": [
        { "subject": "Digital Logic", "module": "Module 3 - Combinational Circuits", "lectureRefs": ["Lecture 7F to 8"], "hours": 1.25, "lectureIds": ["65307e61e4b0723b99fc261b", "65308714e4b025d70c95fd13", "65308cb8e4b04e5016b8780e", "653092abe4b0b2d9842c612f", "6530a532e4b0a91163161683"] },
        { "subject": "Digital Logic", "module": "Module 4 - Functional Completeness", "lectureRefs": ["Lecture 1 to 14 (YT)"], "hours": 4.75, "lectureIds": ["65302e35e4b02be26e250a6a"] }
      ]
    },
    {
      "date": "2026-05-26",
      "label": "26 May",
      "tasks": [
        { "subject": "Digital Logic", "module": "Module 4 - Functional Completeness", "lectureRefs": ["Lecture 15 to 16"], "hours": 2.0, "lectureIds": ["65302e35e4b02be26e250a6a"] },
        { "subject": "C Programming", "module": "Module - 3", "lectureRefs": ["Weekly Quiz - 15 with Solutions"], "hours": 2.25, "lectureIds": ["64926aa3e4b0777295e5937d", "6488774ce4b057ed1849fe53"] }
      ]
    },
    {
      "date": "2026-05-27",
      "label": "27 May",
      "tasks": [
        { "subject": "Digital Logic", "module": "Module 5 - Sequential Circuits", "lectureRefs": ["Lecture 1 to 2A"], "hours": 1.5, "lectureIds": ["6533bad6e4b0fd8a668a0fff", "6533cda7e4b0a1e6c351be1e"] }
      ]
    },
    {
      "date": "2026-05-28",
      "label": "28 May",
      "tasks": [
        { "subject": "Digital Logic", "module": "Module 5 - Sequential Circuits", "lectureRefs": ["Lecture 2B to 3"], "hours": 2.5, "lectureIds": ["6533e900e4b0611a764cc65d", "6533f7a6e4b0ef8549ed7d05", "62dd64890cf292c3366343ed"] },
        { "subject": "C Programming", "module": "Module - 3", "lectureRefs": ["Weekly Quiz - 17 with Solutions"], "hours": 2.25, "lectureIds": ["64926b30e4b0cca6f2032459", "648f15cde4b0272c05179d6d"] }
      ]
    },
    {
      "date": "2026-05-29",
      "label": "29 May",
      "tasks": [
        { "subject": "Digital Logic", "module": "Module 5 - Sequential Circuits", "lectureRefs": ["Lecture 4 to 8B"], "hours": 4.0, "lectureIds": ["62dd7ed30cf292c3366347b1", "6535bd3de4b074938645543a", "6535c784e4b098772257ed55", "653738d0e4b0f1d1dc0d5dc7", "65374346e4b042f7488d3041", "65374ca6e4b020ea2b14da4a"] }
      ]
    },
    {
      "date": "2026-05-30",
      "label": "30 May",
      "tasks": [
        { "subject": "Digital Logic", "module": "Module 5 - Sequential Circuits", "lectureRefs": ["Lecture 9A to 11A"], "hours": 4.75, "lectureIds": ["6538e345e4b0d7a00742d700", "6538eb0de4b02f8c4e5b65a4", "6538f76ce4b0acca45897b59", "65391c2de4b0618dde909c78", "65395681e4b0f3e3722ac833", "65397847e4b055543c5ad0f5", "6539a8e9e4b04fb4516eba08"] },
        { "subject": "C Programming", "module": "Module - 3", "lectureRefs": ["Weekly Quiz - 18"], "hours": 1.0, "lectureIds": ["64a86d13e4b02cfc372fab55"] }
      ]
    },
    {
      "date": "2026-05-31",
      "label": "31 May",
      "tasks": [
        { "subject": "Digital Logic", "module": "Module 5 - Sequential Circuits", "lectureRefs": ["Lecture 11B + (OPTIONAL) Lecture 12 (YT) + Lecture - 13 (YT) [ 1 to 4 ]"], "hours": 5.75, "lectureIds": ["6539bd60e4b03a85ed098d92", "6539cfc4e4b09e65f48ac94b", "6539d131e4b09e65f48ac976", "653abcaee4b007c0dfd518a5"] }
      ]
    }
  ]
};

weeklyPlan.push(newWeek);
fs.writeFileSync(filePath, JSON.stringify(weeklyPlan, null, 2), 'utf8');
console.log('Successfully added Week 14 to weeklyPlan.json!');
