import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get the path to the stock cars directory
    const stockCarsDir = path.join(process.cwd(), 'public', 'assets', 'stock-cars');
    
    // Read all files in the directory
    const files = fs.readdirSync(stockCarsDir);
    
    // Filter to only include .json files
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    // Return the list of files
    return NextResponse.json(jsonFiles);
  } catch (error) {
    console.error('Error listing stock vehicles:', error);
    return NextResponse.json({ error: 'Failed to list stock vehicles' }, { status: 500 });
  }
}
