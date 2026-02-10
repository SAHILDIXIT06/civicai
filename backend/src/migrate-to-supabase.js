import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { complaintsDB, adminsDB, departmentsDB, supabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

async function migrateData() {
  if (!supabase) {
    console.error('❌ Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  console.log('🚀 Starting data migration to Supabase...\n');

  try {
    // Migrate Departments
    console.log('📁 Migrating departments...');
    const departmentsFile = path.join(dataDir, 'departments.json');
    try {
      const departmentsData = JSON.parse(await fs.readFile(departmentsFile, 'utf8'));
      for (const dept of departmentsData.departments) {
        try {
          await departmentsDB.create({
            id: dept.id,
            name: dept.name,
            primaryEmail: dept.primaryEmail || dept.email || null,
            ccEmails: dept.ccEmails || [],
            contactPerson: dept.contactPerson || null,
            phone: dept.phone || dept.contact || null
          });
          console.log(`  ✅ Migrated department: ${dept.name}`);
        } catch (error) {
          if (error.code === '23505') {
            console.log(`  ⏭️  Department already exists: ${dept.name}`);
          } else {
            console.error(`  ❌ Failed to migrate department ${dept.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('  ⚠️  No departments.json found or error reading it');
    }

    // Migrate Admins
    console.log('\n👥 Migrating admins...');
    const adminPhonesFile = path.join(dataDir, 'admin_phones.json');
    try {
      const adminData = JSON.parse(await fs.readFile(adminPhonesFile, 'utf8'));
      const admins = adminData.admins || adminData.adminPhones.map(phone => ({
        phone,
        name: 'Admin',
        addedAt: new Date().toISOString()
      }));

      for (const admin of admins) {
        try {
          await adminsDB.create({
            phone: admin.phone,
            name: admin.name || 'Admin',
            addedAt: admin.addedAt || new Date().toISOString(),
            addedBy: admin.addedBy || null,
            departmentId: admin.departmentId || null,
            departmentName: admin.departmentName || null,
            canAccessComplaints: admin.canAccessComplaints !== false,
            canManageAdmins: admin.canManageAdmins !== false,
            permissionsUpdatedAt: admin.permissionsUpdatedAt || null,
            permissionsUpdatedBy: admin.permissionsUpdatedBy || null
          });
          console.log(`  ✅ Migrated admin: ${admin.name} (${admin.phone})`);
        } catch (error) {
          if (error.code === '23505') {
            console.log(`  ⏭️  Admin already exists: ${admin.phone}`);
          } else {
            console.error(`  ❌ Failed to migrate admin ${admin.phone}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('  ⚠️  No admin_phones.json found or error reading it');
    }

    // Migrate Complaints
    console.log('\n📋 Migrating complaints...');
    const complaintsFile = path.join(dataDir, 'complaints.json');
    try {
      const complaintsData = JSON.parse(await fs.readFile(complaintsFile, 'utf8'));
      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const complaint of complaintsData.complaints) {
        try {
          await complaintsDB.create({
            id: complaint.id,
            createdAt: complaint.createdAt,
            status: complaint.status || 'Submitted',
            category: complaint.category || null,
            mainCategory: complaint.mainCategory || null,
            subCategory: complaint.subCategory || null,
            description: complaint.description,
            location: complaint.location || null,
            userPhone: complaint.userPhone || null,
            userId: complaint.userId || null,
            userName: complaint.userName || null,
            image: complaint.image || null,
            analysis: complaint.analysis || null,
            forwardingHistory: complaint.forwardingHistory || [],
            forwardedTo: complaint.forwardedTo || null,
            forwardedAt: complaint.forwardedAt || null,
            forwardedBy: complaint.forwardedBy || null,
            assignedTo: complaint.assignedTo || null,
            assignedToName: complaint.assignedToName || null,
            assignedAt: complaint.assignedAt || null,
            statusUpdatedAt: complaint.statusUpdatedAt || null,
            statusUpdatedBy: complaint.statusUpdatedBy || null,
            statusUpdatedByName: complaint.statusUpdatedByName || null,
            proofOfWork: complaint.proofOfWork || null,
            resolvedAt: complaint.resolvedAt || null,
            resolvedBy: complaint.resolvedBy || null,
            resolvedByName: complaint.resolvedByName || null
          });
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`  📊 Progress: ${successCount} complaints migrated...`);
          }
        } catch (error) {
          if (error.code === '23505') {
            skipCount++;
          } else {
            errorCount++;
            console.error(`  ❌ Failed to migrate complaint ${complaint.id}:`, error.message);
          }
        }
      }

      console.log(`\n  ✅ Successfully migrated: ${successCount} complaints`);
      if (skipCount > 0) {
        console.log(`  ⏭️  Already existed: ${skipCount} complaints`);
      }
      if (errorCount > 0) {
        console.log(`  ❌ Errors: ${errorCount} complaints`);
      }
    } catch (error) {
      console.log('  ⚠️  No complaints.json found or error reading it');
    }

    console.log('\n✨ Migration completed!');
    console.log('\n📊 Summary:');
    console.log('   Check your Supabase dashboard → Table Editor to view the data');
    console.log('   The app will now use Supabase instead of JSON files');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
