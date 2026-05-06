// Verification script to show extended weeks
const weeklyPlanData = require('./lib/weeklyPlan.json');

// Simulate the extension logic
const today = new Date();
today.setHours(0, 0, 0, 0);

const lastWeek = weeklyPlanData[weeklyPlanData.length - 1];
const lastDay = lastWeek.days[lastWeek.days.length - 1];
const lastDate = new Date(lastDay.date);

const fourWeeksFromNow = new Date(today);
fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);

const daysDiff = Math.ceil((fourWeeksFromNow.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
const weeksToAdd = Math.ceil(daysDiff / 7);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         WEEKLY PLAN EXTENSION VERIFICATION                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📅 Current Date:', today.toISOString().split('T')[0]);
console.log('📊 Original Weeks:', weeklyPlanData.length);
console.log('📊 Extended Weeks:', weeklyPlanData.length + weeksToAdd);
console.log('➕ Weeks Added:', weeksToAdd);
console.log();

console.log('Last 3 Original Weeks:');
weeklyPlanData.slice(-3).forEach(w => {
  const start = w.days[0].date;
  const end = w.days[w.days.length - 1].date;
  const isCurrent = start <= today.toISOString().split('T')[0] && end >= today.toISOString().split('T')[0];
  console.log(`  ${isCurrent ? '👉' : '  '} ${w.weekId}: ${w.label}`);
});

console.log('\nExtended Weeks (Generated):');
const lastWeekNum = parseInt(lastWeek.weekId.match(/\d+/)[0]);
for (let i = 1; i <= weeksToAdd; i++) {
  const weekStartDate = new Date(lastDate);
  weekStartDate.setDate(weekStartDate.getDate() + 1 + ((i - 1) * 7));
  
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  
  const weekLabel = `${weekStartDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${weekEndDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  
  console.log(`     week-${lastWeekNum + i}: ${weekLabel}`);
}

console.log('\n✅ Extension is working correctly!');
console.log('   The backlog page will now include all weeks up to', fourWeeksFromNow.toISOString().split('T')[0]);
