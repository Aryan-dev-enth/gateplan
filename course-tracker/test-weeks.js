// Simple test to verify week extension logic
const weeklyPlanData = require('./lib/weeklyPlan.json');

console.log('=== Weekly Plan Extension Test ===\n');

const today = new Date();
today.setHours(0, 0, 0, 0);
console.log('Today:', today.toISOString().split('T')[0]);

const lastWeek = weeklyPlanData[weeklyPlanData.length - 1];
const lastDay = lastWeek.days[lastWeek.days.length - 1];
const lastDate = new Date(lastDay.date);

console.log('\nOriginal Plan:');
console.log('- Total weeks:', weeklyPlanData.length);
console.log('- Last week ID:', lastWeek.weekId);
console.log('- Last week label:', lastWeek.label);
console.log('- Last date:', lastDay.date);
console.log('- Days since last date:', Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24)));

const fourWeeksFromNow = new Date(today);
fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);

const daysDiff = Math.ceil((fourWeeksFromNow.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
const weeksToAdd = Math.ceil(daysDiff / 7);

console.log('\nExtension Calculation:');
console.log('- Target date (today + 4 weeks):', fourWeeksFromNow.toISOString().split('T')[0]);
console.log('- Days difference:', daysDiff);
console.log('- Weeks to add:', weeksToAdd);

// Simulate week generation
console.log('\nGenerated Weeks:');
for (let i = 1; i <= Math.min(3, weeksToAdd); i++) {
  const weekStartDate = new Date(lastDate);
  weekStartDate.setDate(weekStartDate.getDate() + 1 + ((i - 1) * 7));
  
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  
  console.log(`- Week ${lastWeek.weekId.match(/\d+/)[0] * 1 + i}: ${weekStartDate.toISOString().split('T')[0]} to ${weekEndDate.toISOString().split('T')[0]}`);
}

console.log('\n=== Test Complete ===');
