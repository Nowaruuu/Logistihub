
function calcPreview(){
  var baseFee = parseFloat(document.getElementById('price-base-fee').value)||0;
  var driverLabor = parseFloat(document.getElementById('price-driver-labor').value)||0;
  var expressMult = parseFloat(document.getElementById('price-express-multi').value)||1;
  var insuranceFee = parseFloat(document.getElementById('price-safety-fee').value)||0;
  var vehicle = document.getElementById('calc-vehicle').value;
  var category = document.getElementById('calc-category').value;
  var km = parseFloat(document.getElementById('calc-km').value)||0;
  var kg = parseFloat(document.getElementById('calc-kg').value)||0;
  var isExpress = document.getElementById('calc-express').checked;
  var isInsurance = document.getElementById('calc-insurance').checked;
  // Fuel rate
  var fuelEl = document.getElementById('price-fuel-'+vehicle);
  var fuelRate = fuelEl ? parseFloat(fuelEl.value)||0 : 0;
  var fuelCost = fuelRate * km;
  // Driver labor
  var laborCost = driverLabor * km;
  // Weight surcharge
  var wtRate = 0;
  if(kg<=20) wtRate = parseFloat(document.getElementById('price-wt-1').value)||0;
  else if(kg<=100) wtRate = parseFloat(document.getElementById('price-wt-2').value)||0;
  else if(kg<=500) wtRate = parseFloat(document.getElementById('price-wt-3').value)||0;
  else wtRate = parseFloat(document.getElementById('price-wt-4').value)||0;
  var weightCost = wtRate * kg;
  // Category surcharge
  var catEl = document.getElementById('price-cat-'+category);
  var catCost = catEl ? parseFloat(catEl.value)||0 : 0;
  // Subtotal
  var subtotal = baseFee + fuelCost + laborCost + weightCost + catCost;
  // Express
  var expressCost = 0;
  if(isExpress){ expressCost = subtotal * (expressMult - 1); subtotal = subtotal * expressMult; }
  // Insurance
  var insCost = isInsurance ? insuranceFee : 0;
  var total = subtotal + insCost;
  // Breakdown
  var lines = [];
  lines.push('Base fee: <b>â‚±'+baseFee.toFixed(2)+'</b>');
  lines.push('Fuel ('+fuelRate+'/km Ã— '+km+'km): <b>â‚±'+fuelCost.toFixed(2)+'</b>');
  lines.push('Driver labor ('+driverLabor+'/km Ã— '+km+'km): <b>â‚±'+laborCost.toFixed(2)+'</b>');
  lines.push('Weight ('+wtRate+'/kg Ã— '+kg+'kg): <b>â‚±'+weightCost.toFixed(2)+'</b>');
  if(catCost>0) lines.push('Category surcharge: <b>â‚±'+catCost.toFixed(2)+'</b>');
  if(isExpress) lines.push('Express (Ã—'+expressMult+'): <b style="color:#f59e0b;">+â‚±'+expressCost.toFixed(2)+'</b>');
  if(isInsurance) lines.push('Insurance: <b style="color:#3b82f6;">+â‚±'+insCost.toFixed(2)+'</b>');
  document.getElementById('calc-breakdown').innerHTML = lines.join('<br>');
  document.getElementById('calc-total').textContent = 'â‚±'+total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
}
setTimeout(calcPreview, 100);
</script>

    <!-- â•â• AUDIT LOGS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
    <div id="s-audit" class="screen">
      <div class="card" style="padding:0;overflow:hidden;">
        <div style="padding:20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
          <h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:0;">System Audit Logs</h2>
        </div>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>ACTOR</th>
                <th>TYPE</th>
                <th>ACTION</th>
                <th>TARGET</th>
              </tr>
            </thead>
            <tbody id="audit-logs-tbody">
              <tr><td colspan="5"><div class="empty"><span class="material-symbols-outlined">history</span><p>No audit logs available</p></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- â•â• UPGRADE PLAN â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
    <div id="s-upgrade" class="screen">

      <!-- Hero Banner -->
      <div style="background:#fff;border-radius:16px;padding:36px 32px;margin-bottom:20px;position:relative;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
        <div style="position:absolute;top:-40px;right:-30px;width:180px;height:180px;background:radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%);border-radius:50%;"></div>
        <div style="position:absolute;bottom:-50px;left:20%;width:200px;height:200px;background:radial-gradient(circle,rgba(99,102,241,0.06) 0%,transparent 70%);border-radius:50%;"></div>
        <div style="position:relative;z-index:1;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <div style="width:38px;height:38px;background:#eff6ff;border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <span class="material-symbols-outlined" style="font-size:20px;color:#3b82f6;">rocket_launch</span>
            </div>
            <div>
              <div style="font-size:18px;font-weight:800;color:#0f172a;">Subscription Plans</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:1px;">Power up your logistics operations</div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:99px;padding:6px 16px;">
            <span class="material-symbols-outlined" style="font-size:14px;color:#10b981;">check_circle</span>
            <span style="font-size:12px;color:#64748b;">Current plan: </span>
            <strong id="upgrade-current-plan" style="font-size:12px;color:#3b82f6;text-transform:uppercase;letter-spacing:.04em;">â€”</strong>
          </div>
        </div>
      </div>

      <!-- Billing Cycle Toggle -->
      <div style="display:flex;justify-content:center;margin-bottom:20px;">
        <div id="billing-cycle-toggle" style="display:inline-flex;background:#f1f5f9;border-radius:12px;padding:4px;gap:2px;">
          <button onclick="setBillingCycle('monthly')" class="bc-btn bc-active" data-cycle="monthly" style="padding:10px 20px;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;">Monthly</button>
          <button onclick="setBillingCycle('quarterly')" class="bc-btn" data-cycle="quarterly" style="padding:10px 20px;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;background:transparent;color:#64748b;">
            Quarterly <span style="background:#dcfce7;color:#16a34a;font-size:9px;padding:2px 6px;border-radius:99px;margin-left:4px;font-weight:800;">Save 10%</span>
          </button>
          <button onclick="setBillingCycle('annual')" class="bc-btn" data-cycle="annual" style="padding:10px 20px;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;background:transparent;color:#64748b;">
            Annual <span style="background:#dcfce7;color:#16a34a;font-size:9px;padding:2px 6px;border-radius:99px;margin-left:4px;font-weight:800;">Save 17%</span>
          </button>
        </div>
      </div>

      <!-- Plans Grid -->
      <div id="upgrade-plans-grid" style="display:grid;gap:20px;"></div>

      <!-- Max Plan Notice -->
      <div id="upgrade-max-notice" style="display:none;">
        <div style="background:#fff;border-radius:16px;padding:48px 32px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <div style="width:64px;height:64px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
            <span class="material-symbols-outlined" style="font-size:32px;color:#059669;">workspace_premium</span>
          </div>
          <h3 style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:8px;">You're on the Best Plan!</h3>
          <p style="font-size:14px;color:#64748b;max-width:340px;margin:0 auto;line-height:1.6;">You have access to all features with the <strong style="color:#059669;">Global</strong> plan. Enjoy unlimited everything.</p>
        </div>
      </div>

      <!-- Payment Methods Info -->
      <div style="margin-top:16px;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;">
          <span class="material-symbols-outlined" style="font-size:14px;">lock</span> Secured by PayMongo
        </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;">
          <span class="material-symbols-outlined" style="font-size:14px;">credit_card</span> GCash Â· Card Â· Maya
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;">
          <span class="material-symbols-outlined" style="font-size:14px;">autorenew</span> Cancel anytime
        </div>
      </div>
    </div>

    <script>
    var _SLUG = _SLUG || ((window.__TENANT__ && window.__TENANT__.slug) ? window.__TENANT__.slug : '');
    var _upgradePlans = [
      {
        key: 'startup', label: 'Padala', price: '1,499', icon: 'speed', color: '#64748b', gradient: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
        features: ['Up to 10 riders / drivers','Real-time GPS tracking','Proof of delivery (photo)','Delivery status updates','Email support'],
        noFeatures: ['Live driver map tracking','Delivery history & reports','Priority support','Dedicated account manager']
      },
      {
        key: 'enterprise', label: 'Negosyo', price: '4,999', icon: 'bolt', color: '#3b82f6', gradient: 'linear-gradient(135deg,#eff6ff,#dbeafe)', popular: true,
        features: ['Unlimited riders & users','Live driver map tracking','Delivery history & reports','Priority support'],
        noFeatures: ['Dedicated account manager']
      },
      {
        key: 'global', label: 'Korporasyon', price: '14,999', icon: 'public', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
        features: ['Everything in Negosyo','Custom workspace branding','Dedicated account manager','Data export & analytics'],
        noFeatures: []
      }
    ];

    var _billingCycle = 'monthly';
    var _cycleMultipliers = { monthly: 1, quarterly: 2.7, annual: 10 };
    var _cycleLabels = { monthly: '/mo', quarterly: '/qtr', annual: '/yr' };

    function setBillingCycle(cycle) {
      _billingCycle = cycle;
      document.querySelectorAll('.bc-btn').forEach(function(b) {
        if (b.getAttribute('data-cycle') === cycle) {
          b.style.background = '#fff';
          b.style.color = '#0f172a';
          b.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          b.classList.add('bc-active');
        } else {
          b.style.background = 'transparent';
          b.style.color = '#64748b';
          b.style.boxShadow = 'none';
          b.classList.remove('bc-active');
        }
      });
      renderPlansGrid();
    }

    async function renderPlansGrid() {
      var currentPlan = (window.__TENANT__ && window.__TENANT__.plan) ? window.__TENANT__.plan.toLowerCase() : 'startup';
      var currentIdx = _upgradePlans.findIndex(function(p) { return p.key === currentPlan; });
      if (currentIdx < 0) currentIdx = 0;

      var pendingDowngrade = null;
      try {
        var subRes = await apiFetch('/' + _SLUG + '/api/admin/subscription');
        var subData = await subRes.json();
        if (subData.ok && subData.pending_downgrade) {
          pendingDowngrade = subData.pending_downgrade.toLowerCase();
        }
      } catch(e) {}

      var label = document.getElementById('upgrade-current-plan');
      if (label) label.textContent = _upgradePlans[currentIdx].label;

      var grid = document.getElementById('upgrade-plans-grid');
      if (!grid) return;

      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      grid.innerHTML = '';

      _upgradePlans.forEach(function(p, idx) {
        var isCurrent = (p.key === currentPlan);
        var isUpgrade = (idx > currentIdx);
        var isDowngrade = (idx < currentIdx);
        var isPendingTarget = (pendingDowngrade === p.key);
        var isPopular = p.popular && !isCurrent;
        var card = document.createElement('div');

        var borderColor = isCurrent ? '#10b981' : isPendingTarget ? '#f97316' : isPopular ? p.color : '#e2e8f0';
        card.style.cssText = 'background:' + p.gradient + ';border:2px solid ' + borderColor +
          ';border-radius:16px;padding:28px 24px;position:relative;transition:all .25s ease;' +
          (isCurrent ? '' : 'cursor:pointer;');

        if (!isCurrent) {
          card.onmouseover = function() { this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 32px rgba(0,0,0,0.12)'; this.style.borderColor=p.color; };
          card.onmouseout = function() { this.style.transform='none'; this.style.boxShadow='none'; this.style.borderColor=borderColor; };
        }

        var badges = '';
        if (isCurrent) badges = '<div style="position:absolute;top:-10px;right:16px;background:#10b981;color:#fff;font-size:9px;font-weight:800;padding:4px 14px;border-radius:99px;text-transform:uppercase;letter-spacing:.06em;">Current Plan</div>';
        else if (isPendingTarget) badges = '<div style="position:absolute;top:-10px;right:16px;background:#f97316;color:#fff;font-size:9px;font-weight:800;padding:4px 14px;border-radius:99px;text-transform:uppercase;letter-spacing:.06em;">Downgrade Scheduled</div>';
        else if (isPopular) badges = '<div style="position:absolute;top:-10px;right:16px;background:' + p.color + ';color:#fff;font-size:9px;font-weight:800;padding:4px 14px;border-radius:99px;text-transform:uppercase;letter-spacing:.06em;">Recommended</div>';

        var featuresHtml = p.features.map(function(f) {
          return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#334155;padding:4px 0;"><span class=\'material-symbols-outlined\' style=\'font-size:15px;color:' + p.color + ';\'>check_circle</span>' + f + '</div>';
        }).join('');
        var noFeaturesHtml = p.noFeatures.map(function(f) {
          return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;padding:4px 0;text-decoration:line-through;"><span class=\'material-symbols-outlined\' style=\'font-size:15px;color:#e2e8f0;\'>cancel</span>' + f + '</div>';
        }).join('');

        var buttonHtml = '';
        if (isCurrent) {
          buttonHtml = '<div style="margin-top:20px;padding:12px;background:#d1fae5;border:1px solid #a7f3d0;border-radius:10px;text-align:center;font-size:13px;font-weight:700;color:#059669;display:flex;align-items:center;justify-content:center;gap:6px;"><span class=\'material-symbols-outlined\' style=\'font-size:16px;\'>check_circle</span>Your Current Plan</div>';
        } else if (isUpgrade) {
          buttonHtml = '<button onclick="upgradeToPlan(\'' + p.key + '\', this)" style="margin-top:20px;width:100%;padding:13px;background:' + p.color + ';color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;transition:opacity .15s;" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'"><span class=\'material-symbols-outlined\' style=\'font-size:16px;\'>upgrade</span>Upgrade to ' + p.label + '</button>';
        } else if (isPendingTarget) {
          buttonHtml = '<button onclick="cancelDowngradePlan(this)" style="margin-top:20px;width:100%;padding:13px;background:#fff7ed;color:#ea580c;border:1.5px solid #f97316;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s;" onmouseover="this.style.background=\'#fef2f2\';this.style.borderColor=\'#ef4444\';this.style.color=\'#dc2626\';" onmouseout="this.style.background=\'#fff7ed\';this.style.borderColor=\'#f97316\';this.style.color=\'#ea580c\';"><span class=\'material-symbols-outlined\' style=\'font-size:16px;\'>close</span>Cancel Downgrade</button>';
        } else if (isDowngrade) {
          if (pendingDowngrade) {
            buttonHtml = '<div style="margin-top:20px;padding:12px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;text-align:center;font-size:12px;font-weight:600;color:#94a3b8;">Downgrade pending on another plan</div>';
          } else {
            buttonHtml = '<button onclick="downgradeToPlan(\'' + p.key + '\', \'' + p.label + '\', this)" style="margin-top:20px;width:100%;padding:13px;background:transparent;color:#94a3b8;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s;" onmouseover="this.style.borderColor=\'#f97316\';this.style.color=\'#f97316\';" onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.color=\'#94a3b8\';"><span class=\'material-symbols-outlined\' style=\'font-size:16px;\'>arrow_downward</span>Downgrade to ' + p.label + '</button>';
          }
        }

        card.innerHTML = badges +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">' +
            '<div style="width:40px;height:40px;background:' + p.color + '15;border-radius:10px;display:flex;align-items:center;justify-content:center;"><span class=\'material-symbols-outlined\' style=\'font-size:20px;color:' + p.color + ';\'>' + p.icon + '</span></div>' +
            '<div><div style="font-size:14px;font-weight:800;color:#0f172a;">' + p.label + '</div></div>' +
          '</div>' +
          '<div style="margin-bottom:20px;">' +
            '<span style="font-size:36px;font-weight:800;color:#0f172a;">â‚±' + cyclePrice + '</span>' +
            '<span style="font-size:13px;color:#94a3b8;font-weight:500;">' + _cycleLabels[_billingCycle] + '</span>' +
            (_billingCycle !== 'monthly' ? '<div style="font-size:11px;color:#16a34a;margin-top:2px;">â‚±' + p.price + '/mo equivalent</div>' : '') +
          '</div>' +
          '<div style="border-top:1px solid rgba(0,0,0,0.06);padding-top:16px;">' +
            featuresHtml + noFeaturesHtml +
          '</div>' +
          buttonHtml;

        grid.appendChild(card);
      });
    }
    // renderPlansGrid() is called via go('upgrade') handler â€” NOT here (apiFetch isn't defined yet)

    async function upgradeToPlan(planKey, btn) {
      if (!confirm('Upgrade to ' + planKey.toUpperCase() + '? You will be redirected to PayMongo to complete payment.')) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite;">progress_activity</span> Redirecting...';
      try {
        var r = await apiFetch('/' + _SLUG + '/api/admin/upgrade', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ plan: planKey })
        });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to start upgrade.');
        if (d.checkout_url) {
          window.location.href = d.checkout_url;
        } else {
          throw new Error('No checkout URL returned.');
        }
      } catch(e) {
        alert('Error: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">upgrade</span> Try Again';
      }
    }

    async function downgradeToPlan(planKey, planLabel, btn) {
      if (!confirm('Downgrade to ' + planLabel + '?\n\nYour current plan features will remain active until the next billing cycle. The downgrade takes effect on your next billing date.\n\nAre you sure?')) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite;">progress_activity</span> Processing...';
      try {
        var r = await apiFetch('/' + _SLUG + '/api/admin/downgrade', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ plan: planKey })
        });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to schedule downgrade.');
        alert('âœ“ ' + d.message);
        renderPlansGrid();
      } catch(e) {
        alert('Error: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">arrow_downward</span> Downgrade to ' + planLabel;
      }
    }

    async function cancelDowngradePlan(btn) {
      if (!confirm('Cancel the pending downgrade?\n\nYour current plan will remain active and you will continue to be billed at the current rate.')) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite;">progress_activity</span> Cancelling...';
      try {
        var r = await apiFetch('/' + _SLUG + '/api/admin/cancel-downgrade', {
          method: 'POST',
          headers: {'Content-Type':'application/json'}
        });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to cancel downgrade.');
        alert('âœ“ ' + d.message);
        renderPlansGrid();
      } catch(e) {
        alert('Error: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">close</span> Cancel Downgrade';
      }
    }
    </script>

  </div>
</div>

<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>

<!-- SESSION EXPIRY MODAL -->
<div id="session-expired-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);z-index:99999;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:20px;padding:40px 36px;max-width:380px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.3);">
    <div style="width:56px;height:56px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
      <span class="material-symbols-outlined" style="font-size:28px;color:#ef4444;">lock_clock</span>
    </div>
    <h2 style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:8px;">Session Expired</h2>
    <p style="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:24px;">Your login session has expired for security reasons. Please sign in again to continue.</p>
    <button onclick="redirectToLogin()" style="width:100%;background:#0f2235;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">
      Sign In Again
    </button>
  </div>
</div>

<script>
function toggleSidebar(){var s=document.querySelector('.sidebar');var o=document.getElementById('sidebar-overlay');s.classList.toggle('open');o.classList.toggle('show');document.body.classList.toggle('sidebar-open');}
function closeSidebar(){document.querySelector('.sidebar').classList.remove('open');document.getElementById('sidebar-overlay').classList.remove('show');document.body.classList.remove('sidebar-open');}
// â”€â”€ Global session expiry handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _sessionExpired = false;

function redirectToLogin() {
  var slug = (window.__TENANT__ && window.__TENANT__.slug) ? window.__TENANT__.slug : '';
  var loginUrl = slug ? ('/' + slug + '/admin-login') : '/superadmin-login';
  window.location.href = loginUrl;
}

function showSessionExpired() {
  if (_sessionExpired) return;
  _sessionExpired = true;
  var overlay = document.getElementById('session-expired-overlay');
  if (overlay) { overlay.style.display = 'flex'; }
}

// Wrapper around fetch that detects 401/403 and shows the modal
function apiFetch(url, opts) {
  opts = opts || {};
  opts.credentials = opts.credentials || 'include';
  return fetch(url, opts).then(function(r) {
    if (r.status === 401) {
      showSessionExpired();
      return Promise.reject(new Error('Session expired'));
    }
    return r;
  });
}

function checkSession() {
  var slug = (window.__TENANT__ && window.__TENANT__.slug) ? window.__TENANT__.slug : '';
  if (!slug || _sessionExpired) return;
  fetch('/' + slug + '/api/admin/me', { credentials: 'include' }).then(function(r) {
    if (r.status === 401) { showSessionExpired(); return null; }
    return r.json();
  }).then(function(d) {
    if (d && d.admin) {
      document.getElementById('sidebar-username').textContent = d.admin.name || d.admin.email.split('@')[0];
      document.getElementById('sidebar-role').textContent = d.admin.role || 'ADMIN';
    }
  }).catch(function() {});
}
checkSession();
setInterval(checkSession, 4 * 60 * 1000);

function logout() {
  var slug = (window.__TENANT__ && window.__TENANT__.slug) ? window.__TENANT__.slug : '';
  if (!slug) return;
  apiFetch('/' + slug + '/api/logout', { method: 'POST' })
    .then(function() { window.location.href = '/' + slug + '/admin-login'; })
    .catch(function() { window.location.href = '/' + slug + '/admin-login'; });
}
</script>

<script>
// GUI Scale
function setGuiScale(size) {
  document.body.classList.remove('scale-sm','scale-md','scale-lg');
  document.body.classList.add('scale-' + size);
  localStorage.setItem('gui_scale', size);
  // Highlight active button
  document.querySelectorAll('.gui-scale-btn').forEach(function(b) {
    if (b.getAttribute('data-scale') === size) {
      b.style.borderColor = '#3b82f6'; b.style.background = '#eff6ff'; b.style.color = '#3b82f6';
    } else {
      b.style.borderColor = '#e2e8f0'; b.style.background = '#fff'; b.style.color = '#0f172a';
    }
  });
}
(function(){
  var saved = localStorage.getItem('gui_scale') || 'md';
  document.body.classList.add('scale-' + saved);
  // Highlight active button on load
  setTimeout(function(){ setGuiScale(saved); }, 100);
})();
</script>

<script>
var pageMeta={
  'dashboard':['Dashboard','Welcome back'],
  'shipments':['Shipments','All deliveries in your workspace'],
  'new-shipment':['New Shipment','Shipments / New'],

  'staff':['Staff','Your team'],
  'vehicles':['Vehicles','Your fleet'],
  'app-users':['App Users','Registered users for your company'],
  'payments':['Payments','Invoices and billing'],
  'sales-report':['Sales & Revenue Report','Revenue analytics and transaction history'],
  'subscription':['Subscription','Plan billing and upcoming payments'],
  'pod':['Proof of Delivery','Capture records'],
  'user-reg':['User Registration','Your private registration page'],
  'settings':['Settings','Workspace configuration'],
  'upgrade':['Manage Plan','Upgrade or downgrade your subscription'],
  'audit':['Audit Logs','System activity history']
};

function go(id,navBtn){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
  var el=document.getElementById('s-'+id);
  if(el)el.classList.add('active');
  if(navBtn){
    document.querySelectorAll('.nav-link').forEach(function(l){l.classList.remove('active');});
    navBtn.classList.add('active');
  } else {
    // Auto-find matching nav link by screen id
    document.querySelectorAll('.nav-link').forEach(function(l){
      l.classList.remove('active');
      if(l.getAttribute('onclick') && l.getAttribute('onclick').indexOf("'"+id+"'")!==-1) l.classList.add('active');
    });
  }
  var m=pageMeta[id]||[id,''];
  document.getElementById('page-title').textContent=m[0];
  document.getElementById('page-sub').textContent=m[1];
  window.scrollTo(0,0);
  var lp = document.getElementById('lp-panel');
  if(id==='settings') {
    if(lp) lp.style.display='block';
    loadSettings();
  } else {
    if(lp) lp.style.display='none';
    // Revert unsaved color changes back to saved values
    var t = window.__TENANT__;
    if (t) {
      var savedApp = t.bg_app_color || '#f1f5f9';
      var savedSide = t.bg_sidebar_color || '#0f2235';
      var savedBrand = t.brand_color || '#3b82f6';
      document.body.style.background = savedApp;
      var sb = document.querySelector('.sidebar'); if (sb) sb.style.background = savedSide;
      document.documentElement.style.setProperty('--app-bg', savedApp);
      document.documentElement.style.setProperty('--sidebar-bg', savedSide);
      document.documentElement.style.setProperty('--primary', savedBrand);
    }
  }
  if(id==='audit') loadAuditLogs();
  if(id==='payments') loadPayments();
  if(id==='pod') loadPODs();
  if(id==='subscription') loadSubscription();
  if(id==='upgrade' && typeof renderPlansGrid === 'function') renderPlansGrid();
  if(id==='sales-report') loadSalesReport();
  // Always refresh text contrast after navigation
  if(typeof updateAppTextContrast==='function') setTimeout(function(){ updateAppTextContrast(); updateSidebarTextContrast(); }, 50);
}

function setTab(el){
  var bar=el.closest('.tabs-bar')||el.parentElement;
  bar.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
}

var subTypes=['PACKAGE','VEHICLE','FOOD','DOC','BULK'];
function showSub(type){
  subTypes.forEach(function(t){
    var el=document.getElementById('sf-'+t);
    if(el)el.style.display='none';
  });
  var target=document.getElementById('sf-'+type);
  if(target)target.style.display='block';
}

function copyUrl(){
  var url=document.getElementById('dashboard-reg-url')?document.getElementById('dashboard-reg-url').textContent:'';
  if(!navigator.clipboard||!url) return;
  navigator.clipboard.writeText(url).then(function(){
    document.querySelectorAll('.copy-btn').forEach(function(btn){
      var orig = btn.innerHTML;
      btn.innerHTML = '<span class="material-symbols-outlined">check</span>Copied!';
      btn.style.background = '#16a34a';
      btn.style.color = '#fff';
      btn.style.borderColor = '#16a34a';
      btn.style.transition = 'all 0.5s ease';
      setTimeout(function(){
        btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>Copy';
        btn.style.background = '#dcfce7';
        btn.style.color = '#15803d';
        btn.style.borderColor = '#bbf7d0';
      }, 2000);
    });
  });
}

var _allAppUsers=[];
function loadAppUsers(){
  var slug=(window.__TENANT__&&window.__TENANT__.slug)?window.__TENANT__.slug:'';
  if(!slug)return;
  apiFetch('/'+slug+'/api/admin/app-users')
    .then(function(r){return r.json();})
    .then(function(data){
      _allAppUsers=Array.isArray(data.users)?data.users:[];
      renderAppUsers(_allAppUsers);
    })
    .catch(function(){
      var tb=document.getElementById('app-users-tbody');
      if(tb)tb.innerHTML='<tr><td colspan="5"><div class="empty"><span class="material-symbols-outlined">error</span><p>Failed to load users</p></div></td></tr>';
    });
}
function renderAppUsers(users){
  var tbody=document.getElementById('app-users-tbody');
  if(!tbody)return;
  if(!users||users.length===0){tbody.innerHTML='<tr><td colspan="6"><div class="empty"><span class="material-symbols-outlined">manage_accounts</span><p>No app users registered yet</p><p class="esub">Share your registration link with your staff.</p></div></td></tr>';return;}
  var rc={'Driver':'b-transit','Document Controller':'b-delivered','Admin':'b-awaiting'};
  tbody.innerHTML=users.map(function(u){
    var date=u.created_at?new Date(u.created_at).toLocaleDateString():'N/A';
    var status=u.is_active===false?'<span class="badge b-declined">Inactive</span>':'<span class="badge b-delivered">Active</span>';
    return '<tr><td><strong>'+esc(u.full_name||u.name||'N/A')+'</strong></td><td>'+esc(u.email||'N/A')+'</td><td>'+esc(u.contact_email||'N/A')+'</td><td><span class="badge '+(rc[u.role]||'b-pending')+'">'+esc(u.role||'N/A')+'</span></td><td>'+date+'</td><td>'+status+'</td></tr>';
  }).join('');
}
function filterAppUsers(){
  var role=document.getElementById('app-users-role-filter').value;
  renderAppUsers(role?_allAppUsers.filter(function(u){return u.role===role;}):_allAppUsers);
}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

// â”€â”€ Shipment loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _allShipments=[];
function loadShipments(){
  var slug=(window.__TENANT__&&window.__TENANT__.slug)?window.__TENANT__.slug:'';
  if(!slug)return;
  apiFetch('/'+slug+'/api/admin/shipments?t='+Date.now())
    .then(function(r){return r.json();})
    .then(function(data){
      // Handle both { shipments: [] } and plain [] responses
      if(Array.isArray(data)) _allShipments=data;
      else if(Array.isArray(data.shipments)) _allShipments=data.shipments;
      else _allShipments=[];
      renderDashboardShipments();
      renderShipmentsTable();
      updateStatCards();
    })
    .catch(function(e){console.error('Failed to load shipments:',e);});
}
function updateStatCards(){
  var cards=document.querySelectorAll('.stat-card');
  if(cards.length<4)return;
  var total=_allShipments.length;
  var transit=_allShipments.filter(function(s){return s.status==='In Transit'||s.status==='Out for Delivery';}).length;
  var delivered=_allShipments.filter(function(s){return s.status==='Delivered';}).length;
  var pending=_allShipments.filter(function(s){return s.status==='Pending'||s.status==='Processing';}).length;
  cards[0].querySelector('.stat-value').textContent=total;
  cards[0].querySelector('.stat-note').textContent=total?total+' total':'No data yet';
  cards[1].querySelector('.stat-value').textContent=transit;
  cards[1].querySelector('.stat-note').textContent=transit?transit+' active':'No data yet';
  cards[2].querySelector('.stat-value').textContent=delivered;
  cards[2].querySelector('.stat-note').textContent=delivered?delivered+' completed':'No data yet';
  cards[3].querySelector('.stat-value').textContent=pending;
  cards[3].querySelector('.stat-note').textContent=pending?pending+' awaiting':'No data yet';
  // Nav badge
  var navBadge=document.querySelector('.nav-badge');
  if(navBadge)navBadge.textContent=total;
}
var typeCls={'PACKAGE':'t-pkg','VEHICLE':'t-veh','FOOD':'t-food','DOC':'t-doc','BULK':'t-bulk'};
var statusCls={'Pending':'b-pending','Processing':'b-pending','Queued':'b-awaiting','In Transit':'b-transit','Out for Delivery':'b-transit','Delivered':'b-delivered','Declined':'b-declined','Failed':'b-declined'};
function renderDashboardShipments(){
  // Recent shipments on dashboard (first 5)
  var tbody=document.querySelector('#s-dashboard .tbl-wrap tbody');
  if(!tbody)return;
  var recent=_allShipments.slice(0,8);
  if(!recent.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty"><span class="material-symbols-outlined">inbox</span><p>No shipments yet</p></div></td></tr>';return;}
  tbody.innerHTML=recent.map(function(s){
    var tc=typeCls[s.item_type_flag]||'t-pkg';
    var sc=statusCls[s.status]||'b-pending';
    return '<tr><td><strong>'+esc(s.delivery_number||'')+'</strong></td><td>'+esc(s.client_name||s.sender_name||'N/A')+'</td><td><span class="type-pill '+tc+'">'+esc(s.item_type_flag||'PKG')+'</span></td><td>'+esc(s.driver_name||'Unassigned')+'</td><td><span class="badge '+sc+'">'+esc(s.status||'Pending')+'</span></td></tr>';
  }).join('');
}
var _adminShipStatusFilter = 'All';
function filterShipments(status, tabEl) {
  if (status !== null) _adminShipStatusFilter = status;
  if (tabEl) {
    var bar = tabEl.closest('.tabs-bar') || tabEl.parentElement;
    bar.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    tabEl.classList.add('active');
  }
  renderShipmentsTable();
}
function renderShipmentsTable(){
  var tbody=document.getElementById('admin-shipments-tbody');
  if(!tbody)return;
  var typeFilter=(document.getElementById('admin-ship-type-filter')||{}).value||'';
  var filtered=_allShipments;
  if(_adminShipStatusFilter!=='All'){
    filtered=filtered.filter(function(s){
      if(_adminShipStatusFilter==='In Transit')return s.status==='In Transit'||s.status==='In-Transit';
      if(_adminShipStatusFilter==='Failed')return s.status==='Failed'||s.status==='Declined';
      return s.status===_adminShipStatusFilter;
    });
  }
  if(typeFilter){
    filtered=filtered.filter(function(s){
      var t=(s.item_type||s.package_type||s.item_type_flag||'').toLowerCase();
      return t===typeFilter.toLowerCase()||(s.item_type_flag||'').toLowerCase()===typeFilter.toLowerCase();
    });
  }
  if(!filtered.length){tbody.innerHTML='<tr><td colspan="13"><div class="empty"><span class="material-symbols-outlined">local_shipping</span><p>No shipments found</p></div></td></tr>';return;}
  tbody.innerHTML=filtered.map(function(s){
    var tc=typeCls[s.item_type_flag]||'t-pkg';
    var sc=statusCls[s.status]||'b-pending';
    var route=esc(s.pickup_location||'N/A')+' \u2192 '+esc(s.dropoff_location||'N/A');
    function fmtDateTime(v){if(!v)return '\u2014';var d=new Date(v);return d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
    var dateOrdered=fmtDateTime(s.created_at);
    var dateDelivered=fmtDateTime(s.delivered_at);
    var veh = s.vehicle_type ? esc(s.vehicle_type.charAt(0).toUpperCase() + s.vehicle_type.slice(1)) : '\u2014';
    var plate = s.assigned_vehicle_plate ? esc(s.assigned_vehicle_plate) : '\u2014';
    var sender = s.sender_name ? esc(s.sender_name) : esc(s.client_name||'N/A');
    var receiver = s.receiver_name ? esc(s.receiver_name) : '\u2014';
    return '<tr><td><strong>'+esc(s.delivery_number||'')+'</strong></td><td>'+esc(s.awb||'\u2014')+'</td><td>'+sender+'</td><td>'+receiver+'</td><td><span class="type-pill '+tc+'">'+esc(s.item_type_flag||'PKG')+'</span></td><td style="max-width:260px;white-space:normal;word-break:break-word;font-size:11px;line-height:1.4;">'+route+'</td><td>'+esc(s.driver_name||'Unassigned')+'</td><td>'+veh+'</td><td>'+plate+'</td><td><span class="badge '+sc+'">'+esc(s.status||'Pending')+'</span></td><td style="white-space:nowrap;font-size:11px;">'+dateOrdered+'</td><td style="white-space:nowrap;font-size:11px;">'+dateDelivered+'</td><td></td></tr>';
  }).join('');
}

var _origGo=go;
go=function(id,navBtn){_origGo(id,navBtn);if(id==='app-users')loadAppUsers();if(id==='shipments'||id==='dashboard'){loadShipments();loadDashFleet();loadDashStaff();setTimeout(loadDashMap,300);}};
// Auto-load on page load
loadShipments();
loadStaff(); // Load staff early so pending license badge shows on nav

// â”€â”€ Dashboard Fleet Status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadDashFleet(){
  var slug=(window.__TENANT__&&window.__TENANT__.slug)?window.__TENANT__.slug:'';
  if(!slug)return;
  apiFetch('/'+slug+'/api/admin/vehicles')
    .then(function(r){return r.json();})
    .then(function(data){
      var vehicles=Array.isArray(data)?data:Array.isArray(data.vehicles)?data.vehicles:[];
      var el=document.getElementById('dash-fleet-body');
      if(!el)return;
      if(!vehicles.length){el.innerHTML='<div style="padding:28px;text-align:center;"><span class="material-symbols-outlined" style="font-size:36px;color:#e2e8f0;display:block;margin-bottom:6px;">directions_car</span><p style="font-size:12px;color:#94a3b8;margin-bottom:12px;">No vehicles registered yet</p><button class="btn btn-primary btn-sm" onclick="go(\'vehicles\',null)" style="margin:0 auto;"><span class="material-symbols-outlined">add</span>Add Vehicle</button></div>';return;}
      var html='<div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px;">';
      vehicles.slice(0,5).forEach(function(v){
        var sc=v.status==='Available'?'b-available':v.status==='On Duty'?'b-onduty':'b-maint';
        html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-radius:8px;">';
        html+='<div style="display:flex;align-items:center;gap:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:#64748b;">directions_car</span><div><div style="font-size:12px;font-weight:700;color:#0f172a;">'+esc(v.plate_number||'N/A')+'</div><div style="font-size:10px;color:#94a3b8;">'+esc(v.vehicle_type||v.type||'')+(v.model?' Â· '+esc(v.model):'')+'</div></div></div>';
        html+='<span class="badge '+sc+'">'+esc(v.status||'Unknown')+'</span>';
        html+='</div>';
      });
      if(vehicles.length>5) html+='<div style="text-align:center;font-size:11px;color:#94a3b8;padding:4px;">+'+(vehicles.length-5)+' more</div>';
      html+='</div>';
      el.innerHTML=html;
    }).catch(function(){});
}

// â”€â”€ Dashboard Staff On Duty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadDashStaff(){
  var slug=(window.__TENANT__&&window.__TENANT__.slug)?window.__TENANT__.slug:'';
  if(!slug)return;
  apiFetch('/'+slug+'/api/admin/staff')
    .then(function(r){return r.json();})
    .then(function(data){
      var staff=Array.isArray(data)?data:Array.isArray(data.staff)?data.staff:[];
      var el=document.getElementById('dash-staff-body');
      if(!el)return;
      if(!staff.length){el.innerHTML='<div style="padding:28px;text-align:center;"><span class="material-symbols-outlined" style="font-size:36px;color:#e2e8f0;display:block;margin-bottom:6px;">badge</span><p style="font-size:12px;color:#94a3b8;margin-bottom:12px;">No staff members yet</p><button class="btn btn-primary btn-sm" onclick="go(\'staff\',null)" style="margin:0 auto;"><span class="material-symbols-outlined">person_add</span>Add Staff</button></div>';return;}
      var rc={'Driver':'b-transit','Document Controller':'b-delivered','Manager':'b-awaiting','Admin':'b-pending'};
      var html='<div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px;">';
      staff.slice(0,5).forEach(function(s){
        var bc=rc[s.role]||'b-pending';
        var statusBc=s.status==='active'||s.status==='Available'?'b-available':'b-maint';
        html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-radius:8px;">';
        html+='<div style="display:flex;align-items:center;gap:8px;"><div style="width:28px;height:28px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:14px;color:#64748b;">person</span></div><div><div style="font-size:12px;font-weight:700;color:#0f172a;">'+esc(s.full_name||s.name||'N/A')+'</div><div style="font-size:10px;color:#94a3b8;">'+esc(s.role||'Staff')+'</div></div></div>';
        html+='<span class="badge '+statusBc+'">'+esc(s.status||'Active')+'</span>';
        html+='</div>';
      });
      if(staff.length>5) html+='<div style="text-align:center;font-size:11px;color:#94a3b8;padding:4px;">+'+(staff.length-5)+' more</div>';
      html+='</div>';
      el.innerHTML=html;
    }).catch(function(){});
}

// â”€â”€ Dashboard Live Map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _dashMap=null;
var _dashMapLayers=[];
function _clearMapLayers(){
  _dashMapLayers.forEach(function(l){_dashMap.removeLayer(l);});
  _dashMapLayers=[];
}
function _addDot(lat,lng,color,radius,popup){
  var m=L.circleMarker([lat,lng],{radius:radius,fillColor:color,fillOpacity:1,color:'#fff',weight:3,opacity:1}).addTo(_dashMap);
  if(popup)m.bindPopup(popup);
  _dashMapLayers.push(m);
  return m;
}
// Fetch real road route from OSRM and draw it
function _drawOSRMRoute(pLat,pLng,dLat,dLng,isActive){
  var url='https://router.project-osrm.org/route/v1/driving/'+pLng+','+pLat+';'+dLng+','+dLat+'?overview=full&geometries=geojson';
  fetch(url).then(function(r){return r.json();}).then(function(data){
    if(!data.routes||!data.routes.length)return;
    var coords=data.routes[0].geometry.coordinates.map(function(c){return[c[1],c[0]];});
    // Bold shadow for depth
    var shadow=L.polyline(coords,{color:'#000',weight:isActive?10:8,opacity:0.15,lineCap:'round',lineJoin:'round'}).addTo(_dashMap);
    _dashMapLayers.push(shadow);
    // Thick, bold route line
    var route=L.polyline(coords,{color:isActive?'#2563eb':'#6366f1',weight:isActive?6:5,opacity:isActive?0.9:0.7,lineCap:'round',lineJoin:'round'}).addTo(_dashMap);
    _dashMapLayers.push(route);
  }).catch(function(){
    var line=L.polyline([[pLat,pLng],[dLat,dLng]],{color:isActive?'#2563eb':'#6366f1',weight:5,opacity:0.7,dashArray:'8 6'}).addTo(_dashMap);
    _dashMapLayers.push(line);
  });
}
function loadDashMap(){
  var mapEl=document.getElementById('dash-live-map');
  if(!mapEl)return;
  if(!_dashMap){
    var phBounds=L.latLngBounds([4.2,116.5],[21.3,127.0]);
    _dashMap=L.map(mapEl,{scrollWheelZoom:true,zoomControl:true,maxBounds:phBounds,maxBoundsViscosity:1.0,minZoom:6,maxZoom:18}).setView([12.5,122.0],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'Â© OpenStreetMap'}).addTo(_dashMap);
    setTimeout(function(){_dashMap.invalidateSize();},200);

  }
  _clearMapLayers();
  var allPts=[];
  var transit=_allShipments.filter(function(s){return s.status==='In Transit'||s.status==='Out for Delivery';});
  var pool=transit.length?transit:_allShipments;
  pool.forEach(function(s){
    var pLat=parseFloat(s.pickup_lat), pLng=parseFloat(s.pickup_lng);
    var dLat=parseFloat(s.dropoff_lat), dLng=parseFloat(s.dropoff_lng);
    var hasPickup=pLat&&pLng&&!isNaN(pLat)&&!isNaN(pLng);
    var hasDrop=dLat&&dLng&&!isNaN(dLat)&&!isNaN(dLng);
    if(!hasPickup&&!hasDrop)return;
    var isActive=(s.status==='In Transit'||s.status==='Out for Delivery');
    var typeLabel=s.item_type_flag||'PKG';
    var driverInfo=s.driver_name&&s.driver_name!=='Unassigned'?' Â· '+esc(s.driver_name):'';
    if(hasPickup){
      _addDot(pLat,pLng,'#22c55e',8,'<div style="font-size:12px;line-height:1.5;min-width:140px;"><strong>'+esc(s.delivery_number||'')+'</strong><br><span style="color:#22c55e;font-weight:700;">â–² Pickup</span><br>'+esc(s.pickup_location||'')+'<br><span style="font-size:10px;color:#94a3b8;">'+typeLabel+driverInfo+'</span></div>');
      allPts.push([pLat,pLng]);
    }
    if(hasDrop){
      _addDot(dLat,dLng,isActive?'#3b82f6':'#ef4444',isActive?10:8,'<div style="font-size:12px;line-height:1.5;min-width:140px;"><strong>'+esc(s.delivery_number||'')+'</strong><br><span style="color:'+(isActive?'#3b82f6':'#ef4444')+';font-weight:700;">â–¼ '+(isActive?'In Transit':'Dropoff')+'</span><br>'+esc(s.dropoff_location||'')+'<br><span style="font-size:10px;color:#94a3b8;">'+esc(s.status||'')+driverInfo+'</span></div>');
      allPts.push([dLat,dLng]);
    }
    if(hasPickup&&hasDrop){
      _drawOSRMRoute(pLat,pLng,dLat,dLng,isActive);
    }
  });
  if(allPts.length>0){
    _dashMap.fitBounds(L.latLngBounds(allPts),{padding:[40,40],maxZoom:14});
  }
}


