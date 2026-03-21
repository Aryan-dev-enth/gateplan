import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { signToken } from '@/lib/auth';
import User from '@/models/User';

// POST /api/auth  — body: { action: 'register'|'login', username, password }
export async function POST(request) {
  try {
    await connectDB();
    const { action, username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    if (action === 'register') {
      const exists = await User.findOne({ username: username.toLowerCase() });
      if (exists) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ username: username.toLowerCase(), password: hash });
      const token = signToken({ userId: user._id, username: user.username });
      return NextResponse.json({ token, username: user.username });
    }

    if (action === 'login') {
      const user = await User.findOne({ username: username.toLowerCase() });
      if (!user) return NextResponse.json({ error: 'No account found. Please register first.' }, { status: 401 });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });

      const token = signToken({ userId: user._id, username: user.username });
      return NextResponse.json({ token, username: user.username });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
