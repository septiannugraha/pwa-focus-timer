import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Server-side timer validation
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { userId, sessionId, elapsed, clientTime } = await request.json();

    // Verify user authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get timer session from database
    const { data: timerSession, error } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !timerSession) {
      return NextResponse.json({ error: 'No active timer session' }, { status: 404 });
    }

    // Validate elapsed time with server time
    const serverElapsed = Date.now() - new Date(timerSession.start_time).getTime();
    const timeDrift = Math.abs(serverElapsed - elapsed);

    // Flag suspicious behavior if drift > 5 seconds
    if (timeDrift > 5000) {
      await supabase
        .from('timer_sessions')
        .update({
          suspicious: true,
          drift_amount: timeDrift
        })
        .eq('id', timerSession.id);

      return NextResponse.json({
        warning: 'Time drift detected',
        serverTime: Date.now(),
        drift: timeDrift
      });
    }

    // Update last heartbeat
    await supabase
      .from('timer_sessions')
      .update({
        last_heartbeat: new Date().toISOString(),
        heartbeat_count: (timerSession.heartbeat_count || 0) + 1
      })
      .eq('id', timerSession.id);

    // Check if timer should complete
    if (serverElapsed >= timerSession.duration * 1000) {
      await completeTimer(supabase, timerSession.id, userId);
      return NextResponse.json({
        status: 'completed',
        elapsed: serverElapsed
      });
    }

    return NextResponse.json({
      status: 'active',
      serverTime: Date.now(),
      elapsed: serverElapsed,
      remaining: (timerSession.duration * 1000) - serverElapsed
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function completeTimer(supabase: any, sessionId: string, userId: string) {
  // Mark session as completed
  await supabase
    .from('timer_sessions')
    .update({
      completed: true,
      end_time: new Date().toISOString(),
      validated: true
    })
    .eq('id', sessionId);

  // Update user's streak
  await updateStreak(supabase, userId);
}

async function updateStreak(supabase: any, userId: string) {
  // Get user's current streak
  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (!streak) {
    // Create new streak
    await supabase
      .from('streaks')
      .insert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_completed: today
      });
  } else if (streak.last_completed === yesterday) {
    // Continue streak
    const newStreak = streak.current_streak + 1;
    await supabase
      .from('streaks')
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak.longest_streak),
        last_completed: today
      })
      .eq('user_id', userId);
  } else if (streak.last_completed !== today) {
    // Reset streak
    await supabase
      .from('streaks')
      .update({
        current_streak: 1,
        last_completed: today
      })
      .eq('user_id', userId);
  }
}