// â”€â”€ Sales Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _srMonthlyChart=null, _srTypeChart=null;
var _srMonthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
var _srMonthShort=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Build full slot arrays so chart always shows complete range
function _buildFullChart(rawData, period){
  var slots=[], i;
  if(period==='daily'){
    // 24 hours: build lookup by hr
    var byHr={};
    (rawData||[]).forEach(function(d){byHr[Number(d.hr)]=d;});
    for(i=0;i<24;i++){
      var h=i;
      var label=(h===0?'12 AM':h===12?'12 PM':h<12?h+' AM':(h-12)+' PM');
      var r=byHr[i]||{};
      slots.push({label:label,paid:Number(r.paid_total)||0,pending:Number(r.pending_total)||0,count:Number(r.count)||0});
    }
  } else if(period==='weekly'){
    // Individual days of the current week block (1-7, 8-14, 15-21, 22-28, 29-end)
    var now=new Date();
    var daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    var currentDay=now.getDate();
    var weekBlock=Math.floor((currentDay-1)/7);
    var startDay=weekBlock*7+1;
    var endDay=Math.min(startDay+6, daysInMonth);
    var byDay={};
    (rawData||[]).forEach(function(d){byDay[Number(d.day_num)]=d;});
    for(var d=startDay;d<=endDay;d++){
      var label=_srMonthShort[now.getMonth()]+' '+d;
      var r=byDay[d]||{};
      slots.push({label:label,paid:Number(r.paid_total)||0,pending:Number(r.pending_total)||0,count:Number(r.count)||0});
    }
  } else if(period==='yearly'){
    // Just use the raw data as-is
    (rawData||[]).forEach(function(d){
      slots.push({label:String(d.yr),paid:Number(d.paid_total)||0,pending:Number(d.pending_total)||0,count:Number(d.count)||0});
    });
    if(!slots.length){
      slots.push({label:String(new Date().getFullYear()),paid:0,pending:0,count:0});
    }
  } else {
    // Monthly: all 12 months
    var byMo={};
    (rawData||[]).forEach(function(d){byMo[Number(d.mo)]=d;});
    for(i=1;i<=12;i++){
      var r=byMo[i]||{};
      slots.push({label:_srMonthNames[i-1],paid:Number(r.paid_total)||0,pending:Number(r.pending_total)||0,count:Number(r.count)||0});
    }
  }
  return slots;
}

