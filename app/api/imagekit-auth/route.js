// app/api/imagekit-auth/route.js
// Generate ImageKit upload authentication parameters

import crypto from 'crypto';

export async function GET() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  
  if (!privateKey) {
    return Response.json({ 
      error: 'ImageKit private key not configured' 
    }, { status: 500 });
  }
  
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 2400; // 40 minutes
  
  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');
  
  return Response.json({
    token,
    expire,
    signature,
  });
}