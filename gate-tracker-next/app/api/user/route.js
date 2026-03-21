import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';

// GET /api/user — returns full user data (minus password)
export async function GET(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const user = await User.findById(auth.userId).select('-password').lean();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/user — partial update any top-level field
export async function PATCH(request) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await request.json();

  // Whitelist updatable fields
  const allowed = ['topicStats', 'subjectStats', 'dailyLogs', 'dailyHours',
    'customSlotAssignments', 'practiceLog', 'backlog', 'mockTests', 'streak', 'weeklyTarget'];

  const update = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const user = await User.findByIdAndUpdate(
    auth.userId,
    { $set: update },
    { new: true, select: '-password' }
  ).lean();

  return NextResponse.json(user);
}
