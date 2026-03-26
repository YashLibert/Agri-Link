import 'dotenv/config';
import connectDB from '../config/db.js';
import { addTraceEvent, getChain, verifyChain } from './hashChain.js';

async function test() {
  await connectDB();

  const lotId = `TEST-${Date.now()}`;
  console.log('Testing lot:', lotId);

  await addTraceEvent(lotId, 'LISTED',       { farmerId: 'F1', crop: 'Onion', quantity: 10, grade: 'Grade A', location: 'Nashik' });
  await addTraceEvent(lotId, 'GRADED',       { grade: 'Grade A', confidence: 91.3 });
  await addTraceEvent(lotId, 'ORDER_PLACED', { buyerId: 'B1', buyerName: 'Rajesh Exports', price: 2100 });
  await addTraceEvent(lotId, 'DISPATCHED',   { notes: 'Via Pune cold chain' });
  await addTraceEvent(lotId, 'RECEIVED',     { notes: 'Good condition' });

  const chain = await getChain(lotId);
  console.log('\nChain:');
  chain.forEach(b =>
    console.log(`  Block ${b.blockIndex}: ${b.eventType.padEnd(15)} hash: ${b.currentHash.slice(0,20)}...`)
  );

  const result = await verifyChain(lotId);
  console.log('\nVerification:', result);

  process.exit(0);
}

test().catch(console.error);