// app/api/email-capacity/route.js
// Check email sending capacity across all 6 providers

import { getCapacity, verifyAllProviders } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const verify = searchParams.get('verify') === 'true';
  
  try {
    const capacity = getCapacity();
    
    // Optionally verify all providers (slower, but useful for debugging)
    let verification = null;
    if (verify) {
      verification = await verifyAllProviders();
    }
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      
      // Summary
      summary: {
        configured: capacity.configuredCount,
        totalLimit: capacity.total.limit,
        totalUsed: capacity.total.used,
        totalRemaining: capacity.total.remaining,
        percentageUsed: capacity.total.percentage,
      },
      
      // Per-provider breakdown
      providers: capacity.providers,
      
      // Human-readable message
      message: capacity.total.remaining > 0
        ? `✅ ${capacity.total.remaining} emails available today (${capacity.configuredCount} providers active)`
        : '⚠️ All providers exhausted for today. Resets at midnight.',
      
      // Verification results (if requested)
      ...(verification && { verification }),
    });
    
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message,
      message: 'Failed to check email capacity',
    }, { status: 500 });
  }
}