function _renderSalesChart(chartData, period){
  var slots=_buildFullChart(chartData, period);
  var labels=slots.map(function(s){return s.label;});
  var paidVals=slots.map(function(s){return s.paid;});
  var pendingVals=slots.map(function(s){return s.pending;});
  var counts=slots.map(function(s){return s.count;});
  if(_srMonthlyChart)_srMonthlyChart.destroy();
  var ctx1=document.getElementById('sr-monthly-chart');
  if(ctx1){
    // Set explicit pixel size so Chart.js doesn't need to measure the container
    var w = (ctx1.parentElement ? ctx1.parentElement.clientWidth : 0) || 800;
    ctx1.width = w;
    ctx1.height = 260;
    _srMonthlyChart=new Chart(ctx1.getContext('2d'),{
      type:'bar',
      data:{
        labels:labels,
        datasets:[
          {label:'Collected',data:paidVals,backgroundColor:'#10b981',borderRadius:6,borderSkipped:false,yAxisID:'y',order:2,stack:'rev',maxBarThickness:60},
          {label:'Pending',data:pendingVals,backgroundColor:'#f59e0b',borderRadius:6,borderSkipped:false,yAxisID:'y',order:2,stack:'rev',maxBarThickness:60}
        ]
      },
      options:{
        responsive:false,
        plugins:{legend:{position:'bottom'}},
        scales:{
          y:{beginAtZero:true,stacked:true,position:'left',ticks:{callback:function(v){return'\u20b1'+v.toLocaleString();}},grid:{color:'#f1f5f9'}},
          x:{stacked:true,grid:{display:false}}
        }
      }
    });
  }
}
function loadSalesReportChart(period){
  var slug=(window.__TENANT__&&window.__TENANT__.slug)?window.__TENANT__.slug:'';
  apiFetch('/'+slug+'/api/admin/sales-report?period='+period).then(function(r){return r.json();}).then(function(data){
    _renderSalesChart(data.chart_data||[], period);
  }).catch(function(e){console.error('Chart refresh error:',e);});
}
function loadSalesReport(){
  var slug=(window.__TENANT__&&window.__TENANT__.slug)?window.__TENANT__.slug:'';
  var periodSel=document.getElementById('sr-period-select');
  var curPeriod=periodSel?periodSel.value:'monthly';
  apiFetch('/'+slug+'/api/admin/sales-report?period='+curPeriod).then(function(r){return r.json();}).then(function(data){
    // Stat cards
    document.getElementById('sr-rev-ytd').textContent='\u20b1'+Number(data.revenue_paid||0).toLocaleString();
    document.getElementById('sr-rev-all').textContent='\u20b1'+Number(data.revenue_total||0).toLocaleString();
    var avgDel=data.shipment_count>0?Math.round(data.revenue_total/data.shipment_count):0;
    document.getElementById('sr-avg-del').textContent='\u20b1'+avgDel.toLocaleString();
    document.getElementById('sr-pending').textContent='\u20b1'+Number(data.pending_amount||0).toLocaleString();
    document.getElementById('sr-pending-count').textContent=(data.pending_count||0)+' invoice'+(data.pending_count===1?'':'s');
    // Expense estimation: â‚±27/km (â‚±15 driver + â‚±12 fuel) or 30% fallback
    var totalBilled = Number(data.revenue_total||0);
    var estExpenses = data.total_distance_km ? (Number(data.total_distance_km) * 27) : (totalBilled * 0.30);
    var netProfit = totalBilled - estExpenses;
    var expEl = document.getElementById('sr-expenses');
    if(expEl) expEl.textContent='\u20b1'+Math.round(estExpenses).toLocaleString();
    var netEl = document.getElementById('sr-net-profit');
    if(netEl){ netEl.textContent='\u20b1'+Math.abs(Math.round(netProfit)).toLocaleString(); netEl.style.color=netProfit>=0?'#10b981':'#ef4444'; if(netProfit<0) netEl.textContent='-'+netEl.textContent; }

    // Render chart with current period selection
    _renderSalesChart(data.chart_data||[], curPeriod);

    // Store data globally for chart-only refresh
    window._srLastData=data;

    // Revenue by Type Doughnut
    var typeLabels=(data.by_type||[]).map(function(t){return t.type||'Other';});
    var typeValues=(data.by_type||[]).map(function(t){return Number(t.total)||0;});
    var typeColors=['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899'];
    if(_srTypeChart)_srTypeChart.destroy();
    var ctx2=document.getElementById('sr-type-chart');
    if(ctx2){
      var w2 = (ctx2.parentElement ? ctx2.parentElement.clientWidth : 0) || 400;
      ctx2.width = w2;
      ctx2.height = 220;
      _srTypeChart=new Chart(ctx2.getContext('2d'),{
        type:'doughnut',
        data:{
          labels:typeLabels,
          datasets:[{data:typeValues,backgroundColor:typeColors.slice(0,typeLabels.length),borderWidth:0,hoverOffset:6}]
        },
        options:{responsive:false,cutout:'70%',plugins:{legend:{position:'bottom'}}}
      });
    }

    // Top Clients Table
    var tcTb=document.getElementById('sr-top-clients-tbody');
    if(tcTb){
      if(!data.top_clients||!data.top_clients.length){
        tcTb.innerHTML='<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:20px;">No paid orders yet</td></tr>';
      } else {
        tcTb.innerHTML=data.top_clients.map(function(c){
          return '<tr><td>'+esc(c.client_name)+'</td><td>'+c.orders+'</td><td style="font-weight:700;">\u20b1'+Number(c.total||0).toLocaleString()+'</td></tr>';
        }).join('');
      }
    }

    // Recent Transactions Table
    var txTb=document.getElementById('sr-transactions-tbody');
    if(txTb){
      if(!data.recent_transactions||!data.recent_transactions.length){
        txTb.innerHTML='<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">No paid transactions yet</td></tr>';
      } else {
        txTb.innerHTML=data.recent_transactions.map(function(t){
          var d=t.paid_at?new Date(t.paid_at).toLocaleDateString():'â€”';
          var method=t.payment_method||'â€”';
          return '<tr><td style="font-family:monospace;font-size:11px;">'+esc(String(t.invoice_id))+'</td><td>'+esc(t.delivery_number||'')+'</td><td>'+esc(t.client_name||'Walk-in')+'</td><td><span style="background:#f1f5f9;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;">'+esc(method)+'</span></td><td style="font-weight:700;">\u20b1'+Number(t.total_amount||0).toLocaleString()+'</td><td style="font-size:12px;color:#64748b;">'+d+'</td></tr>';
        }).join('');
      }
    }
  }).catch(function(e){console.error('Sales report error:',e);});
}
function exportSalesReportCSV(){
  var rows=document.querySelectorAll('#sr-transactions-tbody tr');
  if(!rows.length)return;
  var csv='Invoice,Delivery,Client,Method,Amount,Date\n';
  rows.forEach(function(tr){
    var cells=tr.querySelectorAll('td');
    if(cells.length>=6){
      csv+='"'+cells[0].textContent+'","'+cells[1].textContent+'","'+cells[2].textContent+'","'+cells[3].textContent+'","'+cells[4].textContent+'","'+cells[5].textContent+'"\n';
    }
  });
  var blob=new Blob([csv],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='sales_report_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}
function exportSalesReportPDF(){
  // Clone the sales report section
  var srcEl = document.getElementById('s-sales-report');
  var clone = srcEl.cloneNode(true);

  // Convert all canvas charts to <img> tags so they appear in print
  var canvases = srcEl.querySelectorAll('canvas');
  var cloneCanvases = clone.querySelectorAll('canvas');
  for (var i = 0; i < canvases.length; i++) {
    try {
      var dataUrl = canvases[i].toDataURL('image/png', 1.0);
      var img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = 'width:100%;max-width:700px;height:auto;display:block;margin:0 auto;';
      cloneCanvases[i].parentNode.replaceChild(img, cloneCanvases[i]);
    } catch (e) { console.warn('Could not convert canvas to image:', e); }
  }

  // Remove the export buttons from the PDF
  var btns = clone.querySelectorAll('.btn');
  btns.forEach(function(b) { if (b.textContent.includes('Export')) b.remove(); });

  var win = window.open('', '_blank');
  win.document.write('<html><head><title>Sales Report</title>');
  win.document.write('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">');
  win.document.write('<style>');
  win.document.write('body{font-family:Inter,sans-serif;padding:32px 40px;color:#0f172a;max-width:900px;margin:0 auto;}');
  win.document.write('h1{font-size:20px;font-weight:800;margin-bottom:4px;}');
  win.document.write('h2{font-size:18px;font-weight:700;}');
  win.document.write('h3{font-size:15px;font-weight:700;}');
  win.document.write('table{width:100%;border-collapse:collapse;margin-bottom:16px;}');
  win.document.write('th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;font-size:12px;}');
  win.document.write('th{background:#f1f5f9;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;}');
  win.document.write('.card{border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px;overflow:hidden;}');
  win.document.write('.badge{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;}');
  win.document.write('.b-delivered{background:#dcfce7;color:#15803d;}');
  win.document.write('.b-pending{background:#fef9c3;color:#a16207;}');
  win.document.write('.b-declined{background:#fee2e2;color:#b91c1c;}');
  win.document.write('.b-transit{background:#dbeafe;color:#1d4ed8;}');
  win.document.write('select{display:none;}');
  win.document.write('@media print{@page{size:A4;margin:15mm;}}');
  win.document.write('</style></head><body>');
  win.document.write('<h1>Sales & Revenue Report - ' + new Date().toLocaleDateString() + '</h1>');
  win.document.write(clone.innerHTML);
  win.document.write('</body></html>');
  win.document.close();
  setTimeout(function(){ win.print(); }, 600);
}

// Auto-load dashboard widgets
loadDashFleet();
loadDashStaff();
setTimeout(loadDashMap, 500);
</script>

<script>
(function() {
  var t = window.__TENANT__;
  if (!t) return;
  var baseUrl = window.location.origin;
  var regUrl = baseUrl + '/' + t.slug + '/register';

  // Sync hidden color inputs with __TENANT__ values immediately
  var appHex = document.getElementById('set-bg-app-hex');
  var sideHex = document.getElementById('set-bg-sidebar-hex');
  var brandHex = document.getElementById('set-brand-color-hex');
  if (appHex && t.bg_app_color)     appHex.value = t.bg_app_color;
  if (sideHex && t.bg_sidebar_color) sideHex.value = t.bg_sidebar_color;
  if (brandHex && t.brand_color)     brandHex.value = t.brand_color;

  // Company logo
  if (t.logo_url) {
    var logoCont = document.getElementById('sidebar-logo-container');
    var logoImg = document.getElementById('sidebar-logo-img');
    if (logoCont && logoImg) {
      logoImg.src = t.logo_url;
      logoCont.style.display = 'block';
    }
  }

  // Company name
  var nameEl = document.getElementById('sidebar-tenant-name');
  if (nameEl) nameEl.textContent = t.company_name || 'Your Company';

  // Registration URLs
  var dashReg = document.getElementById('dashboard-reg-url');
  if (dashReg) dashReg.textContent = regUrl;

  var regPage = document.getElementById('reg-page-url');
  if (regPage) regPage.textContent = regUrl;

  var appUsersReg = document.getElementById('app-users-reg-url');
  if (appUsersReg) appUsersReg.textContent = regUrl;

  // Fix copy buttons if any
  document.querySelectorAll('[onclick*="your-workspace"], [data-copy]').forEach(function(el) {
    if (el.getAttribute('onclick') && el.getAttribute('onclick').includes('your-workspace')) {
      el.setAttribute('onclick', 'navigator.clipboard.writeText("' + regUrl + '")');
    }
  });

  // Auto-contrast text on page load
  function _lum(h) {
    if (!h) return 1;
    h = h.replace('#','');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
    return (0.299*r + 0.587*g + 0.114*b) / 255;
  }
  // App background text
  var appBg = t.bg_app_color;
  if (appBg) {
    var dark = _lum(appBg) < 0.5;
    var hc = dark ? '#ffffff' : '#0f172a';
    var sc = dark ? 'rgba(255,255,255,.85)' : '#334155';
    document.querySelectorAll('.ph-row h2').forEach(function(el){ el.style.color = hc; });
    document.querySelectorAll('.ph-row p').forEach(function(el){ el.style.color = sc; });
  }
  // Sidebar text
  var sideBg = t.bg_sidebar_color;
  if (sideBg) {
    var sd = _lum(sideBg) < 0.5;
    var nt = sd ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.6)';
    var na = sd ? '#ffffff' : '#0f172a';
    var ns = sd ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.45)';
    var tc = sd ? '#ffffff' : '#0f172a';
    var st = sd ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)';
    document.querySelectorAll('.nav-link').forEach(function(el){ if(!el.classList.contains('active')) el.style.color = nt; });
    document.querySelectorAll('.nav-link.active').forEach(function(el){ el.style.color = na; });
    document.querySelectorAll('.nav-sec').forEach(function(el){ el.style.color = ns; });
    var tn = document.querySelector('.tenant-name'); if(tn) tn.style.color = tc;
    var ts2 = document.querySelector('.tenant-sub'); if(ts2) ts2.style.color = st;
    var un = document.querySelector('.uname'); if(un) un.style.color = tc;
    var ue = document.querySelector('.uemail'); if(ue) ue.style.color = st;
  }
})();
</script>
<script>
function setBgType(type) {
  var imgSec = document.getElementById('bg-image-section');
  var colSec = document.getElementById('bg-color-section');
  var btnImg = document.getElementById('bg-type-btn-image');
  var btnCol = document.getElementById('bg-type-btn-color');
  if (type === 'color') {
    imgSec.style.display = 'none'; colSec.style.display = 'block';
    btnImg.style.background = '#fff'; btnImg.style.color = '#64748b';
    btnCol.style.background = '#0f2235'; btnCol.style.color = '#fff';
  } else {
    imgSec.style.display = 'flex'; colSec.style.display = 'none';
    btnImg.style.background = '#0f2235'; btnImg.style.color = '#fff';
    btnCol.style.background = '#fff'; btnCol.style.color = '#64748b';
  }
}
function clearBgImage() {
  var prev = document.getElementById('bg-preview');
  prev.innerHTML = '<span class="material-symbols-outlined" style="color:#cbd5e1;font-size:28px;">wallpaper</span>';
  delete prev.dataset.base64;
  document.getElementById('set-bg-file').value = '';
}
function updatePageBgPreview() {}
function updateHeroPreview() {
  var val = document.getElementById("set-hero-color-hex").value;
  var prev = document.getElementById("hero-color-preview");
  if(prev) prev.style.background = val;
  var sw = document.getElementById("hero-color-swatch");
  if(sw) sw.style.background = val;
}
function previewLogo(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('logo-preview');
    preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>';
    preview.dataset.base64 = e.target.result;
    if (typeof updateLandingPreview === 'function') updateLandingPreview();
  };
  reader.readAsDataURL(input.files[0]);
}
function previewBackground(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('bg-preview');
    preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>';
    preview.style.display = '';
    preview.dataset.base64 = e.target.result;
    if (typeof updateLandingPreview === 'function') updateLandingPreview();
  };
  reader.readAsDataURL(input.files[0]);
}

