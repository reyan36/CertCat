// app/api/health/route.js
// Simple health check endpoint

export async function GET() {
  return Response.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
}