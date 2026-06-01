const fs = require('fs');
const path = require('path');

const newWeek = {
  "weekId": "week-15",
  "label": "1 Jun – 7 Jun 2026",
  "days": [
    {
      "date": "2026-06-01",
      "label": "1 Jun",
      "tasks": [
        {
          "subject": "Digital Logic",
          "module": "Module 5 - Sequential Circuits",
          "lectureRefs": ["Lecture 13", "Lecture 14"],
          "hours": 3.5,
          "lectureIds": ["6539d131e4b09e65f48ac976", "653abcaee4b007c0dfd518a5"]
        },
        {
          "subject": "Computer Networks",
          "module": "New Module 1 - IP Addressing, Subnetting, and Supernetting",
          "lectureRefs": ["Lecture 1"],
          "hours": 1.25,
          "lectureIds": ["686426dd8e867879453faa4b"]
        }
      ]
    },
    {
      "date": "2026-06-02",
      "label": "2 Jun",
      "tasks": [
        {
          "subject": "Digital Logic",
          "module": "Module 5 - Sequential Circuits",
          "lectureRefs": ["Lecture 14"],
          "hours": 2.5,
          "lectureIds": ["653abcaee4b007c0dfd518a5"]
        },
        {
          "subject": "Computer Networks",
          "module": "New Module 1 - IP Addressing, Subnetting, and Supernetting",
          "lectureRefs": ["Lecture 2", "Lecture 3"],
          "hours": 3.5,
          "lectureIds": ["6867614efa537407404dee91", "686df41ce389b16c74c2ef0b"]
        }
      ]
    },
    {
      "date": "2026-06-03",
      "label": "3 Jun",
      "tasks": [
        {
          "subject": "Digital Logic",
          "module": "Module 5 - Sequential Circuits",
          "lectureRefs": ["Lecture 14", "Lecture 15A"],
          "hours": 2.0,
          "lectureIds": ["653abcaee4b007c0dfd518a5", "653abf9ce4b05265aa4fb190"]
        },
        {
          "subject": "Computer Networks",
          "module": "New Module 1 - IP Addressing, Subnetting, and Supernetting",
          "lectureRefs": ["Lecture 4", "Lecture 5"],
          "hours": 3.0,
          "lectureIds": ["6873bd37f28f63652ca90c41", "6875e6184e848168816c021a"]
        }
      ]
    },
    {
      "date": "2026-06-04",
      "label": "4 Jun",
      "tasks": [
        {
          "subject": "Digital Logic",
          "module": "Module 5 - Sequential Circuits",
          "lectureRefs": ["Lecture 16A", "Lecture 16B"],
          "hours": 1.15,
          "lectureIds": ["653ac007e4b08fed80a2747c", "653ac09de4b0d1c4cee17f6b"]
        },
        {
          "subject": "Computer Networks",
          "module": "New Module 1 - IP Addressing, Subnetting, and Supernetting",
          "lectureRefs": ["Lecture 6"],
          "hours": 2.75,
          "lectureIds": ["6875e7e9773f7718cc8dd95a"]
        }
      ]
    },
    {
      "date": "2026-06-05",
      "label": "5 Jun",
      "tasks": [
        {
          "subject": "Digital Logic",
          "module": "Module 5 - Sequential Circuits",
          "lectureRefs": ["Lecture 16C", "Lecture 16D", "Lecture 16E", "Lecture 16F"],
          "hours": 3.75,
          "lectureIds": ["630643b2e4b0785e6cad9a11", "653c2b95e4b0ac63ee19f4d5", "653c3116e4b084f5408c6a1a", "653c57b7e4b07ad7695f2819"]
        },
        {
          "subject": "Computer Networks",
          "module": "New Module 1 - IP Addressing, Subnetting, and Supernetting",
          "lectureRefs": ["Weekly Quiz 1 Solution"],
          "hours": 2.0,
          "lectureIds": ["6870995f241773190ad65106"]
        }
      ]
    },
    {
      "date": "2026-06-06",
      "label": "6 Jun",
      "tasks": [
        {
          "subject": "Digital Logic",
          "module": "Module 5 - Sequential Circuits",
          "lectureRefs": [
            "GATE ECE 1987 Ripple Counter Question",
            "GATE ECE 1990 Ripple Counter Question",
            "GATE ECE 1993 Ripple Counter Question",
            "GATE ECE 1999 Ripple Counter Question",
            "Lecture 17A",
            "Lecture 17B",
            "GATE CSE 2021 Synchronous Counter Question",
            "Lecture 17C"
          ],
          "hours": 3.25,
          "lectureIds": [
            "653c45ade4b07ad7695f264f",
            "653c4f78e4b01610439b4a9b",
            "653c518ee4b05b97d7d82439",
            "653c51afe4b00951227a9f3c",
            "653d063ce4b0423625da692d",
            "653d1436e4b05c1a6bf00a20",
            "653d1fe0e4b0d20538e70b3a",
            "653e1fe9e4b0d593cd7b556e"
          ]
        },
        {
          "subject": "Computer Networks",
          "module": "New Module 1 - IP Addressing, Subnetting, and Supernetting",
          "lectureRefs": ["Weekly Quiz 2 Solution"],
          "hours": 2.0,
          "lectureIds": ["651c5d60e4b0db3622198499"]
        }
      ]
    },
    {
      "date": "2026-06-07",
      "label": "7 Jun",
      "tasks": [
        {
          "subject": "Digital Logic",
          "module": "Module 5 - Sequential Circuits",
          "lectureRefs": ["Lecture 18A", "Lecture 18B"],
          "hours": 2.5,
          "lectureIds": ["653ee38fe4b09829a573057e", "653edec8e4b0ded455f19021"]
        },
        {
          "subject": "Computer Networks",
          "module": "Module 2: Data Link Layer",
          "lectureRefs": ["Lecture 5"],
          "hours": 2.0,
          "lectureIds": ["6518556de4b0ac1274486c70"]
        }
      ]
    }
  ]
};

const paths = [
  path.join(__dirname, '..', 'lib', 'weeklyPlan.json'),
  path.join(__dirname, '..', 'public', 'weeklyPlan.json')
];

paths.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return;
  }
  
  const weeklyPlan = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const existsIndex = weeklyPlan.findIndex(w => w.weekId === 'week-15');
  if (existsIndex !== -1) {
    console.log(`Week 15 already exists in ${filePath}. Overwriting...`);
    weeklyPlan[existsIndex] = newWeek;
  } else {
    console.log(`Adding Week 15 to ${filePath}...`);
    weeklyPlan.push(newWeek);
  }
  
  fs.writeFileSync(filePath, JSON.stringify(weeklyPlan, null, 2), 'utf8');
  console.log(`Successfully updated ${filePath}`);
});
