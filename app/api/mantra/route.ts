import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize Redis for caching
const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

// Fallback mantras for when API fails
const FALLBACK_MANTRAS = [
  "Focus on progress, not perfection.",
  "Every minute of focus builds your future.",
  "Discipline is choosing between what you want now and what you want most.",
  "Your future self will thank you for not giving up.",
  "Small steps daily lead to big changes yearly.",
  "The pain of discipline weighs ounces, regret weighs tons.",
  "Winners focus on winning, losers focus on winners.",
  "Success is the sum of small efforts repeated daily.",
  "Your only limit is your mind.",
  "Dream it. Believe it. Build it."
];

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `mantra:${userId}:${today}`;

    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        mantra: cached,
        cached: true,
        responseTime: Date.now() - startTime
      });
    }

    // Get user's preferences for personalization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('focus_area, motivation_style')
      .eq('user_id', userId)
      .single();

    const focusArea = profile?.focus_area || 'general productivity';
    const motivationStyle = profile?.motivation_style || 'encouraging';

    // Generate mantra with GPT-4
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a motivational coach. Generate a single, powerful motivational mantra.
            Requirements:
            - Maximum 80 characters
            - Focus area: ${focusArea}
            - Style: ${motivationStyle}
            - No quotes or attribution
            - Action-oriented and personal
            - Fresh and unique, not cliché`
          },
          {
            role: 'user',
            content: 'Generate a motivational mantra for today.'
          }
        ],
        max_tokens: 30,
        temperature: 0.9,
        presence_penalty: 0.6, // Encourage unique responses
      });

      const mantra = completion.choices[0].message.content?.trim() || getFallbackMantra();

      // Validate length
      const finalMantra = mantra.length <= 80 ? mantra : mantra.substring(0, 77) + '...';

      // Cache for 24 hours
      await redis.set(cacheKey, finalMantra, { ex: 86400 });

      // Store in database for analytics
      await supabase
        .from('daily_mantras')
        .insert({
          user_id: userId,
          mantra: finalMantra,
          date: today,
          generated_at: new Date().toISOString()
        });

      return NextResponse.json({
        mantra: finalMantra,
        cached: false,
        responseTime: Date.now() - startTime
      });

    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);

      // Use fallback mantra
      const fallbackMantra = getFallbackMantra();

      // Still cache the fallback
      await redis.set(cacheKey, fallbackMantra, { ex: 86400 });

      return NextResponse.json({
        mantra: fallbackMantra,
        cached: false,
        fallback: true,
        responseTime: Date.now() - startTime
      });
    }

  } catch (error) {
    console.error('Mantra generation error:', error);

    // Return fallback without caching on system error
    return NextResponse.json({
      mantra: getFallbackMantra(),
      error: true,
      fallback: true,
      responseTime: Date.now() - startTime
    });
  }
}

// Get daily quest (similar pattern)
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `quest:${userId}:${today}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        quest: cached,
        cached: true,
        responseTime: Date.now() - startTime
      });
    }

    // Generate quest with GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Generate a simple daily challenge for personal growth.
          Requirements:
          - One specific, actionable task
          - Can be completed in 5-30 minutes
          - Focus on: finance, mindset, health, or productivity
          - Maximum 100 characters
          - Start with a verb (Write, Read, Complete, etc.)`
        },
        {
          role: 'user',
          content: 'Generate today\'s daily quest.'
        }
      ],
      max_tokens: 40,
      temperature: 0.8,
    });

    const quest = completion.choices[0].message.content?.trim() || getDefaultQuest();

    // Cache for 24 hours
    await redis.set(cacheKey, quest, { ex: 86400 });

    // Store in database
    await supabase
      .from('daily_quests')
      .insert({
        user_id: userId,
        quest: quest,
        date: today,
        completed: false
      });

    return NextResponse.json({
      quest: quest,
      cached: false,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Quest generation error:', error);
    return NextResponse.json({
      quest: getDefaultQuest(),
      error: true,
      fallback: true,
      responseTime: Date.now() - startTime
    });
  }
}

function getFallbackMantra(): string {
  return FALLBACK_MANTRAS[Math.floor(Math.random() * FALLBACK_MANTRAS.length)];
}

function getDefaultQuest(): string {
  const quests = [
    "Write 3 things you're grateful for today",
    "Read 10 pages of a personal development book",
    "Complete a 10-minute meditation session",
    "Review and update your monthly budget",
    "Reach out to someone you haven't talked to recently",
    "Do 25 pushups or a 5-minute workout",
    "Declutter one area of your workspace",
    "Learn one new professional skill for 15 minutes"
  ];
  return quests[Math.floor(Math.random() * quests.length)];
}