// FillList handles color inputs â€” native inputs removed
function updateColorPreview() {
  var bar = document.getElementById('color-preview-bar');
  var app = (document.getElementById('set-bg-app-hex') || {}).value || (window.__TENANT__ && window.__TENANT__.bg_app_color) || '#f1f5f9';
  var side = (document.getElementById('set-bg-sidebar-hex') || {}).value || (window.__TENANT__ && window.__TENANT__.bg_sidebar_color) || '#0f2235';
  
  if (bar) {
    if (app.includes('gradient')) {
      bar.style.background = app;
    } else {
      bar.style.background = 'linear-gradient(to right, ' + side + ' 30%, ' + app + ' 30%)';
    }
  }
  // DO NOT set CSS variables here â€” that's done by applyBranding() and FillList onChange
}

function loadSettings() {
  var t = window.__TENANT__;
  if (!t) return;
  var slug = t.slug;
  // Fast path: load lightweight settings (colors, text) â€” no image blobs
  apiFetch('/' + slug + '/api/admin/settings?t=' + Date.now())
    .then(function(r){ return r.json(); })
    .then(function(d) {
      if (d.company_name) document.getElementById('set-company').value = d.company_name;
      if (d.slug) document.getElementById('set-slug').value = d.slug;
      if (d.name) document.getElementById('set-name').value = d.name;
      if (d.email) document.getElementById('set-email').value = d.email;
      // Use API data, fall back to __TENANT__ values
      var _t = window.__TENANT__ || {};
      var _brand = d.brand_color || _t.brand_color;
      var _app = d.bg_app_color || _t.bg_app_color;
      var _side = d.bg_sidebar_color || _t.bg_sidebar_color;
      // Set ALL hidden inputs FIRST
      if (_brand) document.getElementById('set-brand-color-hex').value = _brand;
      if (_app)   document.getElementById('set-bg-app-hex').value = _app;
      if (_side)  document.getElementById('set-bg-sidebar-hex').value = _side;
      // Now update FillLists
      if (_brand && typeof _brandFL !== 'undefined' && _brandFL)     _brandFL.setValue(_brand);
      if (_app && typeof _appFL !== 'undefined' && _appFL)           _appFL.setValue(_app);
      if (_side && typeof _sidebarFL !== 'undefined' && _sidebarFL)  _sidebarFL.setValue(_side);

      // Handle hero/page colors (lightweight, already in response)
      if (!d.has_background && d.bg_hero_color) {
        document.getElementById('set-hero-color-hex').value = d.bg_hero_color;
        var hp = document.getElementById('hero-color-preview');
        if (hp) hp.style.background = d.bg_hero_color;
        if (typeof _heroFL !== 'undefined' && _heroFL) _heroFL.setValue(d.bg_hero_color);
        setBgType('color');
      } else {
        setBgType('image');
      }
      if (d.bg_page_color) {
        document.getElementById('set-page-bg-hex').value = d.bg_page_color;
        if (typeof _pageFL !== 'undefined' && _pageFL) _pageFL.setValue(d.bg_page_color);
      }
      updateColorPreview();
      applyBranding(d);
      if (typeof updateLandingPreview === 'function') updateLandingPreview();
      // Final contrast fix after all FillList setValue callbacks finish
      setTimeout(function(){ updateAppTextContrast(); updateSidebarTextContrast(); }, 100);

      // Lazy path: load images in background (these are large base64 blobs)
      if (d.has_logo || d.has_background) {
        apiFetch('/' + slug + '/api/admin/settings/images')
          .then(function(r2){ return r2.json(); })
          .then(function(img) {
            if (img.logo_url) {
              document.getElementById('logo-preview').innerHTML = '<img src="' + img.logo_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>';
              var lc = document.getElementById('sidebar-logo-container');
              var li = document.getElementById('sidebar-logo-img');
              if (lc && li) { li.src = img.logo_url; lc.style.display = 'block'; }
            }
            if (img.background_url) {
              document.getElementById('bg-preview').innerHTML = '<img src="' + img.background_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>';
              document.getElementById('bg-preview').dataset.base64 = img.background_url;
              setBgType('image');
            }
            if (typeof updateLandingPreview === 'function') updateLandingPreview();
          }).catch(function(e){ console.warn('[loadSettings] Image load deferred:', e.message); });
      }
    }).catch(function(err){ console.error('[loadSettings] Error:', err); });

  // Load pricing config
  apiFetch('/' + slug + '/api/admin/pricing')
    .then(function(r){ return r.json(); })
    .then(function(pc) {
      if (pc.base_fee != null) document.getElementById('price-base-fee').value = pc.base_fee;
      if (pc.driver_labor_per_km != null) document.getElementById('price-driver-labor').value = pc.driver_labor_per_km;
      if (pc.express_multiplier != null) document.getElementById('price-express-multi').value = pc.express_multiplier;
      if (pc.safety_fee != null) document.getElementById('price-safety-fee').value = pc.safety_fee;
      if (pc.fuel_rates) {
        ['motorcycle','sedan','van','truck','flatbed'].forEach(function(v) {
          var el = document.getElementById('price-fuel-' + v);
          if (el && pc.fuel_rates[v] != null) el.value = pc.fuel_rates[v];
        });
      }
      if (pc.weight_tiers && pc.weight_tiers.length >= 4) {
        for (var i = 0; i < 4; i++) {
          var el = document.getElementById('price-wt-' + (i+1));
          if (el) el.value = pc.weight_tiers[i].rate;
        }
      }
      if (pc.category_surcharges) {
        ['PACKAGE','FOOD','DOC','BULK','VEHICLE'].forEach(function(c) {
          var el = document.getElementById('price-cat-' + c);
          if (el && pc.category_surcharges[c] != null) el.value = pc.category_surcharges[c];
        });
      }
    }).catch(function(e){ console.warn('[loadSettings] Pricing load:', e.message); });
}

function applyBranding(d) {
  var brandCol = d.brand_color || (document.getElementById('set-brand-color-hex') || {}).value;
  var appCol = d.bg_app_color || (document.getElementById('set-bg-app-hex') || {}).value;
  var sideCol = d.bg_sidebar_color || (document.getElementById('set-bg-sidebar-hex') || {}).value;
  if (brandCol) document.documentElement.style.setProperty('--primary', brandCol);
  if (appCol) document.documentElement.style.setProperty('--app-bg', appCol);
  if (sideCol) document.documentElement.style.setProperty('--sidebar-bg', sideCol);
  // Use setTimeout to let the browser repaint, then read actual computed colors
  setTimeout(function(){ updateAppTextContrast(); updateSidebarTextContrast(); }, 0);
}

function _colorLum(col) {
  if (!col) return 1;
  // Handle gradient strings â€” weighted average by position (majority wins)
  if (col.includes('gradient')) {
    // Extract rgba + position pairs
    var pairs = [];
    var re = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)\s*([\d.]+)%/g;
    var match;
    while ((match = re.exec(col)) !== null) {
      var lum = (0.299*parseInt(match[1]) + 0.587*parseInt(match[2]) + 0.114*parseInt(match[3])) / 255;
      pairs.push({ lum: lum, pos: parseFloat(match[4]) });
    }
    if (pairs.length >= 2) {
      // Weighted average: each segment between stops, weighted by width
      pairs.sort(function(a, b) { return a.pos - b.pos; });
      var totalWeight = 0, totalLum = 0;
      for (var i = 0; i < pairs.length - 1; i++) {
        var width = pairs[i+1].pos - pairs[i].pos;
        var avgLum = (pairs[i].lum + pairs[i+1].lum) / 2;
        totalLum += avgLum * width;
        totalWeight += width;
      }
      return totalWeight > 0 ? totalLum / totalWeight : pairs[0].lum;
    }
    // Fallback: simple average if positions not found
    var stops = col.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g);
    if (stops && stops.length) {
      var total = 0;
      stops.forEach(function(s) {
        var m = s.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) total += (0.299*parseInt(m[1]) + 0.587*parseInt(m[2]) + 0.114*parseInt(m[3])) / 255;
      });
      return total / stops.length;
    }
    return 1;
  }
  // Handle rgb(r,g,b) or rgba(r,g,b,a)
  var m = col.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return (0.299*parseInt(m[1]) + 0.587*parseInt(m[2]) + 0.114*parseInt(m[3])) / 255;
  // Handle hex
  var hex = col.replace('#','');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if (hex.length !== 6) return 1;
  var r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 1;
  return (0.299*r + 0.587*g + 0.114*b) / 255;
}

function _getEffectiveBg(el) {
  var bg = getComputedStyle(el).backgroundColor;
  // If backgroundColor is transparent, check backgroundImage (gradients)
  if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
    bg = getComputedStyle(el).backgroundImage;
  }
  // Also check inline style.background which may have gradient
  if (!bg || bg === 'none') {
    bg = el.style.background || el.style.backgroundColor;
  }
  return bg || '';
}

function updateAppTextContrast(bgOverride) {
  var bg = bgOverride || _getEffectiveBg(document.body);
  var isDark = _colorLum(bg) < 0.5;
  var headColor = isDark ? '#ffffff' : '#0f172a';
  var subColor = isDark ? 'rgba(255,255,255,.85)' : '#334155';
  document.querySelectorAll('.ph-row h2').forEach(function(el){ el.style.color = headColor; });
  document.querySelectorAll('.ph-row p').forEach(function(el){ el.style.color = subColor; });
}

function updateSidebarTextContrast(bgOverride) {
  var sb = document.querySelector('.sidebar');
  if (!sb) return;
  var bg = bgOverride || _getEffectiveBg(sb);
  var isGrad = bg && bg.includes('gradient');
  var isDark = _colorLum(bg) < 0.5;

  var navText, navActive, navSec, tenant, subText;

  if (isDark) {
    navText = 'rgba(255,255,255,.7)'; navActive = '#ffffff'; navSec = 'rgba(255,255,255,.35)';
    tenant = '#ffffff'; subText = 'rgba(255,255,255,.55)';
  } else {
    navText = 'rgba(0,0,0,.6)'; navActive = '#0f172a'; navSec = 'rgba(0,0,0,.45)';
    tenant = '#0f172a'; subText = 'rgba(0,0,0,.5)';
  }

  document.querySelectorAll('.nav-link').forEach(function(el){
    el.style.backgroundColor = '';
    if(!el.classList.contains('active')) el.style.color = navText;
  });
  document.querySelectorAll('.nav-link.active').forEach(function(el){ el.style.color = navActive; el.style.backgroundColor = ''; });
  document.querySelectorAll('.nav-sec').forEach(function(el){ el.style.color = navSec; });
  var tn = document.querySelector('.tenant-name'); if(tn) tn.style.color = tenant;
  var ts = document.querySelector('.tenant-sub'); if(ts) ts.style.color = subText;
  var un = document.querySelector('.uname'); if(un) un.style.color = tenant;
  var ue = document.querySelector('.uemail'); if(ue) ue.style.color = subText;
}

