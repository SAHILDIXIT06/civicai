import 'dotenv/config';
import pool from './src/db.js';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic Connection');
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connected successfully!');
    console.log('   Server Time:', result.rows[0].current_time);
    console.log('   PostgreSQL:', result.rows[0].pg_version.split(',')[0]);
    console.log('');

    // Test 2: Check if tables exist
    console.log('Test 2: Checking Tables');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('complaints', 'admins', 'departments', 'otp_codes')
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found. Please run schema.sql in Supabase SQL Editor.');
      console.log('   File location: backend/src/schema.sql');
    } else {
      console.log('✅ Tables found:');
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    console.log('');

    // Test 3: Check departments
    if (tables.rows.length > 0) {
      console.log('Test 3: Checking Departments');
      const depts = await pool.query('SELECT COUNT(*) as count FROM departments');
      console.log(`✅ Departments: ${depts.rows[0].count} records`);
      console.log('');

      // Test 4: Check admins
      console.log('Test 4: Checking Admins');
      const admins = await pool.query('SELECT COUNT(*) as count FROM admins');
      console.log(`✅ Admins: ${admins.rows[0].count} records`);
      console.log('');

      // Test 5: Check complaints
      console.log('Test 5: Checking Complaints');
      const complaints = await pool.query('SELECT COUNT(*) as count FROM complaints');
      console.log(`✅ Complaints: ${complaints.rows[0].count} records`);
      console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Next steps:');
    console.log('1. Create backend/src/models/ directory');
    console.log('2. Copy model files from COMPLAINTS_MODEL.md and ADMINS_MODEL.md');
    console.log('3. Update backend/src/app.js to use database models');
    console.log('4. Test the application with: npm run dev');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.log('═══════════════════════════════════════');
    console.log('❌ Database test failed!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.error('Error:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('');
    
    if (error.message.includes('getaddrinfo')) {
      console.log('❌ Connection Error');
      console.log('   - Check your internet connection');
      console.log('   - Verify DATABASE_URL in backend/.env is correct');
      console.log('   - Ensure Supabase project is running');
    } else if (error.message.includes('password authentication failed')) {
      console.log('❌ Authentication Error');
      console.log('   - Check DATABASE_URL password is correct');
      console.log('   - Verify you copied the password correctly from Supabase');
      console.log('   - Special characters may need URL encoding');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('❌ Database Not Found');
      console.log('   - Check DATABASE_URL database name is correct');
      console.log('   - Usually it should end with /postgres');
    } else {
      console.log('❌ Unknown Error');
      console.log('   - Check DATABASE_URL format is correct');
      console.log('   - Should be: postgresql://user:password@host:port/database');
      console.log('   - See QUICK_START_DATABASE.md for help');
    }
    
    console.log('');
    console.log('Current DATABASE_URL (partial):');
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    if (dbUrl === 'NOT SET') {
      console.log('   ❌ DATABASE_URL is not set in backend/.env');
    } else {
      // Show only the host part for security
      const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)/);
      if (urlParts) {
        console.log(`   Host: ${urlParts[3]}`);
        console.log(`   Port: ${urlParts[4]}`);
        console.log(`   Database: ${urlParts[5]}`);
        console.log(`   User: ${urlParts[1]}`);
        console.log('   Password: ****');
      } else {
        console.log('   ❌ DATABASE_URL format is invalid');
      }
    }
    
    console.log('');
    process.exit(1);
  }
}

console.log('');
console.log('═══════════════════════════════════════');
console.log('  CivicAI Database Connection Test');
console.log('═══════════════════════════════════════');
console.log('');

testDatabaseConnection();
