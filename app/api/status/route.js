// app/api/status/route.js
// Health check endpoint for all services including ImageKit

import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkCloudinary() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    return { status: 'down', message: 'Not configured' };
  }
  
  const start = Date.now();
  try {
    // Use a more reliable check - just verify the API endpoint is reachable
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image`,
      { method: 'HEAD', cache: 'no-store' }
    );
    const latency = Date.now() - start;
    
    // Even 401/403 means the service is up (just needs auth)
    if (response.ok || response.status === 401 || response.status === 403) {
      return { status: 'operational', message: `OK (${latency}ms)` };
    }
    return { status: 'degraded', message: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'down', message: error.message || 'Connection failed' };
  }
}

async function checkImageKit() {
  const imagekitUrl = process.env.NEXT_PUBLIC_IMAGEKIT_URL;
  
  if (!imagekitUrl) {
    return { status: 'down', message: 'Not configured' };
  }
  
  const start = Date.now();
  try {
    const response = await fetch(imagekitUrl, { 
      method: 'HEAD', 
      cache: 'no-store' 
    });
    const latency = Date.now() - start;
    
    // CHANGE IS HERE: Added response.status === 404
    // 404 means the CDN is up, just didn't find a file at the root path (which is normal)
    if (response.ok || response.status === 403 || response.status === 404) {
      return { status: 'operational', message: `OK (${latency}ms)` };
    }
    return { status: 'degraded', message: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'down', message: error.message || 'Connection failed' };
  }
}

async function checkFirebase() {
  const start = Date.now();
  try {
    const q = query(collection(db, 'certificates'), limit(1));
    await getDocs(q);
    const latency = Date.now() - start;
    return { status: 'operational', message: `OK (${latency}ms)` };
  } catch (error) {
    if (error.code === 'permission-denied') {
      return { status: 'degraded', message: 'Auth required' };
    }
    return { status: 'down', message: error.message || 'Connection failed' };
  }
}

async function checkEmail() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  
  if (!gmailUser || !gmailPass) {
    return { status: 'down', message: 'Not configured' };
  }
  
  const start = Date.now();
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });
    
    await transporter.verify();
    const latency = Date.now() - start;
    return { status: 'operational', message: `OK (${latency}ms)` };
  } catch (error) {
    if (error.message?.includes('Invalid login')) {
      return { status: 'down', message: 'Invalid credentials' };
    }
    return { status: 'down', message: error.message || 'Connection failed' };
  }
}

async function checkDomain() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.certcat.xyz';
  
  const start = Date.now();
  try {
    const response = await fetch(`${appUrl}/api/health`, { 
      method: 'GET',
      cache: 'no-store',
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      return { status: 'operational', message: `OK (${latency}ms)` };
    }
    return { status: 'degraded', message: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'operational', message: 'Self-check skipped' };
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  
  // Run all checks in parallel
  const [cloudinary, imagekit, firebase, email, domain] = await Promise.all([
    checkCloudinary(),
    checkImageKit(),
    checkFirebase(),
    checkEmail(),
    checkDomain(),
  ]);

  // Determine overall status
  const allServices = [cloudinary, imagekit, firebase, email, domain];
  const hasDown = allServices.some(s => s.status === 'down');
  const hasDegraded = allServices.some(s => s.status === 'degraded');
  
  let overall = 'operational';
  if (hasDown) overall = 'partial_outage';
  else if (hasDegraded) overall = 'degraded';

  return Response.json({
    overall,
    timestamp,
    services: {
      cloudinary: { name: 'Storage (Cloudinary)', ...cloudinary },
      imagekit: { name: 'Storage (ImageKit)', ...imagekit },
      firebase: { name: 'Database (Firebase)', ...firebase },
      email: { name: 'Email Service (Gmail)', ...email },
      domain: { name: 'App Domain', ...domain },
    }
  });
}