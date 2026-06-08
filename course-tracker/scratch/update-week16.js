const fs = require('fs');
const path = require('path');

const newWeek = {
  "weekId": "week-16",
  "label": "8 Jun – 14 Jun 2026",
  "days": [
    {
      "date": "2026-06-08",
      "label": "8 Jun",
      "tasks": [
        {
          "subject": "Computer Organization and Architecture",
          "module": "Module 1 - Basic Components of Computer & Main Memory",
          "lectureRefs": ["Lecture 1A", "Lecture 1B", "Lecture 1C", "Lecture 1D", "Lecture 1E", "Lecture 2A"],
          "hours": 3.5,
          "lectureIds": ["65562d23e4b0a2a329e8d69a", "655639f7e4b0ab75acbcbaf2", "6556577ee4b05787ffaee27c", "65565d0ee4b07fdd9d51935f", "65566542e4b07fdd9d5195df", "65577b75e4b0f2173c486333"]
        },
        {
          "subject": "Computer Networks",
          "module": "Module 2: Data Link Layer",
          "lectureRefs": ["Lecture 6"],
          "hours": 2.0,
          "lectureIds": ["651af46de4b055961bcebc7e"]
        }
      ]
    },
    {
      "date": "2026-06-09",
      "label": "9 Jun",
      "tasks": [
        {
          "subject": "Computer Organization and Architecture",
          "module": "Module 1 - Basic Components of Computer & Main Memory",
          "lectureRefs": ["Lecture 2B"],
          "hours": 3.0,
          "lectureIds": ["656deac7e4b0f8f66cdd12e8"]
        },
        {
          "subject": "Computer Networks",
          "module": "Module 2: Data Link Layer",
          "lectureRefs": ["Lecture 7", "Lecture 8a", "Lecture 8b"],
          "hours": 4.0,
          "lectureIds": ["651d7e86e4b0d899f6d5178e", "651fd38ae4b0053e7a398ee2", "651fd38ae4b04bb26e1a6dda"]
        }
      ]
    },
    {
      "date": "2026-06-10",
      "label": "10 Jun",
      "tasks": [
        {
          "subject": "Computer Organization and Architecture",
          "module": "Module 1 - Basic Components of Computer & Main Memory",
          "lectureRefs": ["Lecture 2C", "Lecture 3A"],
          "hours": 3.0,
          "lectureIds": ["656f2e37e4b0dd4595490b04", "6571e92de4b0399abf85f9f4"]
        },
        {
          "subject": "Computer Networks",
          "module": "Module 2: Data Link Layer",
          "lectureRefs": ["Lecture 8c", "Lecture 9a", "Lecture 9b"],
          "hours": 2.75,
          "lectureIds": ["651fd38ae4b0bf942f3cd450", "65207512e4b0e2629b9b7946", "65207512e4b08148701c8c8b"]
        }
      ]
    },
    {
      "date": "2026-06-11",
      "label": "11 Jun",
      "tasks": [
        {
          "subject": "Computer Organization and Architecture",
          "module": "Module 1 - Basic Components of Computer & Main Memory",
          "lectureRefs": ["Lecture 3B"],
          "hours": 2.0,
          "lectureIds": ["6571f863e4b0d916d0d81e05"]
        },
        {
          "subject": "Computer Networks",
          "module": "Module 2: Data Link Layer",
          "lectureRefs": ["Lecture 10", "Lecture 11"],
          "hours": 4.0,
          "lectureIds": ["6522fdf9e4b0c1ae0c402375", "6524248ae4b0eae2b2a43ef6"]
        }
      ]
    },
    {
      "date": "2026-06-12",
      "label": "12 Jun",
      "tasks": [
        {
          "subject": "Computer Organization and Architecture",
          "module": "Module 1 - Basic Components of Computer & Main Memory",
          "lectureRefs": ["Lecture 3C"],
          "hours": 2.75,
          "lectureIds": ["65732aafe4b069efb43110a2"]
        },
        {
          "subject": "Computer Networks",
          "module": "Module 2: Data Link Layer",
          "lectureRefs": ["Lecture 12", "Lecture 13"],
          "hours": 3.5,
          "lectureIds": ["65257c88e4b03ae0d8729908", "6526c311e4b01abc7182685b"]
        }
      ]
    },
    {
      "date": "2026-06-13",
      "label": "13 Jun",
      "tasks": [
        {
          "subject": "Computer Organization and Architecture",
          "module": "Module 2 - The CPU",
          "lectureRefs": ["Lecture 1", "Lecture 2A"],
          "hours": 5.5,
          "lectureIds": ["65772784e4b074e342d151f1", "65787b20e4b0a9d6581ee2be"]
        }
      ]
    },
    {
      "date": "2026-06-14",
      "label": "14 Jun",
      "tasks": [
        {
          "subject": "Computer Organization and Architecture",
          "module": "Module 2 - The CPU",
          "lectureRefs": ["Lecture 2B"],
          "hours": 1.5,
          "lectureIds": ["6578a618e4b0be913df35869"]
        },
        {
          "subject": "Computer Networks",
          "module": "Module 2: Data Link Layer",
          "lectureRefs": ["Lecture 14", "Lecture 15"],
          "hours": 4.0,
          "lectureIds": ["6528e118e4b05a1ffaab82a1", "652ba744e4b08ee9798c43cf"]
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
  
  const existsIndex = weeklyPlan.findIndex(w => w.weekId === 'week-16');
  if (existsIndex !== -1) {
    console.log(`Week 16 already exists in ${filePath}. Overwriting...`);
    weeklyPlan[existsIndex] = newWeek;
  } else {
    console.log(`Adding Week 16 to ${filePath}...`);
    weeklyPlan.push(newWeek);
  }
  
  fs.writeFileSync(filePath, JSON.stringify(weeklyPlan, null, 2), 'utf8');
  console.log(`Successfully updated ${filePath}`);
});