async function resetToDefaults() {
  if (!confirm('Reset all settings to default? This will clear your logo, background, and all custom colors.')) return;
  var t = window.__TENANT__;
  if (!t) return;
  var slug = t.slug;

  // Default values
  var defaults = {
    brand_color: '#3b82f6',
    bg_app_color: '#f1f5f9',
    bg_sidebar_color: '#0f2235',
    bg_page_color: '#ffffff',
    bg_hero_color: null,
    logo_url: null,
    background_url: null
  };

  // Reset UI fields
  document.getElementById('set-brand-color-hex').value = defaults.brand_color;
  document.getElementById('set-bg-app-hex').value = defaults.bg_app_color;
  document.getElementById('set-bg-sidebar-hex').value = defaults.bg_sidebar_color;
  document.getElementById('set-page-bg-hex').value = defaults.bg_page_color;
  var heroHex = document.getElementById('set-hero-color-hex');
  if (heroHex) heroHex.value = '';

  // Reset fill lists if available
  if (typeof _brandFL !== 'undefined' && _brandFL && _brandFL.setValue) _brandFL.setValue(defaults.brand_color);
  if (typeof _appFL !== 'undefined' && _appFL && _appFL.setValue) _appFL.setValue(defaults.bg_app_color);
  if (typeof _sidebarFL !== 'undefined' && _sidebarFL && _sidebarFL.setValue) _sidebarFL.setValue(defaults.bg_sidebar_color);
  if (typeof _pageFL !== 'undefined' && _pageFL && _pageFL.setValue) _pageFL.setValue(defaults.bg_page_color);

  // Clear logo preview
  var logoPrev = document.getElementById('logo-preview');
  if (logoPrev) { logoPrev.innerHTML = '<span class="material-symbols-outlined" style="color:#cbd5e1;font-size:28px;">image</span>'; logoPrev.dataset.base64 = ''; }
  document.getElementById('set-logo-file').value = '';

  // Clear bg preview
  var bgPrev = document.getElementById('bg-preview');
  if (bgPrev) { bgPrev.innerHTML = '<span class="material-symbols-outlined" style="color:#cbd5e1;font-size:28px;">wallpaper</span>'; bgPrev.style.display = ''; bgPrev.dataset.base64 = ''; }
  document.getElementById('set-bg-file').value = '';
  setBgType('image');

  // Reset GUI scale
  setGuiScale('md');

  // Apply live
  document.body.style.background = defaults.bg_app_color;
  var sb = document.querySelector('.sidebar');
  if (sb) sb.style.background = defaults.bg_sidebar_color;
  document.documentElement.style.setProperty('--primary', defaults.brand_color);

  // Save to server
  try {
    var r = await apiFetch('/' + slug + '/api/admin/settings', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(defaults)
    });
    if (r.ok) {
      var toast = document.createElement('div');
      toast.textContent = 'âœ“ Reset to default!';
      toast.style.cssText = 'position:fixed;top:24px;right:24px;background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.15);';
      document.body.appendChild(toast);
      setTimeout(function(){ toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(function(){ toast.remove(); }, 300); }, 2500);
      loadSettings();
    } else {
      alert('Failed to reset settings.');
    }
  } catch(e) {
    alert('Error: ' + e.message);
  }
}

async function savePricing() {
  var t = window.__TENANT__;
  if (!t) return;
  var slug = t.slug;
  var btn = document.querySelector('[onclick="savePricing()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  var pricingPayload = {
    base_fee: parseFloat(document.getElementById('price-base-fee').value) || 50,
    driver_labor_per_km: parseFloat(document.getElementById('price-driver-labor').value) || 15,
    express_multiplier: parseFloat(document.getElementById('price-express-multi').value) || 1.8,
    safety_fee: parseFloat(document.getElementById('price-safety-fee').value) || 150,
    fuel_rates: {
      motorcycle: parseFloat(document.getElementById('price-fuel-motorcycle').value) || 2.20,
      sedan: parseFloat(document.getElementById('price-fuel-sedan').value) || 4.70,
      van: parseFloat(document.getElementById('price-fuel-van').value) || 6.11,
      truck: parseFloat(document.getElementById('price-fuel-truck').value) || 11.00,
      flatbed: parseFloat(document.getElementById('price-fuel-flatbed').value) || 15.71
    },
    weight_tiers: [
      { max_kg: 20, rate: parseFloat(document.getElementById('price-wt-1').value) || 2 },
      { max_kg: 100, rate: parseFloat(document.getElementById('price-wt-2').value) || 3 },
      { max_kg: 500, rate: parseFloat(document.getElementById('price-wt-3').value) || 2 },
      { max_kg: null, rate: parseFloat(document.getElementById('price-wt-4').value) || 1.5 }
    ],
    category_surcharges: {
      PACKAGE: parseFloat(document.getElementById('price-cat-PACKAGE').value) || 0,
      FOOD: parseFloat(document.getElementById('price-cat-FOOD').value) || 0,
      DOC: parseFloat(document.getElementById('price-cat-DOC').value) || 0,
      BULK: parseFloat(document.getElementById('price-cat-BULK').value) || 0,
      VEHICLE: parseFloat(document.getElementById('price-cat-VEHICLE').value) || 0
    }
  };
  try {
    var r = await apiFetch('/' + slug + '/api/admin/pricing', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(pricingPayload)
    });
    if (r.ok) {
      if (btn) { btn.textContent = 'âœ“ Saved!'; btn.style.background = '#16a34a'; }
      setTimeout(function(){ if(btn){ btn.disabled=false; btn.textContent='Save Pricing'; btn.style.background=''; } }, 2000);
    } else {
      alert('Failed to save pricing.');
      if (btn) { btn.disabled = false; btn.textContent = 'Save Pricing'; }
    }
  } catch(e) {
    alert('Error: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Save Pricing'; }
  }
}

