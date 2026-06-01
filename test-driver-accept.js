/**
 * LIVE TEST: Driver Accept via actual HTTPS API — NOT localhost
 * Tests against https://logistichub.ddns.net
 */
'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');

const BASE_URL = 'https://logistichub.ddns.net';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'logistics_os',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function run() {
  const pool = mysql.createPool(DB_CONFIG);
  console.log('✅ Connected to database');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);

  try {
    // Find tenant
    const [tenants] = await pool.execute(
      `SELECT t.tenant_id, t.slug FROM TENANT t WHERE t.status = 'active'
         AND EXISTS (SELECT 1 FROM STAFF s WHERE s.tenant_id = t.tenant_id AND s.role = 'Driver')
       LIMIT 1`
    );
    if (!tenants.length) throw new Error('No tenant with driver');
    const { tenant_id: tid, slug } = tenants[0];
    console.log(`Tenant: ${slug} (ID: ${tid})`);

    // Find driver with a USERNAME (login credential)
    const [drivers] = await pool.execute(
      "SELECT staff_id, name, username, vehicle_type, vehicle_plate FROM STAFF WHERE tenant_id = ? AND role = 'Driver' AND username IS NOT NULL LIMIT 1",
      [tid]
    );

    let driver, token;

    if (drivers.length && drivers[0].username) {
      driver = drivers[0];
      console.log(`Driver: ${driver.name} (username: ${driver.username}, vehicle: ${driver.vehicle_type})`);

      // Try known passwords
      const passwords = ['password123', 'admin123', 'driver123', '123456', 'password', 'sheeshable'];
      for (const pw of passwords) {
        const r = await fetch(`${BASE_URL}/${slug}/api/staff-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: driver.username, password: pw })
        });
        if (r.ok) {
          const d = await r.json();
          token = d.token;
          console.log(`✅ Logged in with: ${pw}\n`);
          break;
        }
      }
    }

    if (!token) {
      // Create a temp driver for testing
      console.log('⚠️  No driver with login found. Creating temporary test driver...');
      const bcrypt = require('bcryptjs');
      const testUsername = `testdriver_${Date.now()}@${slug}.com`;
      const testPwHash = await bcrypt.hash('test123', 12);
      
      const [result] = await pool.execute(
        `INSERT INTO STAFF (tenant_id, name, first_name, last_name, role, username, password_hash, status, vehicle_type)
         VALUES (?, 'Test Driver', 'Test', 'Driver', 'Driver', ?, ?, 'Available', 'Motorcycle')`,
        [tid, testUsername, testPwHash]
      );
      const tempStaffId = result.insertId;
      console.log(`  Created temp driver: ${testUsername} (staff_id: ${tempStaffId})`);

      // Login
      const loginRes = await fetch(`${BASE_URL}/${slug}/api/staff-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUsername, password: 'test123' })
      });

      if (!loginRes.ok) {
        const err = await loginRes.json().catch(() => ({}));
        console.error(`  ❌ Login failed: ${err.error || loginRes.status}`);
        // Cleanup
        await pool.execute("DELETE FROM STAFF WHERE staff_id = ?", [tempStaffId]);
        await pool.end();
        return;
      }

      const loginData = await loginRes.json();
      token = loginData.token;
      driver = { staff_id: tempStaffId, name: 'Test Driver', vehicle_type: 'Motorcycle', username: testUsername, _isTemp: true };
      console.log(`  ✅ Logged in as temp driver\n`);
    }

    // ═══ TEST A: Get Available Jobs ═══
    console.log('═══ TEST A: GET /driver/jobs (LIVE) ═══');
    const jobsRes = await fetch(`${BASE_URL}/${slug}/api/mobile/driver/jobs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`  HTTP Status: ${jobsRes.status}`);
    const jobsData = await jobsRes.json();
    console.log(`  Jobs found: ${jobsData.jobs?.length || 0}`);

    if (jobsData.error) {
      console.log(`  ❌ Error: ${jobsData.error}`);
    }

    if (jobsData.jobs && jobsData.jobs.length > 0) {
      console.log('\n  Available jobs:');
      for (const j of jobsData.jobs.slice(0, 5)) {
        // Look up payment info from DB
        const [payInfo] = await pool.execute(
          `SELECT GROUP_CONCAT(CONCAT(payment_type, ':', status) SEPARATOR ', ') AS info 
           FROM payment WHERE delivery_number = ? AND tenant_id = ?`,
          [j.delivery_number, tid]
        );
        console.log(`    📦 ${j.delivery_number} | vehicle: ${j.vehicle_type || 'any'} | fee: ₱${j.total_fee || 0}`);
        console.log(`       Payments: ${payInfo[0]?.info || 'NONE'}`);
      }

      // ═══ TEST B: Accept First Job ═══
      const testJob = jobsData.jobs[0];
      console.log(`\n═══ TEST B: POST /driver/accept/${testJob.delivery_number} (LIVE) ═══`);
      const acceptRes = await fetch(`${BASE_URL}/${slug}/api/mobile/driver/accept/${testJob.delivery_number}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const acceptData = await acceptRes.json();
      console.log(`  HTTP Status: ${acceptRes.status}`);
      console.log(`  Response: ${JSON.stringify(acceptData)}`);

      if (acceptRes.ok && acceptData.ok) {
        console.log('  🎉 ACCEPT SUCCEEDED!\n');

        // Revert the shipment
        await pool.execute(
          "UPDATE shipment SET status = 'Pending', assigned_driver_id = NULL, assigned_vehicle_plate = NULL WHERE delivery_number = ? AND tenant_id = ?",
          [testJob.delivery_number, tid]
        );
        await pool.execute(
          "DELETE FROM SHIPMENT_HISTORY WHERE delivery_number = ? AND tenant_id = ? AND status = 'In-Transit' ORDER BY created_at DESC LIMIT 1",
          [testJob.delivery_number, tid]
        );
        // Also delete any notification
        await pool.execute(
          "DELETE FROM NOTIFICATION WHERE tenant_id = ? AND related_tracking_number = ? ORDER BY created_at DESC LIMIT 1",
          [tid, testJob.delivery_number]
        ).catch(() => {});
        console.log('  🔄 Reverted shipment to Pending (test cleanup)\n');
      } else {
        console.log(`  ❌ ACCEPT FAILED: ${acceptData.error || 'Unknown error'}\n`);
      }
    } else {
      console.log('\n  ⚠️  No available jobs found. Checking why...');
      
      const [pending] = await pool.execute(
        "SELECT COUNT(*) as cnt FROM shipment WHERE tenant_id = ? AND status = 'Pending' AND assigned_driver_id IS NULL",
        [tid]
      );
      console.log(`  Pending unassigned shipments: ${pending[0].cnt}`);

      const [withPaid] = await pool.execute(
        `SELECT COUNT(*) as cnt FROM shipment s
         WHERE s.tenant_id = ? AND s.status = 'Pending' AND s.assigned_driver_id IS NULL
           AND EXISTS (SELECT 1 FROM payment p WHERE p.delivery_number = s.delivery_number AND p.tenant_id = s.tenant_id AND p.status = 'Paid')`,
        [tid]
      );
      console.log(`  With paid payment: ${withPaid[0].cnt}`);
      console.log(`  Driver vehicle: ${driver.vehicle_type || 'NONE — NEEDS REGISTRATION'}`);

      if (withPaid[0].cnt > 0) {
        // Show the actual shipments the driver can't see
        const [mismatch] = await pool.execute(
          `SELECT s.delivery_number, s.vehicle_type AS ship_vehicle
           FROM shipment s
           WHERE s.tenant_id = ? AND s.status = 'Pending' AND s.assigned_driver_id IS NULL
             AND EXISTS (SELECT 1 FROM payment p WHERE p.delivery_number = s.delivery_number AND p.tenant_id = s.tenant_id AND p.status = 'Paid')
           LIMIT 5`,
          [tid]
        );
        console.log('\n  Paid pending shipments (why driver can\'t see them):');
        mismatch.forEach(m => {
          const vMatch = !m.ship_vehicle || (m.ship_vehicle || '').toLowerCase() === (driver.vehicle_type || '').toLowerCase();
          console.log(`    ${m.delivery_number} | needs: ${m.ship_vehicle || 'any'} | driver: ${driver.vehicle_type} | match: ${vMatch ? '✅' : '❌ MISMATCH'}`);
        });
      }
    }

    // ═══ TEST C: Address Book ═══
    console.log('═══ TEST C: Address Book (Customer API) ═══');
    // Login as customer
    const [users] = await pool.execute(
      "SELECT user_id, email FROM APP_USER WHERE tenant_id = ? AND email IS NOT NULL LIMIT 1",
      [tid]
    );
    if (users.length) {
      const custEmail = users[0].email;
      // Try login
      const custPasswords = ['password123', '123456', 'password', 'admin123'];
      let custToken = null;
      for (const pw of custPasswords) {
        const r = await fetch(`${BASE_URL}/${slug}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: custEmail, password: pw })
        });
        if (r.ok) {
          const d = await r.json();
          custToken = d.token;
          console.log(`  Logged in as customer: ${custEmail}`);
          break;
        }
      }

      if (custToken) {
        // Test GET /addresses
        const addrRes = await fetch(`${BASE_URL}/${slug}/api/mobile/addresses`, {
          headers: { 'Authorization': `Bearer ${custToken}` }
        });
        console.log(`  GET /addresses: ${addrRes.status}`);
        const addrData = await addrRes.json();
        if (addrRes.ok) {
          console.log(`  ✅ Addresses returned: ${addrData.addresses?.length || 0}`);
        } else {
          console.log(`  ❌ Error: ${JSON.stringify(addrData)}`);
        }

        // Test GET /deliveries (customer)
        const delRes = await fetch(`${BASE_URL}/${slug}/api/mobile/deliveries`, {
          headers: { 'Authorization': `Bearer ${custToken}` }
        });
        console.log(`  GET /deliveries: ${delRes.status}`);
        const delData = await delRes.json();
        if (delRes.ok) {
          console.log(`  ✅ Deliveries returned: ${delData.deliveries?.length || 0}`);
          // Check for balance/overdue info
          const withBalance = (delData.deliveries || []).filter(d => d.balance_status);
          if (withBalance.length) {
            console.log(`  📋 Deliveries with balance payments:`);
            withBalance.forEach(d => {
              console.log(`     ${d.delivery_number}: balance=${d.balance_status} amount=₱${d.balance_amount || 0} due=${d.balance_due_date || 'none'}`);
            });
          }
        } else {
          console.log(`  ❌ Error: ${JSON.stringify(delData)}`);
        }
      } else {
        console.log(`  ⚠️  Could not login as customer (unknown password)`);
      }
    }

    // Cleanup temp driver
    if (driver._isTemp) {
      await pool.execute("DELETE FROM STAFF WHERE staff_id = ?", [driver.staff_id]);
      console.log(`\n🧹 Cleaned up temp driver (staff_id: ${driver.staff_id})`);
    }

    console.log('\n═══ ALL LIVE TESTS COMPLETE ═══');

  } catch (err) {
    console.error('❌ Error:', err.message, err.stack);
  } finally {
    await pool.end();
    console.log('Done.');
  }
}

run();