async function saveSettings() {
  var t = window.__TENANT__;
  if (!t) return;
  var slug = t.slug;
  var logoBase64 = document.getElementById('logo-preview').dataset.base64 || null;
  var bgBase64   = document.getElementById('bg-preview').dataset.base64 || null;
  var isColorMode = document.getElementById('bg-color-section').style.display !== 'none';
  var payload = {
    company_name: document.getElementById('set-company').value.trim() || null,
    brand_color: document.getElementById('set-brand-color-hex').value.trim() || null,
    bg_app_color: document.getElementById('set-bg-app-hex').value.trim() || null,
    bg_sidebar_color: document.getElementById('set-bg-sidebar-hex').value.trim() || null,
    bg_page_color: document.getElementById('set-page-bg-hex').value.trim() || null,
    new_password: document.getElementById('set-password').value || null
  };
  // Logo: only include if freshly uploaded (prevents wiping existing DB value)
  if (logoBase64 && logoBase64.startsWith('data:')) payload.logo_url = logoBase64;
  // Background: in color mode clear image; in image mode only send if new file OR explicitly cleared
  if (isColorMode) {
    payload.background_url = null;
    var _hc = document.getElementById('set-hero-color-hex').value.trim();
    if (_hc) payload.bg_hero_color = _hc;
  } else {
    payload.bg_hero_color = null;
    if (bgBase64 && bgBase64.startsWith('data:')) {
      payload.background_url = bgBase64;
    } else if (!bgBase64) {
      // User clicked Remove and there's no image â€” explicitly clear
      payload.background_url = null;
    }
  }
  var btn = document.querySelector('[onclick="saveSettings()"]');
  if (!btn) btn = event && event.target ? event.target.closest('button') || event.target : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    var r = await apiFetch('/' + slug + '/api/admin/settings', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (_sessionExpired) return; // modal already shown, stop
    if (r.status && r.status >= 400) { alert('Failed to save. Please check your connection.'); return; }
    var d = await r.json();
    if (d.success) {
      if (btn) { btn.textContent = 'âœ“ Saved!'; btn.style.background = '#16a34a'; }
      // Update __TENANT__ with saved values so section switches don't use stale data
      if (payload.brand_color)      window.__TENANT__.brand_color = payload.brand_color;
      if (payload.bg_app_color)     window.__TENANT__.bg_app_color = payload.bg_app_color;
      if (payload.bg_sidebar_color) window.__TENANT__.bg_sidebar_color = payload.bg_sidebar_color;
      if (payload.bg_hero_color !== undefined) window.__TENANT__.bg_hero_color = payload.bg_hero_color;
      if (payload.bg_page_color)    window.__TENANT__.bg_page_color = payload.bg_page_color;
      if (payload.company_name)     window.__TENANT__.company_name = payload.company_name;
      if (payload.logo_url)         window.__TENANT__.logo_url = payload.logo_url;
      if (payload.background_url !== undefined) window.__TENANT__.background_url = payload.background_url;
      applyBranding(payload);

      // Pricing is now saved separately via savePricing()

      setTimeout(function(){ if(btn){ btn.disabled=false; btn.textContent='Save Changes'; btn.style.background=''; } }, 2000);
      return;
    } else {
      alert(d.error || 'Failed to save');
    }
  } catch(e) {
    alert('Error: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
}</script><script src="/public/gradient-picker.js"></script><script>
// â”€â”€ FillList init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _heroFL, _pageFL, _appFL, _sidebarFL, _brandFL;
window.addEventListener('load', function() {
  if(typeof FillList === 'undefined') return;

  _brandFL = new FillList(document.getElementById('brand-fill-list'), {
    value: (window.__TENANT__ && window.__TENANT__.brand_color) || (document.getElementById('set-brand-color-hex') || {}).value || '#3b82f6',
    onChange: function(v) {
      document.getElementById('set-brand-color-hex').value = v;
      document.documentElement.style.setProperty('--primary', v);
    }
  });

  _heroFL = new FillList(document.getElementById('hero-fill-list'), {
    value: '#0f172a',
    onChange: function(v) {
      document.getElementById('set-hero-color-hex').value = v;
      var prev = document.getElementById('hero-color-preview');
      if(prev) prev.style.background = v;
    }
  });

  _pageFL = new FillList(document.getElementById('page-fill-list'), {
    value: '#ffffff',
    onChange: function(v) {
      document.getElementById('set-page-bg-hex').value = v;
    }
  });

  _appFL = new FillList(document.getElementById('app-fill-list'), {
    value: (window.__TENANT__ && window.__TENANT__.bg_app_color) || (document.getElementById('set-bg-app-hex') || {}).value || '#f1f5f9',
    onChange: function(v) {
      document.getElementById('set-bg-app-hex').value = v;
      document.body.style.background = v;  // live apply
      updateAppTextContrast(v);  // immediate with value
      setTimeout(updateAppTextContrast, 0);  // after repaint
      updateColorPreview();
    }
  });

  _sidebarFL = new FillList(document.getElementById('sidebar-fill-list'), {
    value: (window.__TENANT__ && window.__TENANT__.bg_sidebar_color) || (document.getElementById('set-bg-sidebar-hex') || {}).value || '#0f2235',
    onChange: function(v) {
      document.getElementById('set-bg-sidebar-hex').value = v;
      var sb = document.querySelector('.sidebar'); if (sb) sb.style.background = v;  // live apply
      updateSidebarTextContrast(v);  // immediate with value
      setTimeout(updateSidebarTextContrast, 0);  // after repaint
      updateColorPreview();
    }
  });

  // Run contrast immediately and repeatedly to guarantee it applies
  updateAppTextContrast(); updateSidebarTextContrast();
  setTimeout(function(){ updateAppTextContrast(); updateSidebarTextContrast(); }, 100);
  setTimeout(function(){ updateAppTextContrast(); updateSidebarTextContrast(); }, 500);
});</script>
<script>
// Safety net: also run on DOMContentLoaded in case window.load is delayed
document.addEventListener('DOMContentLoaded', function() {
  if (typeof updateAppTextContrast === 'function') {
    setTimeout(function(){ updateAppTextContrast(); updateSidebarTextContrast(); }, 200);
  }
});
</script>

<!-- LIVE PREVIEW PANEL -->
<div id="lp-panel" style="display:none;position:fixed;right:24px;top:72px;width:520px;z-index:9999;font-family:'DM Sans',sans-serif;max-width:calc(100vw - 48px);">
  <div style="background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.18);border:1.5px solid #e2e8f0;overflow:hidden;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.06em;text-transform:uppercase;">Live Preview</span>
      <span style="font-size:10px;color:#94a3b8;">Updates as you change settings</span>
    </div>
    <div style="background:#f1f5f9;padding:8px 14px;display:flex;align-items:center;gap:6px;">
      <div style="width:9px;height:9px;border-radius:50%;background:#ef4444;"></div>
      <div style="width:9px;height:9px;border-radius:50%;background:#f59e0b;"></div>
      <div style="width:9px;height:9px;border-radius:50%;background:#22c55e;"></div>
      <div style="flex:1;background:#fff;border-radius:5px;padding:4px 10px;font-size:11px;color:#94a3b8;font-family:monospace;margin-left:6px;">logisticsos.io/workspace</div>
    </div>
    <div id="lpv-nav" style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#ffffff;transition:background .25s;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div id="lpv-logo" style="width:34px;height:34px;border-radius:7px;background:#e2e8f0;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#94a3b8;">&#9679;</div>
        <span id="lpv-name" style="font-size:15px;font-weight:700;color:#0f172a;">Company</span>
      </div>
      <span style="font-size:11px;color:#64748b;white-space:nowrap;">Client Login &rarr;</span>
    </div>
    <div id="lpv-hero" style="height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;border-radius:10px;margin:8px;transition:background .25s;background-size:cover;background-position:center;">
      <div id="lpv-title" style="font-size:20px;font-weight:800;color:#fff;margin-bottom:5px;">Company.</div>
      <div style="font-size:10px;color:rgba(255,255,255,.55);margin-bottom:10px;">The central portal for logistics</div>
      <div style="font-size:10px;padding:5px 16px;border:1.5px solid rgba(255,255,255,.4);border-radius:20px;color:#fff;">Get Started</div>
    </div>
    <div id="lpv-body" style="padding:12px 14px 16px;background:#f8fafc;transition:background .25s;background-size:cover;background-position:center;">
      <!-- Workspace Operations card mockup -->
      <div style="background:rgba(15,23,42,.82);border-radius:10px;padding:16px 18px;text-align:center;">
        <div style="height:8px;background:rgba(255,255,255,.5);border-radius:3px;width:55%;margin:0 auto 8px;"></div>
        <div style="height:6px;background:rgba(255,255,255,.2);border-radius:3px;width:75%;margin:0 auto 4px;"></div>
        <div style="height:6px;background:rgba(255,255,255,.15);border-radius:3px;width:60%;margin:0 auto 10px;"></div>
        <div style="display:flex;gap:8px;justify-content:center;">
          <div style="background:#3b82f6;border-radius:5px;padding:5px 14px;font-size:10px;color:#fff;font-weight:700;">Join Team</div>
          <div style="border:1px solid rgba(255,255,255,.4);border-radius:5px;padding:5px 14px;font-size:10px;color:#fff;">Staff Login</div>
        </div>
      </div>
      <div style="height:5px;background:rgba(255,255,255,.1);border-radius:3px;width:40%;margin:10px auto 0;"></div>
    </div>
  </div>
</div>

<script>
// Show panel only on Settings tab
(function(){
  var _go = window.go;
  window.go = function(id, btn) {
    _go(id, btn);
    var p = document.getElementById('lp-panel');
    if (p) p.style.display = (id === 'settings') ? 'block' : 'none';
  };
})();

// Live preview updater
function updateLandingPreview() {
  var pageCol = (document.getElementById('set-page-bg-hex')||{}).value || '#ffffff';
  var heroCol = (document.getElementById('set-hero-color-hex')||{}).value || '#0f172a';
  var cname   = (document.getElementById('set-company')||{}).value || 'Company';
  var logoPrev = document.getElementById('logo-preview');
  var bgPrev   = document.getElementById('bg-preview');
  var logoSrc  = (logoPrev && logoPrev.dataset.base64) ||
                 (logoPrev && logoPrev.querySelector('img') && logoPrev.querySelector('img').src) || null;
  var bgSrc    = bgPrev && bgPrev.dataset.base64;

  var nav  = document.getElementById('lpv-nav');
  var body = document.getElementById('lpv-body');
  var hero = document.getElementById('lpv-hero');
  var nameEl  = document.getElementById('lpv-name');
  var titleEl = document.getElementById('lpv-title');
  var logoBox = document.getElementById('lpv-logo');

  if (nav) {
    nav.style.background = pageCol;
    nav.style.backgroundSize = 'cover';
    nav.style.backgroundPosition = 'center';
  }
  if (body) {
    body.style.background = pageCol;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
  }
  if (nameEl)  nameEl.textContent  = cname;
  if (titleEl) titleEl.textContent = cname + '.';

  if (hero) {
    if (bgSrc && bgSrc.length > 10) {
      hero.style.backgroundImage = 'linear-gradient(rgba(15,23,42,.45),rgba(15,23,42,.45)),url(' + bgSrc + ')';
      hero.style.backgroundSize  = 'cover';
      hero.style.backgroundPosition = 'center center';
      hero.style.backgroundColor = '';
    } else {
      hero.style.backgroundImage = '';
      hero.style.backgroundSize  = '';
      hero.style.backgroundPosition = '';
      hero.style.background = heroCol;
    }
  }

  if (logoBox) {
    if (logoSrc && logoSrc.length > 10 && logoSrc.indexOf('undefined') < 0) {
      logoBox.innerHTML = '<img src="' + logoSrc + '" style="width:100%;height:100%;object-fit:contain;"/>';
      logoBox.style.background = 'transparent';
    } else {
      logoBox.innerHTML = '&#9679;';
      logoBox.style.background = '#e2e8f0';
    }
  }
}

// Poll every 150ms for any value change
var _lpSig = '';
setInterval(function() {
  var pc = (document.getElementById('set-page-bg-hex')||{}).value||'';
  var hc = (document.getElementById('set-hero-color-hex')||{}).value||'';
  var cn = (document.getElementById('set-company')||{}).value||'';
  var bgEl = document.getElementById('bg-preview');
  var bh = (bgEl && bgEl.dataset.base64) ? '1' : '0';
  var lgEl = document.getElementById('logo-preview');
  var lh = (lgEl && lgEl.dataset.base64) ? '1' : '0';
  var sig = pc+'|'+hc+'|'+cn+'|'+bh+'|'+lh;
  if (sig !== _lpSig) { _lpSig = sig; updateLandingPreview(); }
}, 150);

// Draggable panel
(function() {
  var panel = document.getElementById('lp-panel');
  if (!panel) return;
  var header = panel.querySelector('div > div:first-child');
  if (!header) return;
  header.style.cursor = 'grab';
  var dragging = false, ox = 0, oy = 0;
  header.addEventListener('mousedown', function(e) {
    dragging = true;
    var r = panel.getBoundingClientRect();
    panel.style.right = 'auto';
    panel.style.left = r.left + 'px';
    panel.style.top  = r.top  + 'px';
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    header.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    panel.style.left = (e.clientX - ox) + 'px';
    panel.style.top  = (e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', function() {
    dragging = false;
    header.style.cursor = 'grab';
  });
})();
</script>

<!-- â•â• ADD STAFF MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
<div id="modal-staff" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
  <div style="background:#fff;border-radius:20px;padding:32px;width:90%;max-width:440px;box-shadow:0 24px 60px rgba(0,0,0,0.25);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">Add Staff Member</div>
      <button onclick="closeStaffModal()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:22px;line-height:1;">&#x2715;</button>
    </div>
    <div id="staff-modal-err" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;font-size:13px;color:#dc2626;margin-bottom:16px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Full Name *</label>
        <input id="s-name" type="text" placeholder="e.g. Juan Dela Cruz" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;">
      </div>
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Role *</label>
        <select id="s-role" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;">
          <option value="">Select role...</option>
          <option value="Driver">Driver</option>
          <option value="Document Controller">Document Controller</option>
          <option value="Manager">Manager</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:14px;"><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Email Address *</label>
      <input id="s-email" type="email" placeholder="e.g. juan@email.com" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;">
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Any valid email address. Login credentials will be emailed here.</div>
    </div>
    <div style="margin-bottom:20px;"><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">License Expiry <span style="font-weight:400;color:#94a3b8;">(optional, for drivers)</span></label>
      <input id="s-license" type="date" min="2026-04-26" max="2031-04-26" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="closeStaffModal()" style="flex:1;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#fff;color:#64748b;font-family:inherit;">Cancel</button>
      <button id="staff-submit-btn" onclick="submitAddStaff()" style="flex:2;padding:12px;background:#0f2235;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
        <span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">person_add</span> Add & Send Email
      </button>
    </div>
  </div>
</div>

<!-- â•â• LICENSE REVIEW MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
<div id="modal-license" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
  <div style="background:#fff;border-radius:20px;padding:32px;width:90%;max-width:520px;box-shadow:0 24px 60px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;"><span class="material-symbols-outlined" style="vertical-align:middle;font-size:18px;color:#f59e0b;margin-right:6px;">verified</span>Review Driver License</div>
      <button onclick="closeLicenseModal()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:22px;line-height:1;">&#x2715;</button>
    </div>
    <div id="license-driver-name" style="font-weight:700;color:#334155;font-size:14px;margin-bottom:12px;"></div>
    <div id="license-img-wrap" style="background:#f1f5f9;border-radius:14px;padding:12px;margin-bottom:16px;text-align:center;min-height:120px;display:flex;align-items:center;justify-content:center;">
      <img id="license-img" src="" alt="License" style="max-width:100%;max-height:400px;border-radius:10px;display:none;" />
      <span id="license-no-img" style="color:#94a3b8;font-size:13px;">No license image uploaded</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div style="background:#f1f5f9;border-radius:10px;padding:10px 14px;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Current Status</div>
        <div id="license-cur-status" style="font-size:13px;font-weight:700;color:#334155;margin-top:2px;"></div>
      </div>
      <div style="background:#f1f5f9;border-radius:10px;padding:10px 14px;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Expiry Date</div>
        <div id="license-cur-expiry" style="font-size:13px;font-weight:700;color:#334155;margin-top:2px;"></div>
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <button id="license-reject-btn" onclick="licenseAction('reject')" style="flex:1;padding:12px;border:1.5px solid #fecaca;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#fef2f2;color:#dc2626;font-family:inherit;"><span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;margin-right:4px;">close</span>Reject</button>
      <button id="license-approve-btn" onclick="licenseAction('verify')" style="flex:2;padding:12px;background:#15803d;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;"><span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;margin-right:4px;">check_circle</span>Approve License</button>
    </div>
  </div>
</div>

<!-- â•â• ADD VEHICLE MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
<div id="modal-vehicle" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
  <div style="background:#fff;border-radius:20px;padding:32px;width:90%;max-width:440px;box-shadow:0 24px 60px rgba(0,0,0,0.25);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">Add Vehicle</div>
      <button onclick="closeVehicleModal()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:22px;line-height:1;">&#x2715;</button>
    </div>
    <div id="vehicle-modal-err" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;font-size:13px;color:#dc2626;margin-bottom:16px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Plate Number *</label>
        <input id="v-plate" type="text" placeholder="e.g. ABC-1234" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;text-transform:uppercase;">
      </div>
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Type *</label>
        <select id="v-type" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;">
          <option value="">Select type...</option>
          <option value="Truck">Truck</option>
          <option value="Van">Van</option>
          <option value="Motorcycle">Motorcycle</option>
          <option value="Sedan">Sedan</option>
          <option value="SUV">SUV</option>
          <option value="Pickup">Pickup</option>
          <option value="Trailer">Trailer</option>
          <option value="Flatbed">Flatbed</option>
          <option value="L300">L300</option>
          <option value="Elf Truck">Elf Truck</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Model / Description <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
      <input id="v-model" type="text" placeholder="e.g. Toyota Hi-Ace 2021" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Capacity (tons) *</label>
        <input id="v-capacity" type="number" min="0" step="0.1" placeholder="e.g. 2.5" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;">
      </div>
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Status *</label>
        <select id="v-status" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;">
          <option value="Available">Available</option>
          <option value="On-Duty">On-Duty</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Retired">Retired</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Ownership Type *</label>
        <select id="v-ownership" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;">
          <option value="company">Company-owned</option>
          <option value="employee">Employee-owned</option>
        </select>
      </div>
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Vehicle Image <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input id="v-image" type="file" accept="image/*" style="display:none;" onchange="previewVehicleImage(this)">
          <button type="button" onclick="document.getElementById('v-image').click()" style="padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;background:#fafbfc;color:#475569;font-family:inherit;"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">add_a_photo</span> Upload</button>
          <img id="v-image-preview" src="" style="display:none;width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;">
        </div>
      </div>
    </div>
    <!-- Ownership Document -->
    <div style="margin-bottom:20px;">
      <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:#f59e0b;">verified</span> Certificate of Registration / Official Receipt (CR/OR) *</label>
      <div id="v-doc-zone" style="border:2px dashed #e2e8f0;border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;background:#fafbfc;" onclick="document.getElementById('v-ownership-doc').click()" ondragover="event.preventDefault();this.style.borderColor='#3b82f6';this.style.background='#eff6ff'" ondragleave="this.style.borderColor='#e2e8f0';this.style.background='#fafbfc'" ondrop="handleDocDrop(event)">
        <input id="v-ownership-doc" type="file" accept="image/*,.pdf" style="display:none;" onchange="handleDocSelect(this)">
        <span class="material-symbols-outlined" style="font-size:28px;color:#94a3b8;">upload_file</span>
        <p style="font-size:12px;color:#64748b;margin-top:6px;">Click or drag to upload CR/OR document</p>
        <p style="font-size:10px;color:#94a3b8;margin-top:2px;">Accepts images or PDF (max 5MB)</p>
      </div>
      <div id="v-doc-preview" style="display:none;margin-top:8px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;color:#16a34a;display:flex;align-items:center;gap:8px;">
        <span class="material-symbols-outlined" style="font-size:16px;">check_circle</span>
        <span id="v-doc-filename">file.pdf</span>
        <button onclick="clearDocUpload()" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#dc2626;font-size:18px;line-height:1;">&times;</button>
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="closeVehicleModal()" style="flex:1;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#fff;color:#64748b;font-family:inherit;">Cancel</button>
      <button id="vehicle-submit-btn" onclick="submitAddVehicle()" style="flex:2;padding:12px;background:#0f2235;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
        <span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">directions_car</span> Add Vehicle
      </button>
    </div>
  </div>
</div>

<!-- â•â• UPDATE VEHICLE MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
<div id="modal-update-vehicle" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
  <div style="background:#fff;border-radius:20px;padding:32px;width:90%;max-width:440px;box-shadow:0 24px 60px rgba(0,0,0,0.25);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">Update Vehicle</div>
      <button onclick="closeUpdateVehicleModal()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:22px;line-height:1;">&#x2715;</button>
    </div>
    <div id="update-vehicle-modal-err" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;font-size:13px;color:#dc2626;margin-bottom:16px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Plate Number</label>
        <input id="u-v-plate" type="text" disabled style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;background:#f8fafc;color:#64748b;">
      </div>
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Type *</label>
        <select id="u-v-type" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;">
          <option value="">Select type...</option>
          <option value="Truck">Truck</option>
          <option value="Van">Van</option>
          <option value="Motorcycle">Motorcycle</option>
          <option value="Sedan">Sedan</option>
          <option value="SUV">SUV</option>
          <option value="Pickup">Pickup</option>
          <option value="Trailer">Trailer</option>
          <option value="Flatbed">Flatbed</option>
          <option value="L300">L300</option>
          <option value="Elf Truck">Elf Truck</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Model / Description <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
      <input id="u-v-model" type="text" placeholder="e.g. Toyota Hi-Ace 2021" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Capacity (tons) *</label>
        <input id="u-v-capacity" type="number" min="0" step="0.1" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;">
      </div>
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Status *</label>
        <select id="u-v-status" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;">
          <option value="Available">Available</option>
          <option value="On-Duty">On-Duty</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Retired">Retired</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Ownership Type</label>
        <select id="u-v-ownership" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;">
          <option value="company">Company-owned</option>
          <option value="employee">Employee-owned</option>
        </select>
      </div>
      <div><label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px;">Vehicle Image <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input id="u-v-image" type="file" accept="image/*" style="display:none;" onchange="previewUpdateVehicleImage(this)">
          <button type="button" onclick="document.getElementById('u-v-image').click()" style="padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;background:#fafbfc;color:#475569;font-family:inherit;"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">add_a_photo</span> Upload</button>
          <img id="u-v-image-preview" src="" style="display:none;width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;">
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="closeUpdateVehicleModal()" style="flex:1;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#fff;color:#64748b;font-family:inherit;">Cancel</button>
      <button id="update-vehicle-submit-btn" onclick="submitUpdateVehicle()" style="flex:2;padding:12px;background:#0f2235;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
        <span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">save</span> Save Changes
      </button>
    </div>
  </div>
</div>

<script>
// â”€â”€ Staff & Vehicle Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _staffData = [], _vehicleData = [], _staffTabFilter = 'All';
var _SLUG = (window.__TENANT__ && window.__TENANT__.slug) ? window.__TENANT__.slug : '';

function loadStaff() {
  apiFetch('/' + _SLUG + '/api/admin/staff').then(function(r){return r.json();}).then(function(rows) {
    _staffData = Array.isArray(rows) ? rows : [];
    renderStaff(_staffData);
  }).catch(function(){
    var tb = document.getElementById('staff-tbody');
    if(tb) tb.innerHTML = '<tr><td colspan="5"><div class="empty"><span class="material-symbols-outlined">error</span><p>Failed to load staff</p></div></td></tr>';
  });
}

function renderStaff(list) {
  var tb = document.getElementById('staff-tbody');
  if(!tb) return;
  if(!list || !list.length) { tb.innerHTML = '<tr><td colspan="7"><div class="empty"><span class="material-symbols-outlined">badge</span><p>No staff records found</p></div></td></tr>'; return; }
  var roleColors = {'Driver':'#ede9fe;color:#7c3aed','Document Controller':'#dcfce7;color:#15803d','Manager':'#dbeafe;color:#1d4ed8','Admin':'#fef3c7;color:#b45309'};
  tb.innerHTML = list.map(function(s) {
    var rc = roleColors[s.role] || '#f1f5f9;color:#64748b';
    var exp = s.license_expiry ? new Date(s.license_expiry).toLocaleDateString() : 'â€”';
    var sid = s.staff_id || s.id || '';
    var isSuspended = s.status === 'suspended';
    var suspendIcon = isSuspended ? 'play_arrow' : 'pause';
    var suspendColor = isSuspended ? '#10b981' : '#f59e0b';
    var hideBtns = s.is_current_user || s.role === 'Admin' || s.role === 'admin';
    var suspendBtn = (sid && !hideBtns) ? '<button onclick="toggleSuspend(\'' + sid + '\', ' + isSuspended + ')" style="background:none;border:none;cursor:pointer;color:' + suspendColor + ';padding:3px 6px;border-radius:6px;margin-right:4px;" title="' + (isSuspended ? 'Activate' : 'Suspend') + '"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">' + suspendIcon + '</span></button>' : '';
    var delBtn = (sid && !hideBtns) ? '<button onclick="deleteStaff(\'' + sid + '\',this)" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:3px 6px;border-radius:6px;" title="Remove"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">delete</span></button>' : '';
    // License status badge + review button (only for drivers)
    var licStatus = s.license_status || 'not_uploaded';
    var licBadge = 'â€”';
    if (s.role === 'Driver') {
      if (licStatus === 'verified') {
        licBadge = '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle;margin-right:2px;">check_circle</span>Verified</span>';
      } else if (licStatus === 'pending_review') {
        licBadge = '<button onclick="openLicenseModal(\'' + sid + '\')" style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;border:1px solid #fde68a;cursor:pointer;font-family:inherit;"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle;margin-right:2px;">schedule</span>Pending â€” Review</button>';
      } else if (licStatus === 'expired') {
        licBadge = '<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;">Expired</span>';
      } else {
        licBadge = '<span style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;">Not Uploaded</span>';
      }
    }
    return '<tr>' +
      '<td><strong>' + esc(s.name || s.first_name || 'â€”') + '</strong></td>' +
      '<td><span style="background:' + rc + ';padding:2px 9px;border-radius:99px;font-size:10px;font-weight:700;">' + esc(s.role||'â€”') + '</span></td>' +
      '<td style="font-family:monospace;font-size:12px;">' + esc(s.username||'â€”') + '</td>' +
      '<td>' + exp + '</td>' +
      '<td>' + licBadge + '</td>' +
      '<td><span class="badge ' + (s.status==='active'||s.status==='Available'?'b-delivered':(isSuspended?'b-declined':'b-pending')) + '">' + esc(s.status||'â€”') + '</span></td>' +
      '<td>' + suspendBtn + delBtn + '</td></tr>';
  }).join('');
  // Update pending license badge on Staff nav
  var pendingCount = list.filter(function(s) { return s.role === 'Driver' && s.license_status === 'pending_review'; }).length;
  var badge = document.getElementById('staff-pending-badge');
  if (badge) { badge.textContent = pendingCount; badge.style.display = pendingCount > 0 ? '' : 'none'; }
}

function filterStaffTab(role, btn) {
  _staffTabFilter = role;
  document.querySelectorAll('#s-staff .tab').forEach(function(t){t.classList.remove('active');});
  if(btn) btn.classList.add('active');
  var filtered = role === 'All' ? _staffData : _staffData.filter(function(s){return s.role === role;});
  renderStaff(filtered);
}
function filterStaffStatus(val) {
  var filtered = val ? _staffData.filter(function(s){return (s.status||'').toLowerCase().includes(val.toLowerCase());}) : _staffData;
  if(_staffTabFilter !== 'All') filtered = filtered.filter(function(s){return s.role === _staffTabFilter;});
  renderStaff(filtered);
}

function loadVehicles() {
  apiFetch('/' + _SLUG + '/api/admin/vehicles').then(function(r){return r.json();}).then(function(rows) {
    _vehicleData = Array.isArray(rows) ? rows : [];
    renderVehicles(_vehicleData);
  }).catch(function(){
    var tb = document.getElementById('vehicles-tbody');
    if(tb) tb.innerHTML = '<tr><td colspan="7"><div class="empty"><span class="material-symbols-outlined">error</span><p>Failed to load vehicles</p></div></td></tr>';
  });
  loadVehicleRequests();
  loadPackageCategories();
}

function renderVehicles(list) {
  var tb = document.getElementById('vehicles-tbody');
  if(!tb) return;
  if(!list || !list.length) { tb.innerHTML = '<tr><td colspan="9"><div class="empty"><span class="material-symbols-outlined">directions_car</span><p>No vehicles registered</p></div></td></tr>'; return; }
  var stColors = {'Available':'b-delivered','On-Duty':'b-transit','Maintenance':'b-awaiting','Retired':'b-declined'};
  tb.innerHTML = list.map(function(v) {
    var plate = v.plate_number || '';
    var delBtn    = plate ? '<button onclick="deleteVehicle(\'' + plate + '\',this)" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:3px 6px;border-radius:6px;" title="Remove"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">delete</span></button>' : '';
    var updateBtn = plate ? '<button onclick="openUpdateVehicleModal(\'' + plate + '\', \'' + (v.vehicle_type||'') + '\', \'' + (v.capacity_tons||'') + '\', \'' + (v.status||'Available') + '\', \'' + esc(v.model||'') + '\', \'' + (v.ownership_type||'company') + '\', \'' + (v.image_url ? '1' : '') + '\')" style="background:none;border:none;cursor:pointer;color:#3b82f6;padding:3px 6px;border-radius:6px;" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">edit</span></button>' : '';
    var assignBtn = (plate && v.status === 'Available') ? '<button onclick="openAssignVehicleModal(\'' + plate + '\')" style="background:none;border:none;cursor:pointer;color:#f59e0b;padding:3px 6px;border-radius:6px;" title="Assign to Driver"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">person_add</span></button>' : '';
    var ownerBadge = v.ownership_type === 'employee' ? '<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#fef3c7;color:#d97706;">Employee</span>' : '<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#dbeafe;color:#2563eb;">Company</span>';
    var imgCell = v.image_url
      ? '<div onclick="viewVehicleImage(\'' + v.image_url.replace(/'/g, "\\'") + '\', \'' + esc(plate) + '\')" style="cursor:pointer;" title="Click to zoom"><img src="' + v.image_url + '" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;transition:transform .15s;" onmouseover="this.style.transform=\'scale(1.15)\'" onmouseout="this.style.transform=\'scale(1)\'"></div>'
      : '<div onclick="showNoImageToast()" style="width:36px;height:36px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="No image available"><span class="material-symbols-outlined" style="font-size:18px;color:#94a3b8;">directions_car</span></div>';
    return '<tr>' +
      '<td>' + imgCell + '</td>' +
      '<td><strong style="font-family:monospace;">' + esc(v.plate_number||'â€”') + '</strong></td>' +
      '<td>' + esc(v.vehicle_type||'â€”') + '</td>' +
      '<td style="color:#64748b;font-size:12px;">' + esc(v.model||'â€”') + '</td>' +
      '<td>' + (v.capacity_tons || 'â€”') + '</td>' +
      '<td>' + ownerBadge + '</td>' +
      '<td><span class="badge ' + (stColors[v.status]||'b-pending') + '">' + esc(v.status||'â€”') + '</span></td>' +
      '<td>' + esc(v.assigned_driver_name||'â€”') + '</td>' +
      '<td><div style="display:flex;gap:2px;">' + assignBtn + updateBtn + delBtn + '</div></td></tr>';
  }).join('');
}

// â”€â”€ Vehicle Image Lightbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function viewVehicleImage(url, plate) {
  var overlay = document.getElementById('vehicle-img-lightbox');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'vehicle-img-lightbox';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;opacity:0;transition:opacity .25s;cursor:pointer;';
    overlay.innerHTML = '<div id="vimg-title" style="color:#fff;font-size:14px;font-weight:700;letter-spacing:.03em;"></div><img id="vimg-src" src="" style="max-width:85vw;max-height:75vh;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);object-fit:contain;"><div style="color:#94a3b8;font-size:12px;margin-top:4px;">Click anywhere to close</div>';
    overlay.onclick = function() { overlay.style.opacity = '0'; setTimeout(function(){ overlay.style.display = 'none'; }, 250); };
    document.body.appendChild(overlay);
  }
  document.getElementById('vimg-title').textContent = plate ? 'Vehicle: ' + plate : 'Vehicle Image';
  document.getElementById('vimg-src').src = url;
  overlay.style.display = 'flex';
  requestAnimationFrame(function() { overlay.style.opacity = '1'; });
}

function showNoImageToast() {
  var t = document.getElementById('no-img-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'no-img-toast';
    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 22px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;display:flex;align-items:center;gap:8px;box-shadow:0 8px 30px rgba(0,0,0,0.2);transition:opacity .3s;';
    t.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;color:#f59e0b;">image_not_supported</span> No vehicle image available';
    document.body.appendChild(t);
  }
  t.style.opacity = '1'; t.style.display = 'flex';
  clearTimeout(window._noImgTimer);
  window._noImgTimer = setTimeout(function() { t.style.opacity = '0'; setTimeout(function(){ t.style.display = 'none'; }, 300); }, 2500);
}

// â”€â”€ Package Categories (global tenant-level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _ALL_PKG_CATS = ['Package','Food','Document','Bulk','Vehicle'];
// Display labels â€” internal DB keys stay the same so mobile mapping works
var _PKG_CAT_LABELS = { Package: 'Standard Package', Food: 'Food', Document: 'Document', Bulk: 'Bulk Freight', Vehicle: 'Vehicle' };
var _activePkgCats = [];
function loadPackageCategories() {
  apiFetch('/' + _SLUG + '/api/admin/package-categories').then(function(r){return r.json();}).then(function(d) {
    _activePkgCats = d.categories || _ALL_PKG_CATS;
    renderPackageCategories();
  });
}
function renderPackageCategories() {
  var el = document.getElementById('pkg-cat-list');
  if(!el) return;
  el.innerHTML = _ALL_PKG_CATS.map(function(cat) {
    var on = _activePkgCats.includes(cat);
    var label = _PKG_CAT_LABELS[cat] || cat;
    return '<button onclick="togglePkgCat(\'' + cat + '\')" style="' +
      'display:inline-flex;align-items:center;gap:7px;padding:7px 16px;border-radius:999px;border:none;cursor:pointer;font-size:12px;font-weight:700;transition:all 0.15s;' +
      (on ? 'background:#16a34a;color:#fff;box-shadow:0 2px 8px rgba(22,163,74,0.3);' : 'background:#f1f5f9;color:#94a3b8;') + '">' +
      '<span style="font-size:14px;">' + (on ? 'âœ“' : 'âœ•') + '</span>' + label +
    '</button>';
  }).join('');
}
function togglePkgCat(cat) {
  var idx = _activePkgCats.indexOf(cat);
  if(idx > -1) { _activePkgCats.splice(idx, 1); }
  else          { _activePkgCats.push(cat); }
  renderPackageCategories();
}
async function savePackageCategories() {
  var btn = document.getElementById('pkg-cat-save-btn');
  if(btn) { btn.disabled = true; btn.textContent = 'Savingâ€¦'; }
  try {
    await apiFetch('/' + _SLUG + '/api/admin/package-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: _activePkgCats })
    });
    if(btn) { btn.textContent = 'âœ“ Saved'; btn.style.background = '#16a34a'; }
    setTimeout(function() {
      if(btn) { btn.disabled = false; btn.textContent = 'Save Changes'; btn.style.background = ''; }
    }, 2000);
  } catch(e) {
    if(btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    alert('Failed to save. Please try again.');
  }
}

// â”€â”€ Vehicle Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadVehicleRequests() {
  var el = document.getElementById('vehicle-requests-list');
  if(!el) return;
  apiFetch('/' + _SLUG + '/api/admin/vehicle-requests').then(function(r){return r.json();}).then(function(rows) {
    var pending = Array.isArray(rows) ? rows.filter(function(r){return r.status==='pending';}) : [];
    if(!pending.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:8px 0;">No pending requests</p>';
      return;
    }
    el.innerHTML = pending.map(function(r) {
      var isAssignment = r.request_type === 'staff_assignment';
      var flagHtml = r.refusal_count >= 3
        ? '<span style="background:#fef2f2;color:#dc2626;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;margin-left:6px;">âš  ' + r.refusal_count + 'x refused</span>'
        : (r.refusal_count > 0 ? '<span style="background:#fff7ed;color:#ea580c;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:6px;">' + r.refusal_count + 'x refused</span>' : '');
      var typeLabel = isAssignment
        ? '<span style="background:#ede9fe;color:#7c3aed;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;">STAFF ASSIGNED</span>'
        : '<span style="background:#dbeafe;color:#1d4ed8;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;">DRIVER REQUEST</span>';
      var approveBtn = !isAssignment ? '<button class="btn btn-primary btn-sm" style="font-size:11px;padding:4px 12px;" onclick="approveVehicleRequest(' + r.id + ')">âœ“ Approve</button>' : '';
      var denyBtn = '<button class="btn btn-sm" style="font-size:11px;padding:4px 12px;background:var(--bg-2);" onclick="denyVehicleRequest(' + r.id + ')">âœ• Deny</button>';
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
            typeLabel + flagHtml +
            '<strong style="font-family:monospace;font-size:13px;">' + esc(r.vehicle_plate) + '</strong>' +
          '</div>' +
          '<p style="margin:2px 0 0;font-size:11px;color:var(--text-muted);">' + esc(r.driver_name) + ' Â· ' + esc(r.vehicle_type) + (r.model ? ' Â· ' + esc(r.model) : '') + '</p>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0;">' + approveBtn + denyBtn + '</div>' +
      '</div>';
    }).join('');
  }).catch(function(){
    el.innerHTML = '<p style="color:#ef4444;font-size:12px;text-align:center;">Failed to load requests</p>';
  });
}

async function approveVehicleRequest(id) {
  if(!confirm('Approve this vehicle request? The vehicle will be assigned to the driver.')) return;
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicle-requests/' + id + '/approve', { method: 'PUT' });
    var d = await r.json();
    if(!r.ok) { alert(d.error || 'Failed'); return; }
    loadVehicles();
  } catch(e) { alert('Network error.'); }
}

async function denyVehicleRequest(id) {
  if(!confirm('Deny this request?')) return;
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicle-requests/' + id + '/deny', { method: 'PUT' });
    if(!r.ok) { alert('Failed to deny.'); return; }
    loadVehicleRequests();
  } catch(e) { alert('Network error.'); }
}

// â”€â”€ Assign Vehicle to Driver modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _assignVehiclePlate = '';
async function openAssignVehicleModal(plate) {
  _assignVehiclePlate = plate;
  // Auto-load staff if not loaded yet (e.g. user hasn't visited Staff tab)
  if (!_staffData || !_staffData.length) {
    try {
      var r = await apiFetch('/' + _SLUG + '/api/admin/staff');
      var d = await r.json();
      _staffData = Array.isArray(d) ? d : (d.staff || []);
    } catch(e) { _staffData = []; }
  }
  var drivers = (_staffData||[]).filter(function(s){return s.role==='Driver' && !s.vehicle_plate;});
  if(!drivers.length) { alert('No unassigned drivers found. All drivers already have vehicles assigned.'); return; }
  var opts = drivers.map(function(d){return '<option value="'+d.staff_id+'">'+esc(d.name)+'</option>';}).join('');
  var html = '<div style="padding:28px 24px 24px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="color:#fff;font-size:20px;">person_add</span></div>' +
        '<div><div style="font-size:15px;font-weight:800;color:#0f172a;">Assign Driver</div><div style="font-size:11px;color:#94a3b8;font-family:monospace;">' + plate + '</div></div>' +
      '</div>' +
      '<button onclick="document.getElementById(\'assign-vehicle-modal\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:20px;line-height:1;padding:4px;">&#x2715;</button>' +
    '</div>' +
    '<label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:6px;">Select Driver</label>' +
    '<div style="position:relative;margin-bottom:14px;">' +
      '<select id="assign-driver-select" style="width:100%;padding:12px 40px 12px 14px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;color:#0f172a;font-size:13px;font-weight:600;font-family:inherit;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;box-sizing:border-box;">' + opts + '</select>' +
      '<span class="material-symbols-outlined" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:20px;color:#64748b;pointer-events:none;">expand_more</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px;padding:10px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:20px;">' +
      '<span class="material-symbols-outlined" style="font-size:14px;color:#0284c7;">info</span>' +
      '<p style="font-size:11px;color:#0369a1;margin:0;">Driver will receive a notification and must accept the assignment.</p>' +
    '</div>' +
    '<div style="display:flex;gap:10px;">' +
      '<button onclick="document.getElementById(\'assign-vehicle-modal\').style.display=\'none\'" style="flex:1;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#fff;color:#64748b;font-family:inherit;">Cancel</button>' +
      '<button onclick="submitAssignVehicle()" style="flex:2;padding:12px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;"><span class="material-symbols-outlined" style="font-size:16px;">send</span> Send Assignment</button>' +
    '</div>' +
  '</div>';
  var modal = document.getElementById('assign-vehicle-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'assign-vehicle-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    document.body.appendChild(modal);
  }
  modal.innerHTML = '<div style="background:#fff;border-radius:20px;width:100%;max-width:420px;box-shadow:0 24px 64px rgba(0,0,0,0.2);">' + html + '</div>';
  modal.style.display = 'flex';
  modal.onclick = function(e){ if(e.target===modal) document.getElementById('assign-vehicle-modal').style.display='none'; };
}

async function deleteStaff(id, btn) {
  if(!id || !confirm('Remove this staff member? This cannot be undone.')) return;
  btn.disabled = true; btn.style.opacity = '0.4';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/staff/' + id, { method: 'DELETE' });
    var d = await r.json();
    if(!r.ok) { alert(d.error || 'Delete failed.'); btn.disabled = false; btn.style.opacity = '1'; return; }
    loadStaff();
  } catch(e) { alert('Network error.'); btn.disabled = false; btn.style.opacity = '1'; }
}

async function toggleSuspend(id, isSuspended) {
  var actionStr = isSuspended ? 'Activate' : 'Suspend';
  if(!id || !confirm(actionStr + ' this staff member?')) return;
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/staff/' + id + '/suspend', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: !isSuspended })
    });
    var d = await r.json();
    if(!r.ok) { alert(d.error || actionStr + ' failed.'); return; }
    loadStaff();
  } catch(e) { alert('Network error.'); }
}

async function deleteVehicle(id, btn) {
  if(!id || !confirm('Remove this vehicle? This cannot be undone.')) return;
  btn.disabled = true; btn.style.opacity = '0.4';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicles/' + id, { method: 'DELETE' });
    var d = await r.json();
    if(!r.ok) { alert(d.error || 'Delete failed.'); btn.disabled = false; btn.style.opacity = '1'; return; }
    loadVehicles();
  } catch(e) { alert('Network error.'); btn.disabled = false; btn.style.opacity = '1'; }
}

// Hook navigation to load staff/vehicles
var _origGoAdmin = window.go;
window.go = function(id, btn) {
  _origGoAdmin(id, btn);
  if(id === 'staff')    loadStaff();
  if(id === 'vehicles') loadVehicles();
};

// â”€â”€ Staff Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openStaffModal() {
  document.getElementById('s-name').value = '';
  document.getElementById('s-email').value = '';
  document.getElementById('s-role').value = '';
  document.getElementById('s-license').value = '';
  document.getElementById('staff-modal-err').style.display = 'none';
  document.getElementById('modal-staff').style.display = 'flex';
}
function closeStaffModal() { document.getElementById('modal-staff').style.display = 'none'; }

async function submitAddStaff() {
  var name  = document.getElementById('s-name').value.trim();
  var email = document.getElementById('s-email').value.trim();
  var role  = document.getElementById('s-role').value;
  var lic   = document.getElementById('s-license').value;
  var errEl = document.getElementById('staff-modal-err');
  var btn   = document.getElementById('staff-submit-btn');
  errEl.style.display = 'none';

  if(!name || !email || !role) { errEl.textContent = 'Please fill in all required fields.'; errEl.style.display = 'block'; return; }
  if(!email.includes('@') || !email.includes('.')) { errEl.textContent = 'Please enter a valid email address.'; errEl.style.display = 'block'; return; }

  btn.disabled = true; btn.textContent = 'Adding...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/staff', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name, email, role, license_expiry: lic || null})
    });
    var d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Failed to add staff.');
    closeStaffModal();
    loadStaff();
    alert('âœ… Staff added! A welcome email with login credentials has been sent to ' + email + '.');
  } catch(e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">person_add</span> Add & Send Email';
}

// â”€â”€ License Review Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _licenseStaffId = null;
function openLicenseModal(staffId) {
  _licenseStaffId = staffId;
  var s = _staffData.find(function(x) { return String(x.staff_id || x.id) === String(staffId); });
  if (!s) return alert('Staff not found.');
  document.getElementById('license-driver-name').textContent = (s.name || 'Driver') + ' â€” ' + (s.role || '');
  var statusLabels = { not_uploaded: 'Not Uploaded', pending_review: 'Pending Review', verified: 'Verified', expired: 'Expired' };
  document.getElementById('license-cur-status').textContent = statusLabels[s.license_status] || s.license_status || 'Unknown';
  document.getElementById('license-cur-expiry').textContent = s.license_expiry ? new Date(s.license_expiry).toLocaleDateString() : 'Not set';
  var img = document.getElementById('license-img');
  var noImg = document.getElementById('license-no-img');
  if (s.license_url && s.license_url.length > 10) {
    img.src = s.license_url;
    img.style.display = 'block';
    noImg.style.display = 'none';
  } else {
    img.style.display = 'none';
    noImg.style.display = 'block';
  }
  document.getElementById('modal-license').style.display = 'flex';
}
function closeLicenseModal() { document.getElementById('modal-license').style.display = 'none'; _licenseStaffId = null; }
async function licenseAction(action) {
  if (!_licenseStaffId) return;
  var label = action === 'verify' ? 'approve' : 'reject';
  if (!confirm('Are you sure you want to ' + label + ' this license?')) return;
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/staff/' + _licenseStaffId + '/license', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed.');
    closeLicenseModal();
    loadStaff();
    alert('âœ… ' + d.message);
  } catch (e) { alert('âŒ ' + e.message); }
}

// â”€â”€ Vehicle Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openVehicleModal() {
  document.getElementById('v-plate').value = '';
  document.getElementById('v-type').value = '';
  document.getElementById('v-model').value = '';
  document.getElementById('v-capacity').value = '';
  document.getElementById('v-status').value = 'Available';
  document.getElementById('v-ownership').value = 'company';
  var imgPreview = document.getElementById('v-image-preview');
  if(imgPreview) { imgPreview.style.display = 'none'; imgPreview.src = ''; }
  window._vehicleImageBase64 = null;
  document.getElementById('vehicle-modal-err').style.display = 'none';
  clearDocUpload();
  document.getElementById('modal-vehicle').style.display = 'flex';
}

function previewVehicleImage(input) {
  if(!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    window._vehicleImageBase64 = e.target.result;
    var preview = document.getElementById('v-image-preview');
    if(preview) { preview.src = e.target.result; preview.style.display = 'block'; }
  };
  reader.readAsDataURL(input.files[0]);
}
function closeVehicleModal() { document.getElementById('modal-vehicle').style.display = 'none'; }

async function submitAddVehicle() {
  var plate    = document.getElementById('v-plate').value.trim();
  var type     = document.getElementById('v-type').value;
  var model    = document.getElementById('v-model').value.trim();
  var capacity = document.getElementById('v-capacity').value;
  var status   = document.getElementById('v-status').value;
  var errEl    = document.getElementById('vehicle-modal-err');
  var btn      = document.getElementById('vehicle-submit-btn');
  errEl.style.display = 'none';

  if(!plate || !type || !capacity || !status) { errEl.textContent = 'All fields are required.'; errEl.style.display = 'block'; return; }
  if(!window._vehicleDocBase64) { errEl.textContent = 'Please upload the CR/OR (Certificate of Registration / Official Receipt) document.'; errEl.style.display = 'block'; return; }

  var ownership = document.getElementById('v-ownership').value;
  btn.disabled = true; btn.textContent = 'Adding...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicles', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({plate_number: plate, type, model: model || null, capacity_tons: capacity, status, ownership_type: ownership, ownership_doc: window._vehicleDocBase64, image_base64: window._vehicleImageBase64 || null})
    });
    var d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Failed to add vehicle.');
    closeVehicleModal();
    loadVehicles();
    alert('âœ… Vehicle ' + plate.toUpperCase() + ' added successfully!');
  } catch(e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">directions_car</span> Add Vehicle';
}

function openUpdateVehicleModal(plate, type, capacity, status, model, ownership, hasImage) {
  document.getElementById('u-v-plate').value = plate;
  document.getElementById('u-v-type').value = type;
  document.getElementById('u-v-model').value = model || '';
  document.getElementById('u-v-capacity').value = capacity;
  document.getElementById('u-v-status').value = status;
  document.getElementById('u-v-ownership').value = ownership || 'company';
  window._updateVehicleImageBase64 = null;
  var imgPrev = document.getElementById('u-v-image-preview');
  // Find existing image from vehicleData
  var existing = (_vehicleData||[]).find(function(v){return v.plate_number===plate;});
  if(existing && existing.image_url) { imgPrev.src = existing.image_url; imgPrev.style.display = 'block'; }
  else { imgPrev.src = ''; imgPrev.style.display = 'none'; }
  document.getElementById('update-vehicle-modal-err').style.display = 'none';
  document.getElementById('modal-update-vehicle').style.display = 'flex';
}
function closeUpdateVehicleModal() { document.getElementById('modal-update-vehicle').style.display = 'none'; }

function previewUpdateVehicleImage(input) {
  if(!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    window._updateVehicleImageBase64 = e.target.result;
    var preview = document.getElementById('u-v-image-preview');
    if(preview) { preview.src = e.target.result; preview.style.display = 'block'; }
  };
  reader.readAsDataURL(input.files[0]);
}

async function submitUpdateVehicle() {
  var plate    = document.getElementById('u-v-plate').value.trim();
  var type     = document.getElementById('u-v-type').value;
  var model    = document.getElementById('u-v-model').value.trim();
  var capacity = document.getElementById('u-v-capacity').value;
  var status   = document.getElementById('u-v-status').value;
  var ownership = document.getElementById('u-v-ownership').value;
  var errEl    = document.getElementById('update-vehicle-modal-err');
  var btn      = document.getElementById('update-vehicle-submit-btn');
  errEl.style.display = 'none';

  if(!type || !capacity || !status) { errEl.textContent = 'All fields are required.'; errEl.style.display = 'block'; return; }

  var payload = {type, model: model || null, capacity_tons: capacity, status, ownership_type: ownership};
  if(window._updateVehicleImageBase64) payload.image_base64 = window._updateVehicleImageBase64;

  btn.disabled = true; btn.textContent = 'Updating...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicles/' + encodeURIComponent(plate), {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    var d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Failed to update vehicle.');
    closeUpdateVehicleModal();
    loadVehicles();
  } catch(e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">save</span> Save Changes';
}

// â”€â”€ AUDIT LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadAuditLogs() {
  var tb = document.getElementById('audit-logs-tbody');
  if(!tb) return;
  tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span></td></tr>';
  try {
    var res = await apiFetch('/' + _SLUG + '/api/admin/audit-logs');
    var logs = await res.json();
    if(!logs || !logs.length) {
      tb.innerHTML = '<tr><td colspan="5"><div class="empty"><span class="material-symbols-outlined">history</span><p>No audit logs available</p></div></td></tr>';
      return;
    }
    tb.innerHTML = logs.map(function(l) {
      var ts = new Date(l.created_at).toLocaleString();
      // Use first_name + last_name from the backend if available
      var act = l.actor_name ? esc(l.actor_name) : esc(l.actor || 'system');
      if (!l.actor_name && act.indexOf('@') > 0) {
        var namePart = act.split('@')[0].replace(/[._]/g,' ');
        act = namePart.split(' ').map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
      }
      var type = esc(l.actor_type || '');
      var typeHtml = type === 'superadmin' ? '<span style="color:#d97706;font-weight:700;font-size:10px;background:#fef3c7;padding:2px 6px;border-radius:4px;text-transform:uppercase;">Superadmin</span>' : '<span style="color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase;">' + type + '</span>';
      return '<tr>' +
        '<td style="white-space:nowrap;color:#64748b;font-size:12px;">' + ts + '</td>' +
        '<td><strong>' + act + '</strong></td>' +
        '<td>' + typeHtml + '</td>' +
        '<td><span style="background:#f1f5f9;color:#334155;padding:3px 8px;border-radius:6px;font-size:11px;font-family:\'DM Mono\',monospace;font-weight:600;">' + esc(l.action) + '</span></td>' +
        '<td>' + esc(l.target || 'â€”') + '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tb.innerHTML = '<tr><td colspan="6"><div class="empty" style="color:#dc2626;"><span class="material-symbols-outlined">error</span><p>Failed to load audit logs.</p></div></td></tr>';
  }
}
// â”€â”€ PAYMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadPayments() {
  var tb = document.querySelector('#s-payments .tbl-wrap tbody');
  if(tb) tb.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span></td></tr>';
  try {
    var res = await apiFetch('/' + _SLUG + '/api/admin/payments');
    var d = await res.json();
    if (!d || !d.payments) throw new Error('Invalid response');

    // Update stat cards
    var rev = parseFloat(d.total_revenue || 0);
    var paidCount = d.payments.filter(function(p){return p.status==='Paid';}).length;
    var pendingCount = parseInt(d.pending_count || 0);
    var overdueCount = d.payments.filter(function(p){return p.status==='Overdue';}).length;

    // Compute estimated expenses: use server-computed values
    var totalKm = parseFloat(d.total_distance || 0);
    var expenses = parseFloat(d.total_expenses || 0);
    var netProfit = rev - expenses;

    var fmt = function(v) { return '\u20B1' + Math.abs(v).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2}); };

    // Gross Revenue
    var el;
    el = document.getElementById('pay-gross');
    if(el) el.textContent = fmt(rev);
    el = document.getElementById('pay-gross-note');
    if(el) el.textContent = paidCount + ' paid invoices';

    // Est. Expenses
    el = document.getElementById('pay-expenses');
    if(el) el.textContent = fmt(expenses);

    // Net Profit
    el = document.getElementById('pay-net');
    if(el) { el.textContent = (netProfit < 0 ? '-' : '') + fmt(netProfit); el.style.color = netProfit >= 0 ? '#16a34a' : '#dc2626'; }
    el = document.getElementById('pay-net-note');
    if(el) el.textContent = totalKm > 0 ? totalKm.toFixed(1) + ' km total distance' : 'Revenue âˆ’ Expenses';

    // Pending
    el = document.getElementById('pay-pending');
    if(el) el.textContent = pendingCount;
    el = document.getElementById('pay-pending-note');
    if(el) el.textContent = pendingCount ? pendingCount + ' awaiting payment' : 'All cleared';

    // Overdue
    el = document.getElementById('pay-overdue');
    if(el) el.textContent = overdueCount;
    el = document.getElementById('pay-overdue-note');
    if(el) el.textContent = overdueCount ? overdueCount + ' past due' : 'No data yet';

    renderPayments(d.payments);
  } catch(e) {
    if(tb) tb.innerHTML = '<tr><td colspan="10"><div class="empty" style="color:#dc2626;"><span class="material-symbols-outlined">error</span><p>Failed to load payments.</p></div></td></tr>';
  }
}

function renderPayments(list) {
  var tb = document.querySelector('#s-payments .tbl-wrap tbody');
  if(!tb) return;
  if(!list || !list.length) {
    tb.innerHTML = '<tr><td colspan="9"><div class="empty"><span class="material-symbols-outlined">payments</span><p>No payment records yet</p></div></td></tr>';
    return;
  }
  var statusCl = {'Paid':'b-delivered','Pending':'b-awaiting','Overdue':'b-declined','AwaitingAdmin':'b-pending'};
  tb.innerHTML = list.map(function(p) {
    var customer = (p.customer_first || p.customer_last)
      ? esc((p.customer_first + ' ' + p.customer_last).trim())
      : esc(p.receiver_name || 'â€”');
    var amount = p.total_amount ? '\u20B1' + parseFloat(p.total_amount).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'â€”';
    var method = p.payment_method || '';
    var methodLabels = {'gcash':'GCash','card':'Card','paymaya':'PayMaya','grab_pay':'GrabPay','billease':'BillEase','dob':'Online Banking'};
    if (method && methodLabels[method.toLowerCase()]) method = methodLabels[method.toLowerCase()];
    else if (method) method = method.charAt(0).toUpperCase() + method.slice(1);
    if (!method && p.paymongo_checkout_id) method = 'PayMongo';
    method = esc(method || 'â€”');
    var ref = esc(p.reference_code || p.paymongo_payment_id || p.paymongo_checkout_id || 'â€”');
    var confirmed = p.admin_confirmed ? '<span style="color:#16a34a;font-size:12px;">&#10003; Yes</span>' : '<span style="color:#94a3b8;font-size:12px;">â€”</span>';
    var st = p.status || 'Pending';
    var stCl = statusCl[st] || 'b-pending';
    var date = p.paid_at ? new Date(p.paid_at).toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : (p.created_at ? new Date(p.created_at).toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'â€”');
    var confirmBtn = (st !== 'Paid')
      ? '<button onclick="confirmPayment(' + p.invoice_id + ',this)" style="font-size:11px;padding:3px 10px;border:1.5px solid #0f2235;border-radius:6px;background:none;cursor:pointer;font-weight:600;color:#0f2235;" title="Mark as Paid">Confirm</button>'
      : '';
    return '<tr>' +
      '<td><strong style="font-family:monospace;">#' + esc(String(p.invoice_id||'')) + '</strong></td>' +
      '<td><strong>' + esc(p.delivery_number||'â€”') + '</strong></td>' +
      '<td>' + customer + '</td>' +
      '<td><strong>' + amount + '</strong></td>' +
      '<td>' + method + '</td>' +
      '<td style="font-family:monospace;font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + ref + '">' + ref + '</td>' +
      '<td>' + confirmed + '</td>' +
      '<td><span class="badge ' + stCl + '">' + esc(st) + '</span></td>' +
      '<td>' + date + '</td>' +
      '<td>' + confirmBtn + '</td>' +
    '</tr>';
  }).join('');
}

async function confirmPayment(invoiceId, btn) {
  if(!confirm('Mark invoice #' + invoiceId + ' as Paid?')) return;
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/payments/' + invoiceId + '/confirm', { method: 'POST' });
    var d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Failed');
    loadPayments();
  } catch(e) { alert(e.message); btn.disabled=false; btn.textContent='Confirm'; }
}
// â”€â”€ Subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadSubscription() {
  var plans = {
    'startup':    { label: 'Padala',       price: 1499,  desc: 'Up to 10 riders / drivers, local deliveries' },
    'enterprise': { label: 'Negosyo',      price: 4999,  desc: 'Unlimited riders & users, live tracking' },
    'global':     { label: 'Korporasyon',  price: 14999, desc: 'Full platform, dedicated manager, data export' }
  };

  var nameEl = document.getElementById('sub-plan-name');
  var descEl = document.getElementById('sub-plan-desc');
  var priceEl = document.getElementById('sub-plan-price');
  var nextEl = document.getElementById('sub-next-billing');
  var daysEl = document.getElementById('sub-days-left');
  var statusEl = document.getElementById('sub-status');
  var sinceEl = document.getElementById('sub-since');
  var tbody = document.getElementById('sub-billing-tbody');

  try {
    var res = await apiFetch('/' + _SLUG + '/api/admin/subscription');
    var d = await res.json();
    if (!d.ok) throw new Error(d.error || 'Failed');

    var planKey = (d.plan || 'startup').toLowerCase();
    var plan = plans[planKey] || plans['startup'];
    var tenantCreated = d.tenant_created_at ? new Date(d.tenant_created_at) : new Date();
    var now = new Date();

    // Populate plan info
    if (nameEl) nameEl.textContent = plan.label;
    if (descEl) descEl.textContent = plan.desc;
    if (priceEl) priceEl.textContent = '\u20b1' + plan.price.toLocaleString() + '.00';

    // Calculate next billing based on monthly cycle from creation
    var nextBilling = new Date(tenantCreated);
    while (nextBilling <= now) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    if (nextEl) nextEl.textContent = nextBilling.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    var daysRemaining = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));
    if (daysEl) {
      if (daysRemaining <= 3) {
        daysEl.innerHTML = '<span style="color:#ef4444;font-weight:700;">' + daysRemaining + ' days remaining \u2014 payment due soon</span>';
      } else {
        daysEl.textContent = daysRemaining + ' days remaining';
      }
    }

    if (statusEl) {
      statusEl.textContent = 'Active';
      statusEl.style.color = '#16a34a';
    }
    if (sinceEl) {
      sinceEl.textContent = 'Since ' + tenantCreated.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Show pending downgrade notice
    var pendingContainer = document.getElementById('sub-pending-downgrade');
    if (pendingContainer && d.pending_downgrade) {
      var targetPlan = plans[d.pending_downgrade] ? plans[d.pending_downgrade].label : d.pending_downgrade;
      var effDate = d.downgrade_effective_date ? new Date(d.downgrade_effective_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'next billing cycle';
      pendingContainer.style.display = 'block';
      pendingContainer.innerHTML = '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<span class="material-symbols-outlined" style="font-size:20px;color:#f97316;">schedule</span>' +
          '<div><div style="font-size:13px;font-weight:700;color:#9a3412;">Downgrade Scheduled</div>' +
          '<div style="font-size:12px;color:#c2410c;">Your plan will change to <strong>' + esc(targetPlan) + '</strong> on ' + effDate + '</div></div>' +
        '</div>' +
        '<button onclick="cancelDowngrade(this)" style="padding:8px 16px;background:#fff;border:1.5px solid #fed7aa;border-radius:8px;font-size:12px;font-weight:700;color:#ea580c;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;" onmouseover="this.style.background=\'#fef2f2\';this.style.borderColor=\'#ef4444\';this.style.color=\'#dc2626\';" onmouseout="this.style.background=\'#fff\';this.style.borderColor=\'#fed7aa\';this.style.color=\'#ea580c\';">Cancel Downgrade</button>' +
      '</div>';
    }

    // Billing history from SUBSCRIPTION_PAYMENT table
    if (!tbody) return;
    var payments = d.payments || [];
    if (!payments.length) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="empty"><span class="material-symbols-outlined">event_repeat</span><p>No subscription payments recorded yet</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = payments.map(function(p) {
      var date = p.created_at ? new Date(p.created_at).toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '\u2014';
      var planLabel = (plans[p.plan] ? plans[p.plan].label : (p.plan || '').charAt(0).toUpperCase() + (p.plan || '').slice(1)) + ' Plan';
      var amount = '\u20b1' + parseFloat(p.amount || 0).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
      var st = (p.status || '').toLowerCase() === 'paid' ? 'Paid' : (p.status || 'Pending');
      var stCl = st === 'Paid' ? 'b-delivered' : 'b-pending';
      return '<tr>' +
        '<td>' + date + '</td>' +
        '<td>' + esc(planLabel) + '</td>' +
        '<td><strong>' + amount + '</strong></td>' +
        '<td><span class="badge ' + stCl + '">' + esc(st) + '</span></td>' +
      '</tr>';
    }).join('');

  } catch(e) {
    // Fallback to __TENANT__ data if API fails
    var t = window.__TENANT__ || {};
    var planKey = (t.plan || 'startup').toLowerCase();
    var plan = plans[planKey] || plans['startup'];
    if (nameEl) nameEl.textContent = plan.label;
    if (descEl) descEl.textContent = plan.desc;
    if (priceEl) priceEl.textContent = '\u20b1' + plan.price.toLocaleString() + '.00';
    if (statusEl) { statusEl.textContent = 'Active'; statusEl.style.color = '#16a34a'; }
    if (tbody) tbody.innerHTML = '<tr><td colspan="4"><div class="empty"><span class="material-symbols-outlined">event_repeat</span><p>Could not load billing history</p></div></td></tr>';
  }
}

async function cancelDowngrade(btn) {
  if (!confirm('Cancel the pending downgrade? Your current plan will remain active.')) return;
  btn.disabled = true;
  btn.textContent = 'Cancelling...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/cancel-downgrade', {
      method: 'POST',
      headers: {'Content-Type':'application/json'}
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    alert('âœ“ ' + d.message);
    // Hide the notice and reload subscription
    var container = document.getElementById('sub-pending-downgrade');
    if (container) container.style.display = 'none';
    loadSubscription();
  } catch(e) {
    alert('Error: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Cancel Downgrade';
  }
}

// â”€â”€ Proof of Delivery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadPODs() {
  var tb = document.querySelector('#s-pod .tbl-wrap tbody');
  if(!tb) return;
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span></td></tr>';
  try {
    var res = await apiFetch('/' + _SLUG + '/api/admin/pods');
    var d = await res.json();
    var pods = d.pods || [];
    if(!pods.length) {
      tb.innerHTML = '<tr><td colspan="6"><div class="empty"><span class="material-symbols-outlined">task</span><p>No PODs yet</p></div></td></tr>';
      return;
    }
    tb.innerHTML = pods.map(function(p) {
      var geo = (p.latitude && p.longitude) ? parseFloat(p.latitude).toFixed(4) + ', ' + parseFloat(p.longitude).toFixed(4) : 'â€”';
      var ts = p.created_at ? new Date(p.created_at).toLocaleString() : 'â€”';
      var type = esc(p.capture_type || p.type || 'Photo');
      var media = p.photo ? '<img src="' + p.photo + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="window.open(this.src)" />' : (p.signature ? '<img src="' + p.signature + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="window.open(this.src)" />' : 'â€”');
      return '<tr>' +
        '<td><strong>' + esc(String(p.pod_id || p.id || '')) + '</strong></td>' +
        '<td><strong>' + esc(p.delivery_number || 'â€”') + '</strong></td>' +
        '<td>' + type + '</td>' +
        '<td style="font-family:monospace;font-size:11px;">' + geo + '</td>' +
        '<td>' + ts + '</td>' +
        '<td>' + media + '</td>' +
      '</tr>';
    }).join('');
  } catch(e) {
    tb.innerHTML = '<tr><td colspan="6"><div class="empty" style="color:#dc2626;"><span class="material-symbols-outlined">error</span><p>Failed to load PODs</p></div></td></tr>';
  }
}
loadPODs();
</script>

<script>
// â”€â”€ Vehicle CR/OR Document Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window._vehicleDocBase64 = null;

function handleDocSelect(input) {
  if (input.files && input.files[0]) processDocFile(input.files[0]);
}

function handleDocDrop(e) {
  e.preventDefault();
  var zone = document.getElementById('v-doc-zone');
  zone.style.borderColor = '#e2e8f0';
  zone.style.background = '#fafbfc';
  if (e.dataTransfer.files && e.dataTransfer.files[0]) processDocFile(e.dataTransfer.files[0]);
}

function processDocFile(file) {
  if (file.size > 5 * 1024 * 1024) { alert('File too large. Maximum 5MB.'); return; }
  var reader = new FileReader();
  reader.onload = function(ev) {
    window._vehicleDocBase64 = ev.target.result;
    document.getElementById('v-doc-filename').textContent = file.name;
    document.getElementById('v-doc-preview').style.display = 'flex';
    document.getElementById('v-doc-zone').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function clearDocUpload() {
  window._vehicleDocBase64 = null;
  document.getElementById('v-doc-preview').style.display = 'none';
  document.getElementById('v-doc-zone').style.display = '';
  var input = document.getElementById('v-ownership-doc');
  if (input) input.value = '';